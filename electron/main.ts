import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { initDb, getDb } from '../db/client'
import { registerEntryHandlers } from './ipc/entries'
import { registerSettingsHandlers } from './ipc/settings'
import { registerAiHandlers } from './ipc/ai'
import { registerGenerationHandlers } from './ipc/generations'
import { registerBucketHandlers } from './ipc/buckets'
import { registerExportHandlers } from './ipc/export'
import { initNotifications } from './notifications'
import { runAutoArchive } from './archive'

const isDev = !app.isPackaged
const shouldOpenDevTools = process.env.ELECTRON_OPEN_DEVTOOLS === 'true'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f5f0e6',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,
    },
  })

  // Open external links in browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    if (shouldOpenDevTools) {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(async () => {
  try {
    // Initialize SQLite and run migrations
    await initDb()

    // Register IPC handlers
    registerEntryHandlers(ipcMain)
    registerSettingsHandlers(ipcMain)
    registerAiHandlers(ipcMain)
    registerGenerationHandlers(ipcMain)
    registerBucketHandlers(ipcMain)
    registerExportHandlers(ipcMain)
    initNotifications(getDb())
    runAutoArchive(getDb())

    createWindow()
  } catch (error) {
    console.error('[seen] Failed to initialize app:', error)
    app.quit()
    return
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
