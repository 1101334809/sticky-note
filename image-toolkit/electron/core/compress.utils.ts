/**
 * 图片压缩核心逻辑（纯函数，可测试）
 * 从 compress.handler.ts 中提取的纯业务逻辑
 */

/** 支持的图片格式 */
export const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'tiff', 'tif']

/** 判断文件是否为支持的图片格式 */
export function isSupportedImage(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return SUPPORTED_FORMATS.includes(ext)
}

/** 生成压缩输出文件名 */
export function getCompressedFileName(originalName: string): string {
  const lastDot = originalName.lastIndexOf('.')
  if (lastDot === -1) return originalName + '_compressed'
  return originalName.slice(0, lastDot) + '_compressed' + originalName.slice(lastDot)
}

/** 计算节省百分比 */
export function calcSavedPercent(originalSize: number, compressedSize: number): number {
  if (originalSize === 0) return 0
  return Math.round((1 - compressedSize / originalSize) * 100)
}

/** 根据模式获取 Sharp 压缩质量参数 */
export function getQualityByMode(mode: 'lossy' | 'lossless' | 'smart', userQuality: number, ext: string): number {
  if (mode === 'lossless') return 100
  if (mode === 'lossy') return userQuality

  // smart 模式: 按格式自动推荐
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 80
    case '.png':
      return 100 // PNG 用无损
    case '.webp':
      return 85
    case '.avif':
      return 80
    default:
      return userQuality
  }
}

/** 格式化文件大小显示 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
