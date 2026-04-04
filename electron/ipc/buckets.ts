import type { IpcMain } from 'electron'
import { getDb } from '../../db/client'
import { randomUUID } from 'crypto'

export function registerBucketHandlers(ipc: IpcMain) {
  const db = getDb()

  ipc.handle('buckets:list', () => {
    return db.prepare('SELECT * FROM buckets ORDER BY sort_order ASC, name ASC').all()
  })

  ipc.handle('buckets:create', (_e, payload: { name: string; promo_criteria_hint?: string }) => {
    const id       = randomUUID()
    const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM buckets').get() as { m: number | null }).m ?? 0
    db.prepare(`
      INSERT INTO buckets (id, name, promo_criteria_hint, sort_order)
      VALUES (?, ?, ?, ?)
    `).run(id, payload.name.trim(), payload.promo_criteria_hint?.trim() ?? '', maxOrder + 1)
    return db.prepare('SELECT * FROM buckets WHERE id = ?').get(id)
  })

  ipc.handle('buckets:update', (_e, id: string, payload: { name?: string; promo_criteria_hint?: string; sort_order?: number }) => {
    const allowed = ['name', 'promo_criteria_hint', 'sort_order']
    const updates = Object.keys(payload).filter(k => allowed.includes(k))
    if (updates.length === 0) return null
    const sql = `UPDATE buckets SET ${updates.map(k => `${k} = ?`).join(', ')} WHERE id = ?`
    db.prepare(sql).run(...updates.map(k => (payload as Record<string, unknown>)[k]), id)
    return db.prepare('SELECT * FROM buckets WHERE id = ?').get(id)
  })

  ipc.handle('buckets:delete', (_e, id: string) => {
    const inUse = db.prepare(
      `SELECT COUNT(*) as c FROM entries WHERE bucket = ? AND deleted_at IS NULL`
    ).get(id) as { c: number }

    if (inUse.c > 0) {
      return { deleted: false, reason: `${inUse.c} active entries use this bucket. Reassign them first.` }
    }

    db.prepare('DELETE FROM buckets WHERE id = ?').run(id)
    return { deleted: true }
  })
}
