/**
 * 转换器接口 — 所有转换器必须实现
 */
import type { ConvertDirection, ConvertConfig } from '../types'

/** 转换输入 */
export interface ConvertInput {
  inputPath: string
  outputDir: string
  config: ConvertConfig
  onProgress: (progress: number) => void
}

/** 转换输出 */
export interface ConvertOutput {
  outputPath: string
  outputSize: number
  /** 附属文件（如提取的图片目录） */
  assets?: string[]
}

/** 转换器接口 */
export interface IConverter {
  /** 支持的转换方向 */
  readonly direction: ConvertDirection
  /** 是否需要 LibreOffice */
  readonly requiresLibreOffice: boolean
  /** 执行转换 */
  convert(input: ConvertInput): Promise<ConvertOutput>
}
