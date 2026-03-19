/**
 * 文档格式转换 — 核心类型定义
 */

/** 支持的文档格式 */
export type DocFormat = 'docx' | 'pptx' | 'pdf' | 'md' | 'html'

/** 转换方向 */
export type ConvertDirection =
  | 'docx-to-pdf'
  | 'docx-to-md'
  | 'docx-to-html'
  | 'pptx-to-docx'
  | 'pptx-to-pdf'
  | 'pptx-to-image'
  | 'pdf-to-docx'
  | 'pdf-to-md'
  | 'md-to-html'
  | 'md-to-docx'
  | 'html-to-md'

/** 源格式 → 可选目标格式 */
export const FORMAT_MATRIX: Record<DocFormat, string[]> = {
  docx: ['pdf', 'md', 'html'],
  pptx: ['docx', 'pdf', 'image'],
  pdf: ['docx', 'md'],
  md: ['html', 'docx'],
  html: ['md'],
}

/** 格式显示名 */
export const FORMAT_LABELS: Record<string, string> = {
  docx: 'Word (.docx)',
  pptx: 'PPT (.pptx)',
  pdf: 'PDF (.pdf)',
  md: 'Markdown (.md)',
  html: 'HTML (.html)',
  image: '图片 (PNG/JPG)',
}

/** 格式对应的文件扩展名 */
export const FORMAT_EXTENSIONS: Record<string, string[]> = {
  docx: ['.docx'],
  pptx: ['.pptx'],
  pdf: ['.pdf'],
  md: ['.md', '.markdown'],
  html: ['.html', '.htm'],
}

/** 转换任务状态 */
export type ConvertStatus = 'pending' | 'converting' | 'completed' | 'failed'

/** 单个转换任务 */
export interface ConvertTask {
  id: string
  inputPath: string
  outputPath: string
  direction: ConvertDirection
  status: ConvertStatus
  progress: number
  error?: string
  inputSize: number
  outputSize?: number
  startTime?: number
  endTime?: number
}

/** 转换配置 */
export interface ConvertConfig {
  direction: ConvertDirection
  outputDir: string
  /** Word→MD 图片处理模式 */
  imageExtractMode: 'folder' | 'base64' | 'ignore'
  /** PPT→Word 布局 */
  pptLayout: 'section' | 'continuous'
  /** PDF→Word 模式 */
  pdfMode: 'text' | 'layout'
}

/** 默认配置 */
export const DEFAULT_CONVERT_CONFIG: ConvertConfig = {
  direction: 'docx-to-md',
  outputDir: '',
  imageExtractMode: 'folder',
  pptLayout: 'section',
  pdfMode: 'text',
}

/** 批量转换进度 */
export interface ConvertBatchProgress {
  total: number
  completed: number
  failed: number
  currentFile: string
}

/** 需要 LibreOffice 的转换方向 */
export const LIBREOFFICE_DIRECTIONS: ConvertDirection[] = [
  'docx-to-pdf',
  'pptx-to-pdf',
  'pptx-to-image',
]

/** 判断转换方向是否需要 LibreOffice */
export function requiresLibreOffice(direction: ConvertDirection): boolean {
  return LIBREOFFICE_DIRECTIONS.includes(direction)
}
