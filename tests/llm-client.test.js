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
    // gemini is handled on its own path, not in the OpenAI-compatible config map
    expect(providers).not.toContain('gemini');
  });

  it('returns deepseek defaults and falls back to custom for unknown', () => {
    expect(getProviderConfig('deepseek').defaultModel).toBe('deepseek-chat');
    expect(getProviderConfig('nope')).toBe(getProviderConfig('custom'));
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
});

describe('testLlmConnection', () => {
  it('resolves true on a parseable response', async () => {
    global.fetch.mockResolvedValueOnce(standardResponse('ok', 'ok'));
    await expect(
      testLlmConnection({ provider: 'deepseek', apiKey: 'key', model: 'deepseek-chat' })
    ).resolves.toBe(true);
  });
});
