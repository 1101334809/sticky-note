/**
 * TextRenderer 单元测试
 * T-032
 */
import { describe, it, expect } from 'vitest'
import { TextRenderer, type TextRenderOptions } from '../../electron/core/watermark/TextRenderer'

describe('TextRenderer', () => {
  const defaultOpts: TextRenderOptions = {
    text: '测试水印',
    fontSize: 36,
    color: '#FFFFFF',
    rotation: 0,
    opacity: 0.5,
  }

  describe('render()', () => {
    it('should return a Buffer', () => {
      const buf = TextRenderer.render(defaultOpts)
      expect(buf).toBeInstanceOf(Buffer)
      expect(buf.length).toBeGreaterThan(0)
    })

    it('should produce valid SVG content', () => {
      const buf = TextRenderer.render(defaultOpts)
      const svg = buf.toString('utf-8')
      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
      expect(svg).toContain('测试水印')
    })

    it('should include the correct font size', () => {
      const buf = TextRenderer.render({ ...defaultOpts, fontSize: 72 })
      const svg = buf.toString('utf-8')
      expect(svg).toContain('font-size="72px"')
    })

    it('should include the correct fill color', () => {
      const buf = TextRenderer.render({ ...defaultOpts, color: '#FF0000' })
      const svg = buf.toString('utf-8')
      expect(svg).toContain('fill="#FF0000"')
    })

    it('should include the correct opacity', () => {
      const buf = TextRenderer.render({ ...defaultOpts, opacity: 0.3 })
      const svg = buf.toString('utf-8')
      expect(svg).toContain('opacity="0.3"')
    })

    it('should include correct rotation transform', () => {
      const buf = TextRenderer.render({ ...defaultOpts, rotation: -30 })
      const svg = buf.toString('utf-8')
      expect(svg).toContain('rotate(-30')
    })

    it('should escape XML special characters', () => {
      const buf = TextRenderer.render({ ...defaultOpts, text: '<test>&"value"' })
      const svg = buf.toString('utf-8')
      expect(svg).toContain('&lt;test&gt;&amp;&quot;value&quot;')
      expect(svg).not.toContain('<test>')
    })

    it('should handle empty text', () => {
      const buf = TextRenderer.render({ ...defaultOpts, text: '' })
      expect(buf).toBeInstanceOf(Buffer)
      const svg = buf.toString('utf-8')
      expect(svg).toContain('<svg')
    })

    it('should handle rotation causing larger bounding box area', () => {
      const noRotation = TextRenderer.render({ ...defaultOpts, rotation: 0 })
      const withRotation = TextRenderer.render({ ...defaultOpts, rotation: 45 })
      const svgNoRotation = noRotation.toString('utf-8')
      const svgWithRotation = withRotation.toString('utf-8')
      // Extract width and height from SVG
      const wNoRot = parseInt(svgNoRotation.match(/width="(\d+)"/)?.[1] || '0')
      const hNoRot = parseInt(svgNoRotation.match(/height="(\d+)"/)?.[1] || '0')
      const wWithRot = parseInt(svgWithRotation.match(/width="(\d+)"/)?.[1] || '0')
      const hWithRot = parseInt(svgWithRotation.match(/height="(\d+)"/)?.[1] || '0')
      // 45 degree rotation increases overall bounding box area
      expect(wWithRot * hWithRot).toBeGreaterThanOrEqual(wNoRot * hNoRot)
    })

    it('should handle Chinese text width estimation correctly', () => {
      const chineseBuf = TextRenderer.render({ ...defaultOpts, text: '中文', fontSize: 36 })
      const englishBuf = TextRenderer.render({ ...defaultOpts, text: 'AB', fontSize: 36 })
      const chSvg = chineseBuf.toString('utf-8')
      const enSvg = englishBuf.toString('utf-8')
      const chWidth = parseInt(chSvg.match(/width="(\d+)"/)?.[1] || '0')
      const enWidth = parseInt(enSvg.match(/width="(\d+)"/)?.[1] || '0')
      // Chinese chars are wider than English chars
      expect(chWidth).toBeGreaterThan(enWidth)
    })
  })
})
