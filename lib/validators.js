import { CJK_CHARACTER_PATTERN } from './segmenter.js';

export function validateChineseInput(value) {
  return Boolean(value && value.trim() && CJK_CHARACTER_PATTERN.test(value));
}

export function validateSettings(settings) {
  if (!settings?.apiKey?.trim() || !settings?.model?.trim()) return false;
  if (settings.provider === 'gemini') return true;
  if (settings.provider === 'custom' || settings.endpoint) {
    return validateApiEndpoint(settings.endpoint);
  }
  return true;
}

// Never send provider credentials over public plaintext HTTP. Local model
// servers may use HTTP on loopback; embedded URL credentials are not supported.
export function validateApiEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || !endpoint.trim()) return false;
  try {
    const url = new URL(endpoint);
    if (url.username || url.password) return false;
    const isLoopback = url.hostname === 'localhost' || url.hostname === '[::1]' || /^127(?:\.\d{1,3}){3}$/.test(url.hostname);
    return url.protocol === 'https:' || (url.protocol === 'http:' && isLoopback);
  } catch {
    return false;
  }
}

export function validateLevel(level) {
  return ['A', 'B', 'C'].includes(level);
}
