/**
 * Markdown → Word 转换器
 *
 * marked → HTML → html-docx-js-typescript → docx
 */
import { readFile, writeFile } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import type { IConverter, ConvertInput, ConvertOutput } from './IConverter'
import type { ConvertDirection } from '../types'

const require = createRequire(import.meta.url)
const { marked } = require('marked')
const htmlDocx = require('html-docx-js-typescript')

export class MdToWordConverter implements IConverter {
  readonly direction: ConvertDirection = 'md-to-docx'
  readonly requiresLibreOffice = false

  async convert(input: ConvertInput): Promise<ConvertOutput> {
    const { inputPath, outputDir, onProgress } = input

    onProgress(10)

    const mdContent = await readFile(inputPath, 'utf-8')
    const baseName = path.basename(inputPath, path.extname(inputPath))

    onProgress(20)

    // 1. Markdown → HTML
    marked.setOptions({ gfm: true, breaks: true })
    const htmlBody = await marked.parse(mdContent)

    const fullHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Microsoft YaHei', Arial, sans-serif; font-size: 12pt; line-height: 1.6;">
${htmlBody}
</body>
</html>`

    onProgress(50)

    // 2. HTML → docx buffer
    const docxBuffer = await htmlDocx.asBlob(fullHtml)

    onProgress(80)

    // 3. 写入文件
    const outputPath = path.join(outputDir, `${baseName}.docx`)
    // asBlob 返回的可能是 Buffer 或 ArrayBuffer
    const buf = Buffer.isBuffer(docxBuffer)
      ? docxBuffer
      : Buffer.from(docxBuffer instanceof ArrayBuffer ? docxBuffer : await docxBuffer.arrayBuffer())
    await writeFile(outputPath, buf)

    const outputStat = await stat(outputPath)
    onProgress(100)

    return {
      outputPath,
      outputSize: outputStat.size,
    }
  }
}
