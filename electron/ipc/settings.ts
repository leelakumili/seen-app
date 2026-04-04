import type { IpcMain } from 'electron'
import { getDb } from '../../db/client'
import { rescheduleNotifications } from '../notifications'

const NOTIFICATION_KEYS = new Set(['notifications_enabled', 'notification_time'])

export function registerSettingsHandlers(ipc: IpcMain) {
  const db = getDb()

  ipc.handle('settings:get', (_e, key: string) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value ?? null
  })

  ipc.handle('settings:set', (_e, key: string, value: string) => {
    db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value)
    if (NOTIFICATION_KEYS.has(key)) rescheduleNotifications()
    return { key, value }
  })

  ipc.handle('settings:getAll', () => {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  })
}
