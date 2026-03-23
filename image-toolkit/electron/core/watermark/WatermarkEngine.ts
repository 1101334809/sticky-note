/**
 * 水印合成引擎
 * 核心处理逻辑：读取源图 → 合成水印图层 → 输出文件
 * T-007, T-008, T-015, T-020, T-021
 */

import sharp from 'sharp'
import fs from 'node:fs'
import {
  type WatermarkOptions,
  type WatermarkPosition,
  type ProcessResult,
  POSITION_TO_GRAVITY,
} from './types'
import { TextRenderer } from './TextRenderer'
import { TileGenerator } from './TileGenerator'

export class WatermarkEngine {
  /**
   * 为单张图片添加水印
   */
  async process(
    inputPath: string,
    outputPath: string,
    options: WatermarkOptions
  ): Promise<ProcessResult> {
    try {
      const image = sharp(inputPath)
      const metadata = await image.metadata()
      const imgWidth = metadata.width || 800
      const imgHeight = metadata.height || 600

      // 1. 生成水印层 Buffer
      let watermarkBuffer: Buffer
      let wmWidth: number
      let wmHeight: number

      if (options.type === 'text') {
        // 文字水印
        const fontSize = options.adaptive
          ? Math.round(imgWidth * (options.fontSize || 36) / 1000)
          : (options.fontSize || 36)

        watermarkBuffer = TextRenderer.render({
          text: options.text || '',
          fontSize,
          color: options.color || '#FFFFFF',
          rotation: options.rotation,
          opacity: options.opacity / 100,
        })
        // 估算 SVG 尺寸
        const svgMeta = await sharp(watermarkBuffer).metadata()
        wmWidth = svgMeta.width || 100
        wmHeight = svgMeta.height || 50
      } else {
        // 图片水印
        const result = await this.prepareImageWatermark(
          options.watermarkPath!,
          imgWidth, imgHeight,
          options.scale || 15,
          options.rotation,
          options.opacity / 100,
          options.adaptive
        )
        watermarkBuffer = result.buffer
        wmWidth = result.width
        wmHeight = result.height
      }

      // 2. 计算合成参数
      let compositeInput: sharp.OverlayOptions[]

      if (options.tileMode) {
        // 平铺模式
        compositeInput = TileGenerator.generate(
          watermarkBuffer,
          wmWidth, wmHeight,
          imgWidth, imgHeight,
          options.tileSpacing || 200
        )
      } else {
        // 单水印模式
        compositeInput = [{
          input: watermarkBuffer,
          ...this.calcGravityAndOffset(
            options.position,
            options.offsetX || 0,
            options.offsetY || 0
          )
        }]
      }

      // 3. 合成并输出
      await image.composite(compositeInput).toFile(outputPath)
      const outputStats = fs.statSync(outputPath)

      return {
        status: 'success',
        inputPath,
        outputPath,
        outputSize: outputStats.size,
      }
    } catch (e: any) {
      return {
        status: 'error',
        inputPath,
        error: e.message,
      }
    }
  }

  /**
   * 九宫格位置 → Sharp gravity + offset
   * T-008
   */
  private calcGravityAndOffset(
    position: WatermarkPosition,
    offsetX: number,
    offsetY: number
  ): { gravity: string; left?: number; top?: number } {
    const gravity = POSITION_TO_GRAVITY[position] || 'southeast'

    // Sharp gravity 模式下不能同时使用 left/top（它是相对 gravity 的）
    // 如果有偏移需要使用绝对定位
    if (offsetX !== 0 || offsetY !== 0) {
      // 需要计算绝对坐标（但这需要知道图片尺寸，外面传入更合理）
      // 简化方案：使用 gravity，暂不支持 offset 与 gravity 混用
      // Sharp composite 支持 gravity 但不支持在 gravity 基础上加偏移
      // 所以 offset 功能在后续需要改用绝对坐标
      return { gravity }
    }

    return { gravity }
  }

  /**
   * 准备图片水印：读取 → 缩放 → 旋转 → 透明度
   * T-015
   */
  private async prepareImageWatermark(
    watermarkPath: string,
    imageWidth: number,
    _imageHeight: number,
    scalePercent: number,
    rotation: number,
    opacity: number,
    _adaptive?: boolean
  ): Promise<{ buffer: Buffer; width: number; height: number }> {
    // 读取水印图片
    let pipeline = sharp(watermarkPath)
    const wmMeta = await pipeline.metadata()
    const origWidth = wmMeta.width || 100
    const origHeight = wmMeta.height || 100

    // 计算目标宽度
    const targetWidth = Math.round(imageWidth * scalePercent / 100)
    const ratio = targetWidth / origWidth
    const targetHeight = Math.round(origHeight * ratio)

    // 缩放
    pipeline = pipeline.resize(targetWidth, targetHeight, { fit: 'inside' })

    // 旋转（如果需要）
    if (rotation !== 0) {
      pipeline = pipeline.rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    }

    // 确保有 alpha 通道
    pipeline = pipeline.ensureAlpha()

    // 透明度处理
    if (opacity < 1) {
      const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true })

      // 直接修改每个像素的 alpha 通道
      for (let i = 3; i < data.length; i += 4) {
        data[i] = Math.round(data[i] * opacity)
      }

      const processedBuffer = await sharp(data, {
        raw: { width: info.width, height: info.height, channels: 4 }
      }).png().toBuffer()

      const finalMeta = await sharp(processedBuffer).metadata()
      return {
        buffer: processedBuffer,
        width: finalMeta.width || targetWidth,
        height: finalMeta.height || targetHeight,
      }
    }

    const buffer = await pipeline.png().toBuffer()
    const finalMeta = await sharp(buffer).metadata()
    return {
      buffer,
      width: finalMeta.width || targetWidth,
      height: finalMeta.height || targetHeight,
    }
  }
}
