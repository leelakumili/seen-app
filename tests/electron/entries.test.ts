import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'

// Minimal in-memory DB + handler logic extracted for unit testing
// (The IPC handler itself wraps this logic — we test the logic directly)

const VALID_ENTRY_TYPES   = ['win', 'blocker', 'shoutout', 'learning', 'delivery'] as const
const VALID_IMPACT_LEVELS = ['team', 'org', 'cross-org'] as const

function validateEntry(payload: { entry_type: string; impact_level: string }): string | null {
  if (!(VALID_ENTRY_TYPES as readonly string[]).includes(payload.entry_type)) {
    return `Invalid entry type "${payload.entry_type}". Must be one of: ${VALID_ENTRY_TYPES.join(', ')}.`
  }
  if (!(VALID_IMPACT_LEVELS as readonly string[]).includes(payload.impact_level)) {
    return `Invalid impact level "${payload.impact_level}". Must be one of: ${VALID_IMPACT_LEVELS.join(', ')}.`
  }
  return null
}

function makeDb() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE entries (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      bucket TEXT NOT NULL,
      impact_level TEXT NOT NULL,
      shoutout_person TEXT,
      created_at TEXT NOT NULL,
      archived_at TEXT,
      deleted_at TEXT
    );
  `)
  return db
}

// ── Validation logic ─────────────────────────────────────────────────────────

describe('validateEntry', () => {
  it('returns null for valid win + team', () => {
    expect(validateEntry({ entry_type: 'win', impact_level: 'team' })).toBeNull()
  })

  it('returns null for all valid types', () => {
    for (const t of VALID_ENTRY_TYPES) {
      expect(validateEntry({ entry_type: t, impact_level: 'org' })).toBeNull()
    }
  })

  it('returns null for all valid impact levels', () => {
    for (const l of VALID_IMPACT_LEVELS) {
      expect(validateEntry({ entry_type: 'win', impact_level: l })).toBeNull()
    }
  })

  it('returns error for invalid entry_type', () => {
    const err = validateEntry({ entry_type: 'unknown', impact_level: 'team' })
    expect(err).not.toBeNull()
    expect(err).toContain('"unknown"')
    expect(err).toContain('win, blocker, shoutout, learning, delivery')
  })

  it('returns error for invalid impact_level', () => {
    const err = validateEntry({ entry_type: 'win', impact_level: 'global' })
    expect(err).not.toBeNull()
    expect(err).toContain('"global"')
  })

  it('returns error for empty entry_type', () => {
    const err = validateEntry({ entry_type: '', impact_level: 'team' })
    expect(err).not.toBeNull()
  })
})

// ── SQLite entry operations ───────────────────────────────────────────────────

describe('entry SQLite operations', () => {
  let db: Database.Database

  beforeEach(() => {
    db = makeDb()
  })

  it('inserts a new entry and retrieves it', () => {
    const id  = 'test-id-1'
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO entries (id, content, entry_type, bucket, impact_level, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, 'Did a thing', 'win', 'execution', 'team', now)

    const row = db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as { content: string }
    expect(row.content).toBe('Did a thing')
  })

  it('soft-deletes an entry', () => {
    const id = 'del-id'
    db.prepare(`INSERT INTO entries (id, content, entry_type, bucket, impact_level, created_at) VALUES (?, 'x', 'win', 'execution', 'team', datetime('now'))`).run(id)
    db.prepare("UPDATE entries SET deleted_at = datetime('now') WHERE id = ?").run(id)

    const rows = db.prepare("SELECT * FROM entries WHERE deleted_at IS NULL").all()
    expect(rows.find((r: any) => r.id === id)).toBeUndefined()
  })

  it('list query excludes archived and deleted entries', () => {
    db.prepare(`INSERT INTO entries (id, content, entry_type, bucket, impact_level, created_at) VALUES ('a', 'active', 'win', 'execution', 'team', datetime('now'))`).run()
    db.prepare(`INSERT INTO entries (id, content, entry_type, bucket, impact_level, created_at, archived_at) VALUES ('b', 'archived', 'win', 'execution', 'team', datetime('now'), datetime('now'))`).run()
    db.prepare(`INSERT INTO entries (id, content, entry_type, bucket, impact_level, created_at, deleted_at) VALUES ('c', 'deleted', 'win', 'execution', 'team', datetime('now'), datetime('now'))`).run()

    const rows = db.prepare("SELECT * FROM entries WHERE deleted_at IS NULL AND archived_at IS NULL").all() as { id: string }[]
    expect(rows.length).toBe(1)
    expect(rows[0].id).toBe('a')
  })

  it('updates allowed columns only', () => {
    const id = 'upd-id'
    db.prepare(`INSERT INTO entries (id, content, entry_type, bucket, impact_level, created_at) VALUES (?, 'original', 'win', 'execution', 'team', datetime('now'))`).run(id)

    const allowed = ['content', 'entry_type', 'bucket', 'impact_level', 'shoutout_person']
    const payload: Record<string, unknown> = { content: 'updated', impact_level: 'org' }
    const updates = Object.keys(payload).filter(k => allowed.includes(k))
    const sql = `UPDATE entries SET ${updates.map(k => `${k} = ?`).join(', ')} WHERE id = ?`
    db.prepare(sql).run(...updates.map(k => payload[k]), id)

    const row = db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as { content: string; impact_level: string }
    expect(row.content).toBe('updated')
    expect(row.impact_level).toBe('org')
  })
})
