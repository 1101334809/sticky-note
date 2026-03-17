/**
 * 用户偏好 状态管理 (settingsStore)
 *
 * 通过 IPC 调用 electron-store 实现跨会话持久化
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // ====== State ======
  const outputDir = ref<string | null>(null)
  const keepOriginalFile = ref(true)
  const soundEnabled = ref(true)
  const theme = ref<'light' | 'dark'>('light')

  // ====== Internal ======

  async function loadFromConfig(key: string, defaultValue: any): Promise<any> {
    try {
      const value = await window.ipcRenderer.invoke('config:get', key)
      return value ?? defaultValue
    } catch {
      return defaultValue
    }
  }

  async function saveToConfig(key: string, value: any): Promise<void> {
    try {
      await window.ipcRenderer.invoke('config:set', key, value)
    } catch (e) {
      console.error(`Failed to save config "${key}":`, e)
    }
  }

  // ====== Actions ======

  /** 初始化：从持久化存储加载偏好 */
  async function init() {
    outputDir.value = await loadFromConfig('outputDir', null)
    keepOriginalFile.value = await loadFromConfig('keepOriginalFile', true)
    soundEnabled.value = await loadFromConfig('soundEnabled', true)
    theme.value = await loadFromConfig('theme', 'light')
  }

  async function setOutputDir(dir: string | null) {
    outputDir.value = dir
    await saveToConfig('outputDir', dir)
  }

  async function setKeepOriginalFile(value: boolean) {
    keepOriginalFile.value = value
    await saveToConfig('keepOriginalFile', value)
  }

  async function setSoundEnabled(value: boolean) {
    soundEnabled.value = value
    await saveToConfig('soundEnabled', value)
  }

  async function setTheme(value: 'light' | 'dark') {
    theme.value = value
    await saveToConfig('theme', value)
  }

  return {
    outputDir,
    keepOriginalFile,
    soundEnabled,
    theme,
    init,
    setOutputDir,
    setKeepOriginalFile,
    setSoundEnabled,
    setTheme,
  }
})
