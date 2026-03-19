/**
 * LibreOffice 检测与调用封装
 */
import { execFile } from 'node:child_process'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'

/** LibreOffice 检测结果 */
export interface LibreOfficeInfo {
  installed: boolean
  path?: string
  version?: string
}

/** 默认安装路径（Windows） */
const DEFAULT_PATHS = [
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
]

/** 缓存检测结果 */
let cachedInfo: LibreOfficeInfo | null = null

/**
 * 检测 LibreOffice 是否安装
 */
export async function detectLibreOffice(): Promise<LibreOfficeInfo> {
  if (cachedInfo) return cachedInfo

  // 1. 检查 PATH 中的 soffice
  try {
    const version = await execPromise('soffice', ['--version'])
    cachedInfo = { installed: true, path: 'soffice', version: version.trim() }
    console.log('[libreoffice] 从 PATH 检测到:', cachedInfo.version)
    return cachedInfo
  } catch { /* not in PATH */ }

  // 2. 检查默认安装路径
  for (const p of DEFAULT_PATHS) {
    try {
      await access(p, constants.X_OK)
      const version = await execPromise(p, ['--version'])
      cachedInfo = { installed: true, path: p, version: version.trim() }
      console.log('[libreoffice] 从默认路径检测到:', p)
      return cachedInfo
    } catch { /* not found */ }
  }

  cachedInfo = { installed: false }
  console.log('[libreoffice] 未检测到 LibreOffice')
  return cachedInfo
}

/**
 * 使用 LibreOffice 转换文件
 * @param inputPath 源文件路径
 * @param outputDir 输出目录
 * @param format 目标格式 (pdf / html / png 等)
 * @param timeout 超时时间 ms (默认 120s)
 */
export async function convertWithLibreOffice(
  inputPath: string,
  outputDir: string,
  format: string,
  timeout = 120000
): Promise<string> {
  const info = await detectLibreOffice()
  if (!info.installed || !info.path) {
    throw new Error('LibreOffice 未安装，请先安装 LibreOffice 7.x+')
  }

  const args = [
    '--headless',
    '--convert-to', format,
    '--outdir', outputDir,
    inputPath,
  ]

  console.log(`[libreoffice] 转换: ${path.basename(inputPath)} → ${format}`)
  await execPromise(info.path, args, timeout)

  // 推断输出文件路径
  const baseName = path.basename(inputPath, path.extname(inputPath))
  const outputPath = path.join(outputDir, `${baseName}.${format}`)
  return outputPath
}

/** 清除缓存（用于测试） */
export function clearCache(): void {
  cachedInfo = null
}

/** execFile Promise 封装 */
function execPromise(cmd: string, args: string[], timeout = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = execFile(cmd, args, { timeout }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`LibreOffice 执行失败: ${error.message}\n${stderr}`))
      } else {
        resolve(stdout)
      }
    })
    // 防止 zombie process
    proc.unref?.()
  })
}
