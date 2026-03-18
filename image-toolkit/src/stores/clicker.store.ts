/**
 * 连点器状态管理 (Pinia)
 *
 * 管理连点器配置、运行状态和 IPC 通信
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ClickerConfig, ClickerState } from '../../electron/core/clicker/types'
import { DEFAULT_CLICKER_CONFIG } from '../../electron/core/clicker/types'

export const useClickerStore = defineStore('clicker', () => {
  // ====== State ======
  const state = ref<ClickerState>('idle')
  const clickCount = ref(0)
  const config = ref<ClickerConfig>({ ...DEFAULT_CLICKER_CONFIG })

  // ====== IPC 事件监听 ======
  const listeners: Array<() => void> = []

  function setupListeners() {
    const onState = (_e: any, data: { state: ClickerState; clickCount: number }) => {
      state.value = data.state
      clickCount.value = data.clickCount
    }

    const onClick = (_e: any, data: { count: number }) => {
      clickCount.value = data.count
    }

    const onCompleted = (_e: any, _data: { clickCount: number }) => {
      state.value = 'idle'
    }

    const onStopped = (_e: any, _data: { clickCount: number }) => {
      state.value = 'idle'
    }

    const onHotkeyToggle = (_e: any, data: { action: string }) => {
      if (data.action === 'start' && state.value === 'idle') {
        start()
      }
    }

    window.ipcRenderer.on('clicker:state', onState)
    window.ipcRenderer.on('clicker:click', onClick)
    window.ipcRenderer.on('clicker:completed', onCompleted)
    window.ipcRenderer.on('clicker:stopped', onStopped)
    window.ipcRenderer.on('clicker:hotkeyToggle', onHotkeyToggle)

    listeners.push(
      () => window.ipcRenderer.off('clicker:state', onState),
      () => window.ipcRenderer.off('clicker:click', onClick),
      () => window.ipcRenderer.off('clicker:completed', onCompleted),
      () => window.ipcRenderer.off('clicker:stopped', onStopped),
      () => window.ipcRenderer.off('clicker:hotkeyToggle', onHotkeyToggle),
    )
  }

  function removeListeners() {
    listeners.forEach(fn => fn())
    listeners.length = 0
  }

  // ====== Actions ======

  async function start() {
    try {
      // JSON 深拷贝去掉 Vue 响应式代理，否则 Electron IPC structured clone 会失败
      const rawConfig = JSON.parse(JSON.stringify(config.value))
      console.log('[clicker-store] 启动连点，配置:', rawConfig)
      const result = await window.ipcRenderer.invoke('clicker:start', rawConfig)
      console.log('[clicker-store] IPC 返回:', result)
      if (!result.success) {
        console.error('连点器启动失败:', result.error)
      }
    } catch (e) {
      console.error('连点器启动异常:', e)
    }
  }

  async function stop() {
    try {
      await window.ipcRenderer.invoke('clicker:stop')
    } catch (e) {
      console.error('连点器停止异常:', e)
    }
  }

  async function toggle() {
    if (state.value === 'idle') {
      await start()
    } else {
      await stop()
    }
  }

  function updateConfig(partial: Partial<ClickerConfig>) {
    config.value = { ...config.value, ...partial }
  }

  /** 从持久化加载配置 */
  async function loadConfig() {
    try {
      const saved = await window.ipcRenderer.invoke('config:get', 'clickerConfig')
      if (saved) {
        config.value = { ...DEFAULT_CLICKER_CONFIG, ...saved }
      }
    } catch { /* 首次使用，使用默认配置 */ }
  }

  /** 保存配置到持久化 */
  async function saveConfig() {
    try {
      const rawConfig = JSON.parse(JSON.stringify(config.value))
      await window.ipcRenderer.invoke('config:set', 'clickerConfig', rawConfig)
    } catch (e) {
      console.error('保存连点器配置失败:', e)
    }
  }

  return {
    state,
    clickCount,
    config,
    start,
    stop,
    toggle,
    updateConfig,
    loadConfig,
    saveConfig,
    setupListeners,
    removeListeners,
  }
})
