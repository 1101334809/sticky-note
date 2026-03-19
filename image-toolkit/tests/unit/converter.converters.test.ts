import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all native dependencies
vi.mock('mammoth', () => ({
  default: {
    convertToHtml: vi.fn().mockResolvedValue({ value: '<h1>Title</h1><p>Content</p>' }),
    images: { imgElement: vi.fn((fn: any) => fn) },
  },
}))

vi.mock('turndown', () => ({
  default: vi.fn().mockImplementation(() => ({
    turndown: vi.fn().mockReturnValue('# Title\n\nContent'),
    addRule: vi.fn(),
  })),
}))

vi.mock('pdf-parse', () => ({
  default: vi.fn().mockResolvedValue({
    text: 'Page 1 content\nPage 2 content',
    numpages: 2,
  }),
}))

vi.mock('marked', () => ({
  marked: {
    parse: vi.fn().mockReturnValue('<h1>Title</h1>'),
    setOptions: vi.fn(),
  },
}))

vi.mock('html-docx-js-typescript', () => ({
  asBlob: vi.fn().mockResolvedValue(Buffer.from('mock-docx')),
}))

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from('mock-file-content')),
  writeFile: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ size: 1024 }),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../electron/core/converter/libreoffice', () => ({
  convertWithLibreOffice: vi.fn().mockResolvedValue('/output/test.pdf'),
  detectLibreOffice: vi.fn().mockResolvedValue({ installed: true, path: '/usr/bin/soffice', version: '7.0' }),
}))

// Mock node:module for createRequire
vi.mock('node:module', () => ({
  createRequire: vi.fn(() => {
    return (mod: string) => {
      if (mod === 'mammoth') {
        return {
          convertToHtml: vi.fn().mockResolvedValue({ value: '<h1>Title</h1><p>Content</p>' }),
          images: { imgElement: vi.fn((fn: any) => fn) },
        }
      }
      if (mod === 'turndown') {
        return vi.fn().mockImplementation(() => ({
          turndown: vi.fn().mockReturnValue('# Title\n\nContent'),
          addRule: vi.fn(),
        }))
      }
      if (mod === 'pdf-parse') {
        return vi.fn().mockResolvedValue({ text: 'Page content', numpages: 1 })
      }
      if (mod === 'marked') {
        return {
          marked: {
            parse: vi.fn().mockReturnValue('<h1>Title</h1>'),
            setOptions: vi.fn(),
          },
        }
      }
      if (mod === 'html-docx-js-typescript') {
        return { asBlob: vi.fn().mockResolvedValue(Buffer.from('mock')) }
      }
      return {}
    }
  }),
}))

import { readFile, writeFile, stat, mkdir } from 'node:fs/promises'

