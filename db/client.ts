import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.')
  return db
}

export async function initDb(): Promise<void> {
  const userDataPath = app.getPath('userData')
  const dbPath       = path.join(userDataPath, 'seen.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)
  console.log(`[seen] Database ready at ${dbPath}`)
}

function runMigrations(database: Database.Database): void {
  // Create migration tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      run_at     TEXT NOT NULL
    )
  `)

  const migrationsDir = resolveMigrationsDir()
  if (!migrationsDir) {
    console.warn('[seen] No migrations directory found; skipping migrations.')
    return
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')

    const runMigration = database.transaction(() => {
      const alreadyRan = database
        .prepare('SELECT 1 FROM _migrations WHERE name = ? LIMIT 1')
        .get(file) as { 1: number } | undefined

      if (alreadyRan) return false

      database.exec(sql)
      database.prepare('INSERT INTO _migrations (name, run_at) VALUES (?, ?)').run(file, new Date().toISOString())
      return true
    })

    if (runMigration()) {
      console.log(`[seen] Migration run: ${file}`)
    }
  }
}

function resolveMigrationsDir(): string | null {
  const appPath = app.getAppPath()
  const candidates = [
    path.join(appPath, 'db/migrations'),
    path.join(__dirname, '../db/migrations'),
    path.join(__dirname, '../../db/migrations'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }

  return null
}
