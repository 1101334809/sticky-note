import { ipcRenderer, contextBridge } from 'electron'

// 尝试同步获取持久化的主题并立即应用，避免页面闪烁 (FOUC)
try {
  const theme = ipcRenderer.sendSync('config:getSync', 'theme') || 'system'
  let isDark = false
  if (theme === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  } else {
    isDark = theme === 'dark'
  }
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
} catch (e) {
  // Ignore
}

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other API you need here.
  // ...
})

