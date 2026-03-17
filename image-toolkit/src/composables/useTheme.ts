/**
 * 主题切换 Composable
 *
 * 管理浅色/深色主题，同步 CSS data-theme 属性和 Naive UI 主题
 */
import { ref, computed } from 'vue'
import { darkTheme } from 'naive-ui'
import { useSettingsStore } from '../stores/settings.store'

const isDark = ref(false)

export function useTheme() {
  const settingsStore = useSettingsStore()

  const currentTheme = computed(() => (isDark.value ? darkTheme : null))

  const siderBg = computed(() =>
    isDark.value ? 'var(--bg-sider)' : 'var(--bg-sider)'
  )

  const logoBorder = computed(() => 'var(--border-light)')

  function toggleTheme() {
    isDark.value = !isDark.value
    applyTheme()
    settingsStore.setTheme(isDark.value ? 'dark' : 'light')
  }

  function applyTheme() {
    // CSS 变量主题切换
    document.documentElement.setAttribute(
      'data-theme',
      isDark.value ? 'dark' : 'light'
    )
    // 通知主进程更新原生窗口背景色
    window.ipcRenderer?.invoke('theme:toggle', isDark.value)
  }

  /** 初始化时从持久化偏好同步 */
  function initFromSettings() {
    isDark.value = settingsStore.theme === 'dark'
    applyTheme()
  }

  return {
    isDark,
    currentTheme,
    siderBg,
    logoBorder,
    toggleTheme,
    initFromSettings,
  }
}
