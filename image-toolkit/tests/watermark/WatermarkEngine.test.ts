/**
 * WatermarkEngine 集成测试
 * T-035
 * 
 * 需要 sharp 模块和真实图片文件来测试完整流程
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { WatermarkEngine } from '../../electron/core/watermark/WatermarkEngine'
import type { WatermarkOptions } from '../../electron/core/watermark/types'
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const FIXTURE_DIR = path.join(__dirname, 'fixtures')
const INPUT_IMAGE = path.join(FIXTURE_DIR, 'test-input.png')
const OUTPUT_IMAGE = path.join(FIXTURE_DIR, 'test-output.png')

beforeAll(async () => {
  // 创建 fixtures 目录和测试用的 100x100 红色 PNG 图片
  if (!fs.existsSync(FIXTURE_DIR)) {
    fs.mkdirSync(FIXTURE_DIR, { recursive: true })
  }
  await sharp({
    create: { width: 200, height: 150, channels: 4, background: { r: 255, g: 100, b: 100, alpha: 1 } }
  }).png().toFile(INPUT_IMAGE)
})

afterAll(() => {
  // 清理测试产物
  if (fs.existsSync(OUTPUT_IMAGE)) fs.unlinkSync(OUTPUT_IMAGE)
  if (fs.existsSync(INPUT_IMAGE)) fs.unlinkSync(INPUT_IMAGE)
  if (fs.existsSync(FIXTURE_DIR)) {
    try { fs.rmdirSync(FIXTURE_DIR) } catch {}
  }
})

describe('WatermarkEngine', () => {
  const engine = new WatermarkEngine()

  const baseOptions: WatermarkOptions = {
    type: 'text',
    text: 'TEST WATERMARK',
    fontSize: 24,
    color: '#FFFFFF',
    opacity: 50,
    rotation: 0,
    position: 'center',
    tileMode: false,
    outputSuffix: '_watermarked',
  }

  describe('process() - 文字水印', () => {
    it('should produce a successful result for text watermark', async () => {
      const result = await engine.process(INPUT_IMAGE, OUTPUT_IMAGE, baseOptions)
      expect(result.status).toBe('success')
      expect(result.inputPath).toBe(INPUT_IMAGE)
      expect(result.outputPath).toBe(OUTPUT_IMAGE)
      expect(result.outputSize).toBeGreaterThan(0)
    })

    it('should create the output file', async () => {
      await engine.process(INPUT_IMAGE, OUTPUT_IMAGE, baseOptions)
      expect(fs.existsSync(OUTPUT_IMAGE)).toBe(true)
    })

    it('should preserve image dimensions', async () => {
      await engine.process(INPUT_IMAGE, OUTPUT_IMAGE, baseOptions)
      const meta = await sharp(OUTPUT_IMAGE).metadata()
      expect(meta.width).toBe(200)
      expect(meta.height).toBe(150)
    })

    it('should handle rotation', async () => {
      const result = await engine.process(INPUT_IMAGE, OUTPUT_IMAGE, {
        ...baseOptions,
        rotation: -30,
      })
      expect(result.status).toBe('success')
    })

    it('should handle tile mode', async () => {
      const result = await engine.process(INPUT_IMAGE, OUTPUT_IMAGE, {
        ...baseOptions,
        tileMode: true,
        tileSpacing: 50,
      })
      expect(result.status).toBe('success')
    })
  })

  describe('process() - 错误处理', () => {
    it('should return error for non-existent input file', async () => {
      const result = await engine.process(
        path.join(FIXTURE_DIR, 'non-existent.png'),
        OUTPUT_IMAGE,
        baseOptions
      )
      expect(result.status).toBe('error')
      expect(result.error).toBeDefined()
    })

    it('should return error for invalid output path', async () => {
      const result = await engine.process(
        INPUT_IMAGE,
        '/invalid/path/that/does/not/exist/output.png',
        baseOptions
      )
      expect(result.status).toBe('error')
      expect(result.error).toBeDefined()
    })
  })
})
