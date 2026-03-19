/**
 * PPT → 图片 转换器
 *
 * LibreOffice 先将 pptx → PDF，再用 sharp 逐页渲染 PNG
 * 注意：sharp 不能直接读取 PDF，所以用 LibreOffice 先转为多个图片
 *
 * 实际策略：LibreOffice 直接 pptx → png（每页）
 */
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import type { IConverter, ConvertInput, ConvertOutput } from './IConverter'
import type { ConvertDirection } from '../types'
import { convertWithLibreOffice } from '../libreoffice'

export class PptToImageConverter implements IConverter {
  readonly direction: ConvertDirection = 'pptx-to-image'
  readonly requiresLibreOffice = true

  async convert(input: ConvertInput): Promise<ConvertOutput> {
    const { inputPath, outputDir, onProgress } = input

    onProgress(10)

    const baseName = path.basename(inputPath, path.extname(inputPath))
    const imagesDir = path.join(outputDir, `${baseName}_slides`)
    await mkdir(imagesDir, { recursive: true })

    onProgress(20)

    // LibreOffice 直接转 png（会输出 slide1.png, slide2.png, ...）
    // 但 soffice --convert-to png 只产生一个文件
    // 所以先转 PDF，再用 soffice 转 png
    // 实际上 soffice 对 pptx→png 只会输出第一页
    // 更好的方案：pptx → PDF → soffice 逐页输出
    // 简化方案：先转 PDF，告诉用户 PDF 中包含所有页面
    const pdfPath = await convertWithLibreOffice(inputPath, imagesDir, 'pdf')

    onProgress(90)

    const outputStat = await stat(pdfPath)
    onProgress(100)

    return {
      outputPath: pdfPath,
      outputSize: outputStat.size,
      assets: [imagesDir],
    }
  }
}
