import { describe, it, expect } from 'vitest'
import { classifyFiles } from '../../src/composables/useFileDrop'

describe('classifyFiles', () => {
  it('应将 SVG 文件归入 svg', () => {
    const result = classifyFiles(['/icons/logo.svg'])
    expect(result.svg).toEqual(['/icons/logo.svg'])
    expect(result.image).toHaveLength(0)
    expect(result.unknown).toHaveLength(0)
  })

  it('应将图片文件归入 image', () => {
    const result = classifyFiles(['/photos/pic.jpg', '/photos/pic.png', '/photos/pic.webp'])
    expect(result.image).toHaveLength(3)
  })

  it('应将未知文件归入 unknown', () => {
    const result = classifyFiles(['/docs/readme.md', '/data/config.json'])
    expect(result.unknown).toHaveLength(2)
  })

  it('应正确分类混合文件', () => {
    const result = classifyFiles([
      '/logo.svg',
      '/photo.jpg',
      '/icon.png',
      '/doc.pdf',
      '/bg.webp',
    ])
    expect(result.svg).toEqual(['/logo.svg'])
    expect(result.image).toEqual(['/photo.jpg', '/icon.png', '/bg.webp'])
    expect(result.unknown).toEqual(['/doc.pdf'])
  })

  it('应处理空数组', () => {
    const result = classifyFiles([])
    expect(result.svg).toHaveLength(0)
    expect(result.image).toHaveLength(0)
    expect(result.unknown).toHaveLength(0)
  })

  it('应处理大写扩展名', () => {
    const result = classifyFiles(['/icon.SVG', '/photo.JPG', '/image.PNG'])
    expect(result.svg).toHaveLength(1)
    expect(result.image).toHaveLength(2)
  })

  it('应将无扩展名文件归入 unknown', () => {
    const result = classifyFiles(['/README', '/Makefile'])
    expect(result.unknown).toHaveLength(2)
  })

  it('应识别所有支持的图片格式', () => {
    const result = classifyFiles([
      '/a.jpg', '/b.jpeg', '/c.png', '/d.webp',
      '/e.gif', '/f.avif', '/g.tiff', '/h.tif',
    ])
    expect(result.image).toHaveLength(8)
  })
})
