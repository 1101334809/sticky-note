import { ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

/**
 * 格式转换 IPC Handlers
 * - convert:start    开始批量转换
 */

export function registerConvertHandlers() {
  ipcMain.handle('convert:start', async (event, options: {
    files: string[]
    targetFormat: string
    size?: number
    outputDir?: string
  }) => {
    const results: any[] = []

    for (let i = 0; i < options.files.length; i++) {
      const filePath = options.files[i]
      const fileName = path.basename(filePath, path.extname(filePath))

      try {
        let pipeline = sharp(fs.readFileSync(filePath))

        // 预设尺寸 resize
        if (options.size && options.size > 0) {
          pipeline = pipeline.resize(options.size, options.size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
        }

        // 格式转换
        const fmt = options.targetFormat.toLowerCase()
        const newExt = fmt === 'jpeg' ? 'jpg' : fmt
        let outputBuffer: Buffer

        switch (fmt) {
          case 'png':
            outputBuffer = await pipeline.png().toBuffer()
            break
          case 'jpeg':
          case 'jpg':
            outputBuffer = await pipeline.flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toBuffer()
            break
          case 'webp':
            outputBuffer = await pipeline.webp({ quality: 85 }).toBuffer()
            break
          case 'avif':
            outputBuffer = await pipeline.avif({ quality: 80 }).toBuffer()
            break
          case 'tiff':
            outputBuffer = await pipeline.tiff().toBuffer()
            break
          case 'bmp':
            // Sharp 不直接支持 BMP 输出，先转 PNG
            outputBuffer = await pipeline.png().toBuffer()
            break
          case 'ico':
            // ICO 需要特殊处理，先转 PNG 再用 png-to-ico
            outputBuffer = await pipeline.resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
            break
          default:
            outputBuffer = await pipeline.toBuffer()
        }

        // 保存
        const outputDir = options.outputDir || path.dirname(filePath)
        const outputPath = path.join(outputDir, `${fileName}.${newExt}`)
        fs.writeFileSync(outputPath, outputBuffer)

        const result = {
          file: filePath,
          fileName: `${fileName}.${newExt}`,
          originalSize: fs.statSync(filePath).size,
          convertedSize: outputBuffer.length,
          outputPath,
          status: 'success' as const,
        }
        results.push(result)
        event.sender.send('convert:progress', { index: i, ...result })
      } catch (e: any) {
        const result = {
          file: filePath,
          fileName: path.basename(filePath),
          status: 'error' as const,
          error: e.message,
        }
        results.push(result)
        event.sender.send('convert:progress', { index: i, ...result })
      }
    }

    return results
  })
}
