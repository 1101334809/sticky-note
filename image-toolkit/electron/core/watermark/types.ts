/**
 * 图片水印 - 类型定义
 * T-005
 */

/** 水印九宫格位置 */
export type WatermarkPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'custom'

/** 水印参数 */
export interface WatermarkOptions {
  /** 水印类型 */
  type: 'text' | 'image'

  // === 文字水印参数 ===
  /** 水印文字内容 */
  text?: string
  /** 字体大小 px (12-120) */
  fontSize?: number
  /** 颜色 hex */
  color?: string

  // === 图片水印参数 ===
  /** 水印图片路径 */
  watermarkPath?: string
  /** 缩放百分比 (5-50)，相对原图 */
  scale?: number

  // === 通用参数 ===
  /** 不透明度 (0-100) */
  opacity: number
  /** 旋转角度 (-180 ~ 180) */
  rotation: number
  /** 位置 */
  position: WatermarkPosition
  /** 自由坐标 X (0~1) */
  positionX?: number
  /** 自由坐标 Y (0~1) */
  positionY?: number
  /** 是否平铺 */
  tileMode: boolean
  /** 平铺间距 px */
  tileSpacing?: number
  /** X 偏移 px */
  offsetX?: number
  /** Y 偏移 px */
  offsetY?: number
  /** 是否按图片尺寸自适应 */
  adaptive?: boolean
  /** 输出文件后缀 */
  outputSuffix: string
}

/** 单文件处理结果 */
export interface ProcessResult {
  status: 'success' | 'error'
  inputPath: string
  outputPath?: string
  outputSize?: number
  error?: string
}

/** 批量处理请求 */
export interface WatermarkRequest {
  files: string[]
  watermarkOptions: WatermarkOptions
  outputDir?: string
}

/** 文件尺寸检查结果 */
export interface FileSizeCheckResult {
  path: string
  fileSize: number
  width: number
  height: number
  isLarge: boolean
}

/** 九宫格位置到 Sharp gravity 的映射 */
export const POSITION_TO_GRAVITY: Record<WatermarkPosition, string> = {
  'top-left': 'northwest',
  'top-center': 'north',
  'top-right': 'northeast',
  'center-left': 'west',
  'center': 'centre',
  'center-right': 'east',
  'bottom-left': 'southwest',
  'bottom-center': 'south',
  'bottom-right': 'southeast',
  'custom': 'centre',
}
