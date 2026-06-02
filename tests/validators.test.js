import { describe, expect, it } from 'vitest';
import { validateChineseInput, validateSettings, validateLevel } from '../lib/validators.js';

describe('validators', () => {
  describe('validateLevel', () => {
    it('accepts A, B, C', () => {
      expect(validateLevel('A')).toBe(true);
      expect(validateLevel('B')).toBe(true);
      expect(validateLevel('C')).toBe(true);
    });

    it('rejects anything else', () => {
      expect(validateLevel('D')).toBe(false);
      expect(validateLevel('')).toBe(false);
      expect(validateLevel(null)).toBe(false);
    });
  });

  describe('validateChineseInput', () => {
    it('accepts text containing Chinese characters', () => {
      expect(validateChineseInput('你好')).toBe(true);
      expect(validateChineseInput('经济发展')).toBe(true);
    });

    it('rejects empty or whitespace-only input', () => {
      expect(validateChineseInput('')).toBe(false);
      expect(validateChineseInput('   ')).toBe(false);
    });

    it('rejects input with no Chinese characters', () => {
      expect(validateChineseInput('hello world')).toBe(false);
    });
  });

  describe('validateSettings', () => {
    it('requires both an API key and a model', () => {
      expect(validateSettings({ apiKey: 'sk-abc', model: 'deepseek-chat' })).toBe(true);
    });

    it('rejects missing key or model', () => {
      expect(validateSettings({ apiKey: '', model: 'deepseek-chat' })).toBe(false);
      expect(validateSettings({ apiKey: 'sk-abc', model: '' })).toBe(false);
      expect(validateSettings(null)).toBe(false);
    });
  });
});
