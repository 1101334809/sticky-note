/**
 * Word → Markdown 转换器
 *
 * 使用 mammoth 解析 .docx → HTML，再用 turndown 转为 Markdown。
 * 图片提取到 `文档名_images/` 同名目录。
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import type { IConverter, ConvertInput, ConvertOutput } from './IConverter'
import type { ConvertDirection } from '../types'

const require = createRequire(import.meta.url)
const mammoth = require('mammoth')
const TurndownService = require('turndown')

export class WordToMdConverter implements IConverter {
  readonly direction: ConvertDirection = 'docx-to-md'
  readonly requiresLibreOffice = false

  async convert(input: ConvertInput): Promise<ConvertOutput> {
    const { inputPath, outputDir, config, onProgress } = input

    onProgress(10)

    // 1. 解析 docx → HTML
    const buffer = await readFile(inputPath)
    const baseName = path.basename(inputPath, path.extname(inputPath))
    const imagesDir = path.join(outputDir, `${baseName}_images`)

    let imageIndex = 0
    const imageMode = config.imageExtractMode || 'folder'

    const result = await mammoth.convertToHtml(
      { buffer },
      {
        convertImage: mammoth.images.imgElement(async (image: any) => {
          if (imageMode === 'ignore') {
            return { src: '' }
          }

          const ext = image.contentType?.split('/')[1] || 'png'
          imageIndex++
          const imageName = `image-${imageIndex}.${ext}`

          if (imageMode === 'base64') {
            const imgBuffer = await image.read()
            const base64 = imgBuffer.toString('base64')
            return { src: `data:${image.contentType};base64,${base64}` }
          }

          // folder 模式：提取到同名目录
          await mkdir(imagesDir, { recursive: true })
          const imagePath = path.join(imagesDir, imageName)
          const imgBuffer = await image.read()
          await writeFile(imagePath, imgBuffer)

          return { src: `./${baseName}_images/${imageName}` }
        }),
      }
    )

    onProgress(50)

    // 2. HTML → Markdown
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    })

    // 支持表格
    turndown.addRule('table', {
      filter: 'table',
      replacement: (_content: any, node: any) => {
        return this.convertTable(node as HTMLTableElement)
      },
    })

    let markdown = turndown.turndown(result.value)

    // 清理多余空行
    markdown = markdown.replace(/\n{3,}/g, '\n\n')

    onProgress(80)

    // 3. 写入文件
    const outputPath = path.join(outputDir, `${baseName}.md`)
    await writeFile(outputPath, markdown, 'utf-8')

    const outputStat = await stat(outputPath)
    onProgress(100)

    return {
      outputPath,
      outputSize: outputStat.size,
      assets: imageIndex > 0 ? [imagesDir] : undefined,
    }
  }

  /** 简单表格转换（Markdown 格式） */
  private convertTable(table: any): string {
    const rows: string[][] = []
    const tableRows = table.querySelectorAll?.('tr') || table.getElementsByTagName?.('tr') || []

    for (const row of tableRows) {
      const cells: string[] = []
      const tableCells = row.querySelectorAll?.('td, th') || row.getElementsByTagName?.('td') || []
      for (const cell of tableCells) {
        cells.push((cell.textContent || '').trim().replace(/\|/g, '\\|'))
      }
      rows.push(cells)
    }

    if (rows.length === 0) return ''

    const colCount = Math.max(...rows.map((r) => r.length))
    const lines: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      while (row.length < colCount) row.push('')
      lines.push(`| ${row.join(' | ')} |`)
      if (i === 0) {
        lines.push(`| ${row.map(() => '---').join(' | ')} |`)
      }
    }

    return '\n' + lines.join('\n') + '\n'
  }
}
