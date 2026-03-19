/**
 * HTML → Markdown 转换器
 *
 * 使用 turndown 将 HTML 转换为 Markdown
 */
import { readFile, writeFile } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import type { IConverter, ConvertInput, ConvertOutput } from './IConverter'
import type { ConvertDirection } from '../types'

const require = createRequire(import.meta.url)
const TurndownService = require('turndown')

export class HtmlToMdConverter implements IConverter {
  readonly direction: ConvertDirection = 'html-to-md'
  readonly requiresLibreOffice = false

  async convert(input: ConvertInput): Promise<ConvertOutput> {
    const { inputPath, outputDir, onProgress } = input

    onProgress(10)

    const htmlContent = await readFile(inputPath, 'utf-8')
    const baseName = path.basename(inputPath, path.extname(inputPath))

    onProgress(30)

    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    })

    // 表格支持
    turndown.addRule('table', {
      filter: 'table',
      replacement: (_content: any, node: any) => {
        return convertTable(node)
      },
    })

    let markdown = turndown.turndown(htmlContent)
    markdown = markdown.replace(/\n{3,}/g, '\n\n')

    onProgress(80)

    const outputPath = path.join(outputDir, `${baseName}.md`)
    await writeFile(outputPath, markdown, 'utf-8')

    const outputStat = await stat(outputPath)
    onProgress(100)

    return {
      outputPath,
      outputSize: outputStat.size,
    }
  }
}

/** 简单表格转换 */
function convertTable(table: any): string {
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
  const colCount = Math.max(...rows.map((r: string[]) => r.length))
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
