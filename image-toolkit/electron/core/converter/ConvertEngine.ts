/**
 * 转换引擎 — 转换器注册表 + 路由
 */
import type { ConvertDirection } from './types'
import type { IConverter, ConvertInput, ConvertOutput } from './converters/IConverter'

export class ConvertEngine {
  private converters = new Map<ConvertDirection, IConverter>()

  /** 注册转换器 */
  register(converter: IConverter): void {
    if (this.converters.has(converter.direction)) {
      console.warn(`[ConvertEngine] 覆盖已注册的转换器: ${converter.direction}`)
    }
    this.converters.set(converter.direction, converter)
    console.log(`[ConvertEngine] 注册转换器: ${converter.direction}`)
  }

  /** 批量注册 */
  registerAll(converters: IConverter[]): void {
    for (const c of converters) {
      this.register(c)
    }
  }

  /** 查找转换器 */
  getConverter(direction: ConvertDirection): IConverter | undefined {
    return this.converters.get(direction)
  }

  /** 检查转换方向是否支持 */
  isSupported(direction: ConvertDirection): boolean {
    return this.converters.has(direction)
  }

  /** 获取所有已注册的转换方向 */
  getSupportedDirections(): ConvertDirection[] {
    return Array.from(this.converters.keys())
  }

  /** 执行转换 */
  async convert(direction: ConvertDirection, input: ConvertInput): Promise<ConvertOutput> {
    const converter = this.converters.get(direction)
    if (!converter) {
      throw new Error(`不支持的转换方向: ${direction}`)
    }
    return converter.convert(input)
  }
}
