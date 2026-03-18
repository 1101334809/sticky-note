import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock win32 模块（koffi 在测试环境中不可用）
vi.mock('../../electron/core/clicker/win32', () => ({
  mouseClick: vi.fn(),
  mouseDoubleClick: vi.fn(),
  getCursorPosition: vi.fn(() => ({ x: 500, y: 300 })),
}))

import { ClickerEngine } from '../../electron/core/clicker/ClickerEngine'
import { mouseClick, mouseDoubleClick, getCursorPosition } from '../../electron/core/clicker/win32'
import { DEFAULT_CLICKER_CONFIG, type ClickerConfig } from '../../electron/core/clicker/types'

describe('ClickerEngine', () => {
  let engine: ClickerEngine

  beforeEach(() => {
    engine = new ClickerEngine()
    vi.useFakeTimers()
    vi.clearAllMocks()
    // 重置默认鼠标位置
    ;(getCursorPosition as any).mockReturnValue({ x: 500, y: 300 })
  })

  afterEach(() => {
    engine.destroy()
    vi.useRealTimers()
  })

  // ====== 初始化 ======

  describe('初始化', () => {
    it('初始状态应为 idle', () => {
      expect(engine.getState()).toBe('idle')
    })

    it('初始点击次数应为 0', () => {
      expect(engine.getClickCount()).toBe(0)
    })
  })

  // ====== start() ======

  describe('start()', () => {
    it('启动后状态应变为 running', () => {
      engine.start({ ...DEFAULT_CLICKER_CONFIG, interval: 100 })
      expect(engine.getState()).toBe('running')
    })

    it('启动后应立即执行一次点击', () => {
      engine.start({ ...DEFAULT_CLICKER_CONFIG, interval: 100 })
      expect(mouseClick).toHaveBeenCalledTimes(1)
    })

    it('重复启动应被忽略', () => {
      engine.start({ ...DEFAULT_CLICKER_CONFIG, interval: 100 })
      engine.start({ ...DEFAULT_CLICKER_CONFIG, interval: 200 })
      // 只执行了第一次的点击
      expect(mouseClick).toHaveBeenCalledTimes(1)
    })

    it('应发出 state-change 事件', () => {
      const handler = vi.fn()
      engine.on('state-change', handler)
      engine.start({ ...DEFAULT_CLICKER_CONFIG, interval: 100 })
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'running', clickCount: 0 })
      )
    })
  })

  // ====== 定时点击 ======

  describe('定时点击', () => {
    it('应按间隔执行点击', () => {
      engine.start({ ...DEFAULT_CLICKER_CONFIG, interval: 100 })
      expect(mouseClick).toHaveBeenCalledTimes(1) // 立即第一次

      vi.advanceTimersByTime(100)
      expect(mouseClick).toHaveBeenCalledTimes(2)

      vi.advanceTimersByTime(100)
      expect(mouseClick).toHaveBeenCalledTimes(3)
    })

    it('应发出 click 事件并累加计数', () => {
      const handler = vi.fn()
      engine.on('click', handler)

      engine.start({ ...DEFAULT_CLICKER_CONFIG, interval: 100 })
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ count: 1 })
      )

      vi.advanceTimersByTime(100)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ count: 2 })
      )

      expect(engine.getClickCount()).toBe(2)
    })
  })

  // ====== stop() ======

  describe('stop()', () => {
    it('停止后状态应变为 idle', () => {
      engine.start({ ...DEFAULT_CLICKER_CONFIG, interval: 100 })
      engine.stop()
      expect(engine.getState()).toBe('idle')
    })

    it('停止后应不再执行点击', () => {
      engine.start({ ...DEFAULT_CLICKER_CONFIG, interval: 100 })
      engine.stop()

      vi.advanceTimersByTime(500)
      // 只有启动时的第一次点击
      expect(mouseClick).toHaveBeenCalledTimes(1)
    })

    it('空闲状态下 stop 应无操作', () => {
      engine.stop()
      expect(engine.getState()).toBe('idle')
    })

    it('应发出 stopped 事件', () => {
      const handler = vi.fn()
      engine.on('stopped', handler)

      engine.start({ ...DEFAULT_CLICKER_CONFIG, interval: 100 })
      vi.advanceTimersByTime(200) // 额外执行 2 次
      engine.stop()

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ clickCount: 3 })
      )
    })
  })

  // ====== 次数限制 ======

  describe('次数限制', () => {
    it('达到次数上限应自动停止', () => {
      engine.start({
        ...DEFAULT_CLICKER_CONFIG,
        interval: 100,
        maxClicks: 3,
      })

      // 第 1 次（立即）
      expect(engine.getClickCount()).toBe(1)

      // 第 2 次
      vi.advanceTimersByTime(100)
      expect(engine.getClickCount()).toBe(2)

      // 第 3 次 → 达到上限
      vi.advanceTimersByTime(100)
      expect(engine.getClickCount()).toBe(3)
      expect(engine.getState()).toBe('idle')
    })

    it('达到上限应发出 completed 事件', () => {
      const handler = vi.fn()
      engine.on('completed', handler)

      engine.start({
        ...DEFAULT_CLICKER_CONFIG,
        interval: 100,
        maxClicks: 1,
      })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ clickCount: 1 })
      )
    })

    it('maxClicks=0 应为无限模式', () => {
      engine.start({
        ...DEFAULT_CLICKER_CONFIG,
        interval: 50,
        maxClicks: 0,
      })

      vi.advanceTimersByTime(500) // 10 次定时器
      expect(engine.getClickCount()).toBe(11) // 1 初始 + 10
      expect(engine.getState()).toBe('running')
    })
  })

  // ====== 点击位置 ======

  describe('点击位置', () => {
    it('follow 模式应使用鼠标当前位置', () => {
      (getCursorPosition as any).mockReturnValue({ x: 123, y: 456 })

      engine.start({
        ...DEFAULT_CLICKER_CONFIG,
        interval: 100,
        positionMode: 'follow',
      })

      expect(mouseClick).toHaveBeenCalledWith(123, 456, 'left')
    })

    it('fixed 模式应使用固定坐标', () => {
      engine.start({
        ...DEFAULT_CLICKER_CONFIG,
        interval: 100,
        positionMode: 'fixed',
        fixedPosition: { x: 800, y: 600 },
      })

      expect(mouseClick).toHaveBeenCalledWith(800, 600, 'left')
    })

    it('multi 模式应轮询多个坐标', () => {
      const handler = vi.fn()
      engine.on('click', handler)

      engine.start({
        ...DEFAULT_CLICKER_CONFIG,
        interval: 100,
        positionMode: 'multi',
        multiPositions: [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
          { x: 50, y: 60 },
        ],
      })

      // 第 1 次 → 坐标 A
      expect(mouseClick).toHaveBeenNthCalledWith(1, 10, 20, 'left')

      // 第 2 次 → 坐标 B
      vi.advanceTimersByTime(100)
      expect(mouseClick).toHaveBeenNthCalledWith(2, 30, 40, 'left')

      // 第 3 次 → 坐标 C
      vi.advanceTimersByTime(100)
      expect(mouseClick).toHaveBeenNthCalledWith(3, 50, 60, 'left')

      // 第 4 次 → 回到坐标 A
      vi.advanceTimersByTime(100)
      expect(mouseClick).toHaveBeenNthCalledWith(4, 10, 20, 'left')
    })

    it('multi 模式空列表应回退到鼠标位置', () => {
      (getCursorPosition as any).mockReturnValue({ x: 999, y: 888 })

      engine.start({
        ...DEFAULT_CLICKER_CONFIG,
        interval: 100,
        positionMode: 'multi',
        multiPositions: [],
      })

      expect(mouseClick).toHaveBeenCalledWith(999, 888, 'left')
    })
  })

  // ====== 鼠标按键 ======

  describe('鼠标按键', () => {
    it('应支持右键点击', () => {
      engine.start({
        ...DEFAULT_CLICKER_CONFIG,
        interval: 100,
        button: 'right',
      })
      expect(mouseClick).toHaveBeenCalledWith(500, 300, 'right')
    })

    it('应支持中键点击', () => {
      engine.start({
        ...DEFAULT_CLICKER_CONFIG,
        interval: 100,
        button: 'middle',
      })
      expect(mouseClick).toHaveBeenCalledWith(500, 300, 'middle')
    })
  })

  // ====== 双击 ======

  describe('双击模式', () => {
    it('双击模式应使用 mouseDoubleClick', () => {
      engine.start({
        ...DEFAULT_CLICKER_CONFIG,
        interval: 100,
        clickType: 'double',
      })
      expect(mouseDoubleClick).toHaveBeenCalledTimes(1)
      expect(mouseClick).not.toHaveBeenCalled()
    })
  })

  // ====== 延迟启动 ======

  describe('延迟启动', () => {
    it('应先进入 countdown 状态', () => {
      engine.start({
        ...DEFAULT_CLICKER_CONFIG,
        interval: 100,
        startDelay: 3,
      })
      expect(engine.getState()).toBe('countdown')
      expect(mouseClick).not.toHaveBeenCalled()
    })

    it('倒计时结束后应开始点击', () => {
      engine.start({
        ...DEFAULT_CLICKER_CONFIG,
        interval: 100,
        startDelay: 2,
      })

      vi.advanceTimersByTime(1999) // 还没到 2 秒
      expect(engine.getState()).toBe('countdown')
      expect(mouseClick).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1) // 刚好 2 秒
      expect(engine.getState()).toBe('running')
      expect(mouseClick).toHaveBeenCalledTimes(1)
    })

    it('倒计时期间停止应取消连点', () => {
      engine.start({
        ...DEFAULT_CLICKER_CONFIG,
        interval: 100,
        startDelay: 3,
      })

      engine.stop()
      expect(engine.getState()).toBe('idle')

      vi.advanceTimersByTime(5000)
      expect(mouseClick).not.toHaveBeenCalled()
    })
  })

  // ====== destroy() ======

  describe('destroy()', () => {
    it('销毁后应停止运行', () => {
      engine.start({ ...DEFAULT_CLICKER_CONFIG, interval: 100 })
      engine.destroy()

      vi.advanceTimersByTime(500)
      // 只有销毁前的第一次点击
      expect(mouseClick).toHaveBeenCalledTimes(1)
    })

    it('销毁后应移除所有监听器', () => {
      const handler = vi.fn()
      engine.on('click', handler)
      engine.destroy()

      expect(engine.listenerCount('click')).toBe(0)
    })
  })
})
