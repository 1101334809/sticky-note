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

  // SVG → PNG 导出（多倍率）
  ipcMain.handle('svg:exportPng', async (_event, options: {
    svgContent: string
    outputDir: string
    fileName: string
    scales: number[]
  }) => {
    // 使用 Sharp 进行 SVG → PNG 转换
    try {
      const results: string[] = []

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

      return { success: true, files: results }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })
}
