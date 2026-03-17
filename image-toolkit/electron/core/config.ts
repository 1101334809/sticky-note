/**
 * 配置管理 — 基于 electron-store 的持久化存储
 *
 * 提供 IPC 通道供渲染进程读写配置
 */
import { ipcMain } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'

// 简易 JSON 文件存储（避免 electron-store 依赖兼容性问题）
// 后续可替换为 electron-store
const CONFIG_FILE = path.join(app.getPath('userData'), 'toolkit-config.json')

function readConfig(): Record<string, any> {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
    }
  } catch (e) {
    console.error('Failed to read config:', e)
  }
  return {}
}

function writeConfig(config: Record<string, any>) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to write config:', e)
  }
}

export function registerConfigHandlers() {
  ipcMain.handle('config:get', async (_event, key: string) => {
    const config = readConfig()
    return config[key] ?? null
  })

  ipcMain.handle('config:set', async (_event, key: string, value: any) => {
    const config = readConfig()
    config[key] = value
    writeConfig(config)
    return true
  })

  ipcMain.handle('config:getAll', async () => {
    return readConfig()
  })
}
