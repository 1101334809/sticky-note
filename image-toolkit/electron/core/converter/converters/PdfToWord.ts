/**
 * PDF → Word 转换器
 *
 * 使用 pdf-parse 提取 PDF 文字层，生成 .docx 文档。
 * 注意：仅支持有文字层的 PDF，扫描件会返回空内容。
 */
import { readFile, writeFile } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx'
import type { IConverter, ConvertInput, ConvertOutput } from './IConverter'
import type { ConvertDirection } from '../types'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

export class PdfToWordConverter implements IConverter {
  readonly direction: ConvertDirection = 'pdf-to-docx'
  readonly requiresLibreOffice = false

  async convert(input: ConvertInput): Promise<ConvertOutput> {
    const { inputPath, outputDir, onProgress } = input

    onProgress(10)

    // 1. 读取并解析 PDF
    const buffer = await readFile(inputPath)

    let pdfData: any
    try {
      pdfData = await pdfParse(buffer)
    } catch (e: any) {
      throw new Error(`PDF 解析失败: ${e.message}`)
    }

    onProgress(40)

    // 2. 检测是否为扫描件（无文字）
    const text = pdfData.text?.trim()
    if (!text) {
      throw new Error('此为扫描件或无文字内容的 PDF，无法提取文字')
    }

    // 3. 将文字按段落拆分，生成 docx
    const lines = text.split('\n')
    const baseName = path.basename(inputPath, path.extname(inputPath))

    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: baseName,
        heading: HeadingLevel.TITLE,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `来源: ${path.basename(inputPath)} (${pdfData.numpages} 页)`,
            italics: true,
            color: '888888',
          }),
        ],
        spacing: { after: 200 },
      }),
    ]

    onProgress(60)

    for (const line of lines) {
      if (line.trim()) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun(line)],
            spacing: { after: 80 },
          })
        )
      }
    }

    const doc = new Document({
      sections: [{ children: paragraphs }],
    })

    const docxBuffer = await Packer.toBuffer(doc)

    onProgress(90)

    // 4. 写入文件
    const outputPath = path.join(outputDir, `${baseName}.docx`)
    await writeFile(outputPath, docxBuffer)

    const outputStat = await stat(outputPath)
    onProgress(100)

    return {
      outputPath,
      outputSize: outputStat.size,
    }
  }
}
