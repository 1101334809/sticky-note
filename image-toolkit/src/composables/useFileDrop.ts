/**
 * 文件拖拽 Composable（V2 升级版）
 *
 * 支持格式识别 + 自动路由分发
 * T-016
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const SVG_EXTS = ['.svg']
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tiff', '.tif']

export interface ClassifiedFiles {
  svg: string[]
  image: string[]
  unknown: string[]
}

/** 根据扩展名分类文件 */
export function classifyFiles(paths: string[]): ClassifiedFiles {
  const result: ClassifiedFiles = { svg: [], image: [], unknown: [] }

  for (const p of paths) {
    const ext = '.' + p.split('.').pop()?.toLowerCase()
    if (SVG_EXTS.includes(ext)) {
      result.svg.push(p)
    } else if (IMAGE_EXTS.includes(ext)) {
      result.image.push(p)
    } else {
      result.unknown.push(p)
    }
  }
  return result
}

export interface DroppedFiles {
  paths: string[]
  route: string
  classified: ClassifiedFiles
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
    if (!e.relatedTarget) isDragging.value = false
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = false

    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return

    const paths: string[] = []
    for (let i = 0; i < files.length; i++) {
      const filePath = (files[i] as any).path
      if (filePath) paths.push(filePath)
    }

    if (paths.length > 0 && onDrop) {
      const classified = classifyFiles(paths)
      onDrop({
        paths,
        route: router.currentRoute.value.path,
        classified,
      })
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
