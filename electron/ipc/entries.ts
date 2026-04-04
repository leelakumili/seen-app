import type { IpcMain } from 'electron'
import { getDb } from '../../db/client'
import { randomUUID } from 'crypto'

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

export function registerEntryHandlers(ipc: IpcMain) {
  const db = getDb()

  ipc.handle('entries:list', (_e, filters: { bucket?: string; limit?: number } = {}) => {
    let sql = `
      SELECT * FROM entries
      WHERE deleted_at IS NULL AND archived_at IS NULL
    `
    const params: unknown[] = []

    if (filters.bucket) {
      sql += ' AND bucket = ?'
      params.push(filters.bucket)
    }

    sql += ' ORDER BY created_at DESC'

    if (filters.limit) {
      sql += ' LIMIT ?'
      params.push(filters.limit)
    }

    return db.prepare(sql).all(...params)
  })

  ipc.handle('entries:create', (_e, payload: {
    content:          string
    entry_type:       string
    bucket:           string
    impact_level:     string
    shoutout_person?: string | null
  }) => {
    const validationError = validateEntry(payload)
    if (validationError) return { error: validationError }

    try {
      const id  = randomUUID()
      const now = new Date().toISOString()

      db.prepare(`
        INSERT INTO entries (id, content, entry_type, bucket, impact_level, shoutout_person, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, payload.content, payload.entry_type, payload.bucket, payload.impact_level, payload.shoutout_person ?? null, now)

      return db.prepare('SELECT * FROM entries WHERE id = ?').get(id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[seen] entries:create failed:', msg)
      return { error: 'Could not save entry. Please try again.' }
    }
  })

  ipc.handle('entries:update', (_e, id: string, payload: Partial<{
    content:          string
    entry_type:       string
    bucket:           string
    impact_level:     string
    shoutout_person:  string | null
  }>) => {
    if (payload.entry_type || payload.impact_level) {
      const validationError = validateEntry({
        entry_type:   payload.entry_type   ?? 'win',
        impact_level: payload.impact_level ?? 'team',
      })
      if (validationError) return { error: validationError }
    }

    const allowed = ['content', 'entry_type', 'bucket', 'impact_level', 'shoutout_person']
    const updates = Object.keys(payload).filter(k => allowed.includes(k))
    if (updates.length === 0) return null

    try {
      const sql = `UPDATE entries SET ${updates.map(k => `${k} = ?`).join(', ')} WHERE id = ?`
      db.prepare(sql).run(...updates.map(k => (payload as Record<string, unknown>)[k]), id)
      return db.prepare('SELECT * FROM entries WHERE id = ?').get(id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[seen] entries:update failed:', msg)
      return { error: 'Could not update entry. Please try again.' }
    }
  })

  ipc.handle('entries:delete', (_e, id: string) => {
    const now = new Date().toISOString()
    db.prepare('UPDATE entries SET deleted_at = ? WHERE id = ?').run(now, id)
    return { deleted: true }
  })
}
