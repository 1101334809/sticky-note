import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

export interface DroppedFiles {
  paths: string[]
  route: string
}

export function useFileDrop(onDrop?: (files: DroppedFiles) => void) {
  const isDragging = ref(false)
  const router = useRouter()

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = true
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = false
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = false

    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return

    const paths: string[] = []
    for (let i = 0; i < files.length; i++) {
      // Electron 中 File 对象有 path 属性
      const filePath = (files[i] as any).path
      if (filePath) paths.push(filePath)
    }

    if (paths.length > 0 && onDrop) {
      onDrop({ paths, route: router.currentRoute.value.path })
    }
  }

  onMounted(() => {
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('drop', handleDrop)
  })

  onUnmounted(() => {
    document.removeEventListener('dragover', handleDragOver)
    document.removeEventListener('dragleave', handleDragLeave)
    document.removeEventListener('drop', handleDrop)
  })

  return { isDragging }
}
