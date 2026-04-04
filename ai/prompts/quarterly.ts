interface Entry {
  content:        string
  bucket:         string
  impact_level:   string
  created_at:     string
  entry_type:     string
  shoutout_person?: string
}

interface UserContext {
  name?:    string
  role?:    string
  manager?: string
}

export function buildQuarterlyPrompt(entries: Entry[], quarter: string, year: number, user: UserContext = {}): string {
  const shoutouts  = entries.filter(e => e.entry_type === 'shoutout')
  const workEntries = entries.filter(e => e.entry_type !== 'shoutout')

  const byBucket = workEntries.reduce<Record<string, Entry[]>>((acc, e) => {
    if (!acc[e.bucket]) acc[e.bucket] = []
    acc[e.bucket].push(e)
    return acc
  }, {})

  const formattedWork = Object.entries(byBucket)
    .map(([bucket, items]) => {
      const lines = items.map(e => `  - [${e.impact_level}] ${e.content}`).join('\n')
      return `${bucket}:\n${lines}`
    })
    .join('\n\n')

  const formattedShoutouts = shoutouts.length > 0
    ? '\n\nSHOUTOUTS / PEER RECOGNITION:\n' +
      shoutouts.map(e => `  - ${e.shoutout_person ? `${e.shoutout_person}: ` : ''}${e.content}`).join('\n')
    : ''

  const identity = [
    user.name    && `Name: ${user.name}`,
    user.role    && `Role: ${user.role}`,
    user.manager && `Manager: ${user.manager}`,
  ].filter(Boolean).join('\n')

  const roleLabel = user.role ?? 'engineer'
  return `You are a career coach helping a ${roleLabel} write their quarterly self-assessment for a performance review.

${identity ? `ENGINEER CONTEXT:\n${identity}\n` : ''}
GROUNDING RULES — follow strictly:
- Use ONLY the work entries listed below as your source of facts.
- Do NOT invent metrics, percentages, team names, departments, tools, or outcomes not present in the entries.
- Do NOT reference any org, team, or person not mentioned in the entries or context above.
- If entries are sparse for a bucket, combine related buckets rather than padding with filler.

${quarter} ${year} WORK ENTRIES (by goal area):
${formattedWork}${formattedShoutouts}

Write a quarterly self-assessment as a numbered list of highlights. Each highlight covers one meaningful work area from the entries.

Output format — follow exactly:

## ${quarter} ${year} — Self-Assessment

1. **[Short descriptive title for this highlight]**
   - **Situation:** [1 sentence: context or challenge that made this work necessary]
   - **Task:** [1 sentence: what you specifically owned, decided, or delivered]
   - **Outcome:** [1 sentence: concrete result, impact, or change — no invented metrics]

2. **[Next highlight title]**
   - **Situation:** ...
   - **Task:** ...
   - **Outcome:** ...

${shoutouts.length > 0 ? `(last item) **Team Recognition**
   - **Situation:** Collaboration and peer contributions this quarter.
   - **Task:** Recognised teammates for specific contributions.
   - **Outcome:** [summarise what recognitions were given and why they mattered]

` : ''}Rules for highlights:
- One numbered item per meaningful work area (typically 3-6 items total).
- Keep each bullet to one sentence — dense and specific, no filler.
- First person, active voice. ("Led", "Shipped", "Identified" — not "Was responsible for").
- No preamble. No section headers outside the numbered list. No closing summary.`
}
