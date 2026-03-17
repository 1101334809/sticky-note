/**
 * 撤销/重做 状态管理 (undoStore)
 *
 * 支持完整的多级撤销栈，容量上限 50
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface UndoableAction {
  type: string         // 'file:remove' | 'file:clear' | 'color:change' | ...
  description: string  // 供 UI 显示："删除了 icon.svg"
  timestamp: number
  undo: () => void
  redo: () => void
}

const MAX_STACK_SIZE = 50

export const useUndoStore = defineStore('undo', () => {
  // ====== State ======
  const undoStack = ref<UndoableAction[]>([])
  const redoStack = ref<UndoableAction[]>([])

  // ====== Getters ======
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const lastAction = computed(() =>
    undoStack.value.length > 0 ? undoStack.value[undoStack.value.length - 1] : null
  )

  // ====== Actions ======

  /** 推入一个可撤销操作 */
  function push(action: UndoableAction) {
    undoStack.value.push(action)
    // 超过容量时丢弃最早的
    if (undoStack.value.length > MAX_STACK_SIZE) {
      undoStack.value.shift()
    }
    // 新操作会清空重做栈
    redoStack.value = []
  }

  /** 撤销 */
  function undo(): UndoableAction | null {
    const action = undoStack.value.pop()
    if (action) {
      action.undo()
      redoStack.value.push(action)
      return action
    }
    return null
  }

  /** 重做 */
  function redo(): UndoableAction | null {
    const action = redoStack.value.pop()
    if (action) {
      action.redo()
      undoStack.value.push(action)
      return action
    }
    return null
  }

  /** 清空撤销/重做栈 */
  function clear() {
    undoStack.value = []
    redoStack.value = []
  }

  return {
    undoStack,
    redoStack,
    canUndo,
    canRedo,
    lastAction,
    push,
    undo,
    redo,
    clear,
  }
})
