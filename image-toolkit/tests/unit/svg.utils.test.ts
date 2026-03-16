import { describe, it, expect } from 'vitest'
import { changeSvgColor, isSvgFile, getScaledFileName } from '../../electron/core/svg.utils'

describe('changeSvgColor', () => {
  it('应替换 fill 属性颜色', () => {
    const svg = '<svg><rect fill="#000" /></svg>'
    const result = changeSvgColor(svg, '#ff0000')
    expect(result).toContain('fill="#ff0000"')
    expect(result).not.toContain('fill="#000"')
  })

  it('应替换 stroke 属性颜色', () => {
    const svg = '<svg><path stroke="#333" /></svg>'
    const result = changeSvgColor(svg, '#00ff00')
    expect(result).toContain('stroke="#00ff00"')
  })

  it('应保留 fill="none"', () => {
    const svg = '<svg><rect fill="none" /><rect fill="#000" /></svg>'
    const result = changeSvgColor(svg, '#ff0000')
    expect(result).toContain('fill="none"')
    expect(result).toContain('fill="#ff0000"')
  })

  it('应保留 stroke="none"', () => {
    const svg = '<svg><path stroke="none" /><path stroke="#333" /></svg>'
    const result = changeSvgColor(svg, '#00ff00')
    expect(result).toContain('stroke="none"')
    expect(result).toContain('stroke="#00ff00"')
  })

  it('应替换内联 style 中的 fill', () => {
    const svg = '<svg><rect style="fill: #000; opacity: 1" /></svg>'
    const result = changeSvgColor(svg, '#ff0000')
    expect(result).toContain('fill: #ff0000')
    expect(result).toContain('opacity: 1')
  })

  it('应替换内联 style 中的 stroke', () => {
    const svg = '<svg><path style="stroke: blue" /></svg>'
    const result = changeSvgColor(svg, 'red')
    expect(result).toContain('stroke: red')
  })

  it('应处理多个元素的批量替换', () => {
    const svg = '<svg><rect fill="#aaa"/><circle fill="#bbb"/><path stroke="#ccc"/></svg>'
    const result = changeSvgColor(svg, '#123456')
    expect(result.match(/fill="#123456"/g)?.length).toBe(2)
    expect(result).toContain('stroke="#123456"')
  })

  it('应处理空 SVG', () => {
    const result = changeSvgColor('<svg></svg>', '#000')
    expect(result).toBe('<svg></svg>')
  })
})

describe('isSvgFile', () => {
  it('应识别 .svg 文件', () => {
    expect(isSvgFile('icon.svg')).toBe(true)
  })

  it('应识别大写 .SVG 文件', () => {
    expect(isSvgFile('LOGO.SVG')).toBe(true)
  })

  it('应拒绝非 SVG 文件', () => {
    expect(isSvgFile('photo.png')).toBe(false)
    expect(isSvgFile('doc.pdf')).toBe(false)
  })

  it('应拒绝无扩展名文件', () => {
    expect(isSvgFile('README')).toBe(false)
  })
})

describe('getScaledFileName', () => {
  it('应生成 @1x 文件名', () => {
    expect(getScaledFileName('icon', 1)).toBe('icon@1x.png')
  })

  it('应生成 @2x 文件名', () => {
    expect(getScaledFileName('logo', 2)).toBe('logo@2x.png')
  })

  it('应生成 @3x 文件名', () => {
    expect(getScaledFileName('avatar', 3)).toBe('avatar@3x.png')
  })
})
