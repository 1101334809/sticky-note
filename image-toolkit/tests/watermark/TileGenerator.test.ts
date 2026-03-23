/**
 * TileGenerator 单元测试
 * T-033
 */
import { describe, it, expect } from 'vitest'
import { TileGenerator } from '../../electron/core/watermark/TileGenerator'

describe('TileGenerator', () => {
  const fakeBuffer = Buffer.from('fake-watermark-data')

  describe('generate()', () => {
    it('should return an array of overlay options', () => {
      const overlays = TileGenerator.generate(fakeBuffer, 100, 50, 500, 400, 100)
      expect(Array.isArray(overlays)).toBe(true)
      expect(overlays.length).toBeGreaterThan(0)
    })

    it('should include the watermark buffer in each overlay', () => {
      const overlays = TileGenerator.generate(fakeBuffer, 100, 50, 500, 400, 100)
      overlays.forEach((o) => {
        expect(o.input).toBe(fakeBuffer)
      })
    })

    it('should produce correct grid positions', () => {
      // 100px watermark, 0px spacing => step = 100, canvas 300x200
      const overlays = TileGenerator.generate(fakeBuffer, 100, 100, 300, 200, 0)
      // Should get 3 columns x 2 rows = 6 tiles
      expect(overlays.length).toBe(6)
      expect(overlays[0]).toEqual({ input: fakeBuffer, left: 0, top: 0 })
      expect(overlays[1]).toEqual({ input: fakeBuffer, left: 100, top: 0 })
      expect(overlays[2]).toEqual({ input: fakeBuffer, left: 200, top: 0 })
      expect(overlays[3]).toEqual({ input: fakeBuffer, left: 0, top: 100 })
    })

    it('should respect spacing between tiles', () => {
      // 50px watermark, 50px spacing => step = 100, canvas 250x100
      const overlays = TileGenerator.generate(fakeBuffer, 50, 50, 250, 100, 50)
      // 3 columns, 1 row = 3 tiles
      expect(overlays.length).toBe(3)
      expect(overlays[0]).toEqual({ input: fakeBuffer, left: 0, top: 0 })
      expect(overlays[1]).toEqual({ input: fakeBuffer, left: 100, top: 0 })
      expect(overlays[2]).toEqual({ input: fakeBuffer, left: 200, top: 0 })
    })

    it('should not exceed MAX_OVERLAYS', () => {
      // Very small watermark on huge canvas => many tiles
      const overlays = TileGenerator.generate(fakeBuffer, 1, 1, 10000, 10000, 0)
      expect(overlays.length).toBeLessThanOrEqual(TileGenerator.MAX_OVERLAYS)
    })

    it('should return empty array when canvas is smaller than watermark', () => {
      // Canvas is 0x0
      const overlays = TileGenerator.generate(fakeBuffer, 100, 50, 0, 0, 100)
      expect(overlays.length).toBe(0)
    })

    it('should produce single tile when watermark fills canvas', () => {
      const overlays = TileGenerator.generate(fakeBuffer, 500, 400, 500, 400, 100)
      expect(overlays.length).toBe(1)
      expect(overlays[0]).toEqual({ input: fakeBuffer, left: 0, top: 0 })
    })

    it('should round left/top to integers', () => {
      const overlays = TileGenerator.generate(fakeBuffer, 33, 33, 100, 100, 0)
      overlays.forEach((o) => {
        expect(Number.isInteger(o.left)).toBe(true)
        expect(Number.isInteger(o.top)).toBe(true)
      })
    })
  })
})
