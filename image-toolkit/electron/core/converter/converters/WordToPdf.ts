/**
 * Word → PDF 转换器
 *
 * 使用 LibreOffice CLI (soffice --headless) 转换
 */
import { stat } from 'node:fs/promises'
import type { IConverter, ConvertInput, ConvertOutput } from './IConverter'
import type { ConvertDirection } from '../types'
import { convertWithLibreOffice } from '../libreoffice'

export class WordToPdfConverter implements IConverter {
  readonly direction: ConvertDirection = 'docx-to-pdf'
  readonly requiresLibreOffice = true

  async convert(input: ConvertInput): Promise<ConvertOutput> {
    const { inputPath, outputDir, onProgress } = input

    onProgress(10)

    const outputPath = await convertWithLibreOffice(inputPath, outputDir, 'pdf')

    onProgress(90)

    const outputStat = await stat(outputPath)
    onProgress(100)

    return {
      outputPath,
      outputSize: outputStat.size,
    }
  }
}
