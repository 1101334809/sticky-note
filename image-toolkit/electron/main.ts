import { app, BrowserWindow, ipcMain, dialog, nativeTheme } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  // 强制暗色主题
  nativeTheme.themeSource = "dark";

  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: "ImageKit - 图片工具库",
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    backgroundColor: "#0f1123",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// ====== IPC Handlers ======

// 选择文件
ipcMain.handle(
  "dialog:openFiles",
  async (
    _event,
    options: {
      filters?: Electron.FileFilter[];
      properties?: Electron.OpenDialogOptions["properties"];
    },
  ) => {
    const result = await dialog.showOpenDialog({
      properties: options.properties || ["openFile", "multiSelections"],
      filters: options.filters || [],
    });
    return result.filePaths;
  },
);

// 选择文件夹
ipcMain.handle("dialog:openFolder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  return result.filePaths[0] || null;
});

// 选择保存目录
ipcMain.handle("dialog:saveDir", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
  });
  return result.filePaths[0] || null;
});

// 读取文件夹中的 SVG 文件
ipcMain.handle("svg:readFolder", async (_event, folderPath: string) => {
  const files = fs.readdirSync(folderPath);
  const svgFiles = files
    .filter((f) => f.toLowerCase().endsWith(".svg"))
    .map((f) => {
      const fullPath = path.join(folderPath, f);
      const stats = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, "utf-8");
      return {
        name: f,
        path: fullPath,
        size: stats.size,
        content,
      };
    });
  return svgFiles;
});

// 保存 SVG 文件（颜色修改后）
ipcMain.handle(
  "svg:saveFile",
  async (_event, filePath: string, content: string) => {
    fs.writeFileSync(filePath, content, "utf-8");
    return true;
  },
);

// ====== App lifecycle ======
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
