import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import Database from 'better-sqlite3'

// Extract pure logic functions for testing without Electron's Notification API

function makeDb() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE entries (
      id TEXT PRIMARY KEY,
      content TEXT,
      entry_type TEXT,
      bucket TEXT,
      impact_level TEXT,
      created_at TEXT,
      archived_at TEXT,
      deleted_at TEXT
    );
  `)
  return db
}

function getSetting(db: Database.Database, key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

function hasLoggedToday(db: Database.Database): boolean {
  const row = db.prepare(`
    SELECT COUNT(*) as c FROM entries
    WHERE deleted_at IS NULL
      AND date(created_at, 'localtime') = date('now', 'localtime')
  `).get() as { c: number }
  return row.c > 0
}

function msUntilTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  const now    = new Date()
  const target = new Date()
  target.setHours(h ?? 17, m ?? 0, 0, 0)
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1)
  return target.getTime() - now.getTime()
}

// ── getSetting ───────────────────────────────────────────────────────────────

describe('getSetting', () => {
  let db: Database.Database

  beforeEach(() => { db = makeDb() })

  it('returns value when key exists', () => {
    db.prepare("INSERT INTO settings VALUES ('foo', 'bar')").run()
    expect(getSetting(db, 'foo')).toBe('bar')
  })

  it('returns null when key does not exist', () => {
    expect(getSetting(db, 'missing')).toBeNull()
  })
})

// ── hasLoggedToday ───────────────────────────────────────────────────────────

describe('hasLoggedToday', () => {
  let db: Database.Database

  beforeEach(() => { db = makeDb() })

  it('returns false when no entries today', () => {
    expect(hasLoggedToday(db)).toBe(false)
  })

  it('returns true when there is at least one entry today', () => {
    db.prepare(`
      INSERT INTO entries (id, content, entry_type, bucket, impact_level, created_at)
      VALUES ('x', 'win', 'win', 'execution', 'team', datetime('now', 'localtime'))
    `).run()
    expect(hasLoggedToday(db)).toBe(true)
  })

  it('returns false when only entry is soft-deleted', () => {
    db.prepare(`
      INSERT INTO entries (id, content, entry_type, bucket, impact_level, created_at, deleted_at)
      VALUES ('x', 'win', 'win', 'execution', 'team', datetime('now'), datetime('now'))
    `).run()
    expect(hasLoggedToday(db)).toBe(false)
  })

  it('returns false when entries exist but only from yesterday', () => {
    db.prepare(`
      INSERT INTO entries (id, content, entry_type, bucket, impact_level, created_at)
      VALUES ('x', 'win', 'win', 'execution', 'team', datetime('now', '-1 day'))
    `).run()
    expect(hasLoggedToday(db)).toBe(false)
  })
})

// ── msUntilTime ──────────────────────────────────────────────────────────────

describe('msUntilTime', () => {
  it('returns a positive number', () => {
    expect(msUntilTime('23:59')).toBeGreaterThan(0)
  })

  it('returns less than 24h for a future time today', () => {
    const result = msUntilTime('23:59')
    expect(result).toBeLessThanOrEqual(24 * 60 * 60 * 1000)
  })

  it('targets tomorrow when time has already passed today', () => {
    // 00:01 is almost always in the past
    const result = msUntilTime('00:01')
    // Should be scheduling for ~tomorrow (close to but less than 24h)
    const twentyThreeHours = 23 * 60 * 60 * 1000
    expect(result).toBeGreaterThan(twentyThreeHours)
  })

  it('handles edge case HH:MM with single digit hour', () => {
    expect(() => msUntilTime('9:00')).not.toThrow()
  })
})
