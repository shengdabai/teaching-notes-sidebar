export function parseModelResponse(rawText) {
  // Strip markdown code fences that LLMs sometimes wrap JSON in
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Invalid JSON from model response');
  }

  if (
    typeof parsed?.line2 !== 'string' ||
    typeof parsed?.line3 !== 'string' ||
    !parsed.line2.trim() ||
    !parsed.line3.trim()
  ) {
    throw new Error('Invalid model response');
  }

  return {
    line2: parsed.line2.trim(),
    line3: parsed.line3.trim()
  };
}
