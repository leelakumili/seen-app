import { describe, it, expect } from 'vitest'
import { buildSuggestPrompt }    from '../../ai/prompts/suggest'
import { buildCorrectPrompt }    from '../../ai/prompts/correct'
import { buildAskSystemPrompt }  from '../../ai/prompts/ask'
import { buildBragMonthPrompt, buildBragDocPrompt } from '../../ai/prompts/brag-doc'
import { buildQuarterlyPrompt }  from '../../ai/prompts/quarterly'

// ── Shared fixtures ──────────────────────────────────────────────────────────

const baseEntry = {
  content:      'Shipped the auth rework with zero P1s in first week',
  entry_type:   'win',
  bucket:       'execution',
  impact_level: 'org',
  created_at:   '2025-01-15T10:00:00Z',
}

const shoutoutEntry = {
  content:        'Pair-programmed through a gnarly migration',
  entry_type:     'shoutout',
  bucket:         'people-impact',
  impact_level:   'team',
  created_at:     '2025-01-20T10:00:00Z',
  shoutout_person: 'Michael',
}

// ── buildSuggestPrompt ───────────────────────────────────────────────────────

describe('buildSuggestPrompt', () => {
  it('includes the entry content in the prompt', () => {
    const p = buildSuggestPrompt('led a cross-team retro')
    expect(p).toContain('led a cross-team retro')
  })

  it('includes all six bucket definitions', () => {
    const p = buildSuggestPrompt('test')
    expect(p).toContain('Technical Scope & Influence')
    expect(p).toContain('People Impact')
    expect(p).toContain('Leadership & Org Health')
    expect(p).toContain('Innovation & Bets')
    expect(p).toContain('External Presence')
    expect(p).toContain('Execution & Delivery')
  })

  it('instructs the model to reply with only a JSON object', () => {
    const p = buildSuggestPrompt('test')
    expect(p).toContain('Reply with only a JSON object')
  })

  it('includes cross-team scope in bucket definitions', () => {
    const p = buildSuggestPrompt('test')
    expect(p).toContain('cross-team technical impact')
  })

  it('includes hiring in bucket definitions', () => {
    const p = buildSuggestPrompt('test')
    expect(p).toContain('hiring')
  })

  it('wraps content in the Entry: field', () => {
    const p = buildSuggestPrompt('my work item')
    expect(p).toMatch(/Entry: "my work item"/)
  })
})

// ── buildCorrectPrompt ───────────────────────────────────────────────────────

describe('buildCorrectPrompt', () => {
  it('includes the original content', () => {
    const p = buildCorrectPrompt('definately shipped it')
    expect(p).toContain('definately shipped it')
  })

  it('instructs not to change meaning or tone', () => {
    const p = buildCorrectPrompt('test')
    expect(p.toLowerCase()).toContain('meaning')
    expect(p.toLowerCase()).toContain('tone')
  })
})

// ── buildAskSystemPrompt ─────────────────────────────────────────────────────

describe('buildAskSystemPrompt', () => {
  it('renders all entries in the prompt', () => {
    const p = buildAskSystemPrompt([baseEntry])
    expect(p).toContain('Shipped the auth rework')
  })

  it('uses the user role when provided', () => {
    const p = buildAskSystemPrompt([baseEntry], 'normal', { role: 'Staff Engineer' })
    expect(p).toContain('Staff Engineer')
  })

  it('falls back to "professional" when no role set', () => {
    const p = buildAskSystemPrompt([baseEntry], 'normal', {})
    expect(p).toContain("professional's work log")
  })

  it('applies brag style instructions when style=brag', () => {
    const p = buildAskSystemPrompt([], 'brag')
    expect(p.toLowerCase()).toContain('boldly')
  })

  it('shows a no-entries message when entries array is empty', () => {
    const p = buildAskSystemPrompt([])
    expect(p).toContain('no entries logged yet')
  })

  it('formats entries with type, bucket, impact_level, date', () => {
    const p = buildAskSystemPrompt([baseEntry])
    expect(p).toContain('WIN')
    expect(p).toContain('execution')
    expect(p).toContain('org')
    expect(p).toContain('2025-01-15')
  })
})

// ── buildBragMonthPrompt ─────────────────────────────────────────────────────

