/**
 * IPC 通信类型定义
 *
 * 定义渲染进程与主进程之间的通信协议
 */

// ====== 压缩模块 ======

export interface CompressOptions {
  files: string[]
  mode: 'lossy' | 'lossless' | 'smart'
  quality: number
  outputDir?: string
}

export interface CompressResult {
  file: string
  fileName: string
  originalSize: number
  compressedSize: number
  savedPercent: number
  outputPath: string
  status: 'success' | 'error'
  error?: string
}

// ====== 格式转换模块 ======

export interface ConvertOptions {
  files: string[]
  targetFormat: string
  size?: number
  customWidth?: number
  customHeight?: number
  lockRatio?: boolean
  outputDir?: string
  keepOriginal?: boolean
}

export interface ConvertResult {
  file: string
  fileName: string
  originalSize: number
  convertedSize: number
  outputPath: string
  status: 'success' | 'error'
  error?: string
}

// ====== SVG 模块 ======

export interface ExportPngOptions {
  svgContent: string
  outputDir: string
  fileName: string
  mode: 'scale' | 'custom'
  scales?: number[]
  customWidth?: number
  customHeight?: number
}

export interface ExportPngResult {
  success: boolean
  files?: string[]
  error?: string
}

export interface SvgFileInfo {
  name: string
  path: string
  size: number
  content: string
}

// ====== 文件操作 ======

export interface FileInfo {
  path: string
  name: string
  size: number
  type: string
  exists: boolean
}

// ====== 通用 ======

export interface ProgressEvent {
  index: number
  status: 'success' | 'error'
  [key: string]: any
}
