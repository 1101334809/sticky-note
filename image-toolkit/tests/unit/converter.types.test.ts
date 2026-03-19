import { describe, it, expect } from 'vitest'
import {
  FORMAT_MATRIX,
  FORMAT_LABELS,
  FORMAT_EXTENSIONS,
  DEFAULT_CONVERT_CONFIG,
  LIBREOFFICE_DIRECTIONS,
  type DocFormat,
  type ConvertDirection,
} from '../../electron/core/converter/types'

describe('converter types', () => {
  // ====== FORMAT_MATRIX ======

  describe('FORMAT_MATRIX', () => {
    it('应包含 5 种源格式', () => {
      const formats: DocFormat[] = ['docx', 'pptx', 'pdf', 'md', 'html']
      for (const fmt of formats) {
        expect(FORMAT_MATRIX[fmt]).toBeDefined()
        expect(Array.isArray(FORMAT_MATRIX[fmt])).toBe(true)
      }
    })

    it('docx 应支持 pdf/md/html 三种目标', () => {
      expect(FORMAT_MATRIX.docx).toContain('pdf')
      expect(FORMAT_MATRIX.docx).toContain('md')
      expect(FORMAT_MATRIX.docx).toContain('html')
    })

    it('pptx 应支持 docx/pdf/image 三种目标', () => {
      expect(FORMAT_MATRIX.pptx).toContain('docx')
      expect(FORMAT_MATRIX.pptx).toContain('pdf')
      expect(FORMAT_MATRIX.pptx).toContain('image')
    })

    it('pdf 应支持 docx/md 两种目标', () => {
      expect(FORMAT_MATRIX.pdf).toContain('docx')
      expect(FORMAT_MATRIX.pdf).toContain('md')
    })

    it('md 应支持 html/docx 两种目标', () => {
      expect(FORMAT_MATRIX.md).toContain('html')
      expect(FORMAT_MATRIX.md).toContain('docx')
    })

    it('html 应支持 md 一种目标', () => {
      expect(FORMAT_MATRIX.html).toContain('md')
    })

    it('所有目标格式组合应覆盖 11 种方向', () => {
      let total = 0
      for (const fmt of Object.keys(FORMAT_MATRIX)) {
        total += FORMAT_MATRIX[fmt as DocFormat].length
      }
      expect(total).toBe(11)
    })
  })

  // ====== FORMAT_LABELS ======

  describe('FORMAT_LABELS', () => {
    it('每种格式应有中文标签', () => {
      expect(FORMAT_LABELS.docx).toBeTruthy()
      expect(FORMAT_LABELS.pdf).toBeTruthy()
      expect(FORMAT_LABELS.md).toBeTruthy()
      expect(FORMAT_LABELS.html).toBeTruthy()
    })
  })

  // ====== FORMAT_EXTENSIONS ======

  describe('FORMAT_EXTENSIONS', () => {
    it('docx 扩展名应包含 .docx', () => {
      expect(FORMAT_EXTENSIONS.docx).toContain('.docx')
    })

    it('pdf 扩展名应包含 .pdf', () => {
      expect(FORMAT_EXTENSIONS.pdf).toContain('.pdf')
    })

    it('md 扩展名应包含 .md', () => {
      expect(FORMAT_EXTENSIONS.md).toContain('.md')
    })
  })

  // ====== DEFAULT_CONVERT_CONFIG ======

  describe('DEFAULT_CONVERT_CONFIG', () => {
    it('应有合理的默认值', () => {
      expect(DEFAULT_CONVERT_CONFIG).toBeDefined()
      expect(DEFAULT_CONVERT_CONFIG.direction).toBeDefined()
    })
  })

  // ====== LIBREOFFICE_DIRECTIONS ======

  describe('LIBREOFFICE_DIRECTIONS', () => {
    it('应包含 docx-to-pdf', () => {
      expect(LIBREOFFICE_DIRECTIONS).toContain('docx-to-pdf')
    })

    it('应包含 pptx-to-pdf', () => {
      expect(LIBREOFFICE_DIRECTIONS).toContain('pptx-to-pdf')
    })

    it('不应包含纯 JS 处理的方向', () => {
      expect(LIBREOFFICE_DIRECTIONS).not.toContain('docx-to-md')
      expect(LIBREOFFICE_DIRECTIONS).not.toContain('html-to-md')
    })
  })
})
