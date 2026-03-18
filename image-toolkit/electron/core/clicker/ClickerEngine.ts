/**
 * 连点器引擎
 *
 * 管理连点的启停、定时、位置计算和次数控制。
 * 通过 EventEmitter 推送状态和点击计数到上层。
 */
import { EventEmitter } from 'node:events'
import { mouseClick, mouseDoubleClick, getCursorPosition } from './win32'
import type { ClickerConfig, ClickerState } from './types'

export class ClickerEngine extends EventEmitter {
  private state: ClickerState = 'idle'
  private config: ClickerConfig | null = null
  private clickCount = 0
  private timer: ReturnType<typeof setInterval> | null = null
  private countdownTimer: ReturnType<typeof setTimeout> | null = null
  private multiIndex = 0 // 多点轮询当前索引

  /** 当前状态 */
  getState(): ClickerState {
    return this.state
  }

  /** 当前点击次数 */
  getClickCount(): number {
    return this.clickCount
  }

  /** 启动连点 */
  start(config: ClickerConfig): void {
    if (this.state !== 'idle') {
      return
    }

    this.config = { ...config }
    this.clickCount = 0
    this.multiIndex = 0

    if (config.startDelay > 0) {
      this.setState('countdown')
      this.countdownTimer = setTimeout(() => {
        this.countdownTimer = null
        this.beginClicking()
      }, config.startDelay * 1000)
    } else {
      this.beginClicking()
    }
  }

  /** 停止连点 */
  stop(): void {
    if (this.state === 'idle') return

    this.clearTimers()
    this.setState('idle')
    this.emit('stopped', { clickCount: this.clickCount })
  }

  /** 内部：开始点击循环 */
  private beginClicking(): void {
    if (!this.config) return

    this.setState('running')

    // 立即执行第一次点击
    this.tick()

    // 设置定时器
    this.timer = setInterval(() => {
      this.tick()
    }, this.config.interval)
  }

  /** 内部：每次点击执行 */
  private tick(): void {
    if (!this.config || this.state !== 'running') return

    const pos = this.getNextPosition()
    const { button, clickType } = this.config

    try {
      if (clickType === 'double') {
        mouseDoubleClick(pos.x, pos.y, button)
      } else {
        mouseClick(pos.x, pos.y, button)
      }
    } catch (e) {
      console.error('[ClickerEngine] 点击执行失败:', e)
    }

    this.clickCount++
    this.emit('click', { count: this.clickCount, position: pos })

    // 检查次数限制
    if (this.config.maxClicks > 0 && this.clickCount >= this.config.maxClicks) {
      this.clearTimers()
      this.setState('idle')
      this.emit('completed', { clickCount: this.clickCount })
    }
  }

  /** 内部：获取下一个点击位置 */
  private getNextPosition(): { x: number; y: number } {
    if (!this.config) return { x: 0, y: 0 }

    switch (this.config.positionMode) {
      case 'fixed':
        return this.config.fixedPosition

      case 'multi': {
        const positions = this.config.multiPositions
        if (positions.length === 0) return getCursorPosition()
        const pos = positions[this.multiIndex % positions.length]
        this.multiIndex++
        return pos
      }

      case 'follow':
      default:
        return getCursorPosition()
    }
  }

  /** 内部：设置状态并通知 */
  private setState(newState: ClickerState): void {
    this.state = newState
    this.emit('state-change', {
      state: newState,
      clickCount: this.clickCount,
    })
  }

  /** 内部：清理所有定时器 */
  private clearTimers(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer)
      this.countdownTimer = null
    }
  }

  /** 销毁引擎 */
  destroy(): void {
    this.stop()
    this.removeAllListeners()
  }
}
