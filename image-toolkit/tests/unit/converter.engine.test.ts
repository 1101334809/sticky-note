import { describe, it, expect, vi } from 'vitest'
import { ConvertEngine } from '../../electron/core/converter/ConvertEngine'
import type { IConverter, ConvertInput, ConvertOutput } from '../../electron/core/converter/converters/IConverter'
import type { ConvertDirection } from '../../electron/core/converter/types'

/** 创建 mock 转换器 */
function createMockConverter(
  direction: ConvertDirection,
  result?: Partial<ConvertOutput>
): IConverter {
  return {
    direction,
    requiresLibreOffice: false,
    convert: vi.fn().mockResolvedValue({
      outputPath: '/mock/output.md',
      outputSize: 1024,
      ...result,
    }),
  }
}

describe('ConvertEngine', () => {
  let engine: ConvertEngine

  beforeEach(() => {
    engine = new ConvertEngine()
  })

  // ====== 注册 ======

  describe('register()', () => {
    it('应成功注册转换器', () => {
      const converter = createMockConverter('docx-to-md')
      engine.register(converter)
      expect(engine.isSupported('docx-to-md')).toBe(true)
    })

    it('注册多个转换器应全部可用', () => {
      engine.registerAll([
        createMockConverter('docx-to-md'),
        createMockConverter('docx-to-pdf'),
        createMockConverter('pdf-to-docx'),
      ])
      expect(engine.getSupportedDirections()).toHaveLength(3)
    })
  })

  // ====== 查找 ======

  describe('getConverter()', () => {
    it('已注册方向应返回转换器', () => {
      const converter = createMockConverter('docx-to-md')
      engine.register(converter)
      expect(engine.getConverter('docx-to-md')).toBe(converter)
    })

    it('未注册方向应返回 undefined', () => {
      expect(engine.getConverter('docx-to-md')).toBeUndefined()
    })
  })

  // ====== isSupported ======

  describe('isSupported()', () => {
    it('已注册应返回 true', () => {
      engine.register(createMockConverter('docx-to-md'))
      expect(engine.isSupported('docx-to-md')).toBe(true)
    })

    it('未注册应返回 false', () => {
      expect(engine.isSupported('docx-to-md')).toBe(false)
    })
  })

  // ====== convert ======

  describe('convert()', () => {
    it('应调用对应转换器的 convert 方法', async () => {
      const converter = createMockConverter('docx-to-md')
      engine.register(converter)

      const input: ConvertInput = {
        inputPath: '/test/input.docx',
        outputDir: '/test/output',
        config: { direction: 'docx-to-md' } as any,
        onProgress: vi.fn(),
      }

      const result = await engine.convert('docx-to-md', input)
      expect(converter.convert).toHaveBeenCalledWith(input)
      expect(result.outputPath).toBe('/mock/output.md')
    })

    it('未注册方向应抛出错误', async () => {
      const input: ConvertInput = {
        inputPath: '/test/input.docx',
        outputDir: '/test/output',
        config: { direction: 'docx-to-md' } as any,
        onProgress: vi.fn(),
      }

      await expect(engine.convert('docx-to-md', input)).rejects.toThrow()
    })
  })

  // ====== getSupportedDirections ======

  describe('getSupportedDirections()', () => {
    it('空引擎应返回空数组', () => {
      expect(engine.getSupportedDirections()).toHaveLength(0)
    })

    it('应返回所有已注册方向', () => {
      engine.registerAll([
        createMockConverter('docx-to-md'),
        createMockConverter('pdf-to-docx'),
      ])
      const dirs = engine.getSupportedDirections()
      expect(dirs).toContain('docx-to-md')
      expect(dirs).toContain('pdf-to-docx')
    })
  })
})
