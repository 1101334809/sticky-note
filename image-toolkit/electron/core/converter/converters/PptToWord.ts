/**
 * PPT → Word 转换器
 *
 * 解析 .pptx 的 XML 结构，提取每张幻灯片的文字内容，
 * 生成 .docx 文档（每页一节）。
 *
 * 注意：.pptx 本质是 ZIP 包，内含 ppt/slides/slide{N}.xml
 */
import { readFile, writeFile } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx'
import type { IConverter, ConvertInput, ConvertOutput } from './IConverter'
import type { ConvertDirection } from '../types'

// 使用 JSZip 来解析 pptx ZIP 结构
let JSZip: any

async function loadJSZip() {
  if (!JSZip) {
    // mammoth 依赖中自带 jszip，复用
    try {
      JSZip = (await import('jszip')).default
    } catch {
      throw new Error('缺少 jszip 依赖，请运行 npm install jszip')
    }
  }
  return JSZip
}

export class PptToWordConverter implements IConverter {
  readonly direction: ConvertDirection = 'pptx-to-docx'
  readonly requiresLibreOffice = false

  async convert(input: ConvertInput): Promise<ConvertOutput> {
    const { inputPath, outputDir, onProgress } = input

    onProgress(10)

    // 1. 读取 pptx ZIP
    const JSZipLib = await loadJSZip()
    const buffer = await readFile(inputPath)
    const zip = await JSZipLib.loadAsync(buffer)

    // 2. 找到所有幻灯片
    const slideFiles: string[] = []
    zip.forEach((relativePath: string) => {
      if (/^ppt\/slides\/slide\d+\.xml$/.test(relativePath)) {
        slideFiles.push(relativePath)
      }
    })

    // 按编号排序
    slideFiles.sort((a: string, b: string) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0')
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0')
      return numA - numB
    })

    onProgress(30)

    // 3. 提取每张幻灯片的文字
    const sections: Array<{ title: string; texts: string[] }> = []

    for (let i = 0; i < slideFiles.length; i++) {
      const slideXml = await zip.file(slideFiles[i])?.async('string')
      if (!slideXml) continue

      const texts = this.extractTextsFromSlideXml(slideXml)
      sections.push({
        title: `幻灯片 ${i + 1}`,
        texts,
      })

      onProgress(30 + Math.round((i / slideFiles.length) * 40))
    }

    onProgress(70)

    // 4. 生成 docx
    const paragraphs: Paragraph[] = []
    const baseName = path.basename(inputPath, path.extname(inputPath))

    // 文档标题
    paragraphs.push(
      new Paragraph({
        text: baseName,
        heading: HeadingLevel.TITLE,
      })
    )

    for (const section of sections) {
      // 每页标题
      paragraphs.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400 },
        })
      )

      // 内容
      for (const text of section.texts) {
        if (text.trim()) {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun(text)],
              spacing: { after: 100 },
            })
          )
        }
      }
    }

    const doc = new Document({
      sections: [{ children: paragraphs }],
    })

    const docxBuffer = await Packer.toBuffer(doc)

    onProgress(90)

    // 5. 写入文件
    const outputPath = path.join(outputDir, `${baseName}.docx`)
    await writeFile(outputPath, docxBuffer)

    const outputStat = await stat(outputPath)
    onProgress(100)

    return {
      outputPath,
      outputSize: outputStat.size,
    }
  }

  /**
   * 从幻灯片 XML 中提取纯文字
   * pptx slide XML 中文字在 <a:t> 标签内
   */
  private extractTextsFromSlideXml(xml: string): string[] {
    const texts: string[] = []
    // 匹配 <a:p>...</a:p> 段落
    const paragraphs = xml.match(/<a:p\b[^>]*>[\s\S]*?<\/a:p>/gi) || []

    for (const p of paragraphs) {
      // 提取 <a:t>...</a:t> 中的文字
      const textMatches = p.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi) || []
      const lineTexts = textMatches.map((t) =>
        t.replace(/<\/?a:t[^>]*>/gi, '').trim()
      )
      const line = lineTexts.join('')
      if (line) {
        texts.push(line)
      }
    }

    return texts
  }
}
