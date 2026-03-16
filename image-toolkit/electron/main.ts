import { app, BrowserWindow, ipcMain, dialog, nativeTheme, Menu } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { registerSvgHandlers } from './ipc/svg.handler'
import { registerCompressHandlers } from './ipc/compress.handler'
import { registerConvertHandlers } from './ipc/convert.handler'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  nativeTheme.themeSource = 'dark'
  Menu.setApplicationMenu(null)

  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'ImageKit - 图片工具库',
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    backgroundColor: '#0f1123',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// ====== 通用 IPC ======
ipcMain.handle('dialog:openFiles', async (_event, options: {
  filters?: Electron.FileFilter[]
  properties?: Electron.OpenDialogOptions['properties']
}) => {
  const result = await dialog.showOpenDialog({
    properties: options.properties || ['openFile', 'multiSelections'],
    filters: options.filters || [],
  })
  return result.filePaths
})

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return result.filePaths[0] || null
})

ipcMain.handle('dialog:saveDir', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
  return result.filePaths[0] || null
})

// 读取单个文本文件
ipcMain.handle('file:readText', async (_event, filePath: string) => {
  const fs = await import('node:fs')
  return fs.readFileSync(filePath, 'utf-8')
})

// ====== 注册模块化 IPC handlers ======
registerSvgHandlers()
registerCompressHandlers()
registerConvertHandlers()

// ====== App lifecycle ======
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()

  // ====== 快捷键 T-040 ======
  const { globalShortcut } = require('electron')

  // Ctrl+O 打开文件
  globalShortcut.register('CmdOrCtrl+O', () => {
    if (!win) return
    dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'],
    }).then(result => {
      if (result.filePaths.length > 0) {
        win?.webContents.send('shortcut:openFiles', result.filePaths)
      }
    })
  })

  // Ctrl+Shift+O 打开文件夹
  globalShortcut.register('CmdOrCtrl+Shift+O', () => {
    if (!win) return
    dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    }).then(result => {
      if (result.filePaths[0]) {
        win?.webContents.send('shortcut:openFolder', result.filePaths[0])
      }
    })
  })
})
