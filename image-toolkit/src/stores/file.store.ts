/**
 * 文件列表状态管理 (fileStore)
 *
 * 管理文件列表的追加/删除/去重/清空/状态更新
 * 供 ImageCompress、FormatConvert、SvgViewer 共用
 */
import { defineStore } from "pinia";
import { ref, computed } from "vue";

/** 单文件条目 */
export interface FileEntry {
  path: string;
  name: string;
  size: number;
  type: string; // 扩展名大写，如 'PNG'
  status: "pending" | "processing" | "success" | "error";
  progress?: number; // 0-100
  selected?: boolean;
  result?: {
    outputPath: string;
    outputSize: number;
    savedPercent: number;
  };
  error?: string;
}

export const useFileStore = defineStore("file", () => {
  // ====== State ======
  const files = ref<FileEntry[]>([]);
  const isProcessing = ref(false);

  // ====== Getters ======
  const fileCount = computed(() => files.value.length);
  const selectedCount = computed(
    () => files.value.filter((f) => f.selected).length,
  );
  const selectedFiles = computed(() => files.value.filter((f) => f.selected));
  const hasFiles = computed(() => files.value.length > 0);

  // ====== Actions ======

  /**
   * 追加文件（自动去重）
   * @returns 重复文件数量
   */
  function addFiles(entries: FileEntry[]): number {
    const existingPaths = new Set(files.value.map((f) => f.path));
    let duplicateCount = 0;

    for (const entry of entries) {
      if (existingPaths.has(entry.path)) {
        duplicateCount++;
      } else {
        files.value.push(entry);
        existingPaths.add(entry.path);
      }
    }

    return duplicateCount;
  }

  /**
   * 从文件路径列表创建 FileEntry 并追加
   * 需通过 IPC 获取文件信息
   */
  async function addFilePaths(paths: string[]): Promise<number> {
    const fileInfos = await window.ipcRenderer.invoke("file:getInfo", paths);
    const entries: FileEntry[] = fileInfos
      .filter((info: any) => info.exists)
      .map((info: any) => ({
        path: info.path,
        name: info.name,
        size: info.size,
        type: info.type,
        status: "pending" as const,
      }));
    return addFiles(entries);
  }

  /** 移除单个文件 */
  function removeFile(path: string): FileEntry | undefined {
    const index = files.value.findIndex((f) => f.path === path);
    if (index !== -1) {
      return files.value.splice(index, 1)[0];
    }
    return undefined;
  }

  /** 清空文件列表 */
  function clearFiles(): FileEntry[] {
    const old = [...files.value];
    files.value = [];
    return old;
  }

  /** 更新单个文件状态 */
  function updateFileStatus(
    index: number,
    update: Partial<
      Pick<FileEntry, "status" | "progress" | "result" | "error">
    >,
  ) {
    if (index >= 0 && index < files.value.length) {
      Object.assign(files.value[index], update);
    }
  }

  /** 切换文件选中 */
  function toggleSelect(path: string) {
    const file = files.value.find((f) => f.path === path);
    if (file) {
      file.selected = !file.selected;
    }
  }

  /** 全选 */
  function selectAll() {
    files.value.forEach((f) => (f.selected = true));
  }

  /** 取消全选 */
  function deselectAll() {
    files.value.forEach((f) => (f.selected = false));
  }

  /** 重置所有文件状态为 pending */
  function resetAllStatus() {
    files.value.forEach((f) => {
      f.status = "pending";
      f.progress = undefined;
      f.result = undefined;
      f.error = undefined;
    });
  }

  /** 设置处理状态 */
  function setProcessing(value: boolean) {
    isProcessing.value = value;
  }

  return {
    // state
    files,
    isProcessing,
    // getters
    fileCount,
    selectedCount,
    selectedFiles,
    hasFiles,
    // actions
    addFiles,
    addFilePaths,
    removeFile,
    clearFiles,
    updateFileStatus,
    toggleSelect,
    selectAll,
    deselectAll,
    resetAllStatus,
    setProcessing,
  };
});
