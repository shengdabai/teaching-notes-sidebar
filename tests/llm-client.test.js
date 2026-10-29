import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateTeachingNote,
  testLlmConnection,
  getProviderConfig,
  getAllProviders
} from '../lib/llm-client.js';

function standardResponse(line2, line3) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify({ line2, line3 }) } }] })
  };
}

function claudeResponse(line2, line3) {
  return {
    ok: true,
    json: async () => ({ content: [{ text: JSON.stringify({ line2, line3 }) }] })
  };
}

beforeEach(() => {
  global.fetch = vi.fn();
});

describe('provider config', () => {
  it('exposes the expected providers', () => {
    const providers = getAllProviders();
    expect(providers).toContain('deepseek');
    expect(providers).toContain('claude');
    expect(providers).toContain('custom');
    expect(providers).toContain('gemini');
  });

  it('returns deepseek defaults and falls back to custom for unknown', () => {
    expect(getProviderConfig('deepseek').defaultModel).toBe('deepseek-chat');
    expect(getProviderConfig('nope')).toBe(getProviderConfig('custom'));
  });

  it('exposes the Gemini models supported by its request path', () => {
    const config = getProviderConfig('gemini');
    expect(config.models).toEqual(['gemini-2.5-flash', 'gemini-2.5-pro']);
    expect(config.defaultModel).toBe('gemini-2.5-flash');
    expect(config.hasEndpoint).toBe(false);
  });
});

describe('generateTeachingNote', () => {
  it('returns the parsed note and sends a system + user message body', async () => {
    global.fetch.mockResolvedValueOnce(standardResponse('Běijīng', 'Beijing.'));

    const result = await generateTeachingNote({
      provider: 'deepseek',
      apiKey: 'key',
      model: 'deepseek-chat',
      prompt: { system: 'SYSTEM RULES', user: 'do the thing' },
      level: 'A'
    });

    expect(result).toEqual({ line2: 'Běijīng', line3: 'Beijing.' });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(global.fetch.mock.calls[0][1].redirect).toBe('error');
    expect(body.max_tokens).toBe(400);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages[0]).toEqual({ role: 'system', content: 'SYSTEM RULES' });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'do the thing' });
  });

  it('omits temperature and response_format for reasoning models', async () => {
    global.fetch.mockResolvedValueOnce(standardResponse('Běijīng', 'Beijing.'));

    await generateTeachingNote({
      provider: 'deepseek',
      apiKey: 'key',
      model: 'deepseek-reasoner',
      prompt: { system: 'S', user: 'U' },
      level: 'A'
    });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.temperature).toBeUndefined();
    expect(body.response_format).toBeUndefined();
    expect(body.max_tokens).toBe(400);
  });

  it('retries once with a correction when the level contract is violated', async () => {
    global.fetch
      .mockResolvedValueOnce(standardResponse('北京', 'Beijing.')) // Chinese leaked into level A
      .mockResolvedValueOnce(standardResponse('Běijīng', 'Beijing.'));

    const result = await generateTeachingNote({
      provider: 'deepseek',
      apiKey: 'key',
      model: 'deepseek-chat',
      prompt: { system: 'S', user: 'U' },
      level: 'A'
    });

    expect(result).toEqual({ line2: 'Běijīng', line3: 'Beijing.' });
    expect(global.fetch).toHaveBeenCalledTimes(2);

    const retryBody = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(retryBody.messages[1].content).toContain('previous attempt was rejected');
  });

  it('does not retry on a non-recoverable error', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] })
    });

    await expect(
      generateTeachingNote({
        provider: 'deepseek',
        apiKey: 'key',
        model: 'deepseek-chat',
        prompt: { system: 'S', user: 'U' },
        level: 'A'
      })
    ).rejects.toThrow();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('surfaces API errors', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Rate limited' } })
    });

    await expect(
      generateTeachingNote({
        provider: 'deepseek',
        apiKey: 'key',
        model: 'deepseek-chat',
        prompt: { system: 'S', user: 'U' },
        level: 'A'
      })
    ).rejects.toThrow('Rate limited');
  });

  it('routes Claude with x-api-key header and a system field', async () => {
    global.fetch.mockResolvedValueOnce(claudeResponse('Běijīng', 'Beijing.'));

    await generateTeachingNote({
      provider: 'claude',
      apiKey: 'sk-ant',
      model: 'claude-sonnet-4-5',
      prompt: { system: 'S', user: 'U' },
      level: 'A'
    });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['x-api-key']).toBe('sk-ant');
    expect(options.redirect).toBe('error');
    expect(JSON.parse(options.body).system).toBe('S');
  });

  it('rejects invalid Gemini models before any request', async () => {
    await expect(
      generateTeachingNote({
        provider: 'gemini',
        apiKey: 'key',
        model: 'gpt-4o',
        prompt: { system: 'S', user: 'U' },
        level: 'A'
      })
    ).rejects.toThrow('Invalid model');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each(['gemini-2.5-flash', 'gemini-2.5-pro'])('routes %s with a header key and structured prompt', async (model) => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '{"line2":"Běijīng","line3":"Beijing."}' }] } }] })
    });
    await expect(generateTeachingNote({
      provider: 'gemini', apiKey: 'test-key', model,
      prompt: { system: 'S', user: 'U' }, level: 'A'
    })).resolves.toEqual({ line2: 'Běijīng', line3: 'Beijing.' });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
    expect(options.headers['x-goog-api-key']).toBe('test-key');
    expect(options.redirect).toBe('error');
    const body = JSON.parse(options.body);
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'S' }] });
    expect(body.contents).toEqual([{ parts: [{ text: 'U' }] }]);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('assembles Gemini answer parts and excludes thought text', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [
        { thought: true, text: 'Internal reasoning is not a note.' },
        { text: '{"line2":"Běijīng",' },
        { text: '"line3":"Beijing."}' }
      ] } }] })
    });
    await expect(generateTeachingNote({
      provider: 'gemini', apiKey: 'test-key', model: 'gemini-2.5-flash',
      prompt: 'U', level: 'A'
    })).resolves.toEqual({ line2: 'Běijīng', line3: 'Beijing.' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('reports Gemini prompt blocking before trying to parse a note', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } })
    });
    await expect(generateTeachingNote({
      provider: 'gemini', apiKey: 'test-key', model: 'gemini-2.5-flash', prompt: 'U'
    })).rejects.toThrow('blocked');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['custom', ''], ['custom', 'http://api.example.com/v1'],
    ['deepseek', 'http://api.example.com/v1'], ['claude', 'https://user:password@api.example.com/v1']
  ])('rejects an unsafe %s endpoint before sending credentials', async (provider, endpoint) => {
    await expect(generateTeachingNote({ provider, endpoint, apiKey: 'test-key', model: 'test-model', prompt: 'U' }))
      .rejects.toThrow('endpoint');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('permits a local HTTP custom endpoint for local models', async () => {
    global.fetch.mockResolvedValueOnce(standardResponse('ok', 'ok'));
    await expect(testLlmConnection({
      provider: 'custom', endpoint: 'http://localhost:11434/v1/chat/completions', apiKey: 'test-key', model: 'local-model'
    })).resolves.toBe(true);
    expect(global.fetch.mock.calls[0][0]).toBe('http://localhost:11434/v1/chat/completions');
  });
});

describe('testLlmConnection', () => {
  it('resolves true on a parseable response', async () => {
    global.fetch.mockResolvedValueOnce(standardResponse('ok', 'ok'));
    await expect(
      testLlmConnection({ provider: 'deepseek', apiKey: 'key', model: 'deepseek-chat' })
    ).resolves.toBe(true);
  });
});
