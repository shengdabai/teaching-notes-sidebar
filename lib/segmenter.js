// Word-level segmentation for Chinese, used to drive per-word pinyin grouping.
// Relies on Intl.Segmenter (Chrome 87+, Node 16+). Falls back to the whole
// string as a single segment when unavailable, so callers always get an array.

// Covers CJK Ext-A + the basic block + compatibility ideographs, plus the
// iteration mark 々 (U+3005), ideographic zero 〇 (U+3007), and Ext-B+ (U+20000+).
const CJK_CHARACTER_PATTERN =
  /[々〇㐀-鿿豈-﫿]|[\u{20000}-\u{2FA1F}]/u;

let cachedSegmenter;

function getSegmenter() {
  if (cachedSegmenter !== undefined) {
    return cachedSegmenter;
  }
  try {
    cachedSegmenter =
      typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
        ? new Intl.Segmenter('zh', { granularity: 'word' })
        : null;
  } catch {
    cachedSegmenter = null;
  }
  return cachedSegmenter;
}

/**
 * Split Chinese text into meaningful words/phrases.
 * @param {string} text
 * @returns {string[]} word segments with whitespace-only pieces dropped
 */
export function segmentChinese(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return [];
  }

  const segmenter = getSegmenter();
  if (!segmenter) {
    return [trimmed];
  }

  try {
    const words = [];
    for (const { segment } of segmenter.segment(trimmed)) {
      if (segment.trim()) {
        words.push(segment);
      }
    }
    return words.length ? words : [trimmed];
  } catch {
    return [trimmed];
  }
}

/**
 * Render segments as a model-readable boundary hint, e.g. "北京 | 城市".
 * @param {string} text
 * @returns {string}
 */
export function segmentBoundaryHint(text) {
  return segmentChinese(text).join(' | ');
}

export { CJK_CHARACTER_PATTERN };
