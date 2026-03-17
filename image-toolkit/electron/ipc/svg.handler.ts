import { ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

/**
 * SVG IPC Handlers
 * - svg:readFolder    读取文件夹中的 SVG 文件
 * - svg:changeColor   cheerio 深度改色
 * - svg:saveFiles     保存修改后的 SVG
 */

export function registerSvgHandlers() {
  // 读取文件夹所有 SVG
  ipcMain.handle('svg:readFolder', async (_event, folderPath: string) => {
    const files = fs.readdirSync(folderPath)
    return files
      .filter(f => f.toLowerCase().endsWith('.svg'))
      .map(f => {
        const fullPath = path.join(folderPath, f)
        const stats = fs.statSync(fullPath)
        const content = fs.readFileSync(fullPath, 'utf-8')
        return { name: f, path: fullPath, size: stats.size, content }
      })
  })

  // 深度 SVG 颜色修改（正则方式，无需 cheerio 依赖）
  ipcMain.handle('svg:changeColor', async (_event, svgContent: string, color: string) => {
    // 替换 fill 属性（保留 fill="none"）
    let result = svgContent.replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`)
    // 替换 stroke 属性（保留 stroke="none"）
    result = result.replace(/stroke="(?!none)[^"]*"/g, `stroke="${color}"`)
    // 替换内联 style 中的 fill 和 stroke
    result = result.replace(/fill:\s*(?!none)[^;}"]+/g, `fill: ${color}`)
    result = result.replace(/stroke:\s*(?!none)[^;}"]+/g, `stroke: ${color}`)
    return result
  })

  // 批量保存 SVG 文件
  ipcMain.handle('svg:saveFiles', async (_event, files: Array<{ path: string; content: string }>) => {
    let saved = 0
    for (const file of files) {
      try {
        fs.writeFileSync(file.path, file.content, 'utf-8')
        saved++
      } catch (e) {
        console.error(`Failed to save ${file.path}:`, e)
      }
    }
    return { saved, total: files.length }
  })

  // SVG → PNG 导出（多倍率 + 自定义像素尺寸）
  ipcMain.handle('svg:exportPng', async (_event, options: {
    svgContent: string
    outputDir: string
    fileName: string
    mode: 'scale' | 'custom'
    scales?: number[]
    customWidth?: number
    customHeight?: number
  }) => {
    try {
      const results: string[] = []

      if (options.mode === 'scale' && options.scales) {
        // 倍率模式
        for (const scale of options.scales) {
          const svgBuffer = Buffer.from(options.svgContent)
          const outputPath = path.join(
            options.outputDir,
            `${options.fileName}@${scale}x.png`
          )

          await sharp(svgBuffer, { density: 72 * scale })
            .png()
            .toFile(outputPath)

          results.push(outputPath)
        }
      } else if (options.mode === 'custom' && options.customWidth && options.customHeight) {
        // 自定义像素尺寸模式
        const svgBuffer = Buffer.from(options.svgContent)
        const outputPath = path.join(
          options.outputDir,
          `${options.fileName}_${options.customWidth}x${options.customHeight}.png`
        )

        await sharp(svgBuffer)
          .resize(options.customWidth, options.customHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toFile(outputPath)

        results.push(outputPath)
      }

      return { success: true, files: results }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  // SVG 批量打包下载（简易 ZIP，使用目录打包）
  ipcMain.handle('svg:downloadZip', async (_event, options: {
    files: Array<{ name: string; content: string }>
    outputDir: string
    zipName: string
  }) => {
    try {
      // 将所有 SVG 内容写入临时目录，然后用 zlib 打包
      const outputPath = path.join(options.outputDir, options.zipName)
      const { execSync } = await import('node:child_process')

      // 创建临时目录
      const tmpDir = path.join(options.outputDir, '.svg-bundle-tmp')
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }

      // 写入文件
      for (const file of options.files) {
        fs.writeFileSync(path.join(tmpDir, file.name), file.content, 'utf-8')
      }

      // 使用 PowerShell 压缩为 ZIP (Windows)
      try {
        execSync(`powershell -Command "Compress-Archive -Path '${tmpDir}\\*' -DestinationPath '${outputPath}' -Force"`, { timeout: 30000 })
      } catch {
        // 备用方案：直接复制目录
        const bundleDir = path.join(options.outputDir, 'svg-bundle')
        if (!fs.existsSync(bundleDir)) {
          fs.mkdirSync(bundleDir, { recursive: true })
        }
        for (const file of options.files) {
          fs.writeFileSync(path.join(bundleDir, file.name), file.content, 'utf-8')
        }
        // 清理临时目录
        fs.rmSync(tmpDir, { recursive: true, force: true })
        return { success: true, outputPath: bundleDir }
      }

      // 清理临时目录
      fs.rmSync(tmpDir, { recursive: true, force: true })
      return { success: true, outputPath }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })
}
