import { describe, expect, test } from 'vitest';
import { buildPrompt } from '../lib/prompt-builder.js';
import { parseModelResponse } from '../lib/response-parser.js';

describe('content formatting helpers', () => {
  test('buildPrompt includes level-specific constraints', () => {
    const prompt = buildPrompt({ sourceText: '经济发展', level: 'B' });
    expect(prompt).toContain('Chinese+tone-marked pinyin');
    expect(prompt).toContain('max 50 words');
    expect(prompt).toContain('Source: 经济发展');
    expect(prompt).toContain('Only JSON');
  });

  test('buildPrompt includes explanation clarity guidance', () => {
    const prompt = buildPrompt({ sourceText: '经济发展', level: 'B' });
    expect(prompt).toContain('max 50 words');
    expect(prompt).toContain('no "teaching note"');
  });

  test('parseModelResponse accepts valid line2 and line3 fields', () => {
    expect(
      parseModelResponse('{"line2":"经济jīngjì 发展fāzhǎn","line3":"Economic development."}')
    ).toEqual({
      line2: '经济jīngjì 发展fāzhǎn',
      line3: 'Economic development.'
    });
  });

  test('parseModelResponse rejects malformed payloads', () => {
    expect(() => parseModelResponse('{"line2":"only"}')).toThrow('Invalid model response');
  });

  test('parseModelResponse strips markdown code fences', () => {
    expect(
      parseModelResponse('```json\n{"line2":"你好","line3":"Hello."}\n```')
    ).toEqual({
      line2: '你好',
      line3: 'Hello.'
    });
  });

  test('parseModelResponse strips bare code fences', () => {
    expect(
      parseModelResponse('```\n{"line2":"你好","line3":"Hello."}\n```')
    ).toEqual({
      line2: '你好',
      line3: 'Hello.'
    });
  });
});
