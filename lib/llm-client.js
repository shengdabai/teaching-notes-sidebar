import { parseModelResponse } from './response-parser.js';

async function parseStandardApiResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    const message = data.error?.message || 'Request failed';
    throw new Error(message);
  }

  const rawText = data.choices?.[0]?.message?.content || '';
  if (!rawText) {
    throw new Error('The model returned an empty response. Try rephrasing your input.');
  }

  return parseModelResponse(rawText);
}

async function parseGeminiApiResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    const message = data.error?.message || 'Request failed';
    throw new Error(message);
  }

  const finishReason = data.candidates?.[0]?.finishReason;
  if (finishReason === 'SAFETY') {
    throw new Error('Response blocked by safety filter. Try rephrasing your input.');
  }

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!rawText) {
    throw new Error('The model returned an empty response. Try rephrasing your input.');
  }

  return parseModelResponse(rawText);
}

async function parseClaudeApiResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    const message = data.error?.message || 'Request failed';
    throw new Error(message);
  }

  const rawText = data.content?.[0]?.text || '';
  if (!rawText) {
    throw new Error('The model returned an empty response. Try rephrasing your input.');
  }

  return parseModelResponse(rawText);
}

function buildStandardBody(prompt, model) {
  return JSON.stringify({
    model: model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 200
  });
}

function buildGeminiBody(prompt) {
  return JSON.stringify({
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          line2: {
            type: 'string',
            description: 'Chinese teaching note content for line 2.'
          },
          line3: {
            type: 'string',
            description: 'English translation and short teaching note for line 3.'
          }
        },
        required: ['line2', 'line3']
      },
      temperature: 0.1,
      maxOutputTokens: 200
    }
  });
}

function buildClaudeBody(prompt, model) {
  return JSON.stringify({
    model: model || 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1
  });
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
    defaultModel: 'claude-sonnet-4-20250514',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-20250514'],
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

const ALLOWED_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'];

export async function generateTeachingNote({ provider, apiKey, model, prompt, endpoint }) {
  if (provider === 'gemini') {
    if (!ALLOWED_GEMINI_MODELS.includes(model)) {
      throw new Error('Invalid model. Choose gemini-2.5-flash or gemini-2.5-pro.');
    }

    const response = await fetch(
      geminiApiUrl(model),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        signal: AbortSignal.timeout(30_000),
        body: buildGeminiBody(prompt)
      }
    );
    return parseGeminiApiResponse(response);
  }

  if (provider === 'claude') {
    const apiUrl = providerApiUrl(provider, endpoint);
    const response = await fetch(
      apiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        signal: AbortSignal.timeout(30_000),
        body: buildClaudeBody(prompt, model)
      }
    );
    return parseClaudeApiResponse(response);
  }

  const apiUrl = providerApiUrl(provider, endpoint);
  const response = await fetch(
    apiUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: AbortSignal.timeout(30_000),
      body: buildStandardBody(prompt, model)
    }
  );
  return parseStandardApiResponse(response);
}

export async function testLlmConnection({ provider, apiKey, model, endpoint }) {
  if (provider === 'gemini') {
    if (!ALLOWED_GEMINI_MODELS.includes(model)) {
      throw new Error('Invalid model. Choose gemini-2.5-flash or gemini-2.5-pro.');
    }

    const response = await fetch(
      geminiApiUrl(model),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        signal: AbortSignal.timeout(15_000),
        body: buildGeminiBody('Return JSON {"line2":"ok","line3":"ok"}')
      }
    );
    await parseGeminiApiResponse(response);
    return true;
  }

  if (provider === 'claude') {
    const apiUrl = providerApiUrl(provider, endpoint);
    const response = await fetch(
      apiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        signal: AbortSignal.timeout(15_000),
        body: buildClaudeBody('Return JSON {"line2":"ok","line3":"ok"}', model)
      }
    );
    await parseClaudeApiResponse(response);
    return true;
  }

  const apiUrl = providerApiUrl(provider, endpoint);
  const response = await fetch(
    apiUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: AbortSignal.timeout(15_000),
      body: buildStandardBody('Return JSON {"line2":"ok","line3":"ok"}', model)
    }
  );
  await parseStandardApiResponse(response);
  return true;
}

export function getProviderConfig(provider) {
  return PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.custom;
}

export function getAllProviders() {
  return Object.keys(PROVIDER_CONFIGS);
}
