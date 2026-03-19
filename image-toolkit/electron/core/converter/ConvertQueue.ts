/**
 * 转换队列 — 串行执行转换任务
 *
 * 串行原因：
 * 1. LibreOffice CLI 不支持并发
 * 2. 大文档内存消耗高
 * 3. 进度反馈更直观
 */
import { EventEmitter } from 'node:events'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { ConvertEngine } from './ConvertEngine'
import type { ConvertTask, ConvertConfig, ConvertDirection } from './types'

export class ConvertQueue extends EventEmitter {
  private queue: ConvertTask[] = []
  private running = false
  private cancelled = false
  private engine: ConvertEngine

  constructor(engine: ConvertEngine) {
    super()
    this.engine = engine
  }

  /** 添加文件并创建任务 */
  addTasks(files: string[], config: ConvertConfig): ConvertTask[] {
    const tasks: ConvertTask[] = files.map((filePath) => {
      const ext = this.getOutputExtension(config.direction)
      const baseName = path.basename(filePath, path.extname(filePath))
      const outputPath = path.join(config.outputDir || path.dirname(filePath), `${baseName}.${ext}`)

      return {
        id: this.generateId(),
        inputPath: filePath,
        outputPath,
        direction: config.direction,
        status: 'pending' as const,
        progress: 0,
        inputSize: 0,
      }
    })

    this.queue.push(...tasks)
    return tasks
  }

  /** 开始处理队列 */
  async start(config: ConvertConfig): Promise<void> {
    if (this.running) return
    this.running = true
    this.cancelled = false

    const total = this.queue.length
    let completed = 0
    let failed = 0

    while (this.queue.length > 0 && !this.cancelled) {
      const task = this.queue[0]
      task.status = 'converting'
      task.startTime = Date.now()

      this.emit('taskStart', { taskId: task.id, fileName: path.basename(task.inputPath) })

      try {
        // 获取输入文件大小
        const stats = await stat(task.inputPath)
        task.inputSize = stats.size

        const output = await this.engine.convert(task.direction, {
          inputPath: task.inputPath,
          outputDir: config.outputDir || path.dirname(task.inputPath),
          config,
          onProgress: (p) => {
            task.progress = p
            this.emit('progress', { taskId: task.id, progress: p })
          },
        })

        task.status = 'completed'
        task.outputPath = output.outputPath
        task.outputSize = output.outputSize
        task.endTime = Date.now()
        completed++

        this.emit('taskDone', {
          taskId: task.id,
          outputPath: output.outputPath,
          outputSize: output.outputSize,
          duration: task.endTime - task.startTime!,
        })
      } catch (e: any) {
        task.status = 'failed'
        task.error = e.message
        task.endTime = Date.now()
        failed++

        this.emit('taskError', {
          taskId: task.id,
          error: e.message,
          recoverable: true,
        })
      }

      this.queue.shift()
    }

    this.running = false
    this.emit('batchDone', { total, completed, failed })
  }

  /** 取消所有任务 */
  cancel(): void {
    this.cancelled = true
    this.queue = []
  }

  /** 获取队列状态 */
  getStatus() {
    return {
      running: this.running,
      queueLength: this.queue.length,
      tasks: [...this.queue],
    }
  }

  /** 根据转换方向获取输出扩展名 */
  private getOutputExtension(direction: ConvertDirection): string {
    const map: Record<string, string> = {
      'docx-to-pdf': 'pdf',
      'docx-to-md': 'md',
      'docx-to-html': 'html',
      'pptx-to-docx': 'docx',
      'pptx-to-pdf': 'pdf',
      'pptx-to-image': 'png',
      'pdf-to-docx': 'docx',
      'pdf-to-md': 'md',
      'md-to-html': 'html',
      'md-to-docx': 'docx',
      'html-to-md': 'md',
    }
    return map[direction] || 'bin'
  }

  /** 生成 UUID */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}
