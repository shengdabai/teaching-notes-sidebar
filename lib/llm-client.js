import { parseModelResponse } from './response-parser.js';

const MAX_TOKENS = 400;

// Accepts a structured prompt { system, user }. Strings are tolerated for
// backward compatibility (treated as the user message with no system prompt).
function normalizePrompt(prompt) {
  if (typeof prompt === 'string') {
    return { system: '', user: prompt };
  }
  return { system: prompt?.system || '', user: prompt?.user || '' };
}

// Re-issue the same request with an explicit correction after a level violation.
function withCorrection(prompt, reason) {
  const { system, user } = normalizePrompt(prompt);
  return {
    system,
    user: `${user}\nThe previous attempt was rejected: ${reason}. Follow the Level rule for line2 exactly.`
  };
}

// Reasoning models (deepseek-reasoner, OpenAI o-series, *-thinking) reject
// `temperature` and `response_format`; sending them returns HTTP 400. Note: this
// does not match gpt-4o (it starts with "gpt", not "o<digit>").
function isReasoningModel(model) {
  return /reasoner|reasoning|thinking/i.test(model || '') || /^o[0-9]/i.test(model || '');
}

async function readJson(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }
  return data;
}

function extractStandardText(data) {
  const rawText = data.choices?.[0]?.message?.content || '';
  if (!rawText) {
    throw new Error('The model returned an empty response. Try rephrasing your input.');
  }
  return rawText;
}

function extractGeminiText(data) {
  if (data.candidates?.[0]?.finishReason === 'SAFETY') {
    throw new Error('Response blocked by safety filter. Try rephrasing your input.');
  }
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!rawText) {
    throw new Error('The model returned an empty response. Try rephrasing your input.');
  }
  return rawText;
}

function extractClaudeText(data) {
  const rawText = data.content?.[0]?.text || '';
  if (!rawText) {
    throw new Error('The model returned an empty response. Try rephrasing your input.');
  }
  return rawText;
}

function buildStandardBody(prompt, model) {
  const { system, user } = normalizePrompt(prompt);
  const messages = [];
  if (system) {
    messages.push({ role: 'system', content: system });
  }
  messages.push({ role: 'user', content: user });

  const body = { model, messages, max_tokens: MAX_TOKENS };
  if (!isReasoningModel(model)) {
    body.temperature = 0.1;
    body.response_format = { type: 'json_object' };
  }
  return JSON.stringify(body);
}

function buildGeminiBody(prompt) {
  const { system, user } = normalizePrompt(prompt);
  const body = {
    contents: [{ parts: [{ text: user }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          line2: { type: 'string', description: 'Teaching note content for line 2.' },
          line3: { type: 'string', description: 'English translation / usage note for line 3.' }
        },
        required: ['line2', 'line3']
      },
      temperature: 0.1,
      maxOutputTokens: MAX_TOKENS
    }
  };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }
  return JSON.stringify(body);
}

function buildClaudeBody(prompt, model) {
  const { system, user } = normalizePrompt(prompt);
  const body = {
    model: model || 'claude-sonnet-4-5',
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: user }],
    temperature: 0.1
  };
  if (system) {
    body.system = system;
  }
  return JSON.stringify(body);
}

const PROVIDER_CONFIGS = {
  deepseek: {
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    hasEndpoint: true
  },
  minimax: {
    defaultModel: 'MiniMax-M1',
    models: ['MiniMax-M1'],
    defaultEndpoint: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    hasEndpoint: true
  },
  glm: {
    defaultModel: 'glm-4-plus',
    models: ['glm-4-plus', 'glm-4-flash'],
    defaultEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    hasEndpoint: true
  },
  chatgpt: {
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    hasEndpoint: true
  },
  claude: {
    defaultModel: 'claude-sonnet-4-5',
    models: ['claude-sonnet-4-5', 'claude-opus-4-5', 'claude-haiku-4-5'],
    defaultEndpoint: 'https://api.anthropic.com/v1/messages',
    hasEndpoint: true
  },
  kimi: {
    defaultModel: 'moonshot-v1-8k',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    defaultEndpoint: 'https://api.moonshot.cn/v1/chat/completions',
    hasEndpoint: true
  },
  qwen: {
    defaultModel: 'qwen-plus',
    models: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
    defaultEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    hasEndpoint: true
  },
  custom: {
    defaultModel: '',
    models: [],
    defaultEndpoint: '',
    hasEndpoint: true
  }
};

const ALLOWED_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'];

function providerApiUrl(provider, endpoint) {
  if (provider === 'gemini') {
    return null;
  }
  const config = PROVIDER_CONFIGS[provider];
  if (config) {
    return endpoint || config.defaultEndpoint;
  }
  return endpoint;
}

function geminiApiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

// One round-trip: build the body for the provider, fetch, extract raw text,
// then parse + validate against the level.
async function requestOnce({ provider, apiKey, model, prompt, endpoint, level, timeoutMs }) {
  if (provider === 'gemini') {
    if (!ALLOWED_GEMINI_MODELS.includes(model)) {
      throw new Error('Invalid model. Choose gemini-2.5-flash or gemini-2.5-pro.');
    }
    const response = await fetch(geminiApiUrl(model), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(timeoutMs),
      body: buildGeminiBody(prompt)
    });
    return parseModelResponse(extractGeminiText(await readJson(response)), level);
  }

  if (provider === 'claude') {
    const response = await fetch(providerApiUrl(provider, endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      signal: AbortSignal.timeout(timeoutMs),
      body: buildClaudeBody(prompt, model)
    });
    return parseModelResponse(extractClaudeText(await readJson(response)), level);
  }

  const response = await fetch(providerApiUrl(provider, endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(timeoutMs),
    body: buildStandardBody(prompt, model)
  });
  return parseModelResponse(extractStandardText(await readJson(response)), level);
}

export async function generateTeachingNote({ provider, apiKey, model, prompt, endpoint, level }) {
  try {
    return await requestOnce({ provider, apiKey, model, prompt, endpoint, level, timeoutMs: 30_000 });
  } catch (error) {
    // A level-contract violation is recoverable: nudge the model once.
    if (error?.code === 'LEVEL_VIOLATION' && level) {
      return requestOnce({
        provider,
        apiKey,
        model,
        prompt: withCorrection(prompt, error.message),
        endpoint,
        level,
        timeoutMs: 30_000
      });
    }
    throw error;
  }
}

export async function testLlmConnection({ provider, apiKey, model, endpoint }) {
  await requestOnce({
    provider,
    apiKey,
    model,
    prompt: { system: '', user: 'Return JSON {"line2":"ok","line3":"ok"}' },
    endpoint,
    level: undefined,
    timeoutMs: 15_000
  });
  return true;
}

export function getProviderConfig(provider) {
  return PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.custom;
}

export function getAllProviders() {
  return Object.keys(PROVIDER_CONFIGS);
}
