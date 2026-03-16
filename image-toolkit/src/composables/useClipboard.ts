import { onMounted, onUnmounted } from 'vue'

export function useClipboard(onPaste?: (dataUrl: string) => void) {
  function handlePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue
        const reader = new FileReader()
        reader.onload = () => {
          if (reader.result && onPaste) {
            onPaste(reader.result as string)
          }
        }
        reader.readAsDataURL(blob)
        break
      }
    }
  }

  onMounted(() => {
    document.addEventListener('paste', handlePaste)
  })

  onUnmounted(() => {
    document.removeEventListener('paste', handlePaste)
  })
}
