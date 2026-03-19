/**
 * 文档转换 Pinia Store
 *
 * 管理文档转换的状态、配置和 IPC 通信
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ConvertDirection,
  ConvertConfig,
  ConvertStatus,
  DocFormat,
} from '../../electron/core/converter/types'
import {
  FORMAT_MATRIX,
  FORMAT_LABELS,
  FORMAT_EXTENSIONS,
  LIBREOFFICE_DIRECTIONS,
} from '../../electron/core/converter/types'

const ipcRenderer = (window as any).ipcRenderer

/** 文件列表项 */
export interface FileItem {
  id: string
  name: string
  path: string
  size: number
  status: ConvertStatus
  progress: number
  error?: string
  outputPath?: string
  outputSize?: number
}

export const useDocConvertStore = defineStore('docConvert', () => {
  // ====== 状态 ======
  const sourceFormat = ref<DocFormat>('docx')
  const targetFormat = ref<string>('md')
  const files = ref<FileItem[]>([])
  const outputDir = ref<string>('')
  const isConverting = ref(false)
  const batchResult = ref<{ total: number; completed: number; failed: number } | null>(null)

  // LibreOffice
  const loInstalled = ref<boolean | null>(null)
  const loPath = ref<string>('')
  const loVersion = ref<string>('')

  // ====== 计算属性 ======
  const direction = computed<ConvertDirection>(() => {
    const src = sourceFormat.value
    const tgt = targetFormat.value
    return `${src}-to-${tgt}` as ConvertDirection
  })

  const availableTargets = computed(() => {
    return FORMAT_MATRIX[sourceFormat.value] || []
  })

  const needsLibreOffice = computed(() => {
    return LIBREOFFICE_DIRECTIONS.includes(direction.value)
  })

  const fileExtensions = computed(() => {
    return FORMAT_EXTENSIONS[sourceFormat.value] || []
  })

  const completedCount = computed(() => files.value.filter((f) => f.status === 'completed').length)
  const failedCount = computed(() => files.value.filter((f) => f.status === 'failed').length)

  // ====== 方法 ======

  /** 初始化：加载配置、检测 LibreOffice、绑定 IPC 事件 */
  async function init() {
    // 加载记忆的输出目录
    try {
      const savedDir = await ipcRenderer?.invoke('config:get', 'docConvert.outputDir')
      if (savedDir) outputDir.value = savedDir
    } catch { /* ignore */ }

    // 检测 LibreOffice
    await checkLibreOffice()

    // 绑定 IPC 事件
    bindIpcEvents()
  }

  /** 检测 LibreOffice */
  async function checkLibreOffice() {
    try {
      const result = await ipcRenderer?.invoke('docConvert:checkLibreOffice')
      loInstalled.value = result?.installed ?? false
      loPath.value = result?.path ?? ''
      loVersion.value = result?.version ?? ''
    } catch {
      loInstalled.value = false
    }
  }

  /** 设置源格式 */
  function setSourceFormat(fmt: DocFormat) {
    sourceFormat.value = fmt
    // 自动选择第一个可用的目标格式
    const targets = FORMAT_MATRIX[fmt] || []
    targetFormat.value = targets[0] || ''
    // 清空文件列表（格式变了）
    files.value = []
  }

  /** 设置目标格式 */
  function setTargetFormat(fmt: string) {
    targetFormat.value = fmt
  }

  /** 添加文件 */
  function addFiles(paths: string[]) {
    for (const p of paths) {
      // 去重
      if (files.value.some((f) => f.path === p)) continue

      const name = p.split(/[/\\]/).pop() || p
      files.value.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        path: p,
        size: 0,
        status: 'pending',
        progress: 0,
      })
    }
  }

  /** 移除文件 */
  function removeFile(id: string) {
    files.value = files.value.filter((f) => f.id !== id)
  }

  /** 清空文件列表 */
  function clearFiles() {
    files.value = []
    batchResult.value = null
  }

  /** 选择输出目录 */
  async function selectOutputDir() {
    try {
      const result = await ipcRenderer?.invoke('docConvert:selectOutputDir')
      if (result?.success && result.path) {
        outputDir.value = result.path
        // 持久化
        await ipcRenderer?.invoke('config:set', 'docConvert.outputDir', result.path)
      }
    } catch { /* ignore */ }
  }

  /** 开始转换 */
  async function startConvert() {
    if (files.value.length === 0) return
    if (isConverting.value) return

    isConverting.value = true
    batchResult.value = null

    // 重置状态
    for (const f of files.value) {
      f.status = 'pending'
      f.progress = 0
      f.error = undefined
    }

    // 立即标记第一个文件为 converting（队列串行处理）
    if (files.value.length > 0) {
      files.value[0].status = 'converting'
    }

    const config: ConvertConfig = JSON.parse(JSON.stringify({
      direction: direction.value,
      outputDir: outputDir.value,
      imageExtractMode: 'folder',
      pptLayout: 'section',
      pdfMode: 'text',
    }))

    try {
      const result = await ipcRenderer?.invoke('docConvert:start', {
        files: files.value.map((f) => f.path),
        config,
      })

      if (!result?.success) {
        console.error('[docConvert] 启动失败:', result?.error)
        isConverting.value = false
        // 重置文件状态
        for (const f of files.value) {
          if (f.status === 'converting') f.status = 'pending'
        }
      }
    } catch (e: any) {
      console.error('[docConvert] 转换异常:', e)
      isConverting.value = false
    }
  }

  /** 取消转换 */
  async function cancelConvert() {
    await ipcRenderer?.invoke('docConvert:cancel')
    isConverting.value = false
  }

  /** 打开输出目录 */
  async function openOutputDir() {
    const dir = outputDir.value || (files.value[0]?.path ? files.value[0].path.replace(/[/\\][^/\\]+$/, '') : '')
    if (dir) {
      await ipcRenderer?.invoke('docConvert:openOutputDir', dir)
    }
  }

  /** 绑定 IPC 事件 */
  function bindIpcEvents() {
    if (!ipcRenderer) return

    // 任务开始：标记对应文件为 converting
    ipcRenderer.on('docConvert:taskStart', (_e: any, data: { taskId: string; fileName: string }) => {
      // 按文件名匹配（队列串行，文件名唯一）
      const file = files.value.find((f) => f.name === data.fileName && f.status === 'pending')
      if (file) {
        file.status = 'converting'
        file.progress = 0
      }
    })

    // 进度更新
    ipcRenderer.on('docConvert:progress', (_e: any, data: { taskId: string; progress: number }) => {
      const converting = files.value.find((f) => f.status === 'converting')
      if (converting) {
        converting.progress = data.progress
      }
    })

    // 单文件完成
    ipcRenderer.on('docConvert:taskDone', (_e: any, data: any) => {
      const converting = files.value.find((f) => f.status === 'converting')
      if (converting) {
        converting.status = 'completed'
        converting.progress = 100
        converting.outputPath = data.outputPath
        converting.outputSize = data.outputSize
      }
    })

    // 单文件失败
    ipcRenderer.on('docConvert:taskError', (_e: any, data: any) => {
      const converting = files.value.find((f) => f.status === 'converting')
      if (converting) {
        converting.status = 'failed'
        converting.error = data.error
      }
    })

    // 批量完成
    ipcRenderer.on('docConvert:batchDone', (_e: any, data: any) => {
      isConverting.value = false
      batchResult.value = {
        total: data.total,
        completed: data.completed,
        failed: data.failed,
      }
    })
  }

  return {
    // 状态
    sourceFormat,
    targetFormat,
    files,
    outputDir,
    isConverting,
    batchResult,
    loInstalled,
    loPath,
    loVersion,
    // 计算属性
    direction,
    availableTargets,
    needsLibreOffice,
    fileExtensions,
    completedCount,
    failedCount,
    // 方法
    init,
    checkLibreOffice,
    setSourceFormat,
    setTargetFormat,
    addFiles,
    removeFile,
    clearFiles,
    selectOutputDir,
    startConvert,
    cancelConvert,
    openOutputDir,
    // 常量（直接暴露给模板使用）
    FORMAT_LABELS,
    FORMAT_MATRIX,
    FORMAT_EXTENSIONS,
  }
})
