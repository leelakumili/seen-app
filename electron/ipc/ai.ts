import { type IpcMain, BrowserWindow } from 'electron'
import { getDb } from '../../db/client'
import { getProvider } from '../../ai/provider'
import {
  buildBragDocPrompt,
  buildBragMonthPrompt,
  buildQuarterlyPrompt,
  buildSuggestPrompt,
  buildAskSystemPrompt,
  buildCorrectPrompt,
} from '../../ai/prompts'
import type { ChatMessage, AskResponseStyle } from '../../ai/prompts'
import { randomUUID, createHash } from 'crypto'

const QUARTER_RANGE: Record<string, [number, number]> = {
  Q1: [1, 3], Q2: [4, 6], Q3: [7, 9], Q4: [10, 12],
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function hashEntries(entries: unknown[]): string {
  const sorted  = [...entries].sort((a: any, b: any) => a.id.localeCompare(b.id))
  const payload = sorted.map((e: any) => `${e.id}|${e.content}|${e.bucket}|${e.impact_level}`).join('\n')
  return createHash('sha256').update(payload).digest('hex')
}

export function registerAiHandlers(ipc: IpcMain) {
  const db = getDb()

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getUserContext() {
    const rows = db.prepare(
      `SELECT key, value FROM settings WHERE key IN ('user_name', 'user_role', 'manager_name', 'target_role')`
    ).all() as { key: string; value: string }[]
    const s = Object.fromEntries(rows.map(r => [r.key, r.value]))
    // Priority: current role → target role → undefined (prompts supply final fallback)
    const role = s.user_role || s.target_role || undefined
    return { name: s.user_name, role, manager: s.manager_name }
  }

  function getBucketNames(): Record<string, string> {
    const rows = db.prepare('SELECT id, name FROM buckets ORDER BY sort_order').all() as { id: string; name: string }[]
    return Object.fromEntries(rows.map(r => [r.id, r.name]))
  }

  function stream(win: BrowserWindow, msg: string) {
    win.webContents.send('ai:stream-chunk', msg)
  }

  function entriesForQuarter(year: number, quarter: string) {
    const [start, end] = QUARTER_RANGE[quarter] ?? [1, 3]
    return db.prepare(`
      SELECT * FROM entries
      WHERE deleted_at IS NULL
        AND strftime('%Y', created_at) = ?
        AND cast(strftime('%m', created_at) as integer) BETWEEN ? AND ?
      ORDER BY created_at ASC
    `).all(String(year), start, end)
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  ipc.handle('ai:suggestBucket', async (_e, content: string) => {
    const provider = getProvider(db)
    const result   = await provider.complete(buildSuggestPrompt(content), { maxTokens: 80 })
    try {
      const parsed = JSON.parse(result?.trim() ?? '{}')
      return {
        bucket:       typeof parsed.bucket       === 'string' ? parsed.bucket       : '',
        entry_type:   typeof parsed.entry_type   === 'string' ? parsed.entry_type   : '',
        impact_level: typeof parsed.impact_level === 'string' ? parsed.impact_level : '',
      }
    } catch {
      return { bucket: '', entry_type: '', impact_level: '' }
    }
  })

  ipc.handle('ai:generateBragMonth', async (e, params: { quarter: string; year: number; month: number }) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return

    const monthLabel = MONTH_NAMES[params.month - 1] ?? String(params.month)
    const entries    = db.prepare(`
      SELECT * FROM entries
      WHERE deleted_at IS NULL
        AND strftime('%Y', created_at) = ?
        AND cast(strftime('%m', created_at) as integer) = ?
      ORDER BY created_at ASC
    `).all(String(params.year), params.month)

    if (entries.length === 0) {
      stream(win, `No entries found for ${monthLabel} ${params.year}.`)
      return
    }

    const currentHash = hashEntries(entries)
    const cached = db.prepare(`
      SELECT id, content_hash, output FROM generations
      WHERE type = 'brag_month' AND year = ? AND month = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(params.year, params.month) as { id: string; content_hash: string; output: string } | undefined

    if (cached?.content_hash === currentHash) {
      stream(win, cached.output)
      return
    }

    const provider  = getProvider(db)
    const prompt    = buildBragMonthPrompt(entries as any[], monthLabel, params.year, getUserContext(), getBucketNames())
    let   fullText  = ''

    await provider.stream(prompt, chunk => { fullText += chunk; stream(win, chunk) })

    const now = new Date().toISOString()
    if (cached) {
      db.prepare(`UPDATE generations SET output = ?, content_hash = ?, created_at = ? WHERE id = ?`)
        .run(fullText, currentHash, now, cached.id)
    } else {
      db.prepare(`INSERT INTO generations (id, type, year, month, content_hash, output, created_at) VALUES (?, 'brag_month', ?, ?, ?, ?, ?)`)
        .run(randomUUID(), params.year, params.month, currentHash, fullText, now)
    }
  })

  ipc.handle('ai:generateBragDoc', async (e, params: { quarter: string; year: number }) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return

    const entries = entriesForQuarter(params.year, params.quarter)
    if (entries.length === 0) {
      const msg = `No entries found for ${params.quarter} ${params.year}.\n\nQ1 = Jan–Mar · Q2 = Apr–Jun · Q3 = Jul–Sep · Q4 = Oct–Dec`
      stream(win, msg)
      return { id: '', output: msg }
    }

    const provider = getProvider(db)
    const prompt   = buildBragDocPrompt(entries as any[], params.quarter, params.year, getUserContext(), getBucketNames())
    let   fullText = ''

    await provider.stream(prompt, chunk => { fullText += chunk; stream(win, chunk) })

    const existing = db.prepare(
      `SELECT id FROM generations WHERE type = 'brag_doc' AND quarter = ? AND year = ?`
    ).get(params.quarter, params.year) as { id: string } | undefined

    const id  = existing?.id ?? randomUUID()
    const now = new Date().toISOString()
    if (existing) {
      db.prepare(`UPDATE generations SET output = ?, created_at = ? WHERE id = ?`).run(fullText, now, id)
    } else {
      db.prepare(`INSERT INTO generations (id, type, quarter, year, output, created_at) VALUES (?, 'brag_doc', ?, ?, ?, ?)`)
        .run(id, params.quarter, params.year, fullText, now)
    }
    return { id, output: fullText }
  })

  ipc.handle('ai:generateQuarterly', async (e, params: { quarter: string; year: number }) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return

    const entries = entriesForQuarter(params.year, params.quarter)
    if (entries.length === 0) {
      const msg = `No entries found for ${params.quarter} ${params.year}.\n\nQ1 = Jan–Mar · Q2 = Apr–Jun · Q3 = Jul–Sep · Q4 = Oct–Dec`
      stream(win, msg)
      return { id: '', output: msg }
    }

    const provider = getProvider(db)
    const prompt   = buildQuarterlyPrompt(entries as any[], params.quarter, params.year, getUserContext())
    let   fullText = ''

    await provider.stream(prompt, chunk => { fullText += chunk; stream(win, chunk) })

    const existing = db.prepare(
      `SELECT id FROM generations WHERE type = 'quarterly' AND quarter = ? AND year = ?`
    ).get(params.quarter, params.year) as { id: string } | undefined

    const id  = existing?.id ?? randomUUID()
    const now = new Date().toISOString()
    if (existing) {
      db.prepare(`UPDATE generations SET output = ?, created_at = ? WHERE id = ?`).run(fullText, now, id)
    } else {
      db.prepare(`INSERT INTO generations (id, type, quarter, year, output, created_at) VALUES (?, 'quarterly', ?, ?, ?, ?)`)
        .run(id, params.quarter, params.year, fullText, now)
    }
    return { id, output: fullText }
  })

  ipc.handle('ai:correctSpelling', async (_e, content: string) => {
    const provider = getProvider(db)
    return (await provider.complete(buildCorrectPrompt(content), { maxTokens: 500 })).trim()
  })

  ipc.handle('ai:ask', async (e, params: { messages: ChatMessage[]; style?: AskResponseStyle }) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return

    const entries  = db.prepare(`SELECT * FROM entries WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 200`).all()
    const provider = getProvider(db)

    await provider.streamChat(buildAskSystemPrompt(entries, params.style ?? 'normal', getUserContext()), params.messages, chunk => stream(win, chunk))
  })
}
