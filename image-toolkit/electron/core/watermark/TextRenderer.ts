/**
 * 文字水印渲染器
 * 将文字渲染为带透明背景的 SVG Buffer，供 Sharp composite 使用
 * T-006
 */

export interface TextRenderOptions {
  text: string
  fontSize: number
  color: string
  rotation: number   // 度数
  opacity: number    // 0-1
}

export class TextRenderer {
  /**
   * 将文字渲染为 SVG Buffer
   */
  static render(options: TextRenderOptions): Buffer {
    const { text, fontSize, color, rotation, opacity } = options

    // 估算文字尺寸（中英文混合取较大值）
    const charWidth = this.estimateCharWidth(text, fontSize)
    const textWidth = charWidth
    const textHeight = fontSize * 1.4

    // 计算旋转后的包围盒
    const { boxWidth, boxHeight } = this.calcRotatedBBox(
      textWidth, textHeight, rotation
    )

    // 构建 SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${boxWidth}" height="${boxHeight}">
  <text
    x="50%" y="50%"
    text-anchor="middle"
    dominant-baseline="central"
    font-size="${fontSize}px"
    font-family="Microsoft YaHei, PingFang SC, sans-serif"
    fill="${color}"
    opacity="${opacity}"
    transform="rotate(${rotation}, ${boxWidth / 2}, ${boxHeight / 2})"
  >${this.escapeXml(text)}</text>
</svg>`

    return Buffer.from(svg)
  }

  /**
   * 估算文字宽度（考虑中英文混合）
   */
  private static estimateCharWidth(text: string, fontSize: number): number {
    let width = 0
    for (const char of text) {
      // 中文和全角字符
      if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(char)) {
        width += fontSize * 1.0
      } else {
        width += fontSize * 0.55
      }
    }
    return Math.max(width, fontSize) // 至少一个字符宽度
  }

  /**
   * 计算旋转后的包围盒尺寸
   */
  private static calcRotatedBBox(
    w: number, h: number, deg: number
  ): { boxWidth: number; boxHeight: number } {
    const rad = Math.abs(deg) * Math.PI / 180
    const sinA = Math.sin(rad)
    const cosA = Math.cos(rad)

    const boxWidth = Math.ceil(w * cosA + h * sinA) + 4
    const boxHeight = Math.ceil(w * sinA + h * cosA) + 4

    return { boxWidth, boxHeight }
  }

  /**
   * XML 特殊字符转义
   */
  private static escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}
