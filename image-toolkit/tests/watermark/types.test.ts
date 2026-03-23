/**
 * 水印类型定义与常量测试
 * T-034
 */
import { describe, it, expect } from 'vitest'
import { POSITION_TO_GRAVITY, type WatermarkPosition } from '../../electron/core/watermark/types'

describe('types.ts 常量映射', () => {
  describe('POSITION_TO_GRAVITY', () => {
    it('should map all 9 standard positions to Sharp gravity values', () => {
      const standardPositions: WatermarkPosition[] = [
        'top-left', 'top-center', 'top-right',
        'center-left', 'center', 'center-right',
        'bottom-left', 'bottom-center', 'bottom-right',
      ]
      standardPositions.forEach((pos) => {
        expect(POSITION_TO_GRAVITY[pos]).toBeDefined()
        expect(typeof POSITION_TO_GRAVITY[pos]).toBe('string')
      })
    })

    it('should map custom position', () => {
      expect(POSITION_TO_GRAVITY['custom']).toBeDefined()
    })

    it('should have correct Sharp gravity values', () => {
      expect(POSITION_TO_GRAVITY['top-left']).toBe('northwest')
      expect(POSITION_TO_GRAVITY['top-center']).toBe('north')
      expect(POSITION_TO_GRAVITY['top-right']).toBe('northeast')
      expect(POSITION_TO_GRAVITY['center-left']).toBe('west')
      expect(POSITION_TO_GRAVITY['center']).toBe('centre')
      expect(POSITION_TO_GRAVITY['center-right']).toBe('east')
      expect(POSITION_TO_GRAVITY['bottom-left']).toBe('southwest')
      expect(POSITION_TO_GRAVITY['bottom-center']).toBe('south')
      expect(POSITION_TO_GRAVITY['bottom-right']).toBe('southeast')
    })

    it('should have exactly 10 entries (9 standard + custom)', () => {
      expect(Object.keys(POSITION_TO_GRAVITY).length).toBe(10)
    })
  })
})
