import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUndoStore } from '../../src/stores/undo.store'

describe('undoStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function createAction(type = 'test', overrides: any = {}) {
    return {
      type,
      description: `Test action: ${type}`,
      timestamp: Date.now(),
      undo: vi.fn(),
      redo: vi.fn(),
      ...overrides,
    }
  }

  // ====== push ======

  describe('push', () => {
    it('应推入操作到撤销栈', () => {
      const store = useUndoStore()
      store.push(createAction())
      expect(store.undoStack).toHaveLength(1)
    })

    it('新操作应清空重做栈', () => {
      const store = useUndoStore()
      const action1 = createAction('first')
      const action2 = createAction('second')
      store.push(action1)
      store.undo() // 撤销后 action1 进入重做栈
      expect(store.redoStack).toHaveLength(1)

      store.push(action2) // 新操作应清空重做栈
      expect(store.redoStack).toHaveLength(0)
    })

    it('超过容量应丢弃最早的操作', () => {
      const store = useUndoStore()
      for (let i = 0; i < 55; i++) {
        store.push(createAction(`action-${i}`))
      }
      expect(store.undoStack.length).toBeLessThanOrEqual(50)
      // 最早的 5 个被丢弃，最新的保留
      expect(store.undoStack[store.undoStack.length - 1].type).toBe('action-54')
    })
  })

  // ====== undo ======

  describe('undo', () => {
    it('空栈应返回 null', () => {
      const store = useUndoStore()
      expect(store.undo()).toBeNull()
    })

    it('应执行 undo 回调', () => {
      const store = useUndoStore()
      const action = createAction()
      store.push(action)
      store.undo()
      expect(action.undo).toHaveBeenCalledOnce()
    })

    it('撤销后应移入重做栈', () => {
      const store = useUndoStore()
      store.push(createAction())
      store.undo()
      expect(store.undoStack).toHaveLength(0)
      expect(store.redoStack).toHaveLength(1)
    })

    it('应返回被撤销的操作', () => {
      const store = useUndoStore()
      const action = createAction('my-action')
      store.push(action)
      const result = store.undo()
      expect(result).not.toBeNull()
      expect(result!.type).toBe('my-action')
    })
  })

  // ====== redo ======

  describe('redo', () => {
    it('空栈应返回 null', () => {
      const store = useUndoStore()
      expect(store.redo()).toBeNull()
    })

    it('应执行 redo 回调', () => {
      const store = useUndoStore()
      const action = createAction()
      store.push(action)
      store.undo()
      store.redo()
      expect(action.redo).toHaveBeenCalledOnce()
    })

    it('重做后应移回撤销栈', () => {
      const store = useUndoStore()
      store.push(createAction())
      store.undo()
      store.redo()
      expect(store.undoStack).toHaveLength(1)
      expect(store.redoStack).toHaveLength(0)
    })
  })

  // ====== clear ======

  describe('clear', () => {
    it('应清空双栈', () => {
      const store = useUndoStore()
      store.push(createAction())
      store.push(createAction())
      store.undo()
      expect(store.undoStack.length).toBeGreaterThan(0)
      expect(store.redoStack.length).toBeGreaterThan(0)

      store.clear()
      expect(store.undoStack).toHaveLength(0)
      expect(store.redoStack).toHaveLength(0)
    })
  })

  // ====== getters ======

  describe('getters', () => {
    it('canUndo / canRedo 应正确反映栈状态', () => {
      const store = useUndoStore()
      expect(store.canUndo).toBe(false)
      expect(store.canRedo).toBe(false)

      store.push(createAction())
      expect(store.canUndo).toBe(true)

      store.undo()
      expect(store.canUndo).toBe(false)
      expect(store.canRedo).toBe(true)
    })

    it('lastAction 应返回栈顶操作', () => {
      const store = useUndoStore()
      expect(store.lastAction).toBeNull()

      store.push(createAction('first'))
      store.push(createAction('second'))
      expect(store.lastAction?.type).toBe('second')
    })
  })

  // ====== undo/redo 多轮往返 ======

  describe('多轮撤销/重做', () => {
    it('应支持连续 undo → redo → undo 往返', () => {
      const store = useUndoStore()
      let counter = 0
      store.push(createAction('inc', {
        undo: () => { counter-- },
        redo: () => { counter++ },
      }))
      counter = 1 // 模拟初始执行

      store.undo()
      expect(counter).toBe(0)

      store.redo()
      expect(counter).toBe(1)

      store.undo()
      expect(counter).toBe(0)
    })
  })
})