describe('buildBragMonthPrompt', () => {
  it('includes the month and year label', () => {
    const p = buildBragMonthPrompt([baseEntry], 'January', 2025, {})
    expect(p).toContain('January 2025')
  })

  it('renders entry content', () => {
    const p = buildBragMonthPrompt([baseEntry], 'January', 2025, {})
    expect(p).toContain('Shipped the auth rework')
  })

  it('includes the impact level tag', () => {
    const p = buildBragMonthPrompt([baseEntry], 'January', 2025, {})
    expect(p).toContain('[org]')
  })

  it('separates shoutout entries into Peer Recognition section', () => {
    const p = buildBragMonthPrompt([baseEntry, shoutoutEntry], 'January', 2025, {})
    expect(p).toContain('Peer Recognition')
    expect(p).toContain('Michael')
  })

  it('uses custom bucket names when provided', () => {
    const p = buildBragMonthPrompt([baseEntry], 'January', 2025, {}, { execution: 'Delivery & Reliability' })
    expect(p).toContain('Delivery & Reliability')
  })

  it('injects user context when set', () => {
    const p = buildBragMonthPrompt([baseEntry], 'January', 2025, { name: 'Leela', role: 'EM' })
    expect(p).toContain('Leela')
    expect(p).toContain('EM')
  })

  it('includes grounding rules', () => {
    const p = buildBragMonthPrompt([baseEntry], 'January', 2025, {})
    expect(p.toLowerCase()).toContain('do not invent')
  })
})

// ── buildBragDocPrompt ───────────────────────────────────────────────────────

describe('buildBragDocPrompt', () => {
  it('includes the quarter and year', () => {
    const p = buildBragDocPrompt([baseEntry], 'Q1', 2025, {})
    expect(p).toContain('Q1 2025')
  })

  it('uses the user role in framing when set', () => {
    const p = buildBragDocPrompt([baseEntry], 'Q1', 2025, { role: 'Engineering Lead' })
    expect(p).toContain('Engineering Lead')
  })

  it('falls back to "engineer" when no role set', () => {
    const p = buildBragDocPrompt([baseEntry], 'Q1', 2025, {})
    expect(p).toContain("engineer's promotion case")
  })

  it('includes GROUNDING RULES block', () => {
    const p = buildBragDocPrompt([baseEntry], 'Q1', 2025, {})
    expect(p).toContain('GROUNDING RULES')
  })

  it('includes Executive Summary section header', () => {
    const p = buildBragDocPrompt([baseEntry], 'Q1', 2025, {})
    expect(p).toContain('## Executive Summary')
  })

  it('omits Peer Recognition section when no shoutouts', () => {
    const p = buildBragDocPrompt([baseEntry], 'Q1', 2025, {})
    expect(p).not.toContain('## Peer Recognition')
  })

  it('includes Peer Recognition section when shoutouts present', () => {
    const p = buildBragDocPrompt([baseEntry, shoutoutEntry], 'Q1', 2025, {})
    expect(p).toContain('Peer Recognition')
  })

  it('renders entry content', () => {
    const p = buildBragDocPrompt([baseEntry], 'Q1', 2025, {})
    expect(p).toContain('Shipped the auth rework')
  })
})

// ── buildQuarterlyPrompt ─────────────────────────────────────────────────────

describe('buildQuarterlyPrompt', () => {
  it('includes the quarter and year in the output header', () => {
    const p = buildQuarterlyPrompt([baseEntry], 'Q1', 2025, {})
    expect(p).toContain('Q1 2025')
  })

  it('uses the user role when set', () => {
    const p = buildQuarterlyPrompt([baseEntry], 'Q1', 2025, { role: 'Staff Engineer' })
    expect(p).toContain('Staff Engineer')
  })

  it('falls back to "engineer" when role not set', () => {
    const p = buildQuarterlyPrompt([baseEntry], 'Q1', 2025, {})
    expect(p).toContain('engineer write')
  })

  it('formats output in Situation/Task/Outcome structure', () => {
    const p = buildQuarterlyPrompt([baseEntry], 'Q1', 2025, {})
    expect(p).toContain('Situation')
    expect(p).toContain('Task')
    expect(p).toContain('Outcome')
  })

  it('adds Team Recognition item when shoutouts present', () => {
    const p = buildQuarterlyPrompt([baseEntry, shoutoutEntry], 'Q1', 2025, {})
    expect(p).toContain('Team Recognition')
  })

  it('includes grounding rule against invented metrics', () => {
    const p = buildQuarterlyPrompt([baseEntry], 'Q1', 2025, {})
    expect(p).toContain('GROUNDING RULES')
  })

  it('renders entry content grouped by bucket', () => {
    const p = buildQuarterlyPrompt([baseEntry], 'Q1', 2025, {})
    expect(p).toContain('execution')
    expect(p).toContain('Shipped the auth rework')
  })
})
