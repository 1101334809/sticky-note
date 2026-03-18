/**
 * 连点器 IPC Handlers
 *
 * 管理连点器的启停、配置、全局热键（F6 / Esc）
 *
 * 注意：
 *   - registerClickerHandlers() 注册 IPC 通道，可在 app ready 前调用
 *   - registerClickerHotkeys() 注册全局热键，必须在 app.whenReady() 后调用
 */
import { ipcMain, globalShortcut, BrowserWindow } from 'electron'
import { ClickerEngine } from '../core/clicker/ClickerEngine'
import type { ClickerConfig } from '../core/clicker/types'

let clicker: ClickerEngine | null = null

/** 获取主窗口实例 */
function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows.length > 0 ? windows[0] : null
}

/** 向渲染进程推送状态 */
function pushState(channel: string, data: any): void {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data)
  }
}

/**
 * 注册连点器 IPC 通道（可在 app ready 前调用）
 */
export function registerClickerHandlers() {
  clicker = new ClickerEngine()

  // ====== 引擎事件 → IPC 推送 ======
  clicker.on('state-change', (data) => {
    pushState('clicker:state', data)
  })

  clicker.on('click', (data) => {
    pushState('clicker:click', data)
  })

  clicker.on('completed', (data) => {
    pushState('clicker:completed', data)
  })

  clicker.on('stopped', (data) => {
    pushState('clicker:stopped', data)
  })

  // ====== IPC 通道 ======

  /** 启动连点 */
  ipcMain.handle('clicker:start', async (_event, config: ClickerConfig) => {
    console.log('[clicker-handler] 收到启动请求, config:', config)
    if (!clicker) return { success: false, error: '引擎未初始化' }
    if (clicker.getState() !== 'idle') {
      return { success: false, error: '连点器正在运行' }
    }
    try {
      clicker.start(config)
      console.log('[clicker-handler] 引擎已启动')
      return { success: true }
    } catch (e: any) {
      console.error('[clicker-handler] 启动失败:', e)
      return { success: false, error: e.message }
    }
  })

  /** 停止连点 */
  ipcMain.handle('clicker:stop', async () => {
    if (!clicker) return { success: false }
    clicker.stop()
    return { success: true }
  })

  /** 获取当前状态 */
  ipcMain.handle('clicker:getStatus', async () => {
    if (!clicker) return { state: 'idle', clickCount: 0 }
    return {
      state: clicker.getState(),
      clickCount: clicker.getClickCount(),
    }
  })
}

/**
 * 注册连点器全局热键（必须在 app.whenReady() 之后调用）
 */
export function registerClickerHotkeys() {
  /** F6 切换连点 */
  globalShortcut.register('F6', () => {
    if (!clicker) return
    if (clicker.getState() === 'idle') {
      pushState('clicker:hotkeyToggle', { action: 'start' })
    } else {
      clicker.stop()
    }
  })

  /** Esc 紧急停止 */
  globalShortcut.register('Escape', () => {
    if (!clicker) return
    if (clicker.getState() !== 'idle') {
      clicker.stop()
    }
  })
}

/** 清理（应用退出时调用） */
export function cleanupClickerHandlers() {
  if (clicker) {
    clicker.destroy()
    clicker = null
  }
  try {
    globalShortcut.unregister('F6')
    globalShortcut.unregister('Escape')
  } catch { /* app may not be ready */ }
}
