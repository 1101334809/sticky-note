/**
 * 文档转换 IPC Handler
 *
 * 注册 IPC 通道，桥接渲染进程与转换引擎
 * 通道前缀使用 docConvert: 避免与图片格式转换 convert: 冲突
 */
import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { ConvertEngine } from '../core/converter/ConvertEngine'
import { ConvertQueue } from '../core/converter/ConvertQueue'
import { detectLibreOffice } from '../core/converter/libreoffice'
import type { ConvertConfig } from '../core/converter/types'

// ====== 转换器导入 ======
import { WordToMdConverter } from '../core/converter/converters/WordToMd'
import { WordToPdfConverter } from '../core/converter/converters/WordToPdf'
import { WordToHtmlConverter } from '../core/converter/converters/WordToHtml'
import { PptToWordConverter } from '../core/converter/converters/PptToWord'
import { PptToPdfConverter } from '../core/converter/converters/PptToPdf'
import { PptToImageConverter } from '../core/converter/converters/PptToImage'
import { PdfToWordConverter } from '../core/converter/converters/PdfToWord'
import { PdfToMdConverter } from '../core/converter/converters/PdfToMd'
import { MdToHtmlConverter } from '../core/converter/converters/MdToHtml'
import { MdToWordConverter } from '../core/converter/converters/MdToWord'
import { HtmlToMdConverter } from '../core/converter/converters/HtmlToMd'

let engine: ConvertEngine | null = null
let queue: ConvertQueue | null = null

/**
 * 注册文档转换 IPC handlers
 */
export function registerDocConvertHandlers() {
  // 初始化引擎和队列
  engine = new ConvertEngine()
  queue = new ConvertQueue(engine)

  // 注册所有转换器（11 种方向）
  engine.registerAll([
    new WordToMdConverter(),
    new WordToPdfConverter(),
    new WordToHtmlConverter(),
    new PptToWordConverter(),
    new PptToPdfConverter(),
    new PptToImageConverter(),
    new PdfToWordConverter(),
    new PdfToMdConverter(),
    new MdToHtmlConverter(),
    new MdToWordConverter(),
    new HtmlToMdConverter(),
  ])

  // ====== IPC 通道（前缀 docConvert: ） ======

  /** 开始批量转换 */
  ipcMain.handle('docConvert:start', async (_event, data: { files: string[]; config: ConvertConfig }) => {
    if (!queue || !engine) return { success: false, error: '引擎未初始化' }

    console.log('[docConvert] 开始转换, 文件数:', data.files.length, '方向:', data.config.direction)

    try {
      const tasks = queue.addTasks(data.files, data.config)

      // 绑定事件推送到渲染进程
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        const pushEvent = (channel: string, eventData: any) => {
          if (!win.isDestroyed()) {
            win.webContents.send(channel, eventData)
          }
        }

        queue.removeAllListeners()
        queue.on('taskStart', (d) => pushEvent('docConvert:taskStart', d))
        queue.on('progress', (d) => pushEvent('docConvert:progress', d))
        queue.on('taskDone', (d) => pushEvent('docConvert:taskDone', d))
        queue.on('taskError', (d) => pushEvent('docConvert:taskError', d))
        queue.on('batchDone', (d) => pushEvent('docConvert:batchDone', d))
      }

      // 异步执行，不 await
      queue.start(data.config).catch((e) => {
        console.error('[docConvert] 批量转换异常:', e)
      })

      return { success: true, taskIds: tasks.map((t) => t.id) }
    } catch (e: any) {
      console.error('[docConvert] 启动失败:', e)
      return { success: false, error: e.message }
    }
  })

  /** 取消转换 */
  ipcMain.handle('docConvert:cancel', async () => {
    queue?.cancel()
    return { success: true }
  })

  /** 获取队列状态 */
  ipcMain.handle('docConvert:getStatus', async () => {
    return queue?.getStatus() ?? { running: false, queueLength: 0, tasks: [] }
  })

  /** 检测 LibreOffice */
  ipcMain.handle('docConvert:checkLibreOffice', async () => {
    return await detectLibreOffice()
  })

  /** 选择输出目录 */
  ipcMain.handle('docConvert:selectOutputDir', async () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return { success: false, error: '无窗口' }

    const result = await dialog.showOpenDialog(win, {
      title: '选择输出目录',
      properties: ['openDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true }
    }

    return { success: true, path: result.filePaths[0] }
  })

  /** 打开输出目录 */
  ipcMain.handle('docConvert:openOutputDir', async (_event, dirPath: string) => {
    try {
      await shell.openPath(dirPath)
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })



  console.log('[docConvert] IPC handlers 已注册')
}

/**
 * 清理文档转换资源
 */
export function cleanupDocConvertHandlers() {
  queue?.cancel()
  queue?.removeAllListeners()
  engine = null
  queue = null
}
