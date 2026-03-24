/**
 * 主题切换 Composable
 *
 * 管理浅色/深色主题，同步 CSS data-theme 属性和 Naive UI 主题
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { darkTheme } from 'naive-ui'
import { useSettingsStore, type ThemeMode } from '../stores/settings.store'
import { lightThemeOverrides, darkThemeOverrides } from '../theme/naiveThemeOverrides'

const isDark = ref(false)
const systemPrefersDark = ref(false)

export function useTheme() {
  const settingsStore = useSettingsStore()

  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleSystemThemeChange = (e: MediaQueryListEvent) => {
    systemPrefersDark.value = e.matches
    if (settingsStore.theme === 'system') {
      applyTheme()
    }
  }

  // 实际渲染的主题状态
  const resolvedIsDark = computed(() => {
    if (settingsStore.theme === 'system') {
      return systemPrefersDark.value
    }
    return settingsStore.theme === 'dark'
  })

  const currentTheme = computed(() => (resolvedIsDark.value ? darkTheme : null))
  const currentThemeOverrides = computed(() => 
    resolvedIsDark.value ? darkThemeOverrides : lightThemeOverrides
  )

  const siderBg = computed(() => 'var(--bg-sidebar)')
  const logoBorder = computed(() => 'var(--border-light)')

  let switchTimer: number | null = null

  // 设置指定的主题模式，带防抖
  function setThemeMode(mode: ThemeMode) {
    if (switchTimer) clearTimeout(switchTimer)
    switchTimer = window.setTimeout(async () => {
      await settingsStore.setTheme(mode)
      applyTheme()
    }, 100) // 简短防抖
  }

  // 快捷切换主题 (UI 上提供快捷按钮时可循环切换)
  function toggleTheme() {
    const nextModeMap: Record<ThemeMode, ThemeMode> = {
      'light': 'dark',
      'dark': 'system',
      'system': 'light'
    }
    setThemeMode(nextModeMap[settingsStore.theme])
  }

  function applyTheme() {
    isDark.value = resolvedIsDark.value
    
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
    systemPrefersDark.value = mediaQuery.matches
    applyTheme()
  }

  onMounted(() => {
    mediaQuery.addEventListener('change', handleSystemThemeChange)
  })

  onUnmounted(() => {
    mediaQuery.removeEventListener('change', handleSystemThemeChange)
  })

  // 监听 store 变化，如果别处修改了 settingsStore.theme，响应变化
  watch(() => settingsStore.theme, () => {
    applyTheme()
  })

  return {
    isDark: resolvedIsDark,
    currentTheme,
    currentThemeOverrides,
    themeMode: computed(() => settingsStore.theme),
    siderBg,
    logoBorder,
    toggleTheme,
    setThemeMode,
    initFromSettings,
  }
}
