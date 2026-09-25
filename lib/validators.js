const CJK_CHARACTER_PATTERN = /[\u3400-\u9FFF\uF900-\uFAFF]/u;

export function validateChineseInput(value) {
  return Boolean(value && value.trim() && CJK_CHARACTER_PATTERN.test(value));
}

export function validateSettings(settings) {
  const provider = settings?.provider;
  const apiKey = settings?.apiKey?.trim();
  const model = settings?.model?.trim();

  if (!apiKey || !model) {
    return false;
  }

  if (provider === 'custom') {
    const endpoint = settings?.endpoint?.trim();
    if (!endpoint) {
      return false;
    }
    try {
      const url = new URL(endpoint);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

export function validateLevel(level) {
  return ['A', 'B', 'C'].includes(level);
}
