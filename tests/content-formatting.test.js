import { describe, expect, test } from 'vitest';
import { buildPrompt, line2RulesByLevel, LEVELS } from '../lib/prompt-builder.js';

describe('buildPrompt', () => {
  test('returns a system + user pair', () => {
    const prompt = buildPrompt({ sourceText: '经济发展', level: 'B' });
    expect(typeof prompt.system).toBe('string');
    expect(typeof prompt.user).toBe('string');
  });

  test('system prompt carries all three level rules', () => {
    const { system } = buildPrompt({ sourceText: '北京', level: 'A' });
    expect(system).toContain(line2RulesByLevel.A);
    expect(system).toContain(line2RulesByLevel.B);
    expect(system).toContain(line2RulesByLevel.C);
  });

  test('system prompt teaches per-word pinyin grouping, not per syllable', () => {
    const { system } = buildPrompt({ sourceText: '北京', level: 'A' });
    expect(system).toContain('never one syllable at a time');
    // grouped examples, not split
    expect(system).toContain('Běijīng');
    expect(system).toContain('经济jīngjì');
  });

  test('system prompt teaches context-correct readings for 多音字', () => {
    const { system } = buildPrompt({ sourceText: '银行', level: 'A' });
    expect(system).toContain('yínháng');
    expect(system).toContain('xíng');
  });

  test('line3 calibration is bounded and free of meta language', () => {
    const { system } = buildPrompt({ sourceText: '经济发展', level: 'B' });
    expect(system).toContain('just the translation');
    expect(system).toContain('Hard limit 30 words');
    expect(system).toContain('"teaching note"');
  });

  test('user message states level, segmented boundaries, and source', () => {
    const { user } = buildPrompt({ sourceText: '经济发展', level: 'B' });
    expect(user).toContain('Level: B');
    expect(user).toContain('Source: 经济发展');
    // Intl.Segmenter splits 经济发展 into two words.
    expect(user).toContain('经济 | 发展');
  });

  test('exposes the canonical level list', () => {
    expect(LEVELS).toEqual(['A', 'B', 'C']);
  });
});
