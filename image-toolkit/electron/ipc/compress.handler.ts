import { ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

/**
 * 图片压缩 IPC Handlers
 * - compress:start    开始批量压缩
 */

export function registerCompressHandlers() {
  ipcMain.handle('compress:start', async (event, options: {
    files: string[]
    mode: 'lossy' | 'lossless' | 'smart'
    quality: number
    outputDir?: string
  }) => {
    const results: any[] = []

    for (let i = 0; i < options.files.length; i++) {
      const filePath = options.files[i]
      const fileName = path.basename(filePath)
      const ext = path.extname(filePath).toLowerCase()

      try {
        const originalBuffer = fs.readFileSync(filePath)
        const originalSize = originalBuffer.length
        let pipeline = sharp(originalBuffer)

        // 根据模式和格式选择压缩参数
        const quality = options.mode === 'lossless' ? 100 : options.quality

        if (['.jpg', '.jpeg'].includes(ext)) {
          pipeline = pipeline.jpeg({
            quality,
            mozjpeg: options.mode !== 'lossless',
          })
        } else if (ext === '.png') {
          pipeline = pipeline.png({
            compressionLevel: options.mode === 'lossless' ? 9 : 6,
            quality: options.mode === 'lossless' ? 100 : quality,
          })
        } else if (ext === '.webp') {
          pipeline = pipeline.webp({
            quality,
            lossless: options.mode === 'lossless',
          })
        } else if (ext === '.avif') {
          pipeline = pipeline.avif({
            quality,
            lossless: options.mode === 'lossless',
          })
        } else if (['.tiff', '.tif'].includes(ext)) {
          pipeline = pipeline.tiff({
            quality,
            compression: 'lzw',
          })
        } else if (ext === '.gif') {
          pipeline = pipeline.gif()
        }

        const compressedBuffer = await pipeline.toBuffer()
        const compressedSize = compressedBuffer.length
        const savedPercent = Math.round((1 - compressedSize / originalSize) * 100)

        // 保存压缩后的文件
        const outputDir = options.outputDir || path.dirname(filePath)
        const outputName = options.outputDir
          ? fileName
          : `${path.basename(fileName, ext)}_compressed${ext}`
        const outputPath = path.join(outputDir, outputName)
        fs.writeFileSync(outputPath, compressedBuffer)

        const result = {
          file: filePath,
          fileName,
          originalSize,
          compressedSize,
          savedPercent,
          outputPath,
          status: 'success' as const,
        }
        results.push(result)

        // 逐文件通知渲染进程
        event.sender.send('compress:progress', { index: i, ...result })
      } catch (e: any) {
        const result = {
          file: filePath,
          fileName,
          status: 'error' as const,
          error: e.message,
        }
        results.push(result)
        event.sender.send('compress:progress', { index: i, ...result })
      }
    }

    return results
  })

  // 读取文件信息
  ipcMain.handle('file:getInfo', async (_event, filePaths: string[]) => {
    return filePaths.map(p => {
      try {
        const stats = fs.statSync(p)
        const name = path.basename(p)
        const ext = path.extname(p).toLowerCase().slice(1).toUpperCase()
        return {
          path: p,
          name,
          size: stats.size,
          type: ext,
          exists: true,
          isDirectory: stats.isDirectory(),
        }
      } catch {
        return { path: p, name: path.basename(p), size: 0, type: '', exists: false, isDirectory: false }
      }
    })
  })
}
