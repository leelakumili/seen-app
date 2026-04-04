export function buildCorrectPrompt(content: string): string {
  return `Fix only spelling and grammar mistakes in the text below.
Do not change the meaning, tone, phrasing, or structure.
Do not add or remove information.
Reply with only the corrected text — no explanations, no quotes.

TEXT:
${content}`
}
