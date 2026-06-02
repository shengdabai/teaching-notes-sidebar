import { segmentBoundaryHint } from './segmenter.js';

// What line 2 must contain at each level. Shown to the model verbatim.
export const line2RulesByLevel = {
  A:
    'tone-marked Hanyu Pinyin ONLY — no Chinese characters, no English. ' +
    'Join the syllables inside each word with no space (北京 → Běijīng, 银行 → yínháng), ' +
    'and put a single space between words. Lowercase, except proper nouns and sentence start.',
  B:
    'each word as the Chinese immediately followed by its tone-marked pinyin, with no space ' +
    'between them (经济jīngjì), and a single space between word groups. No English on this line.',
  C: 'the Chinese only — no pinyin, no English.'
};

export const LEVELS = Object.keys(line2RulesByLevel);

// Tight, varied examples that teach: per-word pinyin grouping, context-correct
// readings for 多音字, and the "translate plainly, annotate only when it adds value"
// calibration for line 3.
const FEW_SHOT_EXAMPLES = [
  { level: 'A', source: '北京', words: '北京', line2: 'Běijīng', line3: 'Beijing, the capital of China.' },
  { level: 'A', source: '银行', words: '银行', line2: 'yínháng', line3: 'Bank (financial institution).' },
  { level: 'B', source: '经济发展', words: '经济 | 发展', line2: '经济jīngjì 发展fāzhǎn', line3: 'Economic development.' },
  { level: 'B', source: '了', words: '了', line2: '了le', line3: 'Particle marking a completed action or a change of state.' },
  { level: 'C', source: '城市', words: '城市', line2: '城市', line3: 'City.' }
];

function renderExamples() {
  return FEW_SHOT_EXAMPLES.map(
    (ex) =>
      `- Level ${ex.level} | source "${ex.source}" | words ${ex.words}` +
      ` -> {"line2":"${ex.line2}","line3":"${ex.line3}"}`
  ).join('\n');
}

function buildSystemPrompt() {
  return [
    'You annotate Chinese vocabulary and phrases for learners. Return ONLY a JSON object',
    '{"line2":"","line3":""} — no markdown, no extra text.',
    '',
    'line2 depends on the level:',
    `- Level A: ${line2RulesByLevel.A}`,
    `- Level B: ${line2RulesByLevel.B}`,
    `- Level C: ${line2RulesByLevel.C}`,
    'Group pinyin by meaning, never one syllable at a time. Pick the reading that fits the',
    'word in context (e.g. 行 is háng in 银行, xíng in 行走).',
    '',
    'line3 is natural English:',
    '- Lead with the plain meaning.',
    '- For a common, concrete word, stop there — just the translation, nothing padded.',
    '- Only if the term carries grammatical function, usage nuance, or idiomatic meaning,',
    '  add ONE short clause on how it is used.',
    '- Hard limit 30 words. Never mention pinyin or tones, never say "teaching note".',
    '',
    'Examples:',
    renderExamples()
  ].join('\n');
}

/**
 * Build the system + user messages for one note. The word-boundary hint comes
 * from client-side segmentation, which is what drives per-word pinyin grouping.
 * @param {{ sourceText: string, level: 'A'|'B'|'C' }} params
 * @returns {{ system: string, user: string }}
 */
export function buildPrompt({ sourceText, level }) {
  const boundaryHint = segmentBoundaryHint(sourceText);
  const user = [
    `Level: ${level}.`,
    `Word boundaries (use as a guide; fix if clearly wrong): ${boundaryHint}`,
    `Source: ${sourceText}`,
    'Return only the JSON object.'
  ].join('\n');

  return { system: buildSystemPrompt(), user };
}
