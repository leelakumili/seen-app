import { Notification, app } from 'electron'
import type Database from 'better-sqlite3'

let scheduledTimeout: ReturnType<typeof setTimeout> | null = null
let dbRef: Database.Database | null = null

// ── DB helpers ──────────────────────────────────────────────────────────────

function getSetting(db: Database.Database, key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

function setSetting(db: Database.Database, key: string, value: string): void {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value)
}

function seedDefaults(db: Database.Database): void {
  const defaults: Record<string, string> = {
    notifications_enabled: 'true',
    notification_time:     '17:00',
  }
  for (const [key, value] of Object.entries(defaults)) {
    db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(key, value)
  }
}

// ── Entry checks ────────────────────────────────────────────────────────────

function hasLoggedToday(db: Database.Database): boolean {
  const row = db.prepare(`
    SELECT COUNT(*) as c FROM entries
    WHERE deleted_at IS NULL
      AND date(created_at, 'localtime') = date('now', 'localtime')
  `).get() as { c: number }
  return row.c > 0
}

// ── Scheduling ──────────────────────────────────────────────────────────────

/**
 * Returns ms until the next occurrence of timeStr (HH:mm).
 * If the time has already passed today, targets tomorrow at that time.
 */
function msUntilTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  const now    = new Date()
  const target = new Date()
  target.setHours(h ?? 17, m ?? 0, 0, 0)

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1)
  }

  return target.getTime() - now.getTime()
}

function fireIfNeeded(db: Database.Database): void {
  if (!Notification.isSupported()) return

  const enabled = getSetting(db, 'notifications_enabled')
  if (enabled !== 'true') return

  const today     = new Date().toISOString().split('T')[0]
  const lastFired = getSetting(db, 'last_notified_date')
  if (lastFired === today) return

  if (hasLoggedToday(db)) {
    setSetting(db, 'last_notified_date', today)
    return
  }

  try {
    new Notification({
      title: 'Time to log your wins',
      body:  'What did you ship, learn, or unblock today? Takes 30 seconds.',
    }).show()
  } catch (err) {
    console.warn('[seen] Notification failed:', err)
  }

  setSetting(db, 'last_notified_date', today)
}

function scheduleNext(db: Database.Database): void {
  if (scheduledTimeout) {
    clearTimeout(scheduledTimeout)
    scheduledTimeout = null
  }

  const enabled = getSetting(db, 'notifications_enabled')
  if (enabled !== 'true') return

  const notificationTime = getSetting(db, 'notification_time') ?? '17:00'
  const delay            = msUntilTime(notificationTime)

  console.log(`[seen] Next notification scheduled in ${Math.round(delay / 60_000)} min`)

  scheduledTimeout = setTimeout(() => {
    fireIfNeeded(db)
    scheduleNext(db)
  }, delay)
}

// ── Public API ──────────────────────────────────────────────────────────────

export function initNotifications(db: Database.Database): void {
  dbRef = db
  seedDefaults(db)
  scheduleNext(db)
  app.on('quit', () => {
    if (scheduledTimeout) clearTimeout(scheduledTimeout)
  })
}

/**
 * Call this after saving notification settings so the schedule
 * immediately reflects the new time — no restart required.
 */
export function rescheduleNotifications(): void {
  if (dbRef) scheduleNext(dbRef)
}
