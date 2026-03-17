import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFileStore, type FileEntry } from '../../src/stores/file.store'

/** 创建一个测试用的 FileEntry */
function createEntry(overrides: Partial<FileEntry> = {}): FileEntry {
  return {
    path: '/test/photo.png',
    name: 'photo.png',
    size: 1024,
    type: 'PNG',
    status: 'pending',
    ...overrides,
  }
}

describe('fileStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ====== addFiles ======

  describe('addFiles', () => {
    it('应追加新文件到列表', () => {
      const store = useFileStore()
      const entry = createEntry()
      store.addFiles([entry])
      expect(store.files).toHaveLength(1)
      expect(store.files[0].name).toBe('photo.png')
    })

    it('应返回重复文件数量', () => {
      const store = useFileStore()
      const entry = createEntry()
      store.addFiles([entry])
      const duplicates = store.addFiles([entry])
      expect(duplicates).toBe(1)
      expect(store.files).toHaveLength(1) // 仍然只有1个
    })

    it('应处理混合新旧文件', () => {
      const store = useFileStore()
      store.addFiles([createEntry({ path: '/a.png', name: 'a.png' })])
      const dupes = store.addFiles([
        createEntry({ path: '/a.png', name: 'a.png' }), // 重复
        createEntry({ path: '/b.png', name: 'b.png' }), // 新
      ])
      expect(dupes).toBe(1)
      expect(store.files).toHaveLength(2)
    })

    it('应处理空数组', () => {
      const store = useFileStore()
      const result = store.addFiles([])
      expect(result).toBe(0)
      expect(store.files).toHaveLength(0)
    })
  })

  // ====== removeFile ======

  describe('removeFile', () => {
    it('应移除存在的文件并返回', () => {
      const store = useFileStore()
      store.addFiles([createEntry()])
      const removed = store.removeFile('/test/photo.png')
      expect(removed).toBeDefined()
      expect(removed!.name).toBe('photo.png')
      expect(store.files).toHaveLength(0)
    })

    it('不存在的文件应返回 undefined', () => {
      const store = useFileStore()
      const removed = store.removeFile('/no-such-file.png')
      expect(removed).toBeUndefined()
    })
  })

  // ====== clearFiles ======

  describe('clearFiles', () => {
    it('应清空列表并返回旧文件', () => {
      const store = useFileStore()
      store.addFiles([
        createEntry({ path: '/a.png' }),
        createEntry({ path: '/b.png' }),
      ])
      const old = store.clearFiles()
      expect(old).toHaveLength(2)
      expect(store.files).toHaveLength(0)
    })

    it('空列表清空应返回空数组', () => {
      const store = useFileStore()
      const old = store.clearFiles()
      expect(old).toHaveLength(0)
    })
  })

  // ====== updateFileStatus ======

  describe('updateFileStatus', () => {
    it('应更新有效索引的文件状态', () => {
      const store = useFileStore()
      store.addFiles([createEntry()])
      store.updateFileStatus(0, { status: 'processing', progress: 50 })
      expect(store.files[0].status).toBe('processing')
      expect(store.files[0].progress).toBe(50)
    })

    it('无效索引应不报错', () => {
      const store = useFileStore()
      expect(() => store.updateFileStatus(-1, { status: 'error' })).not.toThrow()
      expect(() => store.updateFileStatus(999, { status: 'error' })).not.toThrow()
    })
  })

  // ====== toggleSelect / selectAll / deselectAll ======

  describe('选择操作', () => {
    it('toggleSelect 应切换选中状态', () => {
      const store = useFileStore()
      store.addFiles([createEntry()])
      expect(store.files[0].selected).toBeFalsy()

      store.toggleSelect('/test/photo.png')
      expect(store.files[0].selected).toBe(true)

      store.toggleSelect('/test/photo.png')
      expect(store.files[0].selected).toBe(false)
    })

    it('selectAll 应全选', () => {
      const store = useFileStore()
      store.addFiles([
        createEntry({ path: '/a.png' }),
        createEntry({ path: '/b.png' }),
      ])
      store.selectAll()
      expect(store.files.every(f => f.selected)).toBe(true)
    })

    it('deselectAll 应取消全选', () => {
      const store = useFileStore()
      store.addFiles([createEntry({ path: '/a.png', selected: true })])
      store.deselectAll()
      expect(store.files[0].selected).toBe(false)
    })
  })

  // ====== resetAllStatus ======

  describe('resetAllStatus', () => {
    it('应重置所有文件状态为 pending', () => {
      const store = useFileStore()
      store.addFiles([
        createEntry({ path: '/a.png', status: 'success', progress: 100 }),
        createEntry({ path: '/b.png', status: 'error', error: 'fail' }),
      ])
      store.resetAllStatus()
      expect(store.files.every(f => f.status === 'pending')).toBe(true)
      expect(store.files.every(f => f.progress === undefined)).toBe(true)
      expect(store.files.every(f => f.error === undefined)).toBe(true)
    })
  })

  // ====== setProcessing ======

  describe('setProcessing', () => {
    it('应设置处理标志', () => {
      const store = useFileStore()
      expect(store.isProcessing).toBe(false)
      store.setProcessing(true)
      expect(store.isProcessing).toBe(true)
    })
  })

  // ====== Getters ======

  describe('getters', () => {
    it('fileCount 应返回文件数', () => {
      const store = useFileStore()
      expect(store.fileCount).toBe(0)
      store.addFiles([createEntry()])
      expect(store.fileCount).toBe(1)
    })

    it('hasFiles 应反映列表是否为空', () => {
      const store = useFileStore()
      expect(store.hasFiles).toBe(false)
      store.addFiles([createEntry()])
      expect(store.hasFiles).toBe(true)
    })

    it('selectedCount 应返回选中数', () => {
      const store = useFileStore()
      store.addFiles([
        createEntry({ path: '/a.png', selected: true }),
        createEntry({ path: '/b.png' }),
      ])
      expect(store.selectedCount).toBe(1)
    })

    it('selectedFiles 应返回选中文件列表', () => {
      const store = useFileStore()
      store.addFiles([
        createEntry({ path: '/a.png', name: 'a.png', selected: true }),
        createEntry({ path: '/b.png', name: 'b.png' }),
      ])
      expect(store.selectedFiles).toHaveLength(1)
      expect(store.selectedFiles[0].name).toBe('a.png')
    })
  })
})
