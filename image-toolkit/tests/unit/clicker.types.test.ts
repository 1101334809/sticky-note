import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CLICKER_CONFIG,
  type ClickerConfig,
} from '../../electron/core/clicker/types'

describe('DEFAULT_CLICKER_CONFIG', () => {
  it('应有合理的默认间隔', () => {
    expect(DEFAULT_CLICKER_CONFIG.interval).toBe(100)
  })

  it('默认应为左键单击', () => {
    expect(DEFAULT_CLICKER_CONFIG.button).toBe('left')
    expect(DEFAULT_CLICKER_CONFIG.clickType).toBe('single')
  })

  it('默认应为无限次数', () => {
    expect(DEFAULT_CLICKER_CONFIG.maxClicks).toBe(0)
  })

  it('默认应为跟随鼠标模式', () => {
    expect(DEFAULT_CLICKER_CONFIG.positionMode).toBe('follow')
  })

  it('默认无启动延迟', () => {
    expect(DEFAULT_CLICKER_CONFIG.startDelay).toBe(0)
  })

  it('固定坐标默认为 (0,0)', () => {
    expect(DEFAULT_CLICKER_CONFIG.fixedPosition).toEqual({ x: 0, y: 0 })
  })

  it('多点列表默认为空', () => {
    expect(DEFAULT_CLICKER_CONFIG.multiPositions).toEqual([])
  })
})

describe('ClickerConfig 类型安全', () => {
  it('应接受完整配置对象', () => {
    const config: ClickerConfig = {
      interval: 200,
      button: 'right',
      clickType: 'double',
      maxClicks: 50,
      positionMode: 'fixed',
      fixedPosition: { x: 100, y: 200 },
      multiPositions: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
      startDelay: 3,
    }
    expect(config.interval).toBe(200)
    expect(config.button).toBe('right')
    expect(config.clickType).toBe('double')
    expect(config.maxClicks).toBe(50)
    expect(config.positionMode).toBe('fixed')
    expect(config.multiPositions).toHaveLength(2)
    expect(config.startDelay).toBe(3)
  })
})
