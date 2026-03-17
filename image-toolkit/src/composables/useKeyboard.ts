/**
 * 键盘快捷键 Composable
 *
 * 注册全局快捷键：Ctrl+Z/Ctrl+Shift+Z/Ctrl+A/Delete
 * T-045
 */
import { onMounted, onUnmounted } from 'vue'
import { useUndoStore } from '../stores/undo.store'
import { useFileStore } from '../stores/file.store'

export function useKeyboard() {
  const undoStore = useUndoStore()
  const fileStore = useFileStore()

  function handleKeyDown(e: KeyboardEvent) {
    const isCtrl = e.ctrlKey || e.metaKey

    // Ctrl+Z — 撤销
    if (isCtrl && !e.shiftKey && e.key === 'z') {
      e.preventDefault()
      if (undoStore.canUndo) {
        const action = undoStore.undo()
        if (action) {
          console.log(`[Undo] ${action.description}`)
        }
      }
      return
    }

    // Ctrl+Shift+Z — 重做
    if (isCtrl && e.shiftKey && e.key === 'z') {
      e.preventDefault()
      if (undoStore.canRedo) {
        const action = undoStore.redo()
        if (action) {
          console.log(`[Redo] ${action.description}`)
        }
      }
      return
    }

    // Ctrl+A — 全选文件
    if (isCtrl && e.key === 'a') {
      // 仅在非输入框中生效
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      fileStore.selectAll()
      return
    }

    // Delete — 删除选中文件
    if (e.key === 'Delete') {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      const selected = fileStore.selectedFiles
      if (selected.length > 0) {
        const removed = [...selected]
        removed.forEach(f => fileStore.removeFile(f.path))
        undoStore.push({
          type: 'file:batchRemove',
          description: `删除了 ${removed.length} 个选中文件`,
          timestamp: Date.now(),
          undo: () => fileStore.addFiles(removed),
          redo: () => removed.forEach(f => fileStore.removeFile(f.path)),
        })
      }
      return
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })
}
