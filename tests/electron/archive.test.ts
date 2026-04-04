import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { runAutoArchive } from '../../electron/archive'

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

function insertEntry(db: Database.Database, id: string, daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  db.prepare(`
    INSERT INTO entries (id, content, entry_type, bucket, impact_level, created_at)
    VALUES (?, 'test', 'win', 'execution', 'team', ?)
  `).run(id, d.toISOString())
}

function countArchived(db: Database.Database) {
  return (db.prepare('SELECT COUNT(*) as c FROM entries WHERE archived_at IS NOT NULL').get() as { c: number }).c
}

describe('runAutoArchive', () => {
  let db: Database.Database

  beforeEach(() => {
    db = makeDb()
  })

  it('archives entries older than archive_days setting', () => {
    db.prepare("INSERT INTO settings VALUES ('archive_days', '30')").run()
    insertEntry(db, 'old', 45)
    insertEntry(db, 'new', 10)

    runAutoArchive(db)

    expect(countArchived(db)).toBe(1)
    const archived = db.prepare("SELECT * FROM entries WHERE archived_at IS NOT NULL").get() as { id: string }
    expect(archived.id).toBe('old')
  })

  it('defaults to 90 days when no setting is present', () => {
    insertEntry(db, 'old',   100)
    insertEntry(db, 'recent', 60)

    runAutoArchive(db)

    expect(countArchived(db)).toBe(1)
  })

  it('does not archive entries that are already archived', () => {
    db.prepare("INSERT INTO settings VALUES ('archive_days', '30')").run()
    insertEntry(db, 'old', 45)
    db.prepare("UPDATE entries SET archived_at = '2024-01-01' WHERE id = 'old'").run()

    runAutoArchive(db)

    // Still exactly 1, not re-stamped
    const row = db.prepare("SELECT archived_at FROM entries WHERE id = 'old'").get() as { archived_at: string }
    expect(row.archived_at).toBe('2024-01-01')
  })

  it('does not archive soft-deleted entries', () => {
    db.prepare("INSERT INTO settings VALUES ('archive_days', '30')").run()
    insertEntry(db, 'deleted', 45)
    db.prepare("UPDATE entries SET deleted_at = datetime('now') WHERE id = 'deleted'").run()

    runAutoArchive(db)

    expect(countArchived(db)).toBe(0)
  })

  it('does nothing when archive_days is 0', () => {
    db.prepare("INSERT INTO settings VALUES ('archive_days', '0')").run()
    insertEntry(db, 'old', 100)

    runAutoArchive(db)

    expect(countArchived(db)).toBe(0)
  })

  it('does nothing when archive_days is not a valid number', () => {
    db.prepare("INSERT INTO settings VALUES ('archive_days', 'notanumber')").run()
    insertEntry(db, 'old', 100)

    runAutoArchive(db)

    expect(countArchived(db)).toBe(0)
  })

  it('archives nothing when all entries are within the window', () => {
    db.prepare("INSERT INTO settings VALUES ('archive_days', '90')").run()
    insertEntry(db, 'e1', 10)
    insertEntry(db, 'e2', 30)
    insertEntry(db, 'e3', 60)

    runAutoArchive(db)

    expect(countArchived(db)).toBe(0)
  })

  it('archives multiple old entries in one call', () => {
    db.prepare("INSERT INTO settings VALUES ('archive_days', '30')").run()
    insertEntry(db, 'e1', 31)
    insertEntry(db, 'e2', 60)
    insertEntry(db, 'e3', 120)
    insertEntry(db, 'e4', 10)

    runAutoArchive(db)

    expect(countArchived(db)).toBe(3)
  })
})
