const line2RulesByLevel = {
  A: 'Line 2 must contain only tone-marked pinyin. Do not include Chinese characters or English.',
  B: 'Line 2 must group by meaning and output Chinese+tone-marked pinyin together. Do not split mechanically by single character. Example: 经济jīngjì 发展fāzhǎn. Use spaces between phrase groups.',
  C: 'Line 2 must contain only Chinese. Do not include pinyin or English.'
};

export function buildPrompt({ sourceText, level }) {
  const line2Rule = line2RulesByLevel[level];
  return (
    `Chinese note → JSON {"line2":"","line3":""}. Level: ${level}. ` +
    `${line2Rule} ` +
    `Line3: natural English translation. Short phrases (1-4 chars): translation only. Longer: add structure/usage note, max 50 words. ` +
    `Write for students, no "teaching note" phrasing. Only JSON, no extra text. ` +
    `Source: ${sourceText}`
  );
}
