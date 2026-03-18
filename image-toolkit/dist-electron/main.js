var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { ipcMain, shell, app, globalShortcut, BrowserWindow, dialog, nativeTheme, Menu } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";
import { EventEmitter } from "node:events";
import koffi from "koffi";
function registerSvgHandlers() {
  ipcMain.handle("svg:readFolder", async (_event, folderPath) => {
    const files = fs.readdirSync(folderPath);
    return files.filter((f) => f.toLowerCase().endsWith(".svg")).map((f) => {
      const fullPath = path.join(folderPath, f);
      const stats = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, "utf-8");
      return { name: f, path: fullPath, size: stats.size, content };
    });
  });
  ipcMain.handle("svg:changeColor", async (_event, svgContent, color) => {
    let result = svgContent.replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`);
    result = result.replace(/stroke="(?!none)[^"]*"/g, `stroke="${color}"`);
    result = result.replace(/fill:\s*(?!none)[^;}"]+/g, `fill: ${color}`);
    result = result.replace(/stroke:\s*(?!none)[^;}"]+/g, `stroke: ${color}`);
    return result;
  });
  ipcMain.handle("svg:saveFiles", async (_event, files) => {
    let saved = 0;
    for (const file of files) {
      try {
        fs.writeFileSync(file.path, file.content, "utf-8");
        saved++;
      } catch (e) {
        console.error(`Failed to save ${file.path}:`, e);
      }
    }
    return { saved, total: files.length };
  });
  ipcMain.handle("svg:exportPng", async (_event, options) => {
    try {
      const results = [];
      if (options.mode === "scale" && options.scales) {
        for (const scale of options.scales) {
          const svgBuffer = Buffer.from(options.svgContent);
          const outputPath = path.join(
            options.outputDir,
            `${options.fileName}@${scale}x.png`
          );
          await sharp(svgBuffer, { density: 72 * scale }).png().toFile(outputPath);
          results.push(outputPath);
        }
      } else if (options.mode === "custom" && options.customWidth && options.customHeight) {
        const svgBuffer = Buffer.from(options.svgContent);
        const outputPath = path.join(
          options.outputDir,
          `${options.fileName}_${options.customWidth}x${options.customHeight}.png`
        );
        await sharp(svgBuffer).resize(options.customWidth, options.customHeight, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(outputPath);
        results.push(outputPath);
      }
      return { success: true, files: results };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle("svg:downloadZip", async (_event, options) => {
    try {
      const outputPath = path.join(options.outputDir, options.zipName);
      const { execSync } = await import("node:child_process");
      const tmpDir = path.join(options.outputDir, ".svg-bundle-tmp");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      for (const file of options.files) {
        fs.writeFileSync(path.join(tmpDir, file.name), file.content, "utf-8");
      }
      try {
        execSync(`powershell -Command "Compress-Archive -Path '${tmpDir}\\*' -DestinationPath '${outputPath}' -Force"`, { timeout: 3e4 });
      } catch {
        const bundleDir = path.join(options.outputDir, "svg-bundle");
        if (!fs.existsSync(bundleDir)) {
          fs.mkdirSync(bundleDir, { recursive: true });
        }
        for (const file of options.files) {
          fs.writeFileSync(path.join(bundleDir, file.name), file.content, "utf-8");
        }
        fs.rmSync(tmpDir, { recursive: true, force: true });
        return { success: true, outputPath: bundleDir };
      }
      fs.rmSync(tmpDir, { recursive: true, force: true });
      return { success: true, outputPath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}
function registerCompressHandlers() {
  ipcMain.handle("compress:start", async (event, options) => {
    const results = [];
    for (let i = 0; i < options.files.length; i++) {
      const filePath = options.files[i];
      const fileName = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase();
      try {
        const originalBuffer = fs.readFileSync(filePath);
        const originalSize = originalBuffer.length;
        let pipeline = sharp(originalBuffer);
        const quality = options.mode === "lossless" ? 100 : options.quality;
        if ([".jpg", ".jpeg"].includes(ext)) {
          pipeline = pipeline.jpeg({
            quality,
            mozjpeg: options.mode !== "lossless"
          });
        } else if (ext === ".png") {
          pipeline = pipeline.png({
            compressionLevel: options.mode === "lossless" ? 9 : 6,
            quality: options.mode === "lossless" ? 100 : quality
          });
        } else if (ext === ".webp") {
          pipeline = pipeline.webp({
            quality,
            lossless: options.mode === "lossless"
          });
        } else if (ext === ".avif") {
          pipeline = pipeline.avif({
            quality,
            lossless: options.mode === "lossless"
          });
        } else if ([".tiff", ".tif"].includes(ext)) {
          pipeline = pipeline.tiff({
            quality,
            compression: "lzw"
          });
        } else if (ext === ".gif") {
          pipeline = pipeline.gif();
        }
        const compressedBuffer = await pipeline.toBuffer();
        const compressedSize = compressedBuffer.length;
        const savedPercent = Math.round((1 - compressedSize / originalSize) * 100);
        const outputDir = options.outputDir || path.dirname(filePath);
        const outputName = options.outputDir ? fileName : `${path.basename(fileName, ext)}_compressed${ext}`;
        const outputPath = path.join(outputDir, outputName);
        fs.writeFileSync(outputPath, compressedBuffer);
        const result = {
          file: filePath,
          fileName,
          originalSize,
          compressedSize,
          savedPercent,
          outputPath,
          status: "success"
        };
        results.push(result);
        event.sender.send("compress:progress", { index: i, ...result });
      } catch (e) {
        const result = {
          file: filePath,
          fileName,
          status: "error",
          error: e.message
        };
        results.push(result);
        event.sender.send("compress:progress", { index: i, ...result });
      }
    }
    return results;
  });
  ipcMain.handle("file:getInfo", async (_event, filePaths) => {
    return filePaths.map((p) => {
      try {
        const stats = fs.statSync(p);
        const name = path.basename(p);
        const ext = path.extname(p).toLowerCase().slice(1).toUpperCase();
        return {
          path: p,
          name,
          size: stats.size,
          type: ext,
          exists: true,
          isDirectory: stats.isDirectory()
        };
      } catch {
        return { path: p, name: path.basename(p), size: 0, type: "", exists: false, isDirectory: false };
      }
    });
  });
}
function registerConvertHandlers() {
  ipcMain.handle("convert:start", async (event, options) => {
    const results = [];
    for (let i = 0; i < options.files.length; i++) {
      const filePath = options.files[i];
      const fileName = path.basename(filePath, path.extname(filePath));
      try {
        let pipeline = sharp(fs.readFileSync(filePath));
        if (options.size && options.size > 0) {
          pipeline = pipeline.resize(options.size, options.size, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          });
        }
        const fmt = options.targetFormat.toLowerCase();
        const newExt = fmt === "jpeg" ? "jpg" : fmt;
        let outputBuffer;
        switch (fmt) {
          case "png":
            outputBuffer = await pipeline.png().toBuffer();
            break;
          case "jpeg":
          case "jpg":
            outputBuffer = await pipeline.flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer();
            break;
          case "webp":
            outputBuffer = await pipeline.webp({ quality: 85 }).toBuffer();
            break;
          case "avif":
            outputBuffer = await pipeline.avif({ quality: 80 }).toBuffer();
            break;
          case "tiff":
            outputBuffer = await pipeline.tiff().toBuffer();
            break;
          case "bmp":
            outputBuffer = await pipeline.png().toBuffer();
            break;
          case "ico":
            outputBuffer = await pipeline.resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
            break;
          default:
            outputBuffer = await pipeline.toBuffer();
        }
        const outputDir = options.outputDir || path.dirname(filePath);
        const outputPath = path.join(outputDir, `${fileName}.${newExt}`);
        fs.writeFileSync(outputPath, outputBuffer);
        const result = {
          file: filePath,
          fileName: `${fileName}.${newExt}`,
          originalSize: fs.statSync(filePath).size,
          convertedSize: outputBuffer.length,
          outputPath,
          status: "success"
        };
        results.push(result);
        event.sender.send("convert:progress", { index: i, ...result });
      } catch (e) {
        const result = {
          file: filePath,
          fileName: path.basename(filePath),
          status: "error",
          error: e.message
        };
        results.push(result);
        event.sender.send("convert:progress", { index: i, ...result });
      }
    }
    return results;
  });
}
function registerSystemHandlers() {
  ipcMain.handle("system:openPath", async (_event, dirPath) => {
    try {
      await shell.openPath(dirPath);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle("system:showItemInFolder", async (_event, filePath) => {
    try {
      shell.showItemInFolder(filePath);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}
const CONFIG_FILE = path.join(app.getPath("userData"), "toolkit-config.json");
function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to read config:", e);
  }
  return {};
}
function writeConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write config:", e);
  }
}
function registerConfigHandlers() {
  ipcMain.handle("config:get", async (_event, key) => {
    const config = readConfig();
    return config[key] ?? null;
  });
  ipcMain.handle("config:set", async (_event, key, value) => {
    const config = readConfig();
    config[key] = value;
    writeConfig(config);
    return true;
  });
  ipcMain.handle("config:getAll", async () => {
    return readConfig();
  });
}
const INPUT_MOUSE = 0;
const MOUSEEVENTF_LEFTDOWN = 2;
const MOUSEEVENTF_LEFTUP = 4;
const MOUSEEVENTF_RIGHTDOWN = 8;
const MOUSEEVENTF_RIGHTUP = 16;
const MOUSEEVENTF_MIDDLEDOWN = 32;
const MOUSEEVENTF_MIDDLEUP = 64;
const MOUSEEVENTF_ABSOLUTE = 32768;
koffi.struct("POINT", {
  x: "long",
  y: "long"
});
const MOUSEINPUT = koffi.struct("MOUSEINPUT", {
  dx: "long",
  dy: "long",
  mouseData: "uint32",
  dwFlags: "uint32",
  time: "uint32",
  dwExtraInfo: "uintptr"
});
const INPUT = koffi.struct("INPUT", {
  type: "uint32",
  mi: MOUSEINPUT
});
const user32 = koffi.load("user32.dll");
const SendInput = user32.func("uint32 SendInput(uint32 cInputs, INPUT *pInputs, int32 cbSize)");
const GetCursorPos = user32.func("bool GetCursorPos(_Out_ POINT *lpPoint)");
const GetSystemMetrics = user32.func("int32 GetSystemMetrics(int32 nIndex)");
let _screenW = 0;
let _screenH = 0;
function getScreenSize() {
  if (_screenW === 0) {
    _screenW = GetSystemMetrics(0);
    _screenH = GetSystemMetrics(1);
    console.log(`[win32] 屏幕分辨率: ${_screenW}x${_screenH}`);
  }
  return { w: _screenW, h: _screenH };
}
function getCursorPosition() {
  const pt = { x: 0, y: 0 };
  GetCursorPos(pt);
  return { x: pt.x, y: pt.y };
}
function toAbsoluteCoord(x, y) {
  const { w, h } = getScreenSize();
  return {
    ax: Math.round(x * 65535 / (w - 1)),
    ay: Math.round(y * 65535 / (h - 1))
  };
}
function mouseClick(x, y, button = "left") {
  const { ax, ay } = toAbsoluteCoord(x, y);
  let downFlag;
  let upFlag;
  switch (button) {
    case "right":
      downFlag = MOUSEEVENTF_RIGHTDOWN;
      upFlag = MOUSEEVENTF_RIGHTUP;
      break;
    case "middle":
      downFlag = MOUSEEVENTF_MIDDLEDOWN;
      upFlag = MOUSEEVENTF_MIDDLEUP;
      break;
    default:
      downFlag = MOUSEEVENTF_LEFTDOWN;
      upFlag = MOUSEEVENTF_LEFTUP;
  }
  const inputSize = koffi.sizeof(INPUT);
  const downInput = {
    type: INPUT_MOUSE,
    mi: { dx: ax, dy: ay, mouseData: 0, dwFlags: MOUSEEVENTF_ABSOLUTE | downFlag, time: 0, dwExtraInfo: 0 }
  };
  const resultDown = SendInput(1, [downInput], inputSize);
  const upInput = {
    type: INPUT_MOUSE,
    mi: { dx: ax, dy: ay, mouseData: 0, dwFlags: MOUSEEVENTF_ABSOLUTE | upFlag, time: 0, dwExtraInfo: 0 }
  };
  const resultUp = SendInput(1, [upInput], inputSize);
  if (resultDown === 0 || resultUp === 0) {
    console.warn(`[win32] SendInput 返回 0，可能被 UIPI 阻止。pos=(${x},${y}) button=${button}`);
  }
}
function mouseDoubleClick(x, y, button = "left") {
  mouseClick(x, y, button);
  mouseClick(x, y, button);
}
class ClickerEngine extends EventEmitter {
  constructor() {
    super(...arguments);
    __publicField(this, "state", "idle");
    __publicField(this, "config", null);
    __publicField(this, "clickCount", 0);
    __publicField(this, "timer", null);
    __publicField(this, "countdownTimer", null);
    __publicField(this, "multiIndex", 0);
  }
  // 多点轮询当前索引
  /** 当前状态 */
  getState() {
    return this.state;
  }
  /** 当前点击次数 */
  getClickCount() {
    return this.clickCount;
  }
  /** 启动连点 */
  start(config) {
    if (this.state !== "idle") {
      return;
    }
    this.config = { ...config };
    this.clickCount = 0;
    this.multiIndex = 0;
    if (config.startDelay > 0) {
      this.setState("countdown");
      this.countdownTimer = setTimeout(() => {
        this.countdownTimer = null;
        this.beginClicking();
      }, config.startDelay * 1e3);
    } else {
      this.beginClicking();
    }
  }
  /** 停止连点 */
  stop() {
    if (this.state === "idle") return;
    this.clearTimers();
    this.setState("idle");
    this.emit("stopped", { clickCount: this.clickCount });
  }
  /** 内部：开始点击循环 */
  beginClicking() {
    if (!this.config) return;
    this.setState("running");
    this.tick();
    this.timer = setInterval(() => {
      this.tick();
    }, this.config.interval);
  }
  /** 内部：每次点击执行 */
  tick() {
    if (!this.config || this.state !== "running") return;
    const pos = this.getNextPosition();
    const { button, clickType } = this.config;
    try {
      if (clickType === "double") {
        mouseDoubleClick(pos.x, pos.y, button);
      } else {
        mouseClick(pos.x, pos.y, button);
      }
    } catch (e) {
      console.error("[ClickerEngine] 点击执行失败:", e);
    }
    this.clickCount++;
    this.emit("click", { count: this.clickCount, position: pos });
    if (this.config.maxClicks > 0 && this.clickCount >= this.config.maxClicks) {
      this.clearTimers();
      this.setState("idle");
      this.emit("completed", { clickCount: this.clickCount });
    }
  }
  /** 内部：获取下一个点击位置 */
  getNextPosition() {
    if (!this.config) return { x: 0, y: 0 };
    switch (this.config.positionMode) {
      case "fixed":
        return this.config.fixedPosition;
      case "multi": {
        const positions = this.config.multiPositions;
        if (positions.length === 0) return getCursorPosition();
        const pos = positions[this.multiIndex % positions.length];
        this.multiIndex++;
        return pos;
      }
      case "follow":
      default:
        return getCursorPosition();
    }
  }
  /** 内部：设置状态并通知 */
  setState(newState) {
    this.state = newState;
    this.emit("state-change", {
      state: newState,
      clickCount: this.clickCount
    });
  }
  /** 内部：清理所有定时器 */
  clearTimers() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
  }
  /** 销毁引擎 */
  destroy() {
    this.stop();
    this.removeAllListeners();
  }
}
let clicker = null;
function getMainWindow() {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}
function pushState(channel, data) {
  const win2 = getMainWindow();
  if (win2 && !win2.isDestroyed()) {
    win2.webContents.send(channel, data);
  }
}
function registerClickerHandlers() {
  clicker = new ClickerEngine();
  clicker.on("state-change", (data) => {
    pushState("clicker:state", data);
  });
  clicker.on("click", (data) => {
    pushState("clicker:click", data);
  });
  clicker.on("completed", (data) => {
    pushState("clicker:completed", data);
  });
  clicker.on("stopped", (data) => {
    pushState("clicker:stopped", data);
  });
  ipcMain.handle("clicker:start", async (_event, config) => {
    console.log("[clicker-handler] 收到启动请求, config:", config);
    if (!clicker) return { success: false, error: "引擎未初始化" };
    if (clicker.getState() !== "idle") {
      return { success: false, error: "连点器正在运行" };
    }
    try {
      clicker.start(config);
      console.log("[clicker-handler] 引擎已启动");
      return { success: true };
    } catch (e) {
      console.error("[clicker-handler] 启动失败:", e);
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle("clicker:stop", async () => {
    if (!clicker) return { success: false };
    clicker.stop();
    return { success: true };
  });
  ipcMain.handle("clicker:getStatus", async () => {
    if (!clicker) return { state: "idle", clickCount: 0 };
    return {
      state: clicker.getState(),
      clickCount: clicker.getClickCount()
    };
  });
}
function registerClickerHotkeys() {
  globalShortcut.register("F6", () => {
    if (!clicker) return;
    if (clicker.getState() === "idle") {
      pushState("clicker:hotkeyToggle", { action: "start" });
    } else {
      clicker.stop();
    }
  });
  globalShortcut.register("Escape", () => {
    if (!clicker) return;
    if (clicker.getState() !== "idle") {
      clicker.stop();
    }
  });
}
function cleanupClickerHandlers() {
  if (clicker) {
    clicker.destroy();
    clicker = null;
  }
  try {
    globalShortcut.unregister("F6");
    globalShortcut.unregister("Escape");
  } catch {
  }
}
const require$1 = createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  nativeTheme.themeSource = "light";
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: "Universal Toolkit",
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
ipcMain.handle("dialog:openFiles", async (_event, options) => {
  const result = await dialog.showOpenDialog({
    properties: options.properties || ["openFile", "multiSelections"],
    filters: options.filters || []
  });
  return result.filePaths;
});
ipcMain.handle("dialog:openFolder", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  return result.filePaths[0] || null;
});
ipcMain.handle("dialog:saveDir", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
  return result.filePaths[0] || null;
});
ipcMain.handle("file:readText", async (_event, filePath) => {
  const fs2 = await import("node:fs");
  return fs2.readFileSync(filePath, "utf-8");
});
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".tiff", ".tif", ".bmp", ".ico", ".svg"];
ipcMain.handle("file:listImages", async (_event, folderPath) => {
  const fs2 = await import("node:fs");
  const results = [];
  function walk(dir) {
    const entries = fs2.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  }
  walk(folderPath);
  return results;
});
ipcMain.handle("theme:toggle", async (_event, isDark) => {
  nativeTheme.themeSource = isDark ? "dark" : "light";
  if (win) {
    win.setBackgroundColor(isDark ? "#0f1123" : "#ffffff");
  }
});
registerSvgHandlers();
registerCompressHandlers();
registerConvertHandlers();
registerSystemHandlers();
registerConfigHandlers();
registerClickerHandlers();
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    cleanupClickerHandlers();
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  createWindow();
  registerClickerHotkeys();
  const { globalShortcut: globalShortcut2 } = require$1("electron");
  globalShortcut2.register("CmdOrCtrl+O", () => {
    if (!win) return;
    dialog.showOpenDialog(win, {
      properties: ["openFile", "multiSelections"]
    }).then((result) => {
      if (result.filePaths.length > 0) {
        win == null ? void 0 : win.webContents.send("shortcut:openFiles", result.filePaths);
      }
    });
  });
  globalShortcut2.register("CmdOrCtrl+Shift+O", () => {
    if (!win) return;
    dialog.showOpenDialog(win, {
      properties: ["openDirectory"]
    }).then((result) => {
      if (result.filePaths[0]) {
        win == null ? void 0 : win.webContents.send("shortcut:openFolder", result.filePaths[0]);
      }
    });
  });
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
