import { CJK_CHARACTER_PATTERN } from './segmenter.js';

const CJK = new RegExp(CJK_CHARACTER_PATTERN.source, 'u');
// Tone-marked pinyin vowels — their presence in a Chinese-only line means leakage.
const TONE_MARKED_VOWEL = /[āáǎàēéěèêīíǐìōóǒòūúǔùǖǘǚǜüńňǹ]/iu;
// Any Latin / accented-Latin letter (incl. tone-marked pinyin vowels up to U+01FF).
const ANY_LATIN = /[a-zà-ÿā-ǿ]/iu;
// A run of Latin (incl. tone-marked) letters, used to inspect level-C leakage.
const LATIN_TOKEN = /[a-zà-ÿā-ǿ]+/giu;

// A lowercase-only Latin token of length ≥ 2 looks like pinyin or an English
// word; mixed-case (iPhone) or all-caps (PPT, WTO, X) loanword tokens are fine
// inside otherwise-Chinese level-C text.
function hasPinyinLikeToken(text) {
  const tokens = text.match(LATIN_TOKEN) || [];
  return tokens.some((token) => token.length >= 2 && token === token.toLowerCase());
}

/**
 * Detect output that violates the level's line2 contract.
 *
 * NOTE: this checks the *character class* contract only (A = pinyin, B = both,
 * C = Chinese). Per-word pinyin grouping (北京 → "Běijīng", not "Běi jīng") is
 * driven at generation time by the segmentation hint + rules + few-shot in
 * prompt-builder, NOT validated here: Intl.Segmenter merges single-char words
 * (我/想/去 → "我想去"), so a count-based grouping check cannot tell correct
 * per-word pinyin from a syllable split and would false-reject common phrases.
 *
 * @param {string} line2
 * @param {'A'|'B'|'C'} level
 * @returns {string|null} a reason when the output is wrong for the level, else null
 */
export function detectLevelViolation(line2, level) {
  const text = (line2 || '').trim();
  if (!text) {
    return 'line2 is empty';
  }

  if (level === 'A') {
    if (CJK.test(text)) {
      return 'Level A must be pinyin only, but contains Chinese characters';
    }
    if (!ANY_LATIN.test(text)) {
      return 'Level A must contain pinyin';
    }
    return null;
  }

  if (level === 'C') {
    if (!CJK.test(text)) {
      return 'Level C must contain Chinese';
    }
    if (TONE_MARKED_VOWEL.test(text) || hasPinyinLikeToken(text)) {
      return 'Level C must be Chinese only, but contains pinyin/English';
    }
    return null;
  }

  // Level B: Chinese and pinyin must both be present.
  if (!CJK.test(text)) {
    return 'Level B must contain Chinese characters';
  }
  if (!ANY_LATIN.test(text)) {
    return 'Level B must contain pinyin alongside the Chinese';
  }
  return null;
}

// Pull the first balanced {...} object out of noisier text (e.g. a model that
// prepends "Here is the JSON:" or wraps in fences with a language tag).
function extractJsonObject(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return text;
  }
  return text.slice(start, end + 1);
}

/**
 * Parse a model response into { line2, line3 }, optionally enforcing the level.
 * @param {string} rawText
 * @param {'A'|'B'|'C'} [level] when given, throws on a level-contract violation
 */
export function parseModelResponse(rawText, level) {
  // Strip markdown code fences that LLMs sometimes wrap JSON in.
  const cleaned = (rawText || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Retry against the first balanced object before giving up.
    try {
      parsed = JSON.parse(extractJsonObject(cleaned));
    } catch {
      throw new Error('Invalid JSON from model response');
    }
  }

  if (
    typeof parsed?.line2 !== 'string' ||
    typeof parsed?.line3 !== 'string' ||
    !parsed.line2.trim() ||
    !parsed.line3.trim()
  ) {
    throw new Error('Invalid model response');
  }

  const line2 = parsed.line2.trim();
  const line3 = parsed.line3.trim();

  if (level) {
    const violation = detectLevelViolation(line2, level);
    if (violation) {
      const error = new Error(violation);
      error.code = 'LEVEL_VIOLATION';
      throw error;
    }
  }

  return { line2, line3 };
}
