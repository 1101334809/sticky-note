/**
 * Word → HTML 转换器
 *
 * 使用 mammoth 直接输出 HTML
 */
import { readFile, writeFile } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import type { IConverter, ConvertInput, ConvertOutput } from './IConverter'
import type { ConvertDirection } from '../types'

const require = createRequire(import.meta.url)
const mammoth = require('mammoth')

export class WordToHtmlConverter implements IConverter {
  readonly direction: ConvertDirection = 'docx-to-html'
  readonly requiresLibreOffice = false

  async convert(input: ConvertInput): Promise<ConvertOutput> {
    const { inputPath, outputDir, onProgress } = input

    onProgress(10)

    const buffer = await readFile(inputPath)
    const baseName = path.basename(inputPath, path.extname(inputPath))

    // mammoth 输出 HTML，图片内嵌 base64
    const result = await mammoth.convertToHtml({ buffer })

    onProgress(60)

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${baseName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; }
    img { max-width: 100%; }
  </style>
</head>
<body>
${result.value}
</body>
</html>`

    onProgress(80)

    const outputPath = path.join(outputDir, `${baseName}.html`)
    await writeFile(outputPath, html, 'utf-8')

    const outputStat = await stat(outputPath)
    onProgress(100)

    return {
      outputPath,
      outputSize: outputStat.size,
    }
  }
}
