import { type IpcMain, dialog, BrowserWindow } from 'electron'
import { writeFile } from 'fs/promises'

export function registerExportHandlers(ipc: IpcMain) {
  ipc.handle('file:save', async (e, params: { content: string; defaultName: string }) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const result = await dialog.showSaveDialog(win ?? BrowserWindow.getFocusedWindow()!, {
      defaultPath: params.defaultName,
      filters: [{ name: 'Text Files', extensions: ['txt'] }],
    })
    if (result.canceled || !result.filePath) return { saved: false }
    await writeFile(result.filePath, params.content, 'utf8')
    return { saved: true }
  })
}
