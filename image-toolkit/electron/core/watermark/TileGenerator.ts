/**
 * 平铺水印生成器
 * 计算水印平铺的 overlay 数组
 * T-018
 */

import type { OverlayOptions } from 'sharp'

export class TileGenerator {
  /** 最大 overlay 数量，防止内存溢出 */
  static readonly MAX_OVERLAYS = 500

  /**
   * 生成平铺水印的 composite overlay 数组
   */
  static generate(
    watermarkBuffer: Buffer,
    watermarkWidth: number,
    watermarkHeight: number,
    canvasWidth: number,
    canvasHeight: number,
    spacing: number
  ): OverlayOptions[] {
    const overlays: OverlayOptions[] = []

    // 每个平铺单元的步长 = 水印尺寸 + 间距
    const stepX = watermarkWidth + spacing
    const stepY = watermarkHeight + spacing

    for (let y = 0; y < canvasHeight && overlays.length < this.MAX_OVERLAYS; y += stepY) {
      for (let x = 0; x < canvasWidth && overlays.length < this.MAX_OVERLAYS; x += stepX) {
        overlays.push({
          input: watermarkBuffer,
          left: Math.round(x),
          top: Math.round(y),
        })
      }
    }

    return overlays
  }
}
