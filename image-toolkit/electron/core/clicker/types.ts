/**
 * 连点器类型定义
 */

/** 鼠标按键类型 */
export type MouseButton = 'left' | 'right' | 'middle'

/** 点击方式 */
export type ClickType = 'single' | 'double'

/** 位置模式 */
export type PositionMode = 'follow' | 'fixed' | 'multi'

/** 连点器配置 */
export interface ClickerConfig {
  /** 点击间隔（毫秒），范围 20~5000 */
  interval: number
  /** 鼠标按键 */
  button: MouseButton
  /** 点击方式 */
  clickType: ClickType
  /** 点击次数限制，0 = 无限 */
  maxClicks: number
  /** 位置模式 */
  positionMode: PositionMode
  /** 固定坐标（positionMode='fixed' 时使用） */
  fixedPosition: { x: number; y: number }
  /** 多点坐标列表（positionMode='multi' 时使用） */
  multiPositions: { x: number; y: number }[]
  /** 启动延迟（秒） */
  startDelay: number
}

/** 连点器状态 */
export type ClickerState = 'idle' | 'countdown' | 'running'

/** 连点器状态信息（IPC 推送） */
export interface ClickerStatus {
  state: ClickerState
  clickCount: number
  config: ClickerConfig
}

/** 默认配置 */
export const DEFAULT_CLICKER_CONFIG: ClickerConfig = {
  interval: 100,
  button: 'left',
  clickType: 'single',
  maxClicks: 0,
  positionMode: 'follow',
  fixedPosition: { x: 0, y: 0 },
  multiPositions: [],
  startDelay: 0,
}
