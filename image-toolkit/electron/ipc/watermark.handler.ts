/**
 * 图片水印 IPC Handlers
 * T-009, T-024, T-025
 */

import { ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { WatermarkEngine } from '../core/watermark/WatermarkEngine'
import type { WatermarkRequest, FileSizeCheckResult } from '../core/watermark/types'

const engine = new WatermarkEngine()

/**
 * 获取不重复的输出路径（T-025）
 */
function getUniqueOutputPath(basePath: string): string {
  if (!fs.existsSync(basePath)) return basePath

  const dir = path.dirname(basePath)
  const ext = path.extname(basePath)
  const name = path.basename(basePath, ext)
  let counter = 1

  while (fs.existsSync(path.join(dir, `${name}_${counter}${ext}`))) {
    counter++
  }

  return path.join(dir, `${name}_${counter}${ext}`)
}

export function registerWatermarkHandlers() {
  // ====== 批量添加水印 ======
  ipcMain.handle('watermark:start', async (event, request: WatermarkRequest) => {
    const results: any[] = []
    const { files, watermarkOptions, outputDir } = request

    for (let i = 0; i < files.length; i++) {
      const filePath = files[i]
      const ext = path.extname(filePath)
      const baseName = path.basename(filePath, ext)
      const outDir = outputDir || path.dirname(filePath)
      const suffix = watermarkOptions.outputSuffix || '_watermarked'
      const rawOutputPath = path.join(outDir, `${baseName}${suffix}${ext}`)
      const outputPath = getUniqueOutputPath(rawOutputPath)

      // 确保输出目录存在
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true })
      }

      try {
        const result = await engine.process(filePath, outputPath, watermarkOptions)
        results.push(result)
        event.sender.send('watermark:progress', {
          index: i,
          status: 'success',
          outputPath: result.outputPath,
          outputSize: result.outputSize,
        })
      } catch (e: any) {
        const errorResult = {
          status: 'error' as const,
          inputPath: filePath,
          error: e.message,
        }
        results.push(errorResult)
        event.sender.send('watermark:progress', {
          index: i,
          status: 'error',
          error: e.message,
        })
      }
    }

    return results
  })

  // ====== 检查文件尺寸（T-024）======
  ipcMain.handle('watermark:checkFileSize', async (_event, filePaths: string[]): Promise<FileSizeCheckResult[]> => {
    return Promise.all(filePaths.map(async (p) => {
      try {
        const stats = fs.statSync(p)
        const meta = await sharp(p).metadata()
        return {
          path: p,
          fileSize: stats.size,
          width: meta.width || 0,
          height: meta.height || 0,
          isLarge: stats.size > 50 * 1024 * 1024 || (meta.width || 0) > 8000 || (meta.height || 0) > 8000,
        }
      } catch {
        return {
          path: p,
          fileSize: 0,
          width: 0,
          height: 0,
          isLarge: false,
        }
      }
    }))
  })
}
