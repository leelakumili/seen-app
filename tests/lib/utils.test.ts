import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { currentQuarter, BUCKET_COLORS, ENTRY_TYPE_LABELS } from '../../src/lib/utils'

describe('currentQuarter', () => {
  it('returns Q1 for January', () => {
    vi.setSystemTime(new Date('2025-01-15'))
    expect(currentQuarter()).toBe('Q1')
  })

  it('returns Q1 for March', () => {
    vi.setSystemTime(new Date('2025-03-31'))
    expect(currentQuarter()).toBe('Q1')
  })

  it('returns Q2 for April', () => {
    vi.setSystemTime(new Date('2025-04-01'))
    expect(currentQuarter()).toBe('Q2')
  })

  it('returns Q2 for June', () => {
    vi.setSystemTime(new Date('2025-06-30'))
    expect(currentQuarter()).toBe('Q2')
  })

  it('returns Q3 for July', () => {
    vi.setSystemTime(new Date('2025-07-01'))
    expect(currentQuarter()).toBe('Q3')
  })

  it('returns Q3 for September', () => {
    vi.setSystemTime(new Date('2025-09-30'))
    expect(currentQuarter()).toBe('Q3')
  })

  it('returns Q4 for October', () => {
    vi.setSystemTime(new Date('2025-10-01'))
    expect(currentQuarter()).toBe('Q4')
  })

  it('returns Q4 for December', () => {
    vi.setSystemTime(new Date('2025-12-31'))
    expect(currentQuarter()).toBe('Q4')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.useFakeTimers()
  })
})

describe('BUCKET_COLORS', () => {
  it('has an entry for every default bucket', () => {
    const buckets = ['technical-scope', 'people-impact', 'leadership-org', 'innovation-bets', 'external-presence', 'execution']
    for (const b of buckets) {
      expect(BUCKET_COLORS[b]).toBeDefined()
      expect(BUCKET_COLORS[b]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

describe('ENTRY_TYPE_LABELS', () => {
  it('has a label for every entry type', () => {
    const types = ['win', 'blocker', 'shoutout', 'learning', 'delivery']
    for (const t of types) {
      expect(ENTRY_TYPE_LABELS[t]).toBeDefined()
      expect(typeof ENTRY_TYPE_LABELS[t]).toBe('string')
    }
  })

  it('maps blocker to Blocker Resolved', () => {
    expect(ENTRY_TYPE_LABELS.blocker).toBe('Blocker Resolved')
  })
})
