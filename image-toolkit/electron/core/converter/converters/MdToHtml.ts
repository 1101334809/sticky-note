/**
 * Markdown → HTML 转换器
 *
 * 使用 marked 渲染 Markdown 为 HTML，支持 GFM。
 */
import { readFile, writeFile } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import type { IConverter, ConvertInput, ConvertOutput } from './IConverter'
import type { ConvertDirection } from '../types'

const require = createRequire(import.meta.url)
const { marked } = require('marked')

export class MdToHtmlConverter implements IConverter {
  readonly direction: ConvertDirection = 'md-to-html'
  readonly requiresLibreOffice = false

  async convert(input: ConvertInput): Promise<ConvertOutput> {
    const { inputPath, outputDir, onProgress } = input

    onProgress(10)

    const mdContent = await readFile(inputPath, 'utf-8')
    const baseName = path.basename(inputPath, path.extname(inputPath))

    onProgress(30)

    // 设置 marked 选项
    marked.setOptions({
      gfm: true,
      breaks: true,
    })

    const htmlBody = await marked.parse(mdContent)

    // 包裹完整 HTML
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${baseName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f8f8f8; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding: 0 16px; color: #666; }
    img { max-width: 100%; }
    h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; }
  </style>
</head>
<body>
${htmlBody}
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