describe('Converters', () => {
  const mockProgress = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ====== WordToMd ======
  describe('WordToMdConverter', () => {
    it('应导出 WordToMdConverter 类', async () => {
      const { WordToMdConverter } = await import('../../electron/core/converter/converters/WordToMd')
      const converter = new WordToMdConverter()
      expect(converter.direction).toBe('docx-to-md')
      expect(converter.requiresLibreOffice).toBe(false)
    })
  })

  // ====== WordToPdf ======
  describe('WordToPdfConverter', () => {
    it('应导出 WordToPdfConverter 类', async () => {
      const { WordToPdfConverter } = await import('../../electron/core/converter/converters/WordToPdf')
      const converter = new WordToPdfConverter()
      expect(converter.direction).toBe('docx-to-pdf')
      expect(converter.requiresLibreOffice).toBe(true)
    })
  })

  // ====== WordToHtml ======
  describe('WordToHtmlConverter', () => {
    it('应导出 WordToHtmlConverter 类', async () => {
      const { WordToHtmlConverter } = await import('../../electron/core/converter/converters/WordToHtml')
      const converter = new WordToHtmlConverter()
      expect(converter.direction).toBe('docx-to-html')
      expect(converter.requiresLibreOffice).toBe(false)
    })
  })

  // ====== PptToWord ======
  describe('PptToWordConverter', () => {
    it('应导出 PptToWordConverter 类', async () => {
      const { PptToWordConverter } = await import('../../electron/core/converter/converters/PptToWord')
      const converter = new PptToWordConverter()
      expect(converter.direction).toBe('pptx-to-docx')
      expect(converter.requiresLibreOffice).toBe(false)
    })
  })

  // ====== PptToPdf ======
  describe('PptToPdfConverter', () => {
    it('应导出 PptToPdfConverter 类', async () => {
      const { PptToPdfConverter } = await import('../../electron/core/converter/converters/PptToPdf')
      const converter = new PptToPdfConverter()
      expect(converter.direction).toBe('pptx-to-pdf')
      expect(converter.requiresLibreOffice).toBe(true)
    })
  })

  // ====== PdfToWord ======
  describe('PdfToWordConverter', () => {
    it('应导出 PdfToWordConverter 类', async () => {
      const { PdfToWordConverter } = await import('../../electron/core/converter/converters/PdfToWord')
      const converter = new PdfToWordConverter()
      expect(converter.direction).toBe('pdf-to-docx')
      expect(converter.requiresLibreOffice).toBe(false)
    })
  })

  // ====== PdfToMd ======
  describe('PdfToMdConverter', () => {
    it('应导出 PdfToMdConverter 类', async () => {
      const { PdfToMdConverter } = await import('../../electron/core/converter/converters/PdfToMd')
      const converter = new PdfToMdConverter()
      expect(converter.direction).toBe('pdf-to-md')
      expect(converter.requiresLibreOffice).toBe(false)
    })
  })

  // ====== MdToHtml ======
  describe('MdToHtmlConverter', () => {
    it('应导出 MdToHtmlConverter 类', async () => {
      const { MdToHtmlConverter } = await import('../../electron/core/converter/converters/MdToHtml')
      const converter = new MdToHtmlConverter()
      expect(converter.direction).toBe('md-to-html')
      expect(converter.requiresLibreOffice).toBe(false)
    })
  })

  // ====== MdToWord ======
  describe('MdToWordConverter', () => {
    it('应导出 MdToWordConverter 类', async () => {
      const { MdToWordConverter } = await import('../../electron/core/converter/converters/MdToWord')
      const converter = new MdToWordConverter()
      expect(converter.direction).toBe('md-to-docx')
      expect(converter.requiresLibreOffice).toBe(false)
    })
  })

  // ====== HtmlToMd ======
  describe('HtmlToMdConverter', () => {
    it('应导出 HtmlToMdConverter 类', async () => {
      const { HtmlToMdConverter } = await import('../../electron/core/converter/converters/HtmlToMd')
      const converter = new HtmlToMdConverter()
      expect(converter.direction).toBe('html-to-md')
      expect(converter.requiresLibreOffice).toBe(false)
    })
  })

  // ====== PptToImage ======
  describe('PptToImageConverter', () => {
    it('应导出 PptToImageConverter 类', async () => {
      const { PptToImageConverter } = await import('../../electron/core/converter/converters/PptToImage')
      const converter = new PptToImageConverter()
      expect(converter.direction).toBe('pptx-to-image')
      expect(converter.requiresLibreOffice).toBe(true)
    })
  })

  // ====== 接口一致性 ======

  describe('接口一致性', () => {
    it('所有转换器应实现 IConverter 接口', async () => {
      const converterModules = [
        import('../../electron/core/converter/converters/WordToMd'),
        import('../../electron/core/converter/converters/WordToPdf'),
        import('../../electron/core/converter/converters/WordToHtml'),
        import('../../electron/core/converter/converters/PptToWord'),
        import('../../electron/core/converter/converters/PptToPdf'),
        import('../../electron/core/converter/converters/PptToImage'),
        import('../../electron/core/converter/converters/PdfToWord'),
        import('../../electron/core/converter/converters/PdfToMd'),
        import('../../electron/core/converter/converters/MdToHtml'),
        import('../../electron/core/converter/converters/MdToWord'),
        import('../../electron/core/converter/converters/HtmlToMd'),
      ]

      const modules = await Promise.all(converterModules)
      for (const mod of modules) {
        const ConverterClass = Object.values(mod)[0] as any
        const converter = new ConverterClass()

        expect(converter).toHaveProperty('direction')
        expect(typeof converter.direction).toBe('string')
        expect(converter).toHaveProperty('requiresLibreOffice')
        expect(typeof converter.requiresLibreOffice).toBe('boolean')
        expect(converter).toHaveProperty('convert')
        expect(typeof converter.convert).toBe('function')
      }
    })
  })
})
