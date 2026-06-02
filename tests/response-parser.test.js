import { describe, expect, test } from 'vitest';
import { parseModelResponse, detectLevelViolation } from '../lib/response-parser.js';

describe('parseModelResponse', () => {
  test('accepts a valid line2/line3 payload', () => {
    expect(parseModelResponse('{"line2":"经济jīngjì 发展fāzhǎn","line3":"Economic development."}')).toEqual({
      line2: '经济jīngjì 发展fāzhǎn',
      line3: 'Economic development.'
    });
  });

  test('rejects malformed payloads', () => {
    expect(() => parseModelResponse('{"line2":"only"}')).toThrow('Invalid model response');
  });

  test('rejects non-JSON', () => {
    expect(() => parseModelResponse('not json')).toThrow('Invalid JSON');
  });

  test('strips markdown code fences', () => {
    expect(parseModelResponse('```json\n{"line2":"你好","line3":"Hello."}\n```')).toEqual({
      line2: '你好',
      line3: 'Hello.'
    });
  });

  test('strips bare code fences', () => {
    expect(parseModelResponse('```\n{"line2":"你好","line3":"Hello."}\n```')).toEqual({
      line2: '你好',
      line3: 'Hello.'
    });
  });

  test('extracts JSON even with a model preamble', () => {
    expect(
      parseModelResponse('Here is the JSON:\n{"line2":"你好","line3":"Hello."} hope it helps')
    ).toEqual({ line2: '你好', line3: 'Hello.' });
  });

  test('level A: accepts multi-token pinyin (no false grouping reject)', () => {
    // 我想去 = three single-char words; "wǒ xiǎng qù" is correct and must pass.
    expect(parseModelResponse('{"line2":"wǒ xiǎng qù","line3":"I want to go."}', 'A')).toEqual({
      line2: 'wǒ xiǎng qù',
      line3: 'I want to go.'
    });
  });

  test('passes a level-conformant payload through', () => {
    expect(parseModelResponse('{"line2":"Běijīng","line3":"Beijing."}', 'A')).toEqual({
      line2: 'Běijīng',
      line3: 'Beijing.'
    });
  });

  test('throws LEVEL_VIOLATION when level A leaks Chinese', () => {
    let caught;
    try {
      parseModelResponse('{"line2":"北京Běijīng","line3":"Beijing."}', 'A');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeDefined();
    expect(caught.code).toBe('LEVEL_VIOLATION');
  });

  test('throws LEVEL_VIOLATION when level C leaks pinyin', () => {
    expect(() => parseModelResponse('{"line2":"chéngshì","line3":"City."}', 'C')).toThrow();
  });
});

describe('detectLevelViolation', () => {
  test('level A: pinyin only is valid, Chinese is a violation', () => {
    expect(detectLevelViolation('Běijīng chéngshì', 'A')).toBeNull();
    expect(detectLevelViolation('北京', 'A')).toMatch(/pinyin only/);
    expect(detectLevelViolation('北京 Běijīng', 'A')).toMatch(/Chinese/);
  });

  test('level B: requires both Chinese and pinyin', () => {
    expect(detectLevelViolation('经济jīngjì 发展fāzhǎn', 'B')).toBeNull();
    expect(detectLevelViolation('经济 发展', 'B')).toMatch(/pinyin/);
    expect(detectLevelViolation('jingji fazhan', 'B')).toMatch(/Chinese/);
  });

  test('level C: Chinese only is valid, pinyin/English is a violation', () => {
    expect(detectLevelViolation('城市', 'C')).toBeNull();
    // no Chinese at all → flagged as missing Chinese
    expect(detectLevelViolation('chéngshì', 'C')).toMatch(/Chinese/);
    // Chinese present but English leaked in → flagged as not Chinese-only
    expect(detectLevelViolation('城市 city', 'C')).toMatch(/Chinese only/);
  });

  test('level C tolerates loanword tokens but flags lowercase pinyin', () => {
    // mixed-case / all-caps loanwords embedded in Chinese are fine
    expect(detectLevelViolation('AA制', 'C')).toBeNull();
    expect(detectLevelViolation('卡拉OK', 'C')).toBeNull();
    expect(detectLevelViolation('X光', 'C')).toBeNull();
    expect(detectLevelViolation('iPhone手机', 'C')).toBeNull();
    expect(detectLevelViolation('PM2.5很高', 'C')).toBeNull();
    // lowercase pinyin without tone marks still leaks
    expect(detectLevelViolation('我 wo', 'C')).toMatch(/Chinese only/);
  });

  test('empty line2 is always a violation', () => {
    expect(detectLevelViolation('', 'A')).toMatch(/empty/);
  });
});
