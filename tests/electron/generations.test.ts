import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

function makeDb() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE generations (
      id               TEXT PRIMARY KEY,
      type             TEXT NOT NULL,
      date_range_start TEXT,
      date_range_end   TEXT,
      quarter          TEXT,
      year             INTEGER,
      month            INTEGER,
      content_hash     TEXT,
      output           TEXT NOT NULL,
      created_at       TEXT NOT NULL
    );
  `)
  return db
}

// Inline the handler logic for unit-testability

function getGeneration(db: Database.Database, params: {
  type:     'brag_doc' | 'quarterly' | 'brag_month'
  quarter?: string
  year?:    number
  month?:   number
}) {
  if (params.type === 'brag_month') {
    return db.prepare(`
      SELECT * FROM generations
      WHERE type = 'brag_month' AND year = ? AND month = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(params.year, params.month) ?? null
  }
  return db.prepare(`
    SELECT * FROM generations
    WHERE type = ? AND quarter = ? AND year = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(params.type, params.quarter, params.year) ?? null
}

describe('getGeneration', () => {
  let db: Database.Database

  beforeEach(() => {
    db = makeDb()
  })

  it('retrieves a brag_doc generation by quarter and year', () => {
    db.prepare(`
      INSERT INTO generations (id, type, quarter, year, output, created_at)
      VALUES ('g1', 'brag_doc', 'Q1', 2025, 'output text', datetime('now'))
    `).run()

    const result = getGeneration(db, { type: 'brag_doc', quarter: 'Q1', year: 2025 }) as any
    expect(result).not.toBeNull()
    expect(result.output).toBe('output text')
  })

  it('retrieves a quarterly generation', () => {
    db.prepare(`
      INSERT INTO generations (id, type, quarter, year, output, created_at)
      VALUES ('g2', 'quarterly', 'Q2', 2025, 'quarterly out', datetime('now'))
    `).run()

    const result = getGeneration(db, { type: 'quarterly', quarter: 'Q2', year: 2025 }) as any
    expect(result.output).toBe('quarterly out')
  })

  it('retrieves a brag_month generation by year and month', () => {
    db.prepare(`
      INSERT INTO generations (id, type, year, month, output, created_at)
      VALUES ('g3', 'brag_month', 2025, 1, 'jan brag', datetime('now'))
    `).run()

    const result = getGeneration(db, { type: 'brag_month', year: 2025, month: 1 }) as any
    expect(result.output).toBe('jan brag')
  })

  it('returns null when no generation exists', () => {
    const result = getGeneration(db, { type: 'brag_doc', quarter: 'Q3', year: 2025 })
    expect(result).toBeNull()
  })

  it('returns the most recent when multiple generations exist for same period', () => {
    db.prepare(`INSERT INTO generations (id, type, quarter, year, output, created_at) VALUES ('old', 'brag_doc', 'Q1', 2025, 'old output', '2025-01-01')`).run()
    db.prepare(`INSERT INTO generations (id, type, quarter, year, output, created_at) VALUES ('new', 'brag_doc', 'Q1', 2025, 'new output', '2025-02-01')`).run()

    const result = getGeneration(db, { type: 'brag_doc', quarter: 'Q1', year: 2025 }) as any
    expect(result.output).toBe('new output')
  })

  it('does not mix up brag_month records for different months', () => {
    db.prepare(`INSERT INTO generations (id, type, year, month, output, created_at) VALUES ('jan', 'brag_month', 2025, 1, 'january', datetime('now'))`).run()
    db.prepare(`INSERT INTO generations (id, type, year, month, output, created_at) VALUES ('feb', 'brag_month', 2025, 2, 'february', datetime('now'))`).run()

    const jan = getGeneration(db, { type: 'brag_month', year: 2025, month: 1 }) as any
    const feb = getGeneration(db, { type: 'brag_month', year: 2025, month: 2 }) as any
    expect(jan.output).toBe('january')
    expect(feb.output).toBe('february')
  })
})
