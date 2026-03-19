import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fs (ConvertQueue calls stat internally)
vi.mock('node:fs/promises', () => ({
  stat: vi.fn().mockResolvedValue({ size: 2048 }),
  readFile: vi.fn().mockResolvedValue(Buffer.from('mock')),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

import { ConvertQueue } from '../../electron/core/converter/ConvertQueue'
import { ConvertEngine } from '../../electron/core/converter/ConvertEngine'
import type { IConverter, ConvertInput, ConvertOutput } from '../../electron/core/converter/converters/IConverter'
import type { ConvertDirection, ConvertConfig } from '../../electron/core/converter/types'

/** 创建 mock 引擎 */
function createMockEngine(options?: { shouldFail?: boolean; delay?: number }): ConvertEngine {
  const engine = new ConvertEngine()
  const mockConverter: IConverter = {
    direction: 'docx-to-md',
    requiresLibreOffice: false,
    convert: vi.fn().mockImplementation(async (input: ConvertInput) => {
      if (options?.delay) {
        await new Promise((r) => setTimeout(r, options.delay))
      }
      input.onProgress(50)
      if (options?.shouldFail) {
        throw new Error('转换失败')
      }
      input.onProgress(100)
      return { outputPath: '/output/test.md', outputSize: 512 }
    }),
  }
  engine.register(mockConverter)
  return engine
}

describe('ConvertQueue', () => {
  let engine: ConvertEngine
  let queue: ConvertQueue
  const mockConfig: ConvertConfig = {
    direction: 'docx-to-md',
    outputDir: '/output',
  } as ConvertConfig

  beforeEach(() => {
    engine = createMockEngine()
    queue = new ConvertQueue(engine)
  })

  // ====== addTasks ======

  describe('addTasks()', () => {
    it('应创建任务列表', () => {
      const tasks = queue.addTasks(['/file1.docx', '/file2.docx'], mockConfig)
      expect(tasks).toHaveLength(2)
      expect(tasks[0].inputPath).toBe('/file1.docx')
      expect(tasks[1].inputPath).toBe('/file2.docx')
    })

    it('任务初始状态应为 pending', () => {
      const tasks = queue.addTasks(['/file.docx'], mockConfig)
      expect(tasks[0].status).toBe('pending')
    })
  })

  // ====== start ======

  describe('start()', () => {
    it('应串行执行所有任务', async () => {
      queue.addTasks(['/a.docx', '/b.docx'], mockConfig)

      const doneSpy = vi.fn()
      queue.on('taskDone', doneSpy)

      await queue.start(mockConfig)

      expect(doneSpy).toHaveBeenCalledTimes(2)
    })

    it('应发出 batchDone 事件', async () => {
      queue.addTasks(['/a.docx'], mockConfig)

      const batchSpy = vi.fn()
      queue.on('batchDone', batchSpy)

      await queue.start(mockConfig)

      expect(batchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 1,
          completed: 1,
          failed: 0,
        })
      )
    })

    it('应发出 progress 事件', async () => {
      queue.addTasks(['/a.docx'], mockConfig)

      const progressSpy = vi.fn()
      queue.on('progress', progressSpy)

      await queue.start(mockConfig)

      expect(progressSpy).toHaveBeenCalled()
    })
  })

  // ====== 单文件失败不阻断 ======

  describe('错误处理', () => {
    it('单文件失败不应阻断后续任务', async () => {
      // 创建一个总是失败的引擎
      const failEngine = createMockEngine({ shouldFail: true })
      const failQueue = new ConvertQueue(failEngine)
      failQueue.addTasks(['/fail.docx', '/fail2.docx'], mockConfig)

      const errorSpy = vi.fn()
      const batchSpy = vi.fn()
      failQueue.on('taskError', errorSpy)
      failQueue.on('batchDone', batchSpy)

      await failQueue.start(mockConfig)

      // 两个都应该尝试过
      expect(errorSpy).toHaveBeenCalledTimes(2)
      expect(batchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 2,
          completed: 0,
          failed: 2,
        })
      )
    })
  })

  // ====== cancel ======

  describe('cancel()', () => {
    it('取消后不应继续处理', async () => {
      const slowEngine = createMockEngine({ delay: 100 })
      const slowQueue = new ConvertQueue(slowEngine)
      slowQueue.addTasks(['/a.docx', '/b.docx', '/c.docx'], mockConfig)

      const doneSpy = vi.fn()
      slowQueue.on('taskDone', doneSpy)

      // 开始后立即取消
      const startPromise = slowQueue.start(mockConfig)
      slowQueue.cancel()
      await startPromise

      // 最多只完成 1 个（或 0 个，取决于取消时序）
      expect(doneSpy.mock.calls.length).toBeLessThanOrEqual(1)
    })
  })

  // ====== getStatus ======

  describe('getStatus()', () => {
    it('初始状态应为空', () => {
      const status = queue.getStatus()
      expect(status.running).toBe(false)
      expect(status.tasks).toHaveLength(0)
    })

    it('添加任务后应反映数量', () => {
      queue.addTasks(['/a.docx', '/b.docx'], mockConfig)
      const status = queue.getStatus()
      expect(status.tasks).toHaveLength(2)
    })
  })
})
