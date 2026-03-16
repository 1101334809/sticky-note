import { describe, it, expect } from 'vitest'
import {
  isSupportedImage,
  getCompressedFileName,
  calcSavedPercent,
  getQualityByMode,
  formatFileSize,
  SUPPORTED_FORMATS,
} from '../../electron/core/compress.utils'

describe('SUPPORTED_FORMATS', () => {
  it('应包含所有主流图片格式', () => {
    expect(SUPPORTED_FORMATS).toContain('jpg')
    expect(SUPPORTED_FORMATS).toContain('jpeg')
    expect(SUPPORTED_FORMATS).toContain('png')
    expect(SUPPORTED_FORMATS).toContain('webp')
    expect(SUPPORTED_FORMATS).toContain('gif')
    expect(SUPPORTED_FORMATS).toContain('avif')
    expect(SUPPORTED_FORMATS).toContain('tiff')
    expect(SUPPORTED_FORMATS).toContain('tif')
  })
})

describe('isSupportedImage', () => {
  it('应识别 JPEG 文件', () => {
    expect(isSupportedImage('photo.jpg')).toBe(true)
    expect(isSupportedImage('photo.jpeg')).toBe(true)
  })

  it('应识别 PNG 文件', () => {
    expect(isSupportedImage('icon.png')).toBe(true)
  })

  it('应识别 WebP 文件', () => {
    expect(isSupportedImage('image.webp')).toBe(true)
  })

  it('应拒绝非图片文件', () => {
    expect(isSupportedImage('doc.pdf')).toBe(false)
    expect(isSupportedImage('code.ts')).toBe(false)
    expect(isSupportedImage('icon.svg')).toBe(false) // SVG 不在压缩范围
  })

  it('应处理大写扩展名', () => {
    expect(isSupportedImage('PHOTO.JPG')).toBe(true)
    expect(isSupportedImage('IMAGE.PNG')).toBe(true)
  })

  it('应处理无扩展名文件', () => {
    expect(isSupportedImage('README')).toBe(false)
  })
})

describe('getCompressedFileName', () => {
  it('应在扩展名前添加 _compressed', () => {
    expect(getCompressedFileName('photo.jpg')).toBe('photo_compressed.jpg')
  })

  it('应处理多个点的文件名', () => {
    expect(getCompressedFileName('my.photo.png')).toBe('my.photo_compressed.png')
  })

  it('应处理无扩展名文件', () => {
    expect(getCompressedFileName('README')).toBe('README_compressed')
  })
})

describe('calcSavedPercent', () => {
  it('应计算正确的节省百分比', () => {
    expect(calcSavedPercent(1000, 600)).toBe(40)
  })

  it('应处理 0 字节原始文件', () => {
    expect(calcSavedPercent(0, 0)).toBe(0)
  })

  it('应处理压缩后变大的情况', () => {
    expect(calcSavedPercent(100, 120)).toBe(-20)
  })

  it('应处理完全压缩为 0 的情况', () => {
    expect(calcSavedPercent(1000, 0)).toBe(100)
  })

  it('应四舍五入到整数', () => {
    expect(calcSavedPercent(1000, 666)).toBe(33)
    expect(calcSavedPercent(1000, 333)).toBe(67)
  })
})

describe('getQualityByMode', () => {
  it('无损模式 应返回 100', () => {
    expect(getQualityByMode('lossless', 50, '.jpg')).toBe(100)
    expect(getQualityByMode('lossless', 80, '.png')).toBe(100)
  })

  it('有损模式 应返回用户设定质量', () => {
    expect(getQualityByMode('lossy', 75, '.jpg')).toBe(75)
    expect(getQualityByMode('lossy', 60, '.png')).toBe(60)
  })

  it('智能模式 JPEG 应返回 80', () => {
    expect(getQualityByMode('smart', 50, '.jpg')).toBe(80)
    expect(getQualityByMode('smart', 50, '.jpeg')).toBe(80)
  })

  it('智能模式 PNG 应返回 100（无损）', () => {
    expect(getQualityByMode('smart', 50, '.png')).toBe(100)
  })

  it('智能模式 WebP 应返回 85', () => {
    expect(getQualityByMode('smart', 50, '.webp')).toBe(85)
  })

  it('智能模式 未知格式 应返回用户质量', () => {
    expect(getQualityByMode('smart', 70, '.bmp')).toBe(70)
  })
})

describe('formatFileSize', () => {
  it('应格式化字节', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('应格式化 KB', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  it('应格式化 MB', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB')
    expect(formatFileSize(5242880)).toBe('5.0 MB')
  })

  it('应处理 0 字节', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('应保留一位小数', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })
})
