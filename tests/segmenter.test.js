import { describe, expect, test } from 'vitest';
import { segmentChinese, segmentBoundaryHint } from '../lib/segmenter.js';

describe('segmentChinese', () => {
  test('splits a compound phrase into words', () => {
    expect(segmentChinese('经济发展')).toEqual(['经济', '发展']);
  });

  test('keeps a single word intact', () => {
    expect(segmentChinese('北京')).toEqual(['北京']);
  });

  test('separates adjacent words in a longer string', () => {
    expect(segmentChinese('北京银行')).toEqual(['北京', '银行']);
  });

  test('returns an empty array for blank input', () => {
    expect(segmentChinese('')).toEqual([]);
    expect(segmentChinese('   ')).toEqual([]);
  });

  test('drops whitespace-only segments', () => {
    expect(segmentChinese('经济 发展')).toEqual(['经济', '发展']);
  });
});

describe('segmentBoundaryHint', () => {
  test('joins words with a pipe separator', () => {
    expect(segmentBoundaryHint('经济发展')).toBe('经济 | 发展');
  });

  test('renders a single word without separators', () => {
    expect(segmentBoundaryHint('城市')).toBe('城市');
  });
});
