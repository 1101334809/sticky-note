/**
 * PDF → Markdown 转换器
 *
 * 使用 pdf-parse 提取文字层，格式化为 Markdown
 */
import { readFile, writeFile } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import type { IConverter, ConvertInput, ConvertOutput } from './IConverter'
import type { ConvertDirection } from '../types'

export class PdfToMdConverter implements IConverter {
  readonly direction: ConvertDirection = 'pdf-to-md'
  readonly requiresLibreOffice = false

  async convert(input: ConvertInput): Promise<ConvertOutput> {
    const { inputPath, outputDir, onProgress } = input

    onProgress(10)

    const buffer = await readFile(inputPath)

    let pdfData: any
    try {
      const _require = createRequire(import.meta.url)
      const pdfParse = _require('pdf-parse')
      pdfData = await pdfParse(buffer)
    } catch (e: any) {
      throw new Error(`PDF 解析失败: ${e.message}`)
    }

    onProgress(40)

    const text = pdfData.text?.trim()
    if (!text) {
      throw new Error('此为扫描件或无文字内容的 PDF，无法提取文字')
    }

    const baseName = path.basename(inputPath, path.extname(inputPath))

    // 格式化为 Markdown
    const lines = text.split('\n')
    const mdLines: string[] = [
      `# ${baseName}`,
      '',
      `> 来源: ${path.basename(inputPath)} (${pdfData.numpages} 页)`,
      '',
    ]

    for (const line of lines) {
      mdLines.push(line)
    }

    const markdown = mdLines.join('\n')

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
