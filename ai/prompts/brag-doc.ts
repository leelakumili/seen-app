interface Entry {
  content:          string
  entry_type:       string
  bucket:           string
  impact_level:     string
  created_at:       string
  shoutout_person?: string
}

interface UserContext {
  name?:    string
  role?:    string
  manager?: string
}

function identity(user: UserContext): string {
  return [
    user.name    && `Name: ${user.name}`,
    user.role    && `Role: ${user.role}`,
    user.manager && `Manager: ${user.manager}`,
  ].filter(Boolean).join('\n')
}

function resolveName(bucket: string, names: Record<string, string>): string {
  return names[bucket] ?? bucket
}

const GROUNDING = `GROUNDING RULES — follow strictly:
- Use ONLY the work entries listed below as your source of facts.
- Do NOT invent metrics, percentages, outcomes, team names, departments, or tools unless they appear verbatim in an entry.
- If an entry is vague, reflect that vagueness — do not sharpen it with invented specifics.
- If a section has no relevant entries, write "Insufficient entries for this area."`

export function buildBragMonthPrompt(
  entries: Entry[],
  monthLabel: string,
  year: number,
  user: UserContext = {},
  bucketNames: Record<string, string> = {},
): string {
  const shoutouts   = entries.filter(e => e.entry_type === 'shoutout')
  const workEntries = entries.filter(e => e.entry_type !== 'shoutout')

  const byBucket = workEntries.reduce<Record<string, string[]>>((acc, e) => {
    const name = resolveName(e.bucket, bucketNames)
    if (!acc[name]) acc[name] = []
    acc[name].push(`${e.content} [${e.impact_level}]`)
    return acc
  }, {})

  const sections = Object.entries(byBucket)
    .map(([name, items]) => `${name}:\n${items.map(i => `  - ${i}`).join('\n')}`)
    .join('\n\n')

  const shoutoutSection = shoutouts.length > 0
    ? '\n\nPeer Recognition:\n' +
      shoutouts.map(e => `  - ${e.shoutout_person ? `${e.shoutout_person}: ` : ''}${e.content}`).join('\n')
    : ''

  const ctx = identity(user)

  return `You are a career coach. Rewrite each work entry as a single concise brag statement for a promotion portfolio.

${ctx ? `ENGINEER CONTEXT:\n${ctx}\n` : ''}${GROUNDING.replace('GROUNDING RULES', 'RULES')}
- One sentence per entry. Active voice. Strong action verb.
- Preserve impact scope (team / org / cross-org).

WORK ENTRIES — ${monthLabel} ${year}:
${sections}${shoutoutSection}

Rewrite as brag statements. Keep the same grouping. For Peer Recognition entries format as "Recognised [person] for [contribution]."

Output:
**[Goal Area Name]**
- [one-sentence brag statement]
${shoutouts.length > 0 ? '\n**Peer Recognition**\n- [recognition statement]' : ''}

No preamble. No commentary.`
}

export function buildBragDocPrompt(
  entries: Entry[],
  quarter: string,
  year: number,
  user: UserContext = {},
  bucketNames: Record<string, string> = {},
): string {
  const shoutouts   = entries.filter(e => e.entry_type === 'shoutout')
  const workEntries = entries.filter(e => e.entry_type !== 'shoutout')

  const byBucket = workEntries.reduce<Record<string, Entry[]>>((acc, e) => {
    if (!acc[e.bucket]) acc[e.bucket] = []
    acc[e.bucket].push(e)
    return acc
  }, {})

  const sections = Object.entries(byBucket)
    .map(([bucket, items]) => {
      const name  = resolveName(bucket, bucketNames)
      const lines = items.map(e => `  - ${e.content} [${e.impact_level}]`).join('\n')
      return `${name}:\n${lines}`
    })
    .join('\n\n')

  const shoutoutSection = shoutouts.length > 0
    ? '\n\nPeer Recognition & Collaboration:\n' +
      shoutouts.map(e => `  - ${e.shoutout_person ? `${e.shoutout_person}: ` : ''}${e.content}`).join('\n')
    : ''

  const ctx = identity(user)

  const roleLabel = user.role ?? 'engineer'
  return `You are a career coach writing a brag document for a ${roleLabel}'s promotion case.

${ctx ? `ENGINEER CONTEXT:\n${ctx}\n` : ''}${GROUNDING}

${quarter} ${year} WORK ENTRIES:
${sections}${shoutoutSection}

# ${quarter} ${year} — Impact Summary

## Executive Summary
2-3 sentences capturing the overall contribution level and key themes, based only on the entries above.

## Impact by Goal Area
For each bucket with entries, write a paragraph. Use language from the entries. Third person ("Led", "Drove", "Delivered"). No extrapolation.

## Highlight Wins
3-5 standout items. Format: **Bold title** — one sentence from the entry.
${shoutouts.length > 0 ? '\n## Peer Recognition\n**[Person]** — [what they did and why it mattered, from the entry].\n' : ''}
## Evidence of Level
2-3 sentences connecting this quarter's work to the next level's expectations. Grounded in what was logged.

Write with confidence. No hedging. No invented facts.`
}
