/**
 * SVG 颜色处理核心逻辑（纯函数，可测试）
 * 从 svg.handler.ts 中提取的纯业务逻辑
 */

/** 替换 SVG 中的 fill/stroke 颜色，保留 fill="none" 和 stroke="none" */
export function changeSvgColor(svgContent: string, color: string): string {
  let result = svgContent.replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`)
  result = result.replace(/stroke="(?!none)[^"]*"/g, `stroke="${color}"`)
  result = result.replace(/fill:\s*(?!none)[^;}"]+/g, `fill: ${color}`)
  result = result.replace(/stroke:\s*(?!none)[^;}"]+/g, `stroke: ${color}`)
  return result
}

/** 判断文件是否为 SVG */
export function isSvgFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.svg')
}

/** 生成多倍率输出文件名 */
export function getScaledFileName(baseName: string, scale: number): string {
  return `${baseName}@${scale}x.png`
}
