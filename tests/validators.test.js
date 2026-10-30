import { describe, expect, it } from 'vitest';
import { validateApiEndpoint, validateChineseInput, validateSettings, validateLevel } from '../lib/validators.js';

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

    it.each(['𠮷', '𠀀', '〇'])('accepts Chinese character %s supported by the note parser', (input) => {
      expect(validateChineseInput(input)).toBe(true);
    });

    it('rejects empty or whitespace-only input', () => {
      expect(validateChineseInput('')).toBe(false);
      expect(validateChineseInput('   ')).toBe(false);
    });

    it('rejects input with no Chinese characters', () => {
      expect(validateChineseInput('hello world')).toBe(false);
      expect(validateChineseInput('😀')).toBe(false);
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

    it('requires a valid custom endpoint but permits built-in defaults', () => {
      const settings = { apiKey: 'test-key', model: 'test-model' };
      expect(validateSettings({ ...settings, provider: 'custom', endpoint: '' })).toBe(false);
      expect(validateSettings({ ...settings, provider: 'custom', endpoint: 'https://api.example.com/v1' })).toBe(true);
      expect(validateSettings({ ...settings, provider: 'deepseek', endpoint: '' })).toBe(true);
      expect(validateSettings({ ...settings, provider: 'deepseek', endpoint: 'http://api.example.com/v1' })).toBe(false);
    });
  });

  describe('validateApiEndpoint', () => {
    it.each(['https://api.example.com/v1', 'http://localhost:11434/v1', 'http://127.0.0.1:1234/v1', 'http://[::1]:1234/v1'])('accepts HTTPS or local HTTP: %s', (endpoint) => {
      expect(validateApiEndpoint(endpoint)).toBe(true);
    });

    it.each(['', '/relative/path', 'http://api.example.com/v1', 'http://localhost.example.com/v1', 'http://127.example.com/v1', 'ftp://api.example.com/v1', 'https://user:password@api.example.com/v1'])('rejects unsafe or invalid endpoint: %s', (endpoint) => {
      expect(validateApiEndpoint(endpoint)).toBe(false);
    });
  });
});
