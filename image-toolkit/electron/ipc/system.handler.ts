/**
 * 系统操作 IPC Handlers
 * - system:openPath    使用系统文件管理器打开目录/文件
 */
import { ipcMain, shell } from 'electron'

export function registerSystemHandlers() {
  // 使用系统文件管理器打开指定路径
  ipcMain.handle('system:openPath', async (_event, dirPath: string) => {
    try {
      await shell.openPath(dirPath)
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  // 在系统文件管理器中显示文件（选中该文件）
  ipcMain.handle('system:showItemInFolder', async (_event, filePath: string) => {
    try {
      shell.showItemInFolder(filePath)
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })
}
