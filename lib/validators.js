const CJK_CHARACTER_PATTERN = /[\u3400-\u9FFF\uF900-\uFAFF]/u;

export function validateChineseInput(value) {
  return Boolean(value && value.trim() && CJK_CHARACTER_PATTERN.test(value));
}

export function validateSettings(settings) {
  return Boolean(settings?.apiKey?.trim() && settings?.model?.trim());
}

export function validateLevel(level) {
  return ['A', 'B', 'C'].includes(level);
}
