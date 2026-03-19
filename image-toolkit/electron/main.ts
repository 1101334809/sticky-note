import { app, BrowserWindow, ipcMain, dialog, nativeTheme, Menu } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { registerSvgHandlers } from './ipc/svg.handler'
import { registerCompressHandlers } from './ipc/compress.handler'
import { registerConvertHandlers } from './ipc/convert.handler'
import { registerSystemHandlers } from './ipc/system.handler'
import { registerConfigHandlers } from './core/config'
import { registerClickerHandlers, registerClickerHotkeys, cleanupClickerHandlers } from './ipc/clicker.handler'
import { registerDocConvertHandlers, cleanupDocConvertHandlers } from './ipc/docConvert.handler'

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
  nativeTheme.themeSource = 'light'
  Menu.setApplicationMenu(null)

  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Universal Toolkit',
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    backgroundColor: '#ffffff',
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


// 递归列出文件夹中的图片文件
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tiff', '.tif', '.bmp', '.ico', '.svg']
ipcMain.handle('file:listImages', async (_event, folderPath: string) => {
  const fs = await import('node:fs')
  const results: string[] = []

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath)
      }
    }
  }

  walk(folderPath)
  return results
})

// 主题切换
ipcMain.handle('theme:toggle', async (_event, isDark: boolean) => {
  nativeTheme.themeSource = isDark ? 'dark' : 'light'
  if (win) {
    win.setBackgroundColor(isDark ? '#0f1123' : '#ffffff')
  }
})

// ====== 注册模块化 IPC handlers ======
registerSvgHandlers()
registerCompressHandlers()
registerConvertHandlers()
registerSystemHandlers()
registerConfigHandlers()
registerClickerHandlers()
registerDocConvertHandlers()

// ====== App lifecycle ======
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanupClickerHandlers()
    cleanupDocConvertHandlers()
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
  registerClickerHotkeys()

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
