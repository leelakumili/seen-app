import type { IpcMain } from 'electron'
import { getDb } from '../../db/client'

export function registerGenerationHandlers(ipc: IpcMain) {
  const db = getDb()

  ipc.handle('generations:get', (_e, params: {
    type:     'brag_doc' | 'quarterly' | 'brag_month'
    quarter?: string
    year?:    number
    month?:   number
  }) => {
    if (params.type === 'brag_month') {
      return db.prepare(`
        SELECT * FROM generations
        WHERE  type = 'brag_month' AND year = ? AND month = ?
        ORDER  BY created_at DESC
        LIMIT  1
      `).get(params.year, params.month) ?? null
    }

    return db.prepare(`
      SELECT * FROM generations
      WHERE  type = ? AND quarter = ? AND year = ?
      ORDER  BY created_at DESC
      LIMIT  1
    `).get(params.type, params.quarter, params.year) ?? null
  })

  ipc.handle('generations:save', (_e, id: string, output: string) => {
    db.prepare('UPDATE generations SET output = ? WHERE id = ?').run(output, id)
    return { saved: true }
  })
}
