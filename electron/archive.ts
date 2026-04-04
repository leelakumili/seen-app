import type Database from 'better-sqlite3'

/**
 * Soft-archives entries older than `archive_days` (default 90).
 * Called once on app startup. Safe to call repeatedly — already-archived
 * entries are excluded by the WHERE clause.
 */
export function runAutoArchive(db: Database.Database): void {
  const row  = db.prepare('SELECT value FROM settings WHERE key = ?').get('archive_days') as { value: string } | undefined
  const days = parseInt(row?.value ?? '90', 10)
  if (isNaN(days) || days <= 0) return

  const now    = new Date().toISOString()
  const result = db.prepare(`
    UPDATE entries
    SET    archived_at = ?
    WHERE  deleted_at  IS NULL
      AND  archived_at IS NULL
      AND  created_at  <= datetime('now', '-' || ? || ' days')
  `).run(now, days)

  if (result.changes > 0) {
    console.log(`[seen] Auto-archived ${result.changes} entr${result.changes === 1 ? 'y' : 'ies'} older than ${days} days`)
  }
}
