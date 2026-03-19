var au = Object.defineProperty;
var su = (r, e, t) => e in r ? au(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t;
var ye = (r, e, t) => su(r, typeof e != "symbol" ? e + "" : e, t);
import { ipcMain as be, shell as mi, app as Bt, globalShortcut as ur, BrowserWindow as Lt, dialog as yt, nativeTheme as ro, Menu as ou } from "electron";
import { createRequire as tt } from "node:module";
import { fileURLToPath as uu } from "node:url";
import he from "node:path";
import Ae, { constants as cu } from "node:fs";
import cr from "sharp";
import { EventEmitter as no } from "node:events";
import Mt from "koffi";
import { stat as De, access as lu, readFile as Ye, mkdir as io, writeFile as Ze } from "node:fs/promises";
import { execFile as fu } from "node:child_process";
function hu() {
  be.handle("svg:readFolder", async (r, e) => Ae.readdirSync(e).filter((s) => s.toLowerCase().endsWith(".svg")).map((s) => {
    const o = he.join(e, s), u = Ae.statSync(o), l = Ae.readFileSync(o, "utf-8");
    return { name: s, path: o, size: u.size, content: l };
  })), be.handle("svg:changeColor", async (r, e, t) => {
    let s = e.replace(/fill="(?!none)[^"]*"/g, `fill="${t}"`);
    return s = s.replace(/stroke="(?!none)[^"]*"/g, `stroke="${t}"`), s = s.replace(/fill:\s*(?!none)[^;}"]+/g, `fill: ${t}`), s = s.replace(/stroke:\s*(?!none)[^;}"]+/g, `stroke: ${t}`), s;
  }), be.handle("svg:saveFiles", async (r, e) => {
    let t = 0;
    for (const s of e)
      try {
        Ae.writeFileSync(s.path, s.content, "utf-8"), t++;
      } catch (o) {
        console.error(`Failed to save ${s.path}:`, o);
      }
    return { saved: t, total: e.length };
  }), be.handle("svg:exportPng", async (r, e) => {
    try {
      const t = [];
      if (e.mode === "scale" && e.scales)
        for (const s of e.scales) {
          const o = Buffer.from(e.svgContent), u = he.join(
            e.outputDir,
            `${e.fileName}@${s}x.png`
          );
          await cr(o, { density: 72 * s }).png().toFile(u), t.push(u);
        }
      else if (e.mode === "custom" && e.customWidth && e.customHeight) {
        const s = Buffer.from(e.svgContent), o = he.join(
          e.outputDir,
          `${e.fileName}_${e.customWidth}x${e.customHeight}.png`
        );
        await cr(s).resize(e.customWidth, e.customHeight, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(o), t.push(o);
      }
      return { success: !0, files: t };
    } catch (t) {
      return { success: !1, error: t.message };
    }
  }), be.handle("svg:downloadZip", async (r, e) => {
    try {
      const t = he.join(e.outputDir, e.zipName), { execSync: s } = await import("node:child_process"), o = he.join(e.outputDir, ".svg-bundle-tmp");
      Ae.existsSync(o) || Ae.mkdirSync(o, { recursive: !0 });
      for (const u of e.files)
        Ae.writeFileSync(he.join(o, u.name), u.content, "utf-8");
      try {
        s(`powershell -Command "Compress-Archive -Path '${o}\\*' -DestinationPath '${t}' -Force"`, { timeout: 3e4 });
      } catch {
        const u = he.join(e.outputDir, "svg-bundle");
        Ae.existsSync(u) || Ae.mkdirSync(u, { recursive: !0 });
        for (const l of e.files)
          Ae.writeFileSync(he.join(u, l.name), l.content, "utf-8");
        return Ae.rmSync(o, { recursive: !0, force: !0 }), { success: !0, outputPath: u };
      }
      return Ae.rmSync(o, { recursive: !0, force: !0 }), { success: !0, outputPath: t };
    } catch (t) {
      return { success: !1, error: t.message };
    }
  });
}
function du() {
  be.handle("compress:start", async (r, e) => {
    const t = [];
    for (let s = 0; s < e.files.length; s++) {
      const o = e.files[s], u = he.basename(o), l = he.extname(o).toLowerCase();
      try {
        const n = Ae.readFileSync(o), f = n.length;
        let g = cr(n);
        const _ = e.mode === "lossless" ? 100 : e.quality;
        [".jpg", ".jpeg"].includes(l) ? g = g.jpeg({
          quality: _,
          mozjpeg: e.mode !== "lossless"
        }) : l === ".png" ? g = g.png({
          compressionLevel: e.mode === "lossless" ? 9 : 6,
          quality: e.mode === "lossless" ? 100 : _
        }) : l === ".webp" ? g = g.webp({
          quality: _,
          lossless: e.mode === "lossless"
        }) : l === ".avif" ? g = g.avif({
          quality: _,
          lossless: e.mode === "lossless"
        }) : [".tiff", ".tif"].includes(l) ? g = g.tiff({
          quality: _,
          compression: "lzw"
        }) : l === ".gif" && (g = g.gif());
        const k = await g.toBuffer(), R = k.length, E = Math.round((1 - R / f) * 100), C = e.outputDir || he.dirname(o), w = e.outputDir ? u : `${he.basename(u, l)}_compressed${l}`, A = he.join(C, w);
        Ae.writeFileSync(A, k);
        const c = {
          file: o,
          fileName: u,
          originalSize: f,
          compressedSize: R,
          savedPercent: E,
          outputPath: A,
          status: "success"
        };
        t.push(c), r.sender.send("compress:progress", { index: s, ...c });
      } catch (n) {
        const f = {
          file: o,
          fileName: u,
          status: "error",
          error: n.message
        };
        t.push(f), r.sender.send("compress:progress", { index: s, ...f });
      }
    }
    return t;
  }), be.handle("file:getInfo", async (r, e) => e.map((t) => {
    try {
      const s = Ae.statSync(t), o = he.basename(t), u = he.extname(t).toLowerCase().slice(1).toUpperCase();
      return {
        path: t,
        name: o,
        size: s.size,
        type: u,
        exists: !0,
        isDirectory: s.isDirectory()
      };
    } catch {
      return { path: t, name: he.basename(t), size: 0, type: "", exists: !1, isDirectory: !1 };
    }
  }));
}
function pu() {
  be.handle("convert:start", async (r, e) => {
    const t = [];
    for (let s = 0; s < e.files.length; s++) {
      const o = e.files[s], u = he.basename(o, he.extname(o));
      try {
        let l = cr(Ae.readFileSync(o));
        e.size && e.size > 0 && (l = l.resize(e.size, e.size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }));
        const n = e.targetFormat.toLowerCase(), f = n === "jpeg" ? "jpg" : n;
        let g;
        switch (n) {
          case "png":
            g = await l.png().toBuffer();
            break;
          case "jpeg":
          case "jpg":
            g = await l.flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer();
            break;
          case "webp":
            g = await l.webp({ quality: 85 }).toBuffer();
            break;
          case "avif":
            g = await l.avif({ quality: 80 }).toBuffer();
            break;
          case "tiff":
            g = await l.tiff().toBuffer();
            break;
          case "bmp":
            g = await l.png().toBuffer();
            break;
          case "ico":
            g = await l.resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
            break;
          default:
            g = await l.toBuffer();
        }
        const _ = e.outputDir || he.dirname(o), k = he.join(_, `${u}.${f}`);
        Ae.writeFileSync(k, g);
        const R = {
          file: o,
          fileName: `${u}.${f}`,
          originalSize: Ae.statSync(o).size,
          convertedSize: g.length,
          outputPath: k,
          status: "success"
        };
        t.push(R), r.sender.send("convert:progress", { index: s, ...R });
      } catch (l) {
        const n = {
          file: o,
          fileName: he.basename(o),
          status: "error",
          error: l.message
        };
        t.push(n), r.sender.send("convert:progress", { index: s, ...n });
      }
    }
    return t;
  });
}
function mu() {
  be.handle("system:openPath", async (r, e) => {
    try {
      return await mi.openPath(e), { success: !0 };
    } catch (t) {
      return { success: !1, error: t.message };
    }
  }), be.handle("system:showItemInFolder", async (r, e) => {
    try {
      return mi.showItemInFolder(e), { success: !0 };
    } catch (t) {
      return { success: !1, error: t.message };
    }
  });
}
const gi = he.join(Bt.getPath("userData"), "toolkit-config.json");
function yr() {
  try {
    if (Ae.existsSync(gi))
      return JSON.parse(Ae.readFileSync(gi, "utf-8"));
  } catch (r) {
    console.error("Failed to read config:", r);
  }
  return {};
}
function gu(r) {
  try {
    Ae.writeFileSync(gi, JSON.stringify(r, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write config:", e);
  }
}
function wu() {
  be.handle("config:get", async (r, e) => yr()[e] ?? null), be.handle("config:set", async (r, e, t) => {
    const s = yr();
    return s[e] = t, gu(s), !0;
  }), be.handle("config:getAll", async () => yr());
}
const Hi = 0, yu = 2, vu = 4, bu = 8, _u = 16, Eu = 32, xu = 64, Ki = 32768;
Mt.struct("POINT", {
  x: "long",
  y: "long"
});
const Su = Mt.struct("MOUSEINPUT", {
  dx: "long",
  dy: "long",
  mouseData: "uint32",
  dwFlags: "uint32",
  time: "uint32",
  dwExtraInfo: "uintptr"
}), Tu = Mt.struct("INPUT", {
  type: "uint32",
  mi: Su
}), Ai = Mt.load("user32.dll"), Gi = Ai.func("uint32 SendInput(uint32 cInputs, INPUT *pInputs, int32 cbSize)"), Au = Ai.func("bool GetCursorPos(_Out_ POINT *lpPoint)"), Vi = Ai.func("int32 GetSystemMetrics(int32 nIndex)");
let Xt = 0, vr = 0;
function ku() {
  return Xt === 0 && (Xt = Vi(0), vr = Vi(1), console.log(`[win32] 屏幕分辨率: ${Xt}x${vr}`)), { w: Xt, h: vr };
}
function $i() {
  const r = { x: 0, y: 0 };
  return Au(r), { x: r.x, y: r.y };
}
function Ru(r, e) {
  const { w: t, h: s } = ku();
  return {
    ax: Math.round(r * 65535 / (t - 1)),
    ay: Math.round(e * 65535 / (s - 1))
  };
}
function wi(r, e, t = "left") {
  const { ax: s, ay: o } = Ru(r, e);
  let u, l;
  switch (t) {
    case "right":
      u = bu, l = _u;
      break;
    case "middle":
      u = Eu, l = xu;
      break;
    default:
      u = yu, l = vu;
  }
  const n = Mt.sizeof(Tu), f = {
    type: Hi,
    mi: { dx: s, dy: o, mouseData: 0, dwFlags: Ki | u, time: 0, dwExtraInfo: 0 }
  }, g = Gi(1, [f], n), _ = {
    type: Hi,
    mi: { dx: s, dy: o, mouseData: 0, dwFlags: Ki | l, time: 0, dwExtraInfo: 0 }
  }, k = Gi(1, [_], n);
  (g === 0 || k === 0) && console.warn(`[win32] SendInput 返回 0，可能被 UIPI 阻止。pos=(${r},${e}) button=${t}`);
}
function Cu(r, e, t = "left") {
  wi(r, e, t), wi(r, e, t);
}
class Iu extends no {
  constructor() {
    super(...arguments);
    ye(this, "state", "idle");
    ye(this, "config", null);
    ye(this, "clickCount", 0);
    ye(this, "timer", null);
    ye(this, "countdownTimer", null);
    ye(this, "multiIndex", 0);
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
  start(t) {
    this.state === "idle" && (this.config = { ...t }, this.clickCount = 0, this.multiIndex = 0, t.startDelay > 0 ? (this.setState("countdown"), this.countdownTimer = setTimeout(() => {
      this.countdownTimer = null, this.beginClicking();
    }, t.startDelay * 1e3)) : this.beginClicking());
  }
  /** 停止连点 */
  stop() {
    this.state !== "idle" && (this.clearTimers(), this.setState("idle"), this.emit("stopped", { clickCount: this.clickCount }));
  }
  /** 内部：开始点击循环 */
  beginClicking() {
    this.config && (this.setState("running"), this.tick(), this.timer = setInterval(() => {
      this.tick();
    }, this.config.interval));
  }
  /** 内部：每次点击执行 */
  tick() {
    if (!this.config || this.state !== "running") return;
    const t = this.getNextPosition(), { button: s, clickType: o } = this.config;
    try {
      o === "double" ? Cu(t.x, t.y, s) : wi(t.x, t.y, s);
    } catch (u) {
      console.error("[ClickerEngine] 点击执行失败:", u);
    }
    this.clickCount++, this.emit("click", { count: this.clickCount, position: t }), this.config.maxClicks > 0 && this.clickCount >= this.config.maxClicks && (this.clearTimers(), this.setState("idle"), this.emit("completed", { clickCount: this.clickCount }));
  }
  /** 内部：获取下一个点击位置 */
  getNextPosition() {
    if (!this.config) return { x: 0, y: 0 };
    switch (this.config.positionMode) {
      case "fixed":
        return this.config.fixedPosition;
      case "multi": {
        const t = this.config.multiPositions;
        if (t.length === 0) return $i();
        const s = t[this.multiIndex % t.length];
        return this.multiIndex++, s;
      }
      case "follow":
      default:
        return $i();
    }
  }
  /** 内部：设置状态并通知 */
  setState(t) {
    this.state = t, this.emit("state-change", {
      state: t,
      clickCount: this.clickCount
    });
  }
  /** 内部：清理所有定时器 */
  clearTimers() {
    this.timer && (clearInterval(this.timer), this.timer = null), this.countdownTimer && (clearTimeout(this.countdownTimer), this.countdownTimer = null);
  }
  /** 销毁引擎 */
  destroy() {
    this.stop(), this.removeAllListeners();
  }
}
let Se = null;
function Nu() {
  const r = Lt.getAllWindows();
  return r.length > 0 ? r[0] : null;
}
function Pt(r, e) {
  const t = Nu();
  t && !t.isDestroyed() && t.webContents.send(r, e);
}
function Ou() {
  Se = new Iu(), Se.on("state-change", (r) => {
    Pt("clicker:state", r);
  }), Se.on("click", (r) => {
    Pt("clicker:click", r);
  }), Se.on("completed", (r) => {
    Pt("clicker:completed", r);
  }), Se.on("stopped", (r) => {
    Pt("clicker:stopped", r);
  }), be.handle("clicker:start", async (r, e) => {
    if (console.log("[clicker-handler] 收到启动请求, config:", e), !Se) return { success: !1, error: "引擎未初始化" };
    if (Se.getState() !== "idle")
      return { success: !1, error: "连点器正在运行" };
    try {
      return Se.start(e), console.log("[clicker-handler] 引擎已启动"), { success: !0 };
    } catch (t) {
      return console.error("[clicker-handler] 启动失败:", t), { success: !1, error: t.message };
    }
  }), be.handle("clicker:stop", async () => Se ? (Se.stop(), { success: !0 }) : { success: !1 }), be.handle("clicker:getStatus", async () => Se ? {
    state: Se.getState(),
    clickCount: Se.getClickCount()
  } : { state: "idle", clickCount: 0 });
}
function Pu() {
  ur.register("F6", () => {
    Se && (Se.getState() === "idle" ? Pt("clicker:hotkeyToggle", { action: "start" }) : Se.stop());
  }), ur.register("Escape", () => {
    Se && Se.getState() !== "idle" && Se.stop();
  });
}
function Fu() {
  Se && (Se.destroy(), Se = null);
  try {
    ur.unregister("F6"), ur.unregister("Escape");
  } catch {
  }
}
class Du {
  constructor() {
    ye(this, "converters", /* @__PURE__ */ new Map());
  }
  /** 注册转换器 */
  register(e) {
    this.converters.has(e.direction) && console.warn(`[ConvertEngine] 覆盖已注册的转换器: ${e.direction}`), this.converters.set(e.direction, e), console.log(`[ConvertEngine] 注册转换器: ${e.direction}`);
  }
  /** 批量注册 */
  registerAll(e) {
    for (const t of e)
      this.register(t);
  }
  /** 查找转换器 */
  getConverter(e) {
    return this.converters.get(e);
  }
  /** 检查转换方向是否支持 */
  isSupported(e) {
    return this.converters.has(e);
  }
  /** 获取所有已注册的转换方向 */
  getSupportedDirections() {
    return Array.from(this.converters.keys());
  }
  /** 执行转换 */
  async convert(e, t) {
    const s = this.converters.get(e);
    if (!s)
      throw new Error(`不支持的转换方向: ${e}`);
    return s.convert(t);
  }
}
class Bu extends no {
  constructor(t) {
    super();
    ye(this, "queue", []);
    ye(this, "running", !1);
    ye(this, "cancelled", !1);
    ye(this, "engine");
    this.engine = t;
  }
  /** 添加文件并创建任务 */
  addTasks(t, s) {
    const o = t.map((u) => {
      const l = this.getOutputExtension(s.direction), n = he.basename(u, he.extname(u)), f = he.join(s.outputDir || he.dirname(u), `${n}.${l}`);
      return {
        id: this.generateId(),
        inputPath: u,
        outputPath: f,
        direction: s.direction,
        status: "pending",
        progress: 0,
        inputSize: 0
      };
    });
    return this.queue.push(...o), o;
  }
  /** 开始处理队列 */
  async start(t) {
    if (this.running) return;
    this.running = !0, this.cancelled = !1;
    const s = this.queue.length;
    let o = 0, u = 0;
    for (; this.queue.length > 0 && !this.cancelled; ) {
      const l = this.queue[0];
      l.status = "converting", l.startTime = Date.now(), this.emit("taskStart", { taskId: l.id, fileName: he.basename(l.inputPath) });
      try {
        const n = await De(l.inputPath);
        l.inputSize = n.size;
        const f = await this.engine.convert(l.direction, {
          inputPath: l.inputPath,
          outputDir: t.outputDir || he.dirname(l.inputPath),
          config: t,
          onProgress: (g) => {
            l.progress = g, this.emit("progress", { taskId: l.id, progress: g });
          }
        });
        l.status = "completed", l.outputPath = f.outputPath, l.outputSize = f.outputSize, l.endTime = Date.now(), o++, this.emit("taskDone", {
          taskId: l.id,
          outputPath: f.outputPath,
          outputSize: f.outputSize,
          duration: l.endTime - l.startTime
        });
      } catch (n) {
        l.status = "failed", l.error = n.message, l.endTime = Date.now(), u++, this.emit("taskError", {
          taskId: l.id,
          error: n.message,
          recoverable: !0
        });
      }
      this.queue.shift();
    }
    this.running = !1, this.emit("batchDone", { total: s, completed: o, failed: u });
  }
  /** 取消所有任务 */
  cancel() {
    this.cancelled = !0, this.queue = [];
  }
  /** 获取队列状态 */
  getStatus() {
    return {
      running: this.running,
      queueLength: this.queue.length,
      tasks: [...this.queue]
    };
  }
  /** 根据转换方向获取输出扩展名 */
  getOutputExtension(t) {
    return {
      "docx-to-pdf": "pdf",
      "docx-to-md": "md",
      "docx-to-html": "html",
      "pptx-to-docx": "docx",
      "pptx-to-pdf": "pdf",
      "pptx-to-image": "png",
      "pdf-to-docx": "docx",
      "pdf-to-md": "md",
      "md-to-html": "html",
      "md-to-docx": "docx",
      "html-to-md": "md"
    }[t] || "bin";
  }
  /** 生成 UUID */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
const Lu = [
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe"
];
let Ge = null;
async function ao() {
  if (Ge) return Ge;
  try {
    return Ge = { installed: !0, path: "soffice", version: (await yi("soffice", ["--version"])).trim() }, console.log("[libreoffice] 从 PATH 检测到:", Ge.version), Ge;
  } catch {
  }
  for (const r of Lu)
    try {
      await lu(r, cu.X_OK);
      const e = await yi(r, ["--version"]);
      return Ge = { installed: !0, path: r, version: e.trim() }, console.log("[libreoffice] 从默认路径检测到:", r), Ge;
    } catch {
    }
  return Ge = { installed: !1 }, console.log("[libreoffice] 未检测到 LibreOffice"), Ge;
}
async function ki(r, e, t, s = 12e4) {
  const o = await ao();
  if (!o.installed || !o.path)
    throw new Error("LibreOffice 未安装，请先安装 LibreOffice 7.x+");
  const u = [
    "--headless",
    "--convert-to",
    t,
    "--outdir",
    e,
    r
  ];
  console.log(`[libreoffice] 转换: ${he.basename(r)} → ${t}`), await yi(o.path, u, s);
  const l = he.basename(r, he.extname(r));
  return he.join(e, `${l}.${t}`);
}
function yi(r, e, t = 1e4) {
  return new Promise((s, o) => {
    var l;
    const u = fu(r, e, { timeout: t }, (n, f, g) => {
      n ? o(new Error(`LibreOffice 执行失败: ${n.message}
${g}`)) : s(f);
    });
    (l = u.unref) == null || l.call(u);
  });
}
const so = tt(import.meta.url), Xi = so("mammoth"), Uu = so("turndown");
class Mu {
  constructor() {
    ye(this, "direction", "docx-to-md");
    ye(this, "requiresLibreOffice", !1);
  }
  async convert(e) {
    const { inputPath: t, outputDir: s, config: o, onProgress: u } = e;
    u(10);
    const l = await Ye(t), n = he.basename(t, he.extname(t)), f = he.join(s, `${n}_images`);
    let g = 0;
    const _ = o.imageExtractMode || "folder", k = await Xi.convertToHtml(
      { buffer: l },
      {
        convertImage: Xi.images.imgElement(async (A) => {
          var T;
          if (_ === "ignore")
            return { src: "" };
          const c = ((T = A.contentType) == null ? void 0 : T.split("/")[1]) || "png";
          g++;
          const y = `image-${g}.${c}`;
          if (_ === "base64") {
            const B = (await A.read()).toString("base64");
            return { src: `data:${A.contentType};base64,${B}` };
          }
          await io(f, { recursive: !0 });
          const m = he.join(f, y), h = await A.read();
          return await Ze(m, h), { src: `./${n}_images/${y}` };
        })
      }
    );
    u(50);
    const R = new Uu({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-"
    });
    R.addRule("table", {
      filter: "table",
      replacement: (A, c) => this.convertTable(c)
    });
    let E = R.turndown(k.value);
    E = E.replace(/\n{3,}/g, `

`), u(80);
    const C = he.join(s, `${n}.md`);
    await Ze(C, E, "utf-8");
    const w = await De(C);
    return u(100), {
      outputPath: C,
      outputSize: w.size,
      assets: g > 0 ? [f] : void 0
    };
  }
  /** 简单表格转换（Markdown 格式） */
  convertTable(e) {
    var l, n, f, g;
    const t = [], s = ((l = e.querySelectorAll) == null ? void 0 : l.call(e, "tr")) || ((n = e.getElementsByTagName) == null ? void 0 : n.call(e, "tr")) || [];
    for (const _ of s) {
      const k = [], R = ((f = _.querySelectorAll) == null ? void 0 : f.call(_, "td, th")) || ((g = _.getElementsByTagName) == null ? void 0 : g.call(_, "td")) || [];
      for (const E of R)
        k.push((E.textContent || "").trim().replace(/\|/g, "\\|"));
      t.push(k);
    }
    if (t.length === 0) return "";
    const o = Math.max(...t.map((_) => _.length)), u = [];
    for (let _ = 0; _ < t.length; _++) {
      const k = t[_];
      for (; k.length < o; ) k.push("");
      u.push(`| ${k.join(" | ")} |`), _ === 0 && u.push(`| ${k.map(() => "---").join(" | ")} |`);
    }
    return `
` + u.join(`
`) + `
`;
  }
}
class ju {
  constructor() {
    ye(this, "direction", "docx-to-pdf");
    ye(this, "requiresLibreOffice", !0);
  }
  async convert(e) {
    const { inputPath: t, outputDir: s, onProgress: o } = e;
    o(10);
    const u = await ki(t, s, "pdf");
    o(90);
    const l = await De(u);
    return o(100), {
      outputPath: u,
      outputSize: l.size
    };
  }
}
const zu = tt(import.meta.url), Wu = zu("mammoth");
class qu {
  constructor() {
    ye(this, "direction", "docx-to-html");
    ye(this, "requiresLibreOffice", !1);
  }
  async convert(e) {
    const { inputPath: t, outputDir: s, onProgress: o } = e;
    o(10);
    const u = await Ye(t), l = he.basename(t, he.extname(t)), n = await Wu.convertToHtml({ buffer: u });
    o(60);
    const f = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${l}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; }
    img { max-width: 100%; }
  </style>
</head>
<body>
${n.value}
</body>
</html>`;
    o(80);
    const g = he.join(s, `${l}.html`);
    await Ze(g, f, "utf-8");
    const _ = await De(g);
    return o(100), {
      outputPath: g,
      outputSize: _.size
    };
  }
}
var Hu = Object.defineProperty, Ku = Object.defineProperties, Gu = Object.getOwnPropertyDescriptors, Zi = Object.getOwnPropertySymbols, Vu = Object.prototype.hasOwnProperty, $u = Object.prototype.propertyIsEnumerable, vi = (r, e, t) => e in r ? Hu(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, ge = (r, e) => {
  for (var t in e || (e = {}))
    Vu.call(e, t) && vi(r, t, e[t]);
  if (Zi)
    for (var t of Zi(e))
      $u.call(e, t) && vi(r, t, e[t]);
  return r;
}, et = (r, e) => Ku(r, Gu(e)), se = (r, e, t) => vi(r, typeof e != "symbol" ? e + "" : e, t), Xu = (r, e, t) => new Promise((s, o) => {
  var u = (f) => {
    try {
      n(t.next(f));
    } catch (g) {
      o(g);
    }
  }, l = (f) => {
    try {
      n(t.throw(f));
    } catch (g) {
      o(g);
    }
  }, n = (f) => f.done ? s(f.value) : Promise.resolve(f.value).then(u, l);
  n((t = t.apply(r, e)).next());
});
class lr {
  /**
   * Creates a new BaseXmlComponent with the specified XML element name.
   *
   * @param rootKey - The XML element name (e.g., "w:p", "w:r", "w:t")
   */
  constructor(e) {
    se(this, "rootKey"), this.rootKey = e;
  }
}
const Zu = Object.seal({});
class le extends lr {
  /**
   * Creates a new XmlComponent.
   *
   * @param rootKey - The XML element name (e.g., "w:p", "w:r", "w:t")
   */
  constructor(e) {
    super(e), se(this, "root"), this.root = new Array();
  }
  /**
   * Prepares this component and its children for XML serialization.
   *
   * This method is called by the Formatter to convert the component tree into
   * an object structure compatible with the xml library (https://www.npmjs.com/package/xml).
   * It recursively processes all children and handles special cases like
   * attribute-only elements and empty elements.
   *
   * The method can be overridden by subclasses to customize XML representation
   * or execute side effects during serialization (e.g., creating relationships).
   *
   * @param context - The serialization context containing document state
   * @returns The XML-serializable object, or undefined to exclude from output
   *
   * @example
   * ```typescript
   * // Override to add custom serialization logic
   * prepForXml(context: IContext): IXmlableObject | undefined {
   *   // Custom logic here
   *   return super.prepForXml(context);
   * }
   * ```
   */
  prepForXml(e) {
    var t;
    e.stack.push(this);
    const s = this.root.map((o) => o instanceof lr ? o.prepForXml(e) : o).filter((o) => o !== void 0);
    return e.stack.pop(), {
      [this.rootKey]: s.length ? s.length === 1 && ((t = s[0]) != null && t._attr) ? s[0] : s : Zu
    };
  }
  /**
   * Adds a child element to this component.
   *
   * @deprecated Do not use this method. It is only used internally by the library. It will be removed in a future version.
   * @param child - The child component or text string to add
   * @returns This component (for chaining)
   */
  addChildElement(e) {
    return this.root.push(e), this;
  }
}
class fr extends le {
  constructor(e, t) {
    super(e), se(this, "includeIfEmpty"), this.includeIfEmpty = t;
  }
  /**
   * Prepares the component for XML serialization, excluding it if empty.
   *
   * @param context - The serialization context
   * @returns The XML-serializable object, or undefined if empty
   */
  prepForXml(e) {
    const t = super.prepForXml(e);
    if (this.includeIfEmpty || t && (typeof t[this.rootKey] != "object" || Object.keys(t[this.rootKey]).length))
      return t;
  }
}
class ve extends lr {
  /**
   * Creates a new attribute component.
   *
   * @param root - The attribute data object
   */
  constructor(e) {
    super("_attr"), se(this, "xmlKeys"), this.root = e;
  }
  /**
   * Converts the attribute data to an XML-serializable object.
   *
   * This method transforms the property names using xmlKeys (if defined)
   * and filters out undefined values.
   *
   * @param _ - Context (unused for attributes)
   * @returns Object with _attr key containing the mapped attributes
   */
  prepForXml(e) {
    const t = {};
    return Object.entries(this.root).forEach(([s, o]) => {
      if (o !== void 0) {
        const u = this.xmlKeys && this.xmlKeys[s] || s;
        t[u] = o;
      }
    }), { _attr: t };
  }
}
class Yu extends lr {
  /**
   * Creates a new NextAttributeComponent.
   *
   * @param root - Attribute payload with explicit key-value mappings
   */
  constructor(e) {
    super("_attr"), this.root = e;
  }
  /**
   * Converts the attribute payload to an XML-serializable object.
   *
   * Extracts the key and value from each property and filters out
   * undefined values.
   *
   * @param _ - Context (unused for attributes)
   * @returns Object with _attr key containing the attributes
   */
  prepForXml(e) {
    return { _attr: Object.values(this.root).filter(({ value: s }) => s !== void 0).reduce((s, { key: o, value: u }) => et(ge({}, s), { [o]: u }), {}) };
  }
}
class Ie extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      val: "w:val",
      color: "w:color",
      fill: "w:fill",
      space: "w:space",
      sz: "w:sz",
      type: "w:type",
      rsidR: "w:rsidR",
      rsidRPr: "w:rsidRPr",
      rsidSect: "w:rsidSect",
      w: "w:w",
      h: "w:h",
      top: "w:top",
      right: "w:right",
      bottom: "w:bottom",
      left: "w:left",
      header: "w:header",
      footer: "w:footer",
      gutter: "w:gutter",
      linePitch: "w:linePitch",
      pos: "w:pos"
    });
  }
}
var Fe = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function oo(r) {
  return r && r.__esModule && Object.prototype.hasOwnProperty.call(r, "default") ? r.default : r;
}
var br = {}, Zt = { exports: {} }, Yi;
function Ri() {
  if (Yi) return Zt.exports;
  Yi = 1;
  var r = typeof Reflect == "object" ? Reflect : null, e = r && typeof r.apply == "function" ? r.apply : function(T, F, B) {
    return Function.prototype.apply.call(T, F, B);
  }, t;
  r && typeof r.ownKeys == "function" ? t = r.ownKeys : Object.getOwnPropertySymbols ? t = function(T) {
    return Object.getOwnPropertyNames(T).concat(Object.getOwnPropertySymbols(T));
  } : t = function(T) {
    return Object.getOwnPropertyNames(T);
  };
  function s(h) {
    console && console.warn && console.warn(h);
  }
  var o = Number.isNaN || function(T) {
    return T !== T;
  };
  function u() {
    u.init.call(this);
  }
  Zt.exports = u, Zt.exports.once = c, u.EventEmitter = u, u.prototype._events = void 0, u.prototype._eventsCount = 0, u.prototype._maxListeners = void 0;
  var l = 10;
  function n(h) {
    if (typeof h != "function")
      throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof h);
  }
  Object.defineProperty(u, "defaultMaxListeners", {
    enumerable: !0,
    get: function() {
      return l;
    },
    set: function(h) {
      if (typeof h != "number" || h < 0 || o(h))
        throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + h + ".");
      l = h;
    }
  }), u.init = function() {
    (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) && (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0), this._maxListeners = this._maxListeners || void 0;
  }, u.prototype.setMaxListeners = function(T) {
    if (typeof T != "number" || T < 0 || o(T))
      throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + T + ".");
    return this._maxListeners = T, this;
  };
  function f(h) {
    return h._maxListeners === void 0 ? u.defaultMaxListeners : h._maxListeners;
  }
  u.prototype.getMaxListeners = function() {
    return f(this);
  }, u.prototype.emit = function(T) {
    for (var F = [], B = 1; B < arguments.length; B++) F.push(arguments[B]);
    var z = T === "error", I = this._events;
    if (I !== void 0)
      z = z && I.error === void 0;
    else if (!z)
      return !1;
    if (z) {
      var X;
      if (F.length > 0 && (X = F[0]), X instanceof Error)
        throw X;
      var oe = new Error("Unhandled error." + (X ? " (" + X.message + ")" : ""));
      throw oe.context = X, oe;
    }
    var N = I[T];
    if (N === void 0)
      return !1;
    if (typeof N == "function")
      e(N, this, F);
    else
      for (var M = N.length, b = C(N, M), B = 0; B < M; ++B)
        e(b[B], this, F);
    return !0;
  };
  function g(h, T, F, B) {
    var z, I, X;
    if (n(F), I = h._events, I === void 0 ? (I = h._events = /* @__PURE__ */ Object.create(null), h._eventsCount = 0) : (I.newListener !== void 0 && (h.emit(
      "newListener",
      T,
      F.listener ? F.listener : F
    ), I = h._events), X = I[T]), X === void 0)
      X = I[T] = F, ++h._eventsCount;
    else if (typeof X == "function" ? X = I[T] = B ? [F, X] : [X, F] : B ? X.unshift(F) : X.push(F), z = f(h), z > 0 && X.length > z && !X.warned) {
      X.warned = !0;
      var oe = new Error("Possible EventEmitter memory leak detected. " + X.length + " " + String(T) + " listeners added. Use emitter.setMaxListeners() to increase limit");
      oe.name = "MaxListenersExceededWarning", oe.emitter = h, oe.type = T, oe.count = X.length, s(oe);
    }
    return h;
  }
  u.prototype.addListener = function(T, F) {
    return g(this, T, F, !1);
  }, u.prototype.on = u.prototype.addListener, u.prototype.prependListener = function(T, F) {
    return g(this, T, F, !0);
  };
  function _() {
    if (!this.fired)
      return this.target.removeListener(this.type, this.wrapFn), this.fired = !0, arguments.length === 0 ? this.listener.call(this.target) : this.listener.apply(this.target, arguments);
  }
  function k(h, T, F) {
    var B = { fired: !1, wrapFn: void 0, target: h, type: T, listener: F }, z = _.bind(B);
    return z.listener = F, B.wrapFn = z, z;
  }
  u.prototype.once = function(T, F) {
    return n(F), this.on(T, k(this, T, F)), this;
  }, u.prototype.prependOnceListener = function(T, F) {
    return n(F), this.prependListener(T, k(this, T, F)), this;
  }, u.prototype.removeListener = function(T, F) {
    var B, z, I, X, oe;
    if (n(F), z = this._events, z === void 0)
      return this;
    if (B = z[T], B === void 0)
      return this;
    if (B === F || B.listener === F)
      --this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : (delete z[T], z.removeListener && this.emit("removeListener", T, B.listener || F));
    else if (typeof B != "function") {
      for (I = -1, X = B.length - 1; X >= 0; X--)
        if (B[X] === F || B[X].listener === F) {
          oe = B[X].listener, I = X;
          break;
        }
      if (I < 0)
        return this;
      I === 0 ? B.shift() : w(B, I), B.length === 1 && (z[T] = B[0]), z.removeListener !== void 0 && this.emit("removeListener", T, oe || F);
    }
    return this;
  }, u.prototype.off = u.prototype.removeListener, u.prototype.removeAllListeners = function(T) {
    var F, B, z;
    if (B = this._events, B === void 0)
      return this;
    if (B.removeListener === void 0)
      return arguments.length === 0 ? (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0) : B[T] !== void 0 && (--this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : delete B[T]), this;
    if (arguments.length === 0) {
      var I = Object.keys(B), X;
      for (z = 0; z < I.length; ++z)
        X = I[z], X !== "removeListener" && this.removeAllListeners(X);
      return this.removeAllListeners("removeListener"), this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0, this;
    }
    if (F = B[T], typeof F == "function")
      this.removeListener(T, F);
    else if (F !== void 0)
      for (z = F.length - 1; z >= 0; z--)
        this.removeListener(T, F[z]);
    return this;
  };
  function R(h, T, F) {
    var B = h._events;
    if (B === void 0)
      return [];
    var z = B[T];
    return z === void 0 ? [] : typeof z == "function" ? F ? [z.listener || z] : [z] : F ? A(z) : C(z, z.length);
  }
  u.prototype.listeners = function(T) {
    return R(this, T, !0);
  }, u.prototype.rawListeners = function(T) {
    return R(this, T, !1);
  }, u.listenerCount = function(h, T) {
    return typeof h.listenerCount == "function" ? h.listenerCount(T) : E.call(h, T);
  }, u.prototype.listenerCount = E;
  function E(h) {
    var T = this._events;
    if (T !== void 0) {
      var F = T[h];
      if (typeof F == "function")
        return 1;
      if (F !== void 0)
        return F.length;
    }
    return 0;
  }
  u.prototype.eventNames = function() {
    return this._eventsCount > 0 ? t(this._events) : [];
  };
  function C(h, T) {
    for (var F = new Array(T), B = 0; B < T; ++B)
      F[B] = h[B];
    return F;
  }
  function w(h, T) {
    for (; T + 1 < h.length; T++)
      h[T] = h[T + 1];
    h.pop();
  }
  function A(h) {
    for (var T = new Array(h.length), F = 0; F < T.length; ++F)
      T[F] = h[F].listener || h[F];
    return T;
  }
  function c(h, T) {
    return new Promise(function(F, B) {
      function z(X) {
        h.removeListener(T, I), B(X);
      }
      function I() {
        typeof h.removeListener == "function" && h.removeListener("error", z), F([].slice.call(arguments));
      }
      m(h, T, I, { once: !0 }), T !== "error" && y(h, z, { once: !0 });
    });
  }
  function y(h, T, F) {
    typeof h.on == "function" && m(h, "error", T, F);
  }
  function m(h, T, F, B) {
    if (typeof h.on == "function")
      B.once ? h.once(T, F) : h.on(T, F);
    else if (typeof h.addEventListener == "function")
      h.addEventListener(T, function z(I) {
        B.once && h.removeEventListener(T, z), F(I);
      });
    else
      throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof h);
  }
  return Zt.exports;
}
var Yt = { exports: {} }, Ji;
function rt() {
  return Ji || (Ji = 1, typeof Object.create == "function" ? Yt.exports = function(e, t) {
    t && (e.super_ = t, e.prototype = Object.create(t.prototype, {
      constructor: {
        value: e,
        enumerable: !1,
        writable: !0,
        configurable: !0
      }
    }));
  } : Yt.exports = function(e, t) {
    if (t) {
      e.super_ = t;
      var s = function() {
      };
      s.prototype = t.prototype, e.prototype = new s(), e.prototype.constructor = e;
    }
  }), Yt.exports;
}
function Ju(r) {
  return r && r.__esModule && Object.prototype.hasOwnProperty.call(r, "default") ? r.default : r;
}
var uo = { exports: {} }, ke = uo.exports = {}, We, qe;
function bi() {
  throw new Error("setTimeout has not been defined");
}
function _i() {
  throw new Error("clearTimeout has not been defined");
}
(function() {
  try {
    typeof setTimeout == "function" ? We = setTimeout : We = bi;
  } catch {
    We = bi;
  }
  try {
    typeof clearTimeout == "function" ? qe = clearTimeout : qe = _i;
  } catch {
    qe = _i;
  }
})();
function co(r) {
  if (We === setTimeout)
    return setTimeout(r, 0);
  if ((We === bi || !We) && setTimeout)
    return We = setTimeout, setTimeout(r, 0);
  try {
    return We(r, 0);
  } catch {
    try {
      return We.call(null, r, 0);
    } catch {
      return We.call(this, r, 0);
    }
  }
}
function Qu(r) {
  if (qe === clearTimeout)
    return clearTimeout(r);
  if ((qe === _i || !qe) && clearTimeout)
    return qe = clearTimeout, clearTimeout(r);
  try {
    return qe(r);
  } catch {
    try {
      return qe.call(null, r);
    } catch {
      return qe.call(this, r);
    }
  }
}
var Xe = [], mt = !1, ut, or = -1;
function ec() {
  !mt || !ut || (mt = !1, ut.length ? Xe = ut.concat(Xe) : or = -1, Xe.length && lo());
}
function lo() {
  if (!mt) {
    var r = co(ec);
    mt = !0;
    for (var e = Xe.length; e; ) {
      for (ut = Xe, Xe = []; ++or < e; )
        ut && ut[or].run();
      or = -1, e = Xe.length;
    }
    ut = null, mt = !1, Qu(r);
  }
}
ke.nextTick = function(r) {
  var e = new Array(arguments.length - 1);
  if (arguments.length > 1)
    for (var t = 1; t < arguments.length; t++)
      e[t - 1] = arguments[t];
  Xe.push(new fo(r, e)), Xe.length === 1 && !mt && co(lo);
};
function fo(r, e) {
  this.fun = r, this.array = e;
}
fo.prototype.run = function() {
  this.fun.apply(null, this.array);
};
ke.title = "browser";
ke.browser = !0;
ke.env = {};
ke.argv = [];
ke.version = "";
ke.versions = {};
function Je() {
}
ke.on = Je;
ke.addListener = Je;
ke.once = Je;
ke.off = Je;
ke.removeListener = Je;
ke.removeAllListeners = Je;
ke.emit = Je;
ke.prependListener = Je;
ke.prependOnceListener = Je;
ke.listeners = function(r) {
  return [];
};
ke.binding = function(r) {
  throw new Error("process.binding is not supported");
};
ke.cwd = function() {
  return "/";
};
ke.chdir = function(r) {
  throw new Error("process.chdir is not supported");
};
ke.umask = function() {
  return 0;
};
var tc = uo.exports;
const me = /* @__PURE__ */ Ju(tc);
var _r, Qi;
function ho() {
  return Qi || (Qi = 1, _r = Ri().EventEmitter), _r;
}
var Er = {}, Rt = {}, ea;
function rc() {
  if (ea) return Rt;
  ea = 1, Rt.byteLength = n, Rt.toByteArray = g, Rt.fromByteArray = R;
  for (var r = [], e = [], t = typeof Uint8Array < "u" ? Uint8Array : Array, s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", o = 0, u = s.length; o < u; ++o)
    r[o] = s[o], e[s.charCodeAt(o)] = o;
  e[45] = 62, e[95] = 63;
  function l(E) {
    var C = E.length;
    if (C % 4 > 0)
      throw new Error("Invalid string. Length must be a multiple of 4");
    var w = E.indexOf("=");
    w === -1 && (w = C);
    var A = w === C ? 0 : 4 - w % 4;
    return [w, A];
  }
  function n(E) {
    var C = l(E), w = C[0], A = C[1];
    return (w + A) * 3 / 4 - A;
  }
  function f(E, C, w) {
    return (C + w) * 3 / 4 - w;
  }
  function g(E) {
    var C, w = l(E), A = w[0], c = w[1], y = new t(f(E, A, c)), m = 0, h = c > 0 ? A - 4 : A, T;
    for (T = 0; T < h; T += 4)
      C = e[E.charCodeAt(T)] << 18 | e[E.charCodeAt(T + 1)] << 12 | e[E.charCodeAt(T + 2)] << 6 | e[E.charCodeAt(T + 3)], y[m++] = C >> 16 & 255, y[m++] = C >> 8 & 255, y[m++] = C & 255;
    return c === 2 && (C = e[E.charCodeAt(T)] << 2 | e[E.charCodeAt(T + 1)] >> 4, y[m++] = C & 255), c === 1 && (C = e[E.charCodeAt(T)] << 10 | e[E.charCodeAt(T + 1)] << 4 | e[E.charCodeAt(T + 2)] >> 2, y[m++] = C >> 8 & 255, y[m++] = C & 255), y;
  }
  function _(E) {
    return r[E >> 18 & 63] + r[E >> 12 & 63] + r[E >> 6 & 63] + r[E & 63];
  }
  function k(E, C, w) {
    for (var A, c = [], y = C; y < w; y += 3)
      A = (E[y] << 16 & 16711680) + (E[y + 1] << 8 & 65280) + (E[y + 2] & 255), c.push(_(A));
    return c.join("");
  }
  function R(E) {
    for (var C, w = E.length, A = w % 3, c = [], y = 16383, m = 0, h = w - A; m < h; m += y)
      c.push(k(E, m, m + y > h ? h : m + y));
    return A === 1 ? (C = E[w - 1], c.push(
      r[C >> 2] + r[C << 4 & 63] + "=="
    )) : A === 2 && (C = (E[w - 2] << 8) + E[w - 1], c.push(
      r[C >> 10] + r[C >> 4 & 63] + r[C << 2 & 63] + "="
    )), c.join("");
  }
  return Rt;
}
var Jt = {}, ta;
function nc() {
  return ta || (ta = 1, Jt.read = function(r, e, t, s, o) {
    var u, l, n = o * 8 - s - 1, f = (1 << n) - 1, g = f >> 1, _ = -7, k = t ? o - 1 : 0, R = t ? -1 : 1, E = r[e + k];
    for (k += R, u = E & (1 << -_) - 1, E >>= -_, _ += n; _ > 0; u = u * 256 + r[e + k], k += R, _ -= 8)
      ;
    for (l = u & (1 << -_) - 1, u >>= -_, _ += s; _ > 0; l = l * 256 + r[e + k], k += R, _ -= 8)
      ;
    if (u === 0)
      u = 1 - g;
    else {
      if (u === f)
        return l ? NaN : (E ? -1 : 1) * (1 / 0);
      l = l + Math.pow(2, s), u = u - g;
    }
    return (E ? -1 : 1) * l * Math.pow(2, u - s);
  }, Jt.write = function(r, e, t, s, o, u) {
    var l, n, f, g = u * 8 - o - 1, _ = (1 << g) - 1, k = _ >> 1, R = o === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, E = s ? 0 : u - 1, C = s ? 1 : -1, w = e < 0 || e === 0 && 1 / e < 0 ? 1 : 0;
    for (e = Math.abs(e), isNaN(e) || e === 1 / 0 ? (n = isNaN(e) ? 1 : 0, l = _) : (l = Math.floor(Math.log(e) / Math.LN2), e * (f = Math.pow(2, -l)) < 1 && (l--, f *= 2), l + k >= 1 ? e += R / f : e += R * Math.pow(2, 1 - k), e * f >= 2 && (l++, f /= 2), l + k >= _ ? (n = 0, l = _) : l + k >= 1 ? (n = (e * f - 1) * Math.pow(2, o), l = l + k) : (n = e * Math.pow(2, k - 1) * Math.pow(2, o), l = 0)); o >= 8; r[t + E] = n & 255, E += C, n /= 256, o -= 8)
      ;
    for (l = l << o | n, g += o; g > 0; r[t + E] = l & 255, E += C, l /= 256, g -= 8)
      ;
    r[t + E - C] |= w * 128;
  }), Jt;
}
var ra;
function hr() {
  return ra || (ra = 1, function(r) {
    var e = rc(), t = nc(), s = typeof Symbol == "function" && typeof Symbol.for == "function" ? Symbol.for("nodejs.util.inspect.custom") : null;
    r.Buffer = n, r.SlowBuffer = y, r.INSPECT_MAX_BYTES = 50;
    var o = 2147483647;
    r.kMaxLength = o, n.TYPED_ARRAY_SUPPORT = u(), !n.TYPED_ARRAY_SUPPORT && typeof console < "u" && typeof console.error == "function" && console.error(
      "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
    );
    function u() {
      try {
        var S = new Uint8Array(1), i = { foo: function() {
          return 42;
        } };
        return Object.setPrototypeOf(i, Uint8Array.prototype), Object.setPrototypeOf(S, i), S.foo() === 42;
      } catch {
        return !1;
      }
    }
    Object.defineProperty(n.prototype, "parent", {
      enumerable: !0,
      get: function() {
        if (n.isBuffer(this))
          return this.buffer;
      }
    }), Object.defineProperty(n.prototype, "offset", {
      enumerable: !0,
      get: function() {
        if (n.isBuffer(this))
          return this.byteOffset;
      }
    });
    function l(S) {
      if (S > o)
        throw new RangeError('The value "' + S + '" is invalid for option "size"');
      var i = new Uint8Array(S);
      return Object.setPrototypeOf(i, n.prototype), i;
    }
    function n(S, i, a) {
      if (typeof S == "number") {
        if (typeof i == "string")
          throw new TypeError(
            'The "string" argument must be of type string. Received type number'
          );
        return k(S);
      }
      return f(S, i, a);
    }
    n.poolSize = 8192;
    function f(S, i, a) {
      if (typeof S == "string")
        return R(S, i);
      if (ArrayBuffer.isView(S))
        return C(S);
      if (S == null)
        throw new TypeError(
          "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof S
        );
      if (J(S, ArrayBuffer) || S && J(S.buffer, ArrayBuffer) || typeof SharedArrayBuffer < "u" && (J(S, SharedArrayBuffer) || S && J(S.buffer, SharedArrayBuffer)))
        return w(S, i, a);
      if (typeof S == "number")
        throw new TypeError(
          'The "value" argument must not be of type number. Received type number'
        );
      var p = S.valueOf && S.valueOf();
      if (p != null && p !== S)
        return n.from(p, i, a);
      var L = A(S);
      if (L) return L;
      if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof S[Symbol.toPrimitive] == "function")
        return n.from(
          S[Symbol.toPrimitive]("string"),
          i,
          a
        );
      throw new TypeError(
        "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof S
      );
    }
    n.from = function(S, i, a) {
      return f(S, i, a);
    }, Object.setPrototypeOf(n.prototype, Uint8Array.prototype), Object.setPrototypeOf(n, Uint8Array);
    function g(S) {
      if (typeof S != "number")
        throw new TypeError('"size" argument must be of type number');
      if (S < 0)
        throw new RangeError('The value "' + S + '" is invalid for option "size"');
    }
    function _(S, i, a) {
      return g(S), S <= 0 ? l(S) : i !== void 0 ? typeof a == "string" ? l(S).fill(i, a) : l(S).fill(i) : l(S);
    }
    n.alloc = function(S, i, a) {
      return _(S, i, a);
    };
    function k(S) {
      return g(S), l(S < 0 ? 0 : c(S) | 0);
    }
    n.allocUnsafe = function(S) {
      return k(S);
    }, n.allocUnsafeSlow = function(S) {
      return k(S);
    };
    function R(S, i) {
      if ((typeof i != "string" || i === "") && (i = "utf8"), !n.isEncoding(i))
        throw new TypeError("Unknown encoding: " + i);
      var a = m(S, i) | 0, p = l(a), L = p.write(S, i);
      return L !== a && (p = p.slice(0, L)), p;
    }
    function E(S) {
      for (var i = S.length < 0 ? 0 : c(S.length) | 0, a = l(i), p = 0; p < i; p += 1)
        a[p] = S[p] & 255;
      return a;
    }
    function C(S) {
      if (J(S, Uint8Array)) {
        var i = new Uint8Array(S);
        return w(i.buffer, i.byteOffset, i.byteLength);
      }
      return E(S);
    }
    function w(S, i, a) {
      if (i < 0 || S.byteLength < i)
        throw new RangeError('"offset" is outside of buffer bounds');
      if (S.byteLength < i + (a || 0))
        throw new RangeError('"length" is outside of buffer bounds');
      var p;
      return i === void 0 && a === void 0 ? p = new Uint8Array(S) : a === void 0 ? p = new Uint8Array(S, i) : p = new Uint8Array(S, i, a), Object.setPrototypeOf(p, n.prototype), p;
    }
    function A(S) {
      if (n.isBuffer(S)) {
        var i = c(S.length) | 0, a = l(i);
        return a.length === 0 || S.copy(a, 0, 0, i), a;
      }
      if (S.length !== void 0)
        return typeof S.length != "number" || d(S.length) ? l(0) : E(S);
      if (S.type === "Buffer" && Array.isArray(S.data))
        return E(S.data);
    }
    function c(S) {
      if (S >= o)
        throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + o.toString(16) + " bytes");
      return S | 0;
    }
    function y(S) {
      return +S != S && (S = 0), n.alloc(+S);
    }
    n.isBuffer = function(i) {
      return i != null && i._isBuffer === !0 && i !== n.prototype;
    }, n.compare = function(i, a) {
      if (J(i, Uint8Array) && (i = n.from(i, i.offset, i.byteLength)), J(a, Uint8Array) && (a = n.from(a, a.offset, a.byteLength)), !n.isBuffer(i) || !n.isBuffer(a))
        throw new TypeError(
          'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
        );
      if (i === a) return 0;
      for (var p = i.length, L = a.length, H = 0, j = Math.min(p, L); H < j; ++H)
        if (i[H] !== a[H]) {
          p = i[H], L = a[H];
          break;
        }
      return p < L ? -1 : L < p ? 1 : 0;
    }, n.isEncoding = function(i) {
      switch (String(i).toLowerCase()) {
        case "hex":
        case "utf8":
        case "utf-8":
        case "ascii":
        case "latin1":
        case "binary":
        case "base64":
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return !0;
        default:
          return !1;
      }
    }, n.concat = function(i, a) {
      if (!Array.isArray(i))
        throw new TypeError('"list" argument must be an Array of Buffers');
      if (i.length === 0)
        return n.alloc(0);
      var p;
      if (a === void 0)
        for (a = 0, p = 0; p < i.length; ++p)
          a += i[p].length;
      var L = n.allocUnsafe(a), H = 0;
      for (p = 0; p < i.length; ++p) {
        var j = i[p];
        if (J(j, Uint8Array))
          H + j.length > L.length ? n.from(j).copy(L, H) : Uint8Array.prototype.set.call(
            L,
            j,
            H
          );
        else if (n.isBuffer(j))
          j.copy(L, H);
        else
          throw new TypeError('"list" argument must be an Array of Buffers');
        H += j.length;
      }
      return L;
    };
    function m(S, i) {
      if (n.isBuffer(S))
        return S.length;
      if (ArrayBuffer.isView(S) || J(S, ArrayBuffer))
        return S.byteLength;
      if (typeof S != "string")
        throw new TypeError(
          'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof S
        );
      var a = S.length, p = arguments.length > 2 && arguments[2] === !0;
      if (!p && a === 0) return 0;
      for (var L = !1; ; )
        switch (i) {
          case "ascii":
          case "latin1":
          case "binary":
            return a;
          case "utf8":
          case "utf-8":
            return v(S).length;
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return a * 2;
          case "hex":
            return a >>> 1;
          case "base64":
            return O(S).length;
          default:
            if (L)
              return p ? -1 : v(S).length;
            i = ("" + i).toLowerCase(), L = !0;
        }
    }
    n.byteLength = m;
    function h(S, i, a) {
      var p = !1;
      if ((i === void 0 || i < 0) && (i = 0), i > this.length || ((a === void 0 || a > this.length) && (a = this.length), a <= 0) || (a >>>= 0, i >>>= 0, a <= i))
        return "";
      for (S || (S = "utf8"); ; )
        switch (S) {
          case "hex":
            return Q(this, i, a);
          case "utf8":
          case "utf-8":
            return b(this, i, a);
          case "ascii":
            return q(this, i, a);
          case "latin1":
          case "binary":
            return ne(this, i, a);
          case "base64":
            return M(this, i, a);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return ce(this, i, a);
          default:
            if (p) throw new TypeError("Unknown encoding: " + S);
            S = (S + "").toLowerCase(), p = !0;
        }
    }
    n.prototype._isBuffer = !0;
    function T(S, i, a) {
      var p = S[i];
      S[i] = S[a], S[a] = p;
    }
    n.prototype.swap16 = function() {
      var i = this.length;
      if (i % 2 !== 0)
        throw new RangeError("Buffer size must be a multiple of 16-bits");
      for (var a = 0; a < i; a += 2)
        T(this, a, a + 1);
      return this;
    }, n.prototype.swap32 = function() {
      var i = this.length;
      if (i % 4 !== 0)
        throw new RangeError("Buffer size must be a multiple of 32-bits");
      for (var a = 0; a < i; a += 4)
        T(this, a, a + 3), T(this, a + 1, a + 2);
      return this;
    }, n.prototype.swap64 = function() {
      var i = this.length;
      if (i % 8 !== 0)
        throw new RangeError("Buffer size must be a multiple of 64-bits");
      for (var a = 0; a < i; a += 8)
        T(this, a, a + 7), T(this, a + 1, a + 6), T(this, a + 2, a + 5), T(this, a + 3, a + 4);
      return this;
    }, n.prototype.toString = function() {
      var i = this.length;
      return i === 0 ? "" : arguments.length === 0 ? b(this, 0, i) : h.apply(this, arguments);
    }, n.prototype.toLocaleString = n.prototype.toString, n.prototype.equals = function(i) {
      if (!n.isBuffer(i)) throw new TypeError("Argument must be a Buffer");
      return this === i ? !0 : n.compare(this, i) === 0;
    }, n.prototype.inspect = function() {
      var i = "", a = r.INSPECT_MAX_BYTES;
      return i = this.toString("hex", 0, a).replace(/(.{2})/g, "$1 ").trim(), this.length > a && (i += " ... "), "<Buffer " + i + ">";
    }, s && (n.prototype[s] = n.prototype.inspect), n.prototype.compare = function(i, a, p, L, H) {
      if (J(i, Uint8Array) && (i = n.from(i, i.offset, i.byteLength)), !n.isBuffer(i))
        throw new TypeError(
          'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof i
        );
      if (a === void 0 && (a = 0), p === void 0 && (p = i ? i.length : 0), L === void 0 && (L = 0), H === void 0 && (H = this.length), a < 0 || p > i.length || L < 0 || H > this.length)
        throw new RangeError("out of range index");
      if (L >= H && a >= p)
        return 0;
      if (L >= H)
        return -1;
      if (a >= p)
        return 1;
      if (a >>>= 0, p >>>= 0, L >>>= 0, H >>>= 0, this === i) return 0;
      for (var j = H - L, re = p - a, ae = Math.min(j, re), ie = this.slice(L, H), fe = i.slice(a, p), de = 0; de < ae; ++de)
        if (ie[de] !== fe[de]) {
          j = ie[de], re = fe[de];
          break;
        }
      return j < re ? -1 : re < j ? 1 : 0;
    };
    function F(S, i, a, p, L) {
      if (S.length === 0) return -1;
      if (typeof a == "string" ? (p = a, a = 0) : a > 2147483647 ? a = 2147483647 : a < -2147483648 && (a = -2147483648), a = +a, d(a) && (a = L ? 0 : S.length - 1), a < 0 && (a = S.length + a), a >= S.length) {
        if (L) return -1;
        a = S.length - 1;
      } else if (a < 0)
        if (L) a = 0;
        else return -1;
      if (typeof i == "string" && (i = n.from(i, p)), n.isBuffer(i))
        return i.length === 0 ? -1 : B(S, i, a, p, L);
      if (typeof i == "number")
        return i = i & 255, typeof Uint8Array.prototype.indexOf == "function" ? L ? Uint8Array.prototype.indexOf.call(S, i, a) : Uint8Array.prototype.lastIndexOf.call(S, i, a) : B(S, [i], a, p, L);
      throw new TypeError("val must be string, number or Buffer");
    }
    function B(S, i, a, p, L) {
      var H = 1, j = S.length, re = i.length;
      if (p !== void 0 && (p = String(p).toLowerCase(), p === "ucs2" || p === "ucs-2" || p === "utf16le" || p === "utf-16le")) {
        if (S.length < 2 || i.length < 2)
          return -1;
        H = 2, j /= 2, re /= 2, a /= 2;
      }
      function ae(Ne, Qe) {
        return H === 1 ? Ne[Qe] : Ne.readUInt16BE(Qe * H);
      }
      var ie;
      if (L) {
        var fe = -1;
        for (ie = a; ie < j; ie++)
          if (ae(S, ie) === ae(i, fe === -1 ? 0 : ie - fe)) {
            if (fe === -1 && (fe = ie), ie - fe + 1 === re) return fe * H;
          } else
            fe !== -1 && (ie -= ie - fe), fe = -1;
      } else
        for (a + re > j && (a = j - re), ie = a; ie >= 0; ie--) {
          for (var de = !0, pe = 0; pe < re; pe++)
            if (ae(S, ie + pe) !== ae(i, pe)) {
              de = !1;
              break;
            }
          if (de) return ie;
        }
      return -1;
    }
    n.prototype.includes = function(i, a, p) {
      return this.indexOf(i, a, p) !== -1;
    }, n.prototype.indexOf = function(i, a, p) {
      return F(this, i, a, p, !0);
    }, n.prototype.lastIndexOf = function(i, a, p) {
      return F(this, i, a, p, !1);
    };
    function z(S, i, a, p) {
      a = Number(a) || 0;
      var L = S.length - a;
      p ? (p = Number(p), p > L && (p = L)) : p = L;
      var H = i.length;
      p > H / 2 && (p = H / 2);
      for (var j = 0; j < p; ++j) {
        var re = parseInt(i.substr(j * 2, 2), 16);
        if (d(re)) return j;
        S[a + j] = re;
      }
      return j;
    }
    function I(S, i, a, p) {
      return D(v(i, S.length - a), S, a, p);
    }
    function X(S, i, a, p) {
      return D(W(i), S, a, p);
    }
    function oe(S, i, a, p) {
      return D(O(i), S, a, p);
    }
    function N(S, i, a, p) {
      return D(U(i, S.length - a), S, a, p);
    }
    n.prototype.write = function(i, a, p, L) {
      if (a === void 0)
        L = "utf8", p = this.length, a = 0;
      else if (p === void 0 && typeof a == "string")
        L = a, p = this.length, a = 0;
      else if (isFinite(a))
        a = a >>> 0, isFinite(p) ? (p = p >>> 0, L === void 0 && (L = "utf8")) : (L = p, p = void 0);
      else
        throw new Error(
          "Buffer.write(string, encoding, offset[, length]) is no longer supported"
        );
      var H = this.length - a;
      if ((p === void 0 || p > H) && (p = H), i.length > 0 && (p < 0 || a < 0) || a > this.length)
        throw new RangeError("Attempt to write outside buffer bounds");
      L || (L = "utf8");
      for (var j = !1; ; )
        switch (L) {
          case "hex":
            return z(this, i, a, p);
          case "utf8":
          case "utf-8":
            return I(this, i, a, p);
          case "ascii":
          case "latin1":
          case "binary":
            return X(this, i, a, p);
          case "base64":
            return oe(this, i, a, p);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return N(this, i, a, p);
          default:
            if (j) throw new TypeError("Unknown encoding: " + L);
            L = ("" + L).toLowerCase(), j = !0;
        }
    }, n.prototype.toJSON = function() {
      return {
        type: "Buffer",
        data: Array.prototype.slice.call(this._arr || this, 0)
      };
    };
    function M(S, i, a) {
      return i === 0 && a === S.length ? e.fromByteArray(S) : e.fromByteArray(S.slice(i, a));
    }
    function b(S, i, a) {
      a = Math.min(S.length, a);
      for (var p = [], L = i; L < a; ) {
        var H = S[L], j = null, re = H > 239 ? 4 : H > 223 ? 3 : H > 191 ? 2 : 1;
        if (L + re <= a) {
          var ae, ie, fe, de;
          switch (re) {
            case 1:
              H < 128 && (j = H);
              break;
            case 2:
              ae = S[L + 1], (ae & 192) === 128 && (de = (H & 31) << 6 | ae & 63, de > 127 && (j = de));
              break;
            case 3:
              ae = S[L + 1], ie = S[L + 2], (ae & 192) === 128 && (ie & 192) === 128 && (de = (H & 15) << 12 | (ae & 63) << 6 | ie & 63, de > 2047 && (de < 55296 || de > 57343) && (j = de));
              break;
            case 4:
              ae = S[L + 1], ie = S[L + 2], fe = S[L + 3], (ae & 192) === 128 && (ie & 192) === 128 && (fe & 192) === 128 && (de = (H & 15) << 18 | (ae & 63) << 12 | (ie & 63) << 6 | fe & 63, de > 65535 && de < 1114112 && (j = de));
          }
        }
        j === null ? (j = 65533, re = 1) : j > 65535 && (j -= 65536, p.push(j >>> 10 & 1023 | 55296), j = 56320 | j & 1023), p.push(j), L += re;
      }
      return ee(p);
    }
    var G = 4096;
    function ee(S) {
      var i = S.length;
      if (i <= G)
        return String.fromCharCode.apply(String, S);
      for (var a = "", p = 0; p < i; )
        a += String.fromCharCode.apply(
          String,
          S.slice(p, p += G)
        );
      return a;
    }
    function q(S, i, a) {
      var p = "";
      a = Math.min(S.length, a);
      for (var L = i; L < a; ++L)
        p += String.fromCharCode(S[L] & 127);
      return p;
    }
    function ne(S, i, a) {
      var p = "";
      a = Math.min(S.length, a);
      for (var L = i; L < a; ++L)
        p += String.fromCharCode(S[L]);
      return p;
    }
    function Q(S, i, a) {
      var p = S.length;
      (!i || i < 0) && (i = 0), (!a || a < 0 || a > p) && (a = p);
      for (var L = "", H = i; H < a; ++H)
        L += Y[S[H]];
      return L;
    }
    function ce(S, i, a) {
      for (var p = S.slice(i, a), L = "", H = 0; H < p.length - 1; H += 2)
        L += String.fromCharCode(p[H] + p[H + 1] * 256);
      return L;
    }
    n.prototype.slice = function(i, a) {
      var p = this.length;
      i = ~~i, a = a === void 0 ? p : ~~a, i < 0 ? (i += p, i < 0 && (i = 0)) : i > p && (i = p), a < 0 ? (a += p, a < 0 && (a = 0)) : a > p && (a = p), a < i && (a = i);
      var L = this.subarray(i, a);
      return Object.setPrototypeOf(L, n.prototype), L;
    };
    function V(S, i, a) {
      if (S % 1 !== 0 || S < 0) throw new RangeError("offset is not uint");
      if (S + i > a) throw new RangeError("Trying to access beyond buffer length");
    }
    n.prototype.readUintLE = n.prototype.readUIntLE = function(i, a, p) {
      i = i >>> 0, a = a >>> 0, p || V(i, a, this.length);
      for (var L = this[i], H = 1, j = 0; ++j < a && (H *= 256); )
        L += this[i + j] * H;
      return L;
    }, n.prototype.readUintBE = n.prototype.readUIntBE = function(i, a, p) {
      i = i >>> 0, a = a >>> 0, p || V(i, a, this.length);
      for (var L = this[i + --a], H = 1; a > 0 && (H *= 256); )
        L += this[i + --a] * H;
      return L;
    }, n.prototype.readUint8 = n.prototype.readUInt8 = function(i, a) {
      return i = i >>> 0, a || V(i, 1, this.length), this[i];
    }, n.prototype.readUint16LE = n.prototype.readUInt16LE = function(i, a) {
      return i = i >>> 0, a || V(i, 2, this.length), this[i] | this[i + 1] << 8;
    }, n.prototype.readUint16BE = n.prototype.readUInt16BE = function(i, a) {
      return i = i >>> 0, a || V(i, 2, this.length), this[i] << 8 | this[i + 1];
    }, n.prototype.readUint32LE = n.prototype.readUInt32LE = function(i, a) {
      return i = i >>> 0, a || V(i, 4, this.length), (this[i] | this[i + 1] << 8 | this[i + 2] << 16) + this[i + 3] * 16777216;
    }, n.prototype.readUint32BE = n.prototype.readUInt32BE = function(i, a) {
      return i = i >>> 0, a || V(i, 4, this.length), this[i] * 16777216 + (this[i + 1] << 16 | this[i + 2] << 8 | this[i + 3]);
    }, n.prototype.readIntLE = function(i, a, p) {
      i = i >>> 0, a = a >>> 0, p || V(i, a, this.length);
      for (var L = this[i], H = 1, j = 0; ++j < a && (H *= 256); )
        L += this[i + j] * H;
      return H *= 128, L >= H && (L -= Math.pow(2, 8 * a)), L;
    }, n.prototype.readIntBE = function(i, a, p) {
      i = i >>> 0, a = a >>> 0, p || V(i, a, this.length);
      for (var L = a, H = 1, j = this[i + --L]; L > 0 && (H *= 256); )
        j += this[i + --L] * H;
      return H *= 128, j >= H && (j -= Math.pow(2, 8 * a)), j;
    }, n.prototype.readInt8 = function(i, a) {
      return i = i >>> 0, a || V(i, 1, this.length), this[i] & 128 ? (255 - this[i] + 1) * -1 : this[i];
    }, n.prototype.readInt16LE = function(i, a) {
      i = i >>> 0, a || V(i, 2, this.length);
      var p = this[i] | this[i + 1] << 8;
      return p & 32768 ? p | 4294901760 : p;
    }, n.prototype.readInt16BE = function(i, a) {
      i = i >>> 0, a || V(i, 2, this.length);
      var p = this[i + 1] | this[i] << 8;
      return p & 32768 ? p | 4294901760 : p;
    }, n.prototype.readInt32LE = function(i, a) {
      return i = i >>> 0, a || V(i, 4, this.length), this[i] | this[i + 1] << 8 | this[i + 2] << 16 | this[i + 3] << 24;
    }, n.prototype.readInt32BE = function(i, a) {
      return i = i >>> 0, a || V(i, 4, this.length), this[i] << 24 | this[i + 1] << 16 | this[i + 2] << 8 | this[i + 3];
    }, n.prototype.readFloatLE = function(i, a) {
      return i = i >>> 0, a || V(i, 4, this.length), t.read(this, i, !0, 23, 4);
    }, n.prototype.readFloatBE = function(i, a) {
      return i = i >>> 0, a || V(i, 4, this.length), t.read(this, i, !1, 23, 4);
    }, n.prototype.readDoubleLE = function(i, a) {
      return i = i >>> 0, a || V(i, 8, this.length), t.read(this, i, !0, 52, 8);
    }, n.prototype.readDoubleBE = function(i, a) {
      return i = i >>> 0, a || V(i, 8, this.length), t.read(this, i, !1, 52, 8);
    };
    function P(S, i, a, p, L, H) {
      if (!n.isBuffer(S)) throw new TypeError('"buffer" argument must be a Buffer instance');
      if (i > L || i < H) throw new RangeError('"value" argument is out of bounds');
      if (a + p > S.length) throw new RangeError("Index out of range");
    }
    n.prototype.writeUintLE = n.prototype.writeUIntLE = function(i, a, p, L) {
      if (i = +i, a = a >>> 0, p = p >>> 0, !L) {
        var H = Math.pow(2, 8 * p) - 1;
        P(this, i, a, p, H, 0);
      }
      var j = 1, re = 0;
      for (this[a] = i & 255; ++re < p && (j *= 256); )
        this[a + re] = i / j & 255;
      return a + p;
    }, n.prototype.writeUintBE = n.prototype.writeUIntBE = function(i, a, p, L) {
      if (i = +i, a = a >>> 0, p = p >>> 0, !L) {
        var H = Math.pow(2, 8 * p) - 1;
        P(this, i, a, p, H, 0);
      }
      var j = p - 1, re = 1;
      for (this[a + j] = i & 255; --j >= 0 && (re *= 256); )
        this[a + j] = i / re & 255;
      return a + p;
    }, n.prototype.writeUint8 = n.prototype.writeUInt8 = function(i, a, p) {
      return i = +i, a = a >>> 0, p || P(this, i, a, 1, 255, 0), this[a] = i & 255, a + 1;
    }, n.prototype.writeUint16LE = n.prototype.writeUInt16LE = function(i, a, p) {
      return i = +i, a = a >>> 0, p || P(this, i, a, 2, 65535, 0), this[a] = i & 255, this[a + 1] = i >>> 8, a + 2;
    }, n.prototype.writeUint16BE = n.prototype.writeUInt16BE = function(i, a, p) {
      return i = +i, a = a >>> 0, p || P(this, i, a, 2, 65535, 0), this[a] = i >>> 8, this[a + 1] = i & 255, a + 2;
    }, n.prototype.writeUint32LE = n.prototype.writeUInt32LE = function(i, a, p) {
      return i = +i, a = a >>> 0, p || P(this, i, a, 4, 4294967295, 0), this[a + 3] = i >>> 24, this[a + 2] = i >>> 16, this[a + 1] = i >>> 8, this[a] = i & 255, a + 4;
    }, n.prototype.writeUint32BE = n.prototype.writeUInt32BE = function(i, a, p) {
      return i = +i, a = a >>> 0, p || P(this, i, a, 4, 4294967295, 0), this[a] = i >>> 24, this[a + 1] = i >>> 16, this[a + 2] = i >>> 8, this[a + 3] = i & 255, a + 4;
    }, n.prototype.writeIntLE = function(i, a, p, L) {
      if (i = +i, a = a >>> 0, !L) {
        var H = Math.pow(2, 8 * p - 1);
        P(this, i, a, p, H - 1, -H);
      }
      var j = 0, re = 1, ae = 0;
      for (this[a] = i & 255; ++j < p && (re *= 256); )
        i < 0 && ae === 0 && this[a + j - 1] !== 0 && (ae = 1), this[a + j] = (i / re >> 0) - ae & 255;
      return a + p;
    }, n.prototype.writeIntBE = function(i, a, p, L) {
      if (i = +i, a = a >>> 0, !L) {
        var H = Math.pow(2, 8 * p - 1);
        P(this, i, a, p, H - 1, -H);
      }
      var j = p - 1, re = 1, ae = 0;
      for (this[a + j] = i & 255; --j >= 0 && (re *= 256); )
        i < 0 && ae === 0 && this[a + j + 1] !== 0 && (ae = 1), this[a + j] = (i / re >> 0) - ae & 255;
      return a + p;
    }, n.prototype.writeInt8 = function(i, a, p) {
      return i = +i, a = a >>> 0, p || P(this, i, a, 1, 127, -128), i < 0 && (i = 255 + i + 1), this[a] = i & 255, a + 1;
    }, n.prototype.writeInt16LE = function(i, a, p) {
      return i = +i, a = a >>> 0, p || P(this, i, a, 2, 32767, -32768), this[a] = i & 255, this[a + 1] = i >>> 8, a + 2;
    }, n.prototype.writeInt16BE = function(i, a, p) {
      return i = +i, a = a >>> 0, p || P(this, i, a, 2, 32767, -32768), this[a] = i >>> 8, this[a + 1] = i & 255, a + 2;
    }, n.prototype.writeInt32LE = function(i, a, p) {
      return i = +i, a = a >>> 0, p || P(this, i, a, 4, 2147483647, -2147483648), this[a] = i & 255, this[a + 1] = i >>> 8, this[a + 2] = i >>> 16, this[a + 3] = i >>> 24, a + 4;
    }, n.prototype.writeInt32BE = function(i, a, p) {
      return i = +i, a = a >>> 0, p || P(this, i, a, 4, 2147483647, -2147483648), i < 0 && (i = 4294967295 + i + 1), this[a] = i >>> 24, this[a + 1] = i >>> 16, this[a + 2] = i >>> 8, this[a + 3] = i & 255, a + 4;
    };
    function $(S, i, a, p, L, H) {
      if (a + p > S.length) throw new RangeError("Index out of range");
      if (a < 0) throw new RangeError("Index out of range");
    }
    function Z(S, i, a, p, L) {
      return i = +i, a = a >>> 0, L || $(S, i, a, 4), t.write(S, i, a, p, 23, 4), a + 4;
    }
    n.prototype.writeFloatLE = function(i, a, p) {
      return Z(this, i, a, !0, p);
    }, n.prototype.writeFloatBE = function(i, a, p) {
      return Z(this, i, a, !1, p);
    };
    function te(S, i, a, p, L) {
      return i = +i, a = a >>> 0, L || $(S, i, a, 8), t.write(S, i, a, p, 52, 8), a + 8;
    }
    n.prototype.writeDoubleLE = function(i, a, p) {
      return te(this, i, a, !0, p);
    }, n.prototype.writeDoubleBE = function(i, a, p) {
      return te(this, i, a, !1, p);
    }, n.prototype.copy = function(i, a, p, L) {
      if (!n.isBuffer(i)) throw new TypeError("argument should be a Buffer");
      if (p || (p = 0), !L && L !== 0 && (L = this.length), a >= i.length && (a = i.length), a || (a = 0), L > 0 && L < p && (L = p), L === p || i.length === 0 || this.length === 0) return 0;
      if (a < 0)
        throw new RangeError("targetStart out of bounds");
      if (p < 0 || p >= this.length) throw new RangeError("Index out of range");
      if (L < 0) throw new RangeError("sourceEnd out of bounds");
      L > this.length && (L = this.length), i.length - a < L - p && (L = i.length - a + p);
      var H = L - p;
      return this === i && typeof Uint8Array.prototype.copyWithin == "function" ? this.copyWithin(a, p, L) : Uint8Array.prototype.set.call(
        i,
        this.subarray(p, L),
        a
      ), H;
    }, n.prototype.fill = function(i, a, p, L) {
      if (typeof i == "string") {
        if (typeof a == "string" ? (L = a, a = 0, p = this.length) : typeof p == "string" && (L = p, p = this.length), L !== void 0 && typeof L != "string")
          throw new TypeError("encoding must be a string");
        if (typeof L == "string" && !n.isEncoding(L))
          throw new TypeError("Unknown encoding: " + L);
        if (i.length === 1) {
          var H = i.charCodeAt(0);
          (L === "utf8" && H < 128 || L === "latin1") && (i = H);
        }
      } else typeof i == "number" ? i = i & 255 : typeof i == "boolean" && (i = Number(i));
      if (a < 0 || this.length < a || this.length < p)
        throw new RangeError("Out of range index");
      if (p <= a)
        return this;
      a = a >>> 0, p = p === void 0 ? this.length : p >>> 0, i || (i = 0);
      var j;
      if (typeof i == "number")
        for (j = a; j < p; ++j)
          this[j] = i;
      else {
        var re = n.isBuffer(i) ? i : n.from(i, L), ae = re.length;
        if (ae === 0)
          throw new TypeError('The value "' + i + '" is invalid for argument "value"');
        for (j = 0; j < p - a; ++j)
          this[j + a] = re[j % ae];
      }
      return this;
    };
    var K = /[^+/0-9A-Za-z-_]/g;
    function x(S) {
      if (S = S.split("=")[0], S = S.trim().replace(K, ""), S.length < 2) return "";
      for (; S.length % 4 !== 0; )
        S = S + "=";
      return S;
    }
    function v(S, i) {
      i = i || 1 / 0;
      for (var a, p = S.length, L = null, H = [], j = 0; j < p; ++j) {
        if (a = S.charCodeAt(j), a > 55295 && a < 57344) {
          if (!L) {
            if (a > 56319) {
              (i -= 3) > -1 && H.push(239, 191, 189);
              continue;
            } else if (j + 1 === p) {
              (i -= 3) > -1 && H.push(239, 191, 189);
              continue;
            }
            L = a;
            continue;
          }
          if (a < 56320) {
            (i -= 3) > -1 && H.push(239, 191, 189), L = a;
            continue;
          }
          a = (L - 55296 << 10 | a - 56320) + 65536;
        } else L && (i -= 3) > -1 && H.push(239, 191, 189);
        if (L = null, a < 128) {
          if ((i -= 1) < 0) break;
          H.push(a);
        } else if (a < 2048) {
          if ((i -= 2) < 0) break;
          H.push(
            a >> 6 | 192,
            a & 63 | 128
          );
        } else if (a < 65536) {
          if ((i -= 3) < 0) break;
          H.push(
            a >> 12 | 224,
            a >> 6 & 63 | 128,
            a & 63 | 128
          );
        } else if (a < 1114112) {
          if ((i -= 4) < 0) break;
          H.push(
            a >> 18 | 240,
            a >> 12 & 63 | 128,
            a >> 6 & 63 | 128,
            a & 63 | 128
          );
        } else
          throw new Error("Invalid code point");
      }
      return H;
    }
    function W(S) {
      for (var i = [], a = 0; a < S.length; ++a)
        i.push(S.charCodeAt(a) & 255);
      return i;
    }
    function U(S, i) {
      for (var a, p, L, H = [], j = 0; j < S.length && !((i -= 2) < 0); ++j)
        a = S.charCodeAt(j), p = a >> 8, L = a % 256, H.push(L), H.push(p);
      return H;
    }
    function O(S) {
      return e.toByteArray(x(S));
    }
    function D(S, i, a, p) {
      for (var L = 0; L < p && !(L + a >= i.length || L >= S.length); ++L)
        i[L + a] = S[L];
      return L;
    }
    function J(S, i) {
      return S instanceof i || S != null && S.constructor != null && S.constructor.name != null && S.constructor.name === i.name;
    }
    function d(S) {
      return S !== S;
    }
    var Y = function() {
      for (var S = "0123456789abcdef", i = new Array(256), a = 0; a < 16; ++a)
        for (var p = a * 16, L = 0; L < 16; ++L)
          i[p + L] = S[a] + S[L];
      return i;
    }();
  }(Er)), Er;
}
var xr = {}, Sr = {}, Tr, na;
function po() {
  return na || (na = 1, Tr = function() {
    if (typeof Symbol != "function" || typeof Object.getOwnPropertySymbols != "function")
      return !1;
    if (typeof Symbol.iterator == "symbol")
      return !0;
    var e = {}, t = /* @__PURE__ */ Symbol("test"), s = Object(t);
    if (typeof t == "string" || Object.prototype.toString.call(t) !== "[object Symbol]" || Object.prototype.toString.call(s) !== "[object Symbol]")
      return !1;
    var o = 42;
    e[t] = o;
    for (var u in e)
      return !1;
    if (typeof Object.keys == "function" && Object.keys(e).length !== 0 || typeof Object.getOwnPropertyNames == "function" && Object.getOwnPropertyNames(e).length !== 0)
      return !1;
    var l = Object.getOwnPropertySymbols(e);
    if (l.length !== 1 || l[0] !== t || !Object.prototype.propertyIsEnumerable.call(e, t))
      return !1;
    if (typeof Object.getOwnPropertyDescriptor == "function") {
      var n = (
        /** @type {PropertyDescriptor} */
        Object.getOwnPropertyDescriptor(e, t)
      );
      if (n.value !== o || n.enumerable !== !0)
        return !1;
    }
    return !0;
  }), Tr;
}
var Ar, ia;
function Ci() {
  if (ia) return Ar;
  ia = 1;
  var r = po();
  return Ar = function() {
    return r() && !!Symbol.toStringTag;
  }, Ar;
}
var kr, aa;
function mo() {
  return aa || (aa = 1, kr = Object), kr;
}
var Rr, sa;
function ic() {
  return sa || (sa = 1, Rr = Error), Rr;
}
var Cr, oa;
function ac() {
  return oa || (oa = 1, Cr = EvalError), Cr;
}
var Ir, ua;
function sc() {
  return ua || (ua = 1, Ir = RangeError), Ir;
}
var Nr, ca;
function oc() {
  return ca || (ca = 1, Nr = ReferenceError), Nr;
}
var Or, la;
function go() {
  return la || (la = 1, Or = SyntaxError), Or;
}
var Pr, fa;
function dr() {
  return fa || (fa = 1, Pr = TypeError), Pr;
}
var Fr, ha;
function uc() {
  return ha || (ha = 1, Fr = URIError), Fr;
}
var Dr, da;
function cc() {
  return da || (da = 1, Dr = Math.abs), Dr;
}
var Br, pa;
function lc() {
  return pa || (pa = 1, Br = Math.floor), Br;
}
var Lr, ma;
function fc() {
  return ma || (ma = 1, Lr = Math.max), Lr;
}
var Ur, ga;
function hc() {
  return ga || (ga = 1, Ur = Math.min), Ur;
}
var Mr, wa;
function dc() {
  return wa || (wa = 1, Mr = Math.pow), Mr;
}
var jr, ya;
function pc() {
  return ya || (ya = 1, jr = Math.round), jr;
}
var zr, va;
function mc() {
  return va || (va = 1, zr = Number.isNaN || function(e) {
    return e !== e;
  }), zr;
}
var Wr, ba;
function gc() {
  if (ba) return Wr;
  ba = 1;
  var r = /* @__PURE__ */ mc();
  return Wr = function(t) {
    return r(t) || t === 0 ? t : t < 0 ? -1 : 1;
  }, Wr;
}
var qr, _a;
function wc() {
  return _a || (_a = 1, qr = Object.getOwnPropertyDescriptor), qr;
}
var Hr, Ea;
function jt() {
  if (Ea) return Hr;
  Ea = 1;
  var r = /* @__PURE__ */ wc();
  if (r)
    try {
      r([], "length");
    } catch {
      r = null;
    }
  return Hr = r, Hr;
}
var Kr, xa;
function pr() {
  if (xa) return Kr;
  xa = 1;
  var r = Object.defineProperty || !1;
  if (r)
    try {
      r({}, "a", { value: 1 });
    } catch {
      r = !1;
    }
  return Kr = r, Kr;
}
var Gr, Sa;
function yc() {
  if (Sa) return Gr;
  Sa = 1;
  var r = typeof Symbol < "u" && Symbol, e = po();
  return Gr = function() {
    return typeof r != "function" || typeof Symbol != "function" || typeof r("foo") != "symbol" || typeof /* @__PURE__ */ Symbol("bar") != "symbol" ? !1 : e();
  }, Gr;
}
var Vr, Ta;
function wo() {
  return Ta || (Ta = 1, Vr = typeof Reflect < "u" && Reflect.getPrototypeOf || null), Vr;
}
var $r, Aa;
function yo() {
  if (Aa) return $r;
  Aa = 1;
  var r = /* @__PURE__ */ mo();
  return $r = r.getPrototypeOf || null, $r;
}
var Xr, ka;
function vc() {
  if (ka) return Xr;
  ka = 1;
  var r = "Function.prototype.bind called on incompatible ", e = Object.prototype.toString, t = Math.max, s = "[object Function]", o = function(f, g) {
    for (var _ = [], k = 0; k < f.length; k += 1)
      _[k] = f[k];
    for (var R = 0; R < g.length; R += 1)
      _[R + f.length] = g[R];
    return _;
  }, u = function(f, g) {
    for (var _ = [], k = g, R = 0; k < f.length; k += 1, R += 1)
      _[R] = f[k];
    return _;
  }, l = function(n, f) {
    for (var g = "", _ = 0; _ < n.length; _ += 1)
      g += n[_], _ + 1 < n.length && (g += f);
    return g;
  };
  return Xr = function(f) {
    var g = this;
    if (typeof g != "function" || e.apply(g) !== s)
      throw new TypeError(r + g);
    for (var _ = u(arguments, 1), k, R = function() {
      if (this instanceof k) {
        var c = g.apply(
          this,
          o(_, arguments)
        );
        return Object(c) === c ? c : this;
      }
      return g.apply(
        f,
        o(_, arguments)
      );
    }, E = t(0, g.length - _.length), C = [], w = 0; w < E; w++)
      C[w] = "$" + w;
    if (k = Function("binder", "return function (" + l(C, ",") + "){ return binder.apply(this,arguments); }")(R), g.prototype) {
      var A = function() {
      };
      A.prototype = g.prototype, k.prototype = new A(), A.prototype = null;
    }
    return k;
  }, Xr;
}
var Zr, Ra;
function zt() {
  if (Ra) return Zr;
  Ra = 1;
  var r = vc();
  return Zr = Function.prototype.bind || r, Zr;
}
var Yr, Ca;
function Ii() {
  return Ca || (Ca = 1, Yr = Function.prototype.call), Yr;
}
var Jr, Ia;
function Ni() {
  return Ia || (Ia = 1, Jr = Function.prototype.apply), Jr;
}
var Qr, Na;
function bc() {
  return Na || (Na = 1, Qr = typeof Reflect < "u" && Reflect && Reflect.apply), Qr;
}
var en, Oa;
function vo() {
  if (Oa) return en;
  Oa = 1;
  var r = zt(), e = Ni(), t = Ii(), s = bc();
  return en = s || r.call(t, e), en;
}
var tn, Pa;
function Oi() {
  if (Pa) return tn;
  Pa = 1;
  var r = zt(), e = /* @__PURE__ */ dr(), t = Ii(), s = vo();
  return tn = function(u) {
    if (u.length < 1 || typeof u[0] != "function")
      throw new e("a function is required");
    return s(r, t, u);
  }, tn;
}
var rn, Fa;
function _c() {
  if (Fa) return rn;
  Fa = 1;
  var r = Oi(), e = /* @__PURE__ */ jt(), t;
  try {
    t = /** @type {{ __proto__?: typeof Array.prototype }} */
    [].__proto__ === Array.prototype;
  } catch (l) {
    if (!l || typeof l != "object" || !("code" in l) || l.code !== "ERR_PROTO_ACCESS")
      throw l;
  }
  var s = !!t && e && e(
    Object.prototype,
    /** @type {keyof typeof Object.prototype} */
    "__proto__"
  ), o = Object, u = o.getPrototypeOf;
  return rn = s && typeof s.get == "function" ? r([s.get]) : typeof u == "function" ? (
    /** @type {import('./get')} */
    function(n) {
      return u(n == null ? n : o(n));
    }
  ) : !1, rn;
}
var nn, Da;
function bo() {
  if (Da) return nn;
  Da = 1;
  var r = wo(), e = yo(), t = /* @__PURE__ */ _c();
  return nn = r ? function(o) {
    return r(o);
  } : e ? function(o) {
    if (!o || typeof o != "object" && typeof o != "function")
      throw new TypeError("getProto: not an object");
    return e(o);
  } : t ? function(o) {
    return t(o);
  } : null, nn;
}
var an, Ba;
function Ec() {
  if (Ba) return an;
  Ba = 1;
  var r = Function.prototype.call, e = Object.prototype.hasOwnProperty, t = zt();
  return an = t.call(r, e), an;
}
var sn, La;
function _o() {
  if (La) return sn;
  La = 1;
  var r, e = /* @__PURE__ */ mo(), t = /* @__PURE__ */ ic(), s = /* @__PURE__ */ ac(), o = /* @__PURE__ */ sc(), u = /* @__PURE__ */ oc(), l = /* @__PURE__ */ go(), n = /* @__PURE__ */ dr(), f = /* @__PURE__ */ uc(), g = /* @__PURE__ */ cc(), _ = /* @__PURE__ */ lc(), k = /* @__PURE__ */ fc(), R = /* @__PURE__ */ hc(), E = /* @__PURE__ */ dc(), C = /* @__PURE__ */ pc(), w = /* @__PURE__ */ gc(), A = Function, c = function(W) {
    try {
      return A('"use strict"; return (' + W + ").constructor;")();
    } catch {
    }
  }, y = /* @__PURE__ */ jt(), m = /* @__PURE__ */ pr(), h = function() {
    throw new n();
  }, T = y ? function() {
    try {
      return arguments.callee, h;
    } catch {
      try {
        return y(arguments, "callee").get;
      } catch {
        return h;
      }
    }
  }() : h, F = yc()(), B = bo(), z = yo(), I = wo(), X = Ni(), oe = Ii(), N = {}, M = typeof Uint8Array > "u" || !B ? r : B(Uint8Array), b = {
    __proto__: null,
    "%AggregateError%": typeof AggregateError > "u" ? r : AggregateError,
    "%Array%": Array,
    "%ArrayBuffer%": typeof ArrayBuffer > "u" ? r : ArrayBuffer,
    "%ArrayIteratorPrototype%": F && B ? B([][Symbol.iterator]()) : r,
    "%AsyncFromSyncIteratorPrototype%": r,
    "%AsyncFunction%": N,
    "%AsyncGenerator%": N,
    "%AsyncGeneratorFunction%": N,
    "%AsyncIteratorPrototype%": N,
    "%Atomics%": typeof Atomics > "u" ? r : Atomics,
    "%BigInt%": typeof BigInt > "u" ? r : BigInt,
    "%BigInt64Array%": typeof BigInt64Array > "u" ? r : BigInt64Array,
    "%BigUint64Array%": typeof BigUint64Array > "u" ? r : BigUint64Array,
    "%Boolean%": Boolean,
    "%DataView%": typeof DataView > "u" ? r : DataView,
    "%Date%": Date,
    "%decodeURI%": decodeURI,
    "%decodeURIComponent%": decodeURIComponent,
    "%encodeURI%": encodeURI,
    "%encodeURIComponent%": encodeURIComponent,
    "%Error%": t,
    "%eval%": eval,
    // eslint-disable-line no-eval
    "%EvalError%": s,
    "%Float16Array%": typeof Float16Array > "u" ? r : Float16Array,
    "%Float32Array%": typeof Float32Array > "u" ? r : Float32Array,
    "%Float64Array%": typeof Float64Array > "u" ? r : Float64Array,
    "%FinalizationRegistry%": typeof FinalizationRegistry > "u" ? r : FinalizationRegistry,
    "%Function%": A,
    "%GeneratorFunction%": N,
    "%Int8Array%": typeof Int8Array > "u" ? r : Int8Array,
    "%Int16Array%": typeof Int16Array > "u" ? r : Int16Array,
    "%Int32Array%": typeof Int32Array > "u" ? r : Int32Array,
    "%isFinite%": isFinite,
    "%isNaN%": isNaN,
    "%IteratorPrototype%": F && B ? B(B([][Symbol.iterator]())) : r,
    "%JSON%": typeof JSON == "object" ? JSON : r,
    "%Map%": typeof Map > "u" ? r : Map,
    "%MapIteratorPrototype%": typeof Map > "u" || !F || !B ? r : B((/* @__PURE__ */ new Map())[Symbol.iterator]()),
    "%Math%": Math,
    "%Number%": Number,
    "%Object%": e,
    "%Object.getOwnPropertyDescriptor%": y,
    "%parseFloat%": parseFloat,
    "%parseInt%": parseInt,
    "%Promise%": typeof Promise > "u" ? r : Promise,
    "%Proxy%": typeof Proxy > "u" ? r : Proxy,
    "%RangeError%": o,
    "%ReferenceError%": u,
    "%Reflect%": typeof Reflect > "u" ? r : Reflect,
    "%RegExp%": RegExp,
    "%Set%": typeof Set > "u" ? r : Set,
    "%SetIteratorPrototype%": typeof Set > "u" || !F || !B ? r : B((/* @__PURE__ */ new Set())[Symbol.iterator]()),
    "%SharedArrayBuffer%": typeof SharedArrayBuffer > "u" ? r : SharedArrayBuffer,
    "%String%": String,
    "%StringIteratorPrototype%": F && B ? B(""[Symbol.iterator]()) : r,
    "%Symbol%": F ? Symbol : r,
    "%SyntaxError%": l,
    "%ThrowTypeError%": T,
    "%TypedArray%": M,
    "%TypeError%": n,
    "%Uint8Array%": typeof Uint8Array > "u" ? r : Uint8Array,
    "%Uint8ClampedArray%": typeof Uint8ClampedArray > "u" ? r : Uint8ClampedArray,
    "%Uint16Array%": typeof Uint16Array > "u" ? r : Uint16Array,
    "%Uint32Array%": typeof Uint32Array > "u" ? r : Uint32Array,
    "%URIError%": f,
    "%WeakMap%": typeof WeakMap > "u" ? r : WeakMap,
    "%WeakRef%": typeof WeakRef > "u" ? r : WeakRef,
    "%WeakSet%": typeof WeakSet > "u" ? r : WeakSet,
    "%Function.prototype.call%": oe,
    "%Function.prototype.apply%": X,
    "%Object.defineProperty%": m,
    "%Object.getPrototypeOf%": z,
    "%Math.abs%": g,
    "%Math.floor%": _,
    "%Math.max%": k,
    "%Math.min%": R,
    "%Math.pow%": E,
    "%Math.round%": C,
    "%Math.sign%": w,
    "%Reflect.getPrototypeOf%": I
  };
  if (B)
    try {
      null.error;
    } catch (W) {
      var G = B(B(W));
      b["%Error.prototype%"] = G;
    }
  var ee = function W(U) {
    var O;
    if (U === "%AsyncFunction%")
      O = c("async function () {}");
    else if (U === "%GeneratorFunction%")
      O = c("function* () {}");
    else if (U === "%AsyncGeneratorFunction%")
      O = c("async function* () {}");
    else if (U === "%AsyncGenerator%") {
      var D = W("%AsyncGeneratorFunction%");
      D && (O = D.prototype);
    } else if (U === "%AsyncIteratorPrototype%") {
      var J = W("%AsyncGenerator%");
      J && B && (O = B(J.prototype));
    }
    return b[U] = O, O;
  }, q = {
    __proto__: null,
    "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
    "%ArrayPrototype%": ["Array", "prototype"],
    "%ArrayProto_entries%": ["Array", "prototype", "entries"],
    "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
    "%ArrayProto_keys%": ["Array", "prototype", "keys"],
    "%ArrayProto_values%": ["Array", "prototype", "values"],
    "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
    "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
    "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
    "%BooleanPrototype%": ["Boolean", "prototype"],
    "%DataViewPrototype%": ["DataView", "prototype"],
    "%DatePrototype%": ["Date", "prototype"],
    "%ErrorPrototype%": ["Error", "prototype"],
    "%EvalErrorPrototype%": ["EvalError", "prototype"],
    "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
    "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
    "%FunctionPrototype%": ["Function", "prototype"],
    "%Generator%": ["GeneratorFunction", "prototype"],
    "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
    "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
    "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
    "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
    "%JSONParse%": ["JSON", "parse"],
    "%JSONStringify%": ["JSON", "stringify"],
    "%MapPrototype%": ["Map", "prototype"],
    "%NumberPrototype%": ["Number", "prototype"],
    "%ObjectPrototype%": ["Object", "prototype"],
    "%ObjProto_toString%": ["Object", "prototype", "toString"],
    "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
    "%PromisePrototype%": ["Promise", "prototype"],
    "%PromiseProto_then%": ["Promise", "prototype", "then"],
    "%Promise_all%": ["Promise", "all"],
    "%Promise_reject%": ["Promise", "reject"],
    "%Promise_resolve%": ["Promise", "resolve"],
    "%RangeErrorPrototype%": ["RangeError", "prototype"],
    "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
    "%RegExpPrototype%": ["RegExp", "prototype"],
    "%SetPrototype%": ["Set", "prototype"],
    "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
    "%StringPrototype%": ["String", "prototype"],
    "%SymbolPrototype%": ["Symbol", "prototype"],
    "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
    "%TypedArrayPrototype%": ["TypedArray", "prototype"],
    "%TypeErrorPrototype%": ["TypeError", "prototype"],
    "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
    "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
    "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
    "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
    "%URIErrorPrototype%": ["URIError", "prototype"],
    "%WeakMapPrototype%": ["WeakMap", "prototype"],
    "%WeakSetPrototype%": ["WeakSet", "prototype"]
  }, ne = zt(), Q = /* @__PURE__ */ Ec(), ce = ne.call(oe, Array.prototype.concat), V = ne.call(X, Array.prototype.splice), P = ne.call(oe, String.prototype.replace), $ = ne.call(oe, String.prototype.slice), Z = ne.call(oe, RegExp.prototype.exec), te = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g, K = /\\(\\)?/g, x = function(U) {
    var O = $(U, 0, 1), D = $(U, -1);
    if (O === "%" && D !== "%")
      throw new l("invalid intrinsic syntax, expected closing `%`");
    if (D === "%" && O !== "%")
      throw new l("invalid intrinsic syntax, expected opening `%`");
    var J = [];
    return P(U, te, function(d, Y, S, i) {
      J[J.length] = S ? P(i, K, "$1") : Y || d;
    }), J;
  }, v = function(U, O) {
    var D = U, J;
    if (Q(q, D) && (J = q[D], D = "%" + J[0] + "%"), Q(b, D)) {
      var d = b[D];
      if (d === N && (d = ee(D)), typeof d > "u" && !O)
        throw new n("intrinsic " + U + " exists, but is not available. Please file an issue!");
      return {
        alias: J,
        name: D,
        value: d
      };
    }
    throw new l("intrinsic " + U + " does not exist!");
  };
  return sn = function(U, O) {
    if (typeof U != "string" || U.length === 0)
      throw new n("intrinsic name must be a non-empty string");
    if (arguments.length > 1 && typeof O != "boolean")
      throw new n('"allowMissing" argument must be a boolean');
    if (Z(/^%?[^%]*%?$/, U) === null)
      throw new l("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
    var D = x(U), J = D.length > 0 ? D[0] : "", d = v("%" + J + "%", O), Y = d.name, S = d.value, i = !1, a = d.alias;
    a && (J = a[0], V(D, ce([0, 1], a)));
    for (var p = 1, L = !0; p < D.length; p += 1) {
      var H = D[p], j = $(H, 0, 1), re = $(H, -1);
      if ((j === '"' || j === "'" || j === "`" || re === '"' || re === "'" || re === "`") && j !== re)
        throw new l("property names with quotes must have matching quotes");
      if ((H === "constructor" || !L) && (i = !0), J += "." + H, Y = "%" + J + "%", Q(b, Y))
        S = b[Y];
      else if (S != null) {
        if (!(H in S)) {
          if (!O)
            throw new n("base intrinsic for " + U + " exists, but the property is not available.");
          return;
        }
        if (y && p + 1 >= D.length) {
          var ae = y(S, H);
          L = !!ae, L && "get" in ae && !("originalValue" in ae.get) ? S = ae.get : S = S[H];
        } else
          L = Q(S, H), S = S[H];
        L && !i && (b[Y] = S);
      }
    }
    return S;
  }, sn;
}
var on, Ua;
function Eo() {
  if (Ua) return on;
  Ua = 1;
  var r = /* @__PURE__ */ _o(), e = Oi(), t = e([r("%String.prototype.indexOf%")]);
  return on = function(o, u) {
    var l = (
      /** @type {(this: unknown, ...args: unknown[]) => unknown} */
      r(o, !!u)
    );
    return typeof l == "function" && t(o, ".prototype.") > -1 ? e(
      /** @type {const} */
      [l]
    ) : l;
  }, on;
}
var un, Ma;
function xc() {
  if (Ma) return un;
  Ma = 1;
  var r = Ci()(), e = /* @__PURE__ */ Eo(), t = e("Object.prototype.toString"), s = function(n) {
    return r && n && typeof n == "object" && Symbol.toStringTag in n ? !1 : t(n) === "[object Arguments]";
  }, o = function(n) {
    return s(n) ? !0 : n !== null && typeof n == "object" && "length" in n && typeof n.length == "number" && n.length >= 0 && t(n) !== "[object Array]" && "callee" in n && t(n.callee) === "[object Function]";
  }, u = function() {
    return s(arguments);
  }();
  return s.isLegacyArguments = o, un = u ? s : o, un;
}
var cn, ja;
function Sc() {
  if (ja) return cn;
  ja = 1;
  var r = Object.prototype.toString, e = Function.prototype.toString, t = /^\s*(?:function)?\*/, s = Ci()(), o = Object.getPrototypeOf, u = function() {
    if (!s)
      return !1;
    try {
      return Function("return function*() {}")();
    } catch {
    }
  }, l;
  return cn = function(f) {
    if (typeof f != "function")
      return !1;
    if (t.test(e.call(f)))
      return !0;
    if (!s) {
      var g = r.call(f);
      return g === "[object GeneratorFunction]";
    }
    if (!o)
      return !1;
    if (typeof l > "u") {
      var _ = u();
      l = _ ? o(_) : !1;
    }
    return o(f) === l;
  }, cn;
}
var ln, za;
function Tc() {
  if (za) return ln;
  za = 1;
  var r = Function.prototype.toString, e = typeof Reflect == "object" && Reflect !== null && Reflect.apply, t, s;
  if (typeof e == "function" && typeof Object.defineProperty == "function")
    try {
      t = Object.defineProperty({}, "length", {
        get: function() {
          throw s;
        }
      }), s = {}, e(function() {
        throw 42;
      }, null, t);
    } catch (y) {
      y !== s && (e = null);
    }
  else
    e = null;
  var o = /^\s*class\b/, u = function(m) {
    try {
      var h = r.call(m);
      return o.test(h);
    } catch {
      return !1;
    }
  }, l = function(m) {
    try {
      return u(m) ? !1 : (r.call(m), !0);
    } catch {
      return !1;
    }
  }, n = Object.prototype.toString, f = "[object Object]", g = "[object Function]", _ = "[object GeneratorFunction]", k = "[object HTMLAllCollection]", R = "[object HTML document.all class]", E = "[object HTMLCollection]", C = typeof Symbol == "function" && !!Symbol.toStringTag, w = !(0 in [,]), A = function() {
    return !1;
  };
  if (typeof document == "object") {
    var c = document.all;
    n.call(c) === n.call(document.all) && (A = function(m) {
      if ((w || !m) && (typeof m > "u" || typeof m == "object"))
        try {
          var h = n.call(m);
          return (h === k || h === R || h === E || h === f) && m("") == null;
        } catch {
        }
      return !1;
    });
  }
  return ln = e ? function(m) {
    if (A(m))
      return !0;
    if (!m || typeof m != "function" && typeof m != "object")
      return !1;
    try {
      e(m, null, t);
    } catch (h) {
      if (h !== s)
        return !1;
    }
    return !u(m) && l(m);
  } : function(m) {
    if (A(m))
      return !0;
    if (!m || typeof m != "function" && typeof m != "object")
      return !1;
    if (C)
      return l(m);
    if (u(m))
      return !1;
    var h = n.call(m);
    return h !== g && h !== _ && !/^\[object HTML/.test(h) ? !1 : l(m);
  }, ln;
}
var fn, Wa;
function Ac() {
  if (Wa) return fn;
  Wa = 1;
  var r = Tc(), e = Object.prototype.toString, t = Object.prototype.hasOwnProperty, s = function(f, g, _) {
    for (var k = 0, R = f.length; k < R; k++)
      t.call(f, k) && (_ == null ? g(f[k], k, f) : g.call(_, f[k], k, f));
  }, o = function(f, g, _) {
    for (var k = 0, R = f.length; k < R; k++)
      _ == null ? g(f.charAt(k), k, f) : g.call(_, f.charAt(k), k, f);
  }, u = function(f, g, _) {
    for (var k in f)
      t.call(f, k) && (_ == null ? g(f[k], k, f) : g.call(_, f[k], k, f));
  };
  function l(n) {
    return e.call(n) === "[object Array]";
  }
  return fn = function(f, g, _) {
    if (!r(g))
      throw new TypeError("iterator must be a function");
    var k;
    arguments.length >= 3 && (k = _), l(f) ? s(f, g, k) : typeof f == "string" ? o(f, g, k) : u(f, g, k);
  }, fn;
}
var hn, qa;
function kc() {
  return qa || (qa = 1, hn = [
    "Float32Array",
    "Float64Array",
    "Int8Array",
    "Int16Array",
    "Int32Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Uint16Array",
    "Uint32Array",
    "BigInt64Array",
    "BigUint64Array"
  ]), hn;
}
var dn, Ha;
function Rc() {
  if (Ha) return dn;
  Ha = 1;
  var r = /* @__PURE__ */ kc(), e = typeof globalThis > "u" ? Fe : globalThis;
  return dn = function() {
    for (var s = [], o = 0; o < r.length; o++)
      typeof e[r[o]] == "function" && (s[s.length] = r[o]);
    return s;
  }, dn;
}
var pn = { exports: {} }, mn, Ka;
function Cc() {
  if (Ka) return mn;
  Ka = 1;
  var r = /* @__PURE__ */ pr(), e = /* @__PURE__ */ go(), t = /* @__PURE__ */ dr(), s = /* @__PURE__ */ jt();
  return mn = function(u, l, n) {
    if (!u || typeof u != "object" && typeof u != "function")
      throw new t("`obj` must be an object or a function`");
    if (typeof l != "string" && typeof l != "symbol")
      throw new t("`property` must be a string or a symbol`");
    if (arguments.length > 3 && typeof arguments[3] != "boolean" && arguments[3] !== null)
      throw new t("`nonEnumerable`, if provided, must be a boolean or null");
    if (arguments.length > 4 && typeof arguments[4] != "boolean" && arguments[4] !== null)
      throw new t("`nonWritable`, if provided, must be a boolean or null");
    if (arguments.length > 5 && typeof arguments[5] != "boolean" && arguments[5] !== null)
      throw new t("`nonConfigurable`, if provided, must be a boolean or null");
    if (arguments.length > 6 && typeof arguments[6] != "boolean")
      throw new t("`loose`, if provided, must be a boolean");
    var f = arguments.length > 3 ? arguments[3] : null, g = arguments.length > 4 ? arguments[4] : null, _ = arguments.length > 5 ? arguments[5] : null, k = arguments.length > 6 ? arguments[6] : !1, R = !!s && s(u, l);
    if (r)
      r(u, l, {
        configurable: _ === null && R ? R.configurable : !_,
        enumerable: f === null && R ? R.enumerable : !f,
        value: n,
        writable: g === null && R ? R.writable : !g
      });
    else if (k || !f && !g && !_)
      u[l] = n;
    else
      throw new e("This environment does not support defining a property as non-configurable, non-writable, or non-enumerable.");
  }, mn;
}
var gn, Ga;
function Ic() {
  if (Ga) return gn;
  Ga = 1;
  var r = /* @__PURE__ */ pr(), e = function() {
    return !!r;
  };
  return e.hasArrayLengthDefineBug = function() {
    if (!r)
      return null;
    try {
      return r([], "length", { value: 1 }).length !== 1;
    } catch {
      return !0;
    }
  }, gn = e, gn;
}
var wn, Va;
function Nc() {
  if (Va) return wn;
  Va = 1;
  var r = /* @__PURE__ */ _o(), e = /* @__PURE__ */ Cc(), t = /* @__PURE__ */ Ic()(), s = /* @__PURE__ */ jt(), o = /* @__PURE__ */ dr(), u = r("%Math.floor%");
  return wn = function(n, f) {
    if (typeof n != "function")
      throw new o("`fn` is not a function");
    if (typeof f != "number" || f < 0 || f > 4294967295 || u(f) !== f)
      throw new o("`length` must be a positive 32-bit integer");
    var g = arguments.length > 2 && !!arguments[2], _ = !0, k = !0;
    if ("length" in n && s) {
      var R = s(n, "length");
      R && !R.configurable && (_ = !1), R && !R.writable && (k = !1);
    }
    return (_ || k || !g) && (t ? e(
      /** @type {Parameters<define>[0]} */
      n,
      "length",
      f,
      !0,
      !0
    ) : e(
      /** @type {Parameters<define>[0]} */
      n,
      "length",
      f
    )), n;
  }, wn;
}
var yn, $a;
function Oc() {
  if ($a) return yn;
  $a = 1;
  var r = zt(), e = Ni(), t = vo();
  return yn = function() {
    return t(r, e, arguments);
  }, yn;
}
var Xa;
function Pc() {
  return Xa || (Xa = 1, function(r) {
    var e = /* @__PURE__ */ Nc(), t = /* @__PURE__ */ pr(), s = Oi(), o = Oc();
    r.exports = function(l) {
      var n = s(arguments), f = l.length - (arguments.length - 1);
      return e(
        n,
        1 + (f > 0 ? f : 0),
        !0
      );
    }, t ? t(r.exports, "apply", { value: o }) : r.exports.apply = o;
  }(pn)), pn.exports;
}
var vn, Za;
function xo() {
  if (Za) return vn;
  Za = 1;
  var r = Ac(), e = /* @__PURE__ */ Rc(), t = Pc(), s = /* @__PURE__ */ Eo(), o = /* @__PURE__ */ jt(), u = bo(), l = s("Object.prototype.toString"), n = Ci()(), f = typeof globalThis > "u" ? Fe : globalThis, g = e(), _ = s("String.prototype.slice"), k = s("Array.prototype.indexOf", !0) || function(A, c) {
    for (var y = 0; y < A.length; y += 1)
      if (A[y] === c)
        return y;
    return -1;
  }, R = { __proto__: null };
  n && o && u ? r(g, function(w) {
    var A = new f[w]();
    if (Symbol.toStringTag in A && u) {
      var c = u(A), y = o(c, Symbol.toStringTag);
      if (!y && c) {
        var m = u(c);
        y = o(m, Symbol.toStringTag);
      }
      R["$" + w] = t(y.get);
    }
  }) : r(g, function(w) {
    var A = new f[w](), c = A.slice || A.set;
    c && (R[
      /** @type {`$${import('.').TypedArrayName}`} */
      "$" + w
    ] = /** @type {import('./types').BoundSlice | import('./types').BoundSet} */
    // @ts-expect-error TODO FIXME
    t(c));
  });
  var E = function(A) {
    var c = !1;
    return r(
      /** @type {Record<`\$${import('.').TypedArrayName}`, Getter>} */
      R,
      /** @type {(getter: Getter, name: `\$${import('.').TypedArrayName}`) => void} */
      function(y, m) {
        if (!c)
          try {
            "$" + y(A) === m && (c = /** @type {import('.').TypedArrayName} */
            _(m, 1));
          } catch {
          }
      }
    ), c;
  }, C = function(A) {
    var c = !1;
    return r(
      /** @type {Record<`\$${import('.').TypedArrayName}`, Getter>} */
      R,
      /** @type {(getter: Getter, name: `\$${import('.').TypedArrayName}`) => void} */
      function(y, m) {
        if (!c)
          try {
            y(A), c = /** @type {import('.').TypedArrayName} */
            _(m, 1);
          } catch {
          }
      }
    ), c;
  };
  return vn = function(A) {
    if (!A || typeof A != "object")
      return !1;
    if (!n) {
      var c = _(l(A), 8, -1);
      return k(g, c) > -1 ? c : c !== "Object" ? !1 : C(A);
    }
    return o ? E(A) : null;
  }, vn;
}
var bn, Ya;
function Fc() {
  if (Ya) return bn;
  Ya = 1;
  var r = /* @__PURE__ */ xo();
  return bn = function(t) {
    return !!r(t);
  }, bn;
}
var Ja;
function Dc() {
  return Ja || (Ja = 1, function(r) {
    var e = /* @__PURE__ */ xc(), t = Sc(), s = /* @__PURE__ */ xo(), o = /* @__PURE__ */ Fc();
    function u(p) {
      return p.call.bind(p);
    }
    var l = typeof BigInt < "u", n = typeof Symbol < "u", f = u(Object.prototype.toString), g = u(Number.prototype.valueOf), _ = u(String.prototype.valueOf), k = u(Boolean.prototype.valueOf);
    if (l)
      var R = u(BigInt.prototype.valueOf);
    if (n)
      var E = u(Symbol.prototype.valueOf);
    function C(p, L) {
      if (typeof p != "object")
        return !1;
      try {
        return L(p), !0;
      } catch {
        return !1;
      }
    }
    r.isArgumentsObject = e, r.isGeneratorFunction = t, r.isTypedArray = o;
    function w(p) {
      return typeof Promise < "u" && p instanceof Promise || p !== null && typeof p == "object" && typeof p.then == "function" && typeof p.catch == "function";
    }
    r.isPromise = w;
    function A(p) {
      return typeof ArrayBuffer < "u" && ArrayBuffer.isView ? ArrayBuffer.isView(p) : o(p) || $(p);
    }
    r.isArrayBufferView = A;
    function c(p) {
      return s(p) === "Uint8Array";
    }
    r.isUint8Array = c;
    function y(p) {
      return s(p) === "Uint8ClampedArray";
    }
    r.isUint8ClampedArray = y;
    function m(p) {
      return s(p) === "Uint16Array";
    }
    r.isUint16Array = m;
    function h(p) {
      return s(p) === "Uint32Array";
    }
    r.isUint32Array = h;
    function T(p) {
      return s(p) === "Int8Array";
    }
    r.isInt8Array = T;
    function F(p) {
      return s(p) === "Int16Array";
    }
    r.isInt16Array = F;
    function B(p) {
      return s(p) === "Int32Array";
    }
    r.isInt32Array = B;
    function z(p) {
      return s(p) === "Float32Array";
    }
    r.isFloat32Array = z;
    function I(p) {
      return s(p) === "Float64Array";
    }
    r.isFloat64Array = I;
    function X(p) {
      return s(p) === "BigInt64Array";
    }
    r.isBigInt64Array = X;
    function oe(p) {
      return s(p) === "BigUint64Array";
    }
    r.isBigUint64Array = oe;
    function N(p) {
      return f(p) === "[object Map]";
    }
    N.working = typeof Map < "u" && N(/* @__PURE__ */ new Map());
    function M(p) {
      return typeof Map > "u" ? !1 : N.working ? N(p) : p instanceof Map;
    }
    r.isMap = M;
    function b(p) {
      return f(p) === "[object Set]";
    }
    b.working = typeof Set < "u" && b(/* @__PURE__ */ new Set());
    function G(p) {
      return typeof Set > "u" ? !1 : b.working ? b(p) : p instanceof Set;
    }
    r.isSet = G;
    function ee(p) {
      return f(p) === "[object WeakMap]";
    }
    ee.working = typeof WeakMap < "u" && ee(/* @__PURE__ */ new WeakMap());
    function q(p) {
      return typeof WeakMap > "u" ? !1 : ee.working ? ee(p) : p instanceof WeakMap;
    }
    r.isWeakMap = q;
    function ne(p) {
      return f(p) === "[object WeakSet]";
    }
    ne.working = typeof WeakSet < "u" && ne(/* @__PURE__ */ new WeakSet());
    function Q(p) {
      return ne(p);
    }
    r.isWeakSet = Q;
    function ce(p) {
      return f(p) === "[object ArrayBuffer]";
    }
    ce.working = typeof ArrayBuffer < "u" && ce(new ArrayBuffer());
    function V(p) {
      return typeof ArrayBuffer > "u" ? !1 : ce.working ? ce(p) : p instanceof ArrayBuffer;
    }
    r.isArrayBuffer = V;
    function P(p) {
      return f(p) === "[object DataView]";
    }
    P.working = typeof ArrayBuffer < "u" && typeof DataView < "u" && P(new DataView(new ArrayBuffer(1), 0, 1));
    function $(p) {
      return typeof DataView > "u" ? !1 : P.working ? P(p) : p instanceof DataView;
    }
    r.isDataView = $;
    var Z = typeof SharedArrayBuffer < "u" ? SharedArrayBuffer : void 0;
    function te(p) {
      return f(p) === "[object SharedArrayBuffer]";
    }
    function K(p) {
      return typeof Z > "u" ? !1 : (typeof te.working > "u" && (te.working = te(new Z())), te.working ? te(p) : p instanceof Z);
    }
    r.isSharedArrayBuffer = K;
    function x(p) {
      return f(p) === "[object AsyncFunction]";
    }
    r.isAsyncFunction = x;
    function v(p) {
      return f(p) === "[object Map Iterator]";
    }
    r.isMapIterator = v;
    function W(p) {
      return f(p) === "[object Set Iterator]";
    }
    r.isSetIterator = W;
    function U(p) {
      return f(p) === "[object Generator]";
    }
    r.isGeneratorObject = U;
    function O(p) {
      return f(p) === "[object WebAssembly.Module]";
    }
    r.isWebAssemblyCompiledModule = O;
    function D(p) {
      return C(p, g);
    }
    r.isNumberObject = D;
    function J(p) {
      return C(p, _);
    }
    r.isStringObject = J;
    function d(p) {
      return C(p, k);
    }
    r.isBooleanObject = d;
    function Y(p) {
      return l && C(p, R);
    }
    r.isBigIntObject = Y;
    function S(p) {
      return n && C(p, E);
    }
    r.isSymbolObject = S;
    function i(p) {
      return D(p) || J(p) || d(p) || Y(p) || S(p);
    }
    r.isBoxedPrimitive = i;
    function a(p) {
      return typeof Uint8Array < "u" && (V(p) || K(p));
    }
    r.isAnyArrayBuffer = a, ["isProxy", "isExternal", "isModuleNamespaceObject"].forEach(function(p) {
      Object.defineProperty(r, p, {
        enumerable: !1,
        value: function() {
          throw new Error(p + " is not supported in userland");
        }
      });
    });
  }(Sr)), Sr;
}
var _n, Qa;
function Bc() {
  return Qa || (Qa = 1, _n = function(e) {
    return e && typeof e == "object" && typeof e.copy == "function" && typeof e.fill == "function" && typeof e.readUInt8 == "function";
  }), _n;
}
var es;
function So() {
  return es || (es = 1, function(r) {
    var e = Object.getOwnPropertyDescriptors || function($) {
      for (var Z = Object.keys($), te = {}, K = 0; K < Z.length; K++)
        te[Z[K]] = Object.getOwnPropertyDescriptor($, Z[K]);
      return te;
    }, t = /%[sdj%]/g;
    r.format = function(P) {
      if (!T(P)) {
        for (var $ = [], Z = 0; Z < arguments.length; Z++)
          $.push(l(arguments[Z]));
        return $.join(" ");
      }
      for (var Z = 1, te = arguments, K = te.length, x = String(P).replace(t, function(W) {
        if (W === "%%") return "%";
        if (Z >= K) return W;
        switch (W) {
          case "%s":
            return String(te[Z++]);
          case "%d":
            return Number(te[Z++]);
          case "%j":
            try {
              return JSON.stringify(te[Z++]);
            } catch {
              return "[Circular]";
            }
          default:
            return W;
        }
      }), v = te[Z]; Z < K; v = te[++Z])
        y(v) || !I(v) ? x += " " + v : x += " " + l(v);
      return x;
    }, r.deprecate = function(P, $) {
      if (typeof me < "u" && me.noDeprecation === !0)
        return P;
      if (typeof me > "u")
        return function() {
          return r.deprecate(P, $).apply(this, arguments);
        };
      var Z = !1;
      function te() {
        if (!Z) {
          if (me.throwDeprecation)
            throw new Error($);
          me.traceDeprecation ? console.trace($) : console.error($), Z = !0;
        }
        return P.apply(this, arguments);
      }
      return te;
    };
    var s = {}, o = /^$/;
    if (me.env.NODE_DEBUG) {
      var u = me.env.NODE_DEBUG;
      u = u.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replace(/\*/g, ".*").replace(/,/g, "$|^").toUpperCase(), o = new RegExp("^" + u + "$", "i");
    }
    r.debuglog = function(P) {
      if (P = P.toUpperCase(), !s[P])
        if (o.test(P)) {
          var $ = me.pid;
          s[P] = function() {
            var Z = r.format.apply(r, arguments);
            console.error("%s %d: %s", P, $, Z);
          };
        } else
          s[P] = function() {
          };
      return s[P];
    };
    function l(P, $) {
      var Z = {
        seen: [],
        stylize: f
      };
      return arguments.length >= 3 && (Z.depth = arguments[2]), arguments.length >= 4 && (Z.colors = arguments[3]), c($) ? Z.showHidden = $ : $ && r._extend(Z, $), B(Z.showHidden) && (Z.showHidden = !1), B(Z.depth) && (Z.depth = 2), B(Z.colors) && (Z.colors = !1), B(Z.customInspect) && (Z.customInspect = !0), Z.colors && (Z.stylize = n), _(Z, P, Z.depth);
    }
    r.inspect = l, l.colors = {
      bold: [1, 22],
      italic: [3, 23],
      underline: [4, 24],
      inverse: [7, 27],
      white: [37, 39],
      grey: [90, 39],
      black: [30, 39],
      blue: [34, 39],
      cyan: [36, 39],
      green: [32, 39],
      magenta: [35, 39],
      red: [31, 39],
      yellow: [33, 39]
    }, l.styles = {
      special: "cyan",
      number: "yellow",
      boolean: "yellow",
      undefined: "grey",
      null: "bold",
      string: "green",
      date: "magenta",
      // "name": intentionally not styling
      regexp: "red"
    };
    function n(P, $) {
      var Z = l.styles[$];
      return Z ? "\x1B[" + l.colors[Z][0] + "m" + P + "\x1B[" + l.colors[Z][1] + "m" : P;
    }
    function f(P, $) {
      return P;
    }
    function g(P) {
      var $ = {};
      return P.forEach(function(Z, te) {
        $[Z] = !0;
      }), $;
    }
    function _(P, $, Z) {
      if (P.customInspect && $ && N($.inspect) && // Filter out the util module, it's inspect function is special
      $.inspect !== r.inspect && // Also filter out any prototype objects using the circular check.
      !($.constructor && $.constructor.prototype === $)) {
        var te = $.inspect(Z, P);
        return T(te) || (te = _(P, te, Z)), te;
      }
      var K = k(P, $);
      if (K)
        return K;
      var x = Object.keys($), v = g(x);
      if (P.showHidden && (x = Object.getOwnPropertyNames($)), oe($) && (x.indexOf("message") >= 0 || x.indexOf("description") >= 0))
        return R($);
      if (x.length === 0) {
        if (N($)) {
          var W = $.name ? ": " + $.name : "";
          return P.stylize("[Function" + W + "]", "special");
        }
        if (z($))
          return P.stylize(RegExp.prototype.toString.call($), "regexp");
        if (X($))
          return P.stylize(Date.prototype.toString.call($), "date");
        if (oe($))
          return R($);
      }
      var U = "", O = !1, D = ["{", "}"];
      if (A($) && (O = !0, D = ["[", "]"]), N($)) {
        var J = $.name ? ": " + $.name : "";
        U = " [Function" + J + "]";
      }
      if (z($) && (U = " " + RegExp.prototype.toString.call($)), X($) && (U = " " + Date.prototype.toUTCString.call($)), oe($) && (U = " " + R($)), x.length === 0 && (!O || $.length == 0))
        return D[0] + U + D[1];
      if (Z < 0)
        return z($) ? P.stylize(RegExp.prototype.toString.call($), "regexp") : P.stylize("[Object]", "special");
      P.seen.push($);
      var d;
      return O ? d = E(P, $, Z, v, x) : d = x.map(function(Y) {
        return C(P, $, Z, v, Y, O);
      }), P.seen.pop(), w(d, U, D);
    }
    function k(P, $) {
      if (B($))
        return P.stylize("undefined", "undefined");
      if (T($)) {
        var Z = "'" + JSON.stringify($).replace(/^"|"$/g, "").replace(/'/g, "\\'").replace(/\\"/g, '"') + "'";
        return P.stylize(Z, "string");
      }
      if (h($))
        return P.stylize("" + $, "number");
      if (c($))
        return P.stylize("" + $, "boolean");
      if (y($))
        return P.stylize("null", "null");
    }
    function R(P) {
      return "[" + Error.prototype.toString.call(P) + "]";
    }
    function E(P, $, Z, te, K) {
      for (var x = [], v = 0, W = $.length; v < W; ++v)
        ne($, String(v)) ? x.push(C(
          P,
          $,
          Z,
          te,
          String(v),
          !0
        )) : x.push("");
      return K.forEach(function(U) {
        U.match(/^\d+$/) || x.push(C(
          P,
          $,
          Z,
          te,
          U,
          !0
        ));
      }), x;
    }
    function C(P, $, Z, te, K, x) {
      var v, W, U;
      if (U = Object.getOwnPropertyDescriptor($, K) || { value: $[K] }, U.get ? U.set ? W = P.stylize("[Getter/Setter]", "special") : W = P.stylize("[Getter]", "special") : U.set && (W = P.stylize("[Setter]", "special")), ne(te, K) || (v = "[" + K + "]"), W || (P.seen.indexOf(U.value) < 0 ? (y(Z) ? W = _(P, U.value, null) : W = _(P, U.value, Z - 1), W.indexOf(`
`) > -1 && (x ? W = W.split(`
`).map(function(O) {
        return "  " + O;
      }).join(`
`).slice(2) : W = `
` + W.split(`
`).map(function(O) {
        return "   " + O;
      }).join(`
`))) : W = P.stylize("[Circular]", "special")), B(v)) {
        if (x && K.match(/^\d+$/))
          return W;
        v = JSON.stringify("" + K), v.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/) ? (v = v.slice(1, -1), v = P.stylize(v, "name")) : (v = v.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'"), v = P.stylize(v, "string"));
      }
      return v + ": " + W;
    }
    function w(P, $, Z) {
      var te = P.reduce(function(K, x) {
        return x.indexOf(`
`) >= 0, K + x.replace(/\u001b\[\d\d?m/g, "").length + 1;
      }, 0);
      return te > 60 ? Z[0] + ($ === "" ? "" : $ + `
 `) + " " + P.join(`,
  `) + " " + Z[1] : Z[0] + $ + " " + P.join(", ") + " " + Z[1];
    }
    r.types = Dc();
    function A(P) {
      return Array.isArray(P);
    }
    r.isArray = A;
    function c(P) {
      return typeof P == "boolean";
    }
    r.isBoolean = c;
    function y(P) {
      return P === null;
    }
    r.isNull = y;
    function m(P) {
      return P == null;
    }
    r.isNullOrUndefined = m;
    function h(P) {
      return typeof P == "number";
    }
    r.isNumber = h;
    function T(P) {
      return typeof P == "string";
    }
    r.isString = T;
    function F(P) {
      return typeof P == "symbol";
    }
    r.isSymbol = F;
    function B(P) {
      return P === void 0;
    }
    r.isUndefined = B;
    function z(P) {
      return I(P) && b(P) === "[object RegExp]";
    }
    r.isRegExp = z, r.types.isRegExp = z;
    function I(P) {
      return typeof P == "object" && P !== null;
    }
    r.isObject = I;
    function X(P) {
      return I(P) && b(P) === "[object Date]";
    }
    r.isDate = X, r.types.isDate = X;
    function oe(P) {
      return I(P) && (b(P) === "[object Error]" || P instanceof Error);
    }
    r.isError = oe, r.types.isNativeError = oe;
    function N(P) {
      return typeof P == "function";
    }
    r.isFunction = N;
    function M(P) {
      return P === null || typeof P == "boolean" || typeof P == "number" || typeof P == "string" || typeof P == "symbol" || // ES6 symbol
      typeof P > "u";
    }
    r.isPrimitive = M, r.isBuffer = Bc();
    function b(P) {
      return Object.prototype.toString.call(P);
    }
    function G(P) {
      return P < 10 ? "0" + P.toString(10) : P.toString(10);
    }
    var ee = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];
    function q() {
      var P = /* @__PURE__ */ new Date(), $ = [
        G(P.getHours()),
        G(P.getMinutes()),
        G(P.getSeconds())
      ].join(":");
      return [P.getDate(), ee[P.getMonth()], $].join(" ");
    }
    r.log = function() {
      console.log("%s - %s", q(), r.format.apply(r, arguments));
    }, r.inherits = rt(), r._extend = function(P, $) {
      if (!$ || !I($)) return P;
      for (var Z = Object.keys($), te = Z.length; te--; )
        P[Z[te]] = $[Z[te]];
      return P;
    };
    function ne(P, $) {
      return Object.prototype.hasOwnProperty.call(P, $);
    }
    var Q = typeof Symbol < "u" ? /* @__PURE__ */ Symbol("util.promisify.custom") : void 0;
    r.promisify = function($) {
      if (typeof $ != "function")
        throw new TypeError('The "original" argument must be of type Function');
      if (Q && $[Q]) {
        var Z = $[Q];
        if (typeof Z != "function")
          throw new TypeError('The "util.promisify.custom" argument must be of type Function');
        return Object.defineProperty(Z, Q, {
          value: Z,
          enumerable: !1,
          writable: !1,
          configurable: !0
        }), Z;
      }
      function Z() {
        for (var te, K, x = new Promise(function(U, O) {
          te = U, K = O;
        }), v = [], W = 0; W < arguments.length; W++)
          v.push(arguments[W]);
        v.push(function(U, O) {
          U ? K(U) : te(O);
        });
        try {
          $.apply(this, v);
        } catch (U) {
          K(U);
        }
        return x;
      }
      return Object.setPrototypeOf(Z, Object.getPrototypeOf($)), Q && Object.defineProperty(Z, Q, {
        value: Z,
        enumerable: !1,
        writable: !1,
        configurable: !0
      }), Object.defineProperties(
        Z,
        e($)
      );
    }, r.promisify.custom = Q;
    function ce(P, $) {
      if (!P) {
        var Z = new Error("Promise was rejected with a falsy value");
        Z.reason = P, P = Z;
      }
      return $(P);
    }
    function V(P) {
      if (typeof P != "function")
        throw new TypeError('The "original" argument must be of type Function');
      function $() {
        for (var Z = [], te = 0; te < arguments.length; te++)
          Z.push(arguments[te]);
        var K = Z.pop();
        if (typeof K != "function")
          throw new TypeError("The last argument must be of type Function");
        var x = this, v = function() {
          return K.apply(x, arguments);
        };
        P.apply(this, Z).then(
          function(W) {
            me.nextTick(v.bind(null, null, W));
          },
          function(W) {
            me.nextTick(ce.bind(null, W, v));
          }
        );
      }
      return Object.setPrototypeOf($, Object.getPrototypeOf(P)), Object.defineProperties(
        $,
        e(P)
      ), $;
    }
    r.callbackify = V;
  }(xr)), xr;
}
var En, ts;
function Lc() {
  if (ts) return En;
  ts = 1;
  function r(C, w) {
    var A = Object.keys(C);
    if (Object.getOwnPropertySymbols) {
      var c = Object.getOwnPropertySymbols(C);
      w && (c = c.filter(function(y) {
        return Object.getOwnPropertyDescriptor(C, y).enumerable;
      })), A.push.apply(A, c);
    }
    return A;
  }
  function e(C) {
    for (var w = 1; w < arguments.length; w++) {
      var A = arguments[w] != null ? arguments[w] : {};
      w % 2 ? r(Object(A), !0).forEach(function(c) {
        t(C, c, A[c]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(C, Object.getOwnPropertyDescriptors(A)) : r(Object(A)).forEach(function(c) {
        Object.defineProperty(C, c, Object.getOwnPropertyDescriptor(A, c));
      });
    }
    return C;
  }
  function t(C, w, A) {
    return w = l(w), w in C ? Object.defineProperty(C, w, { value: A, enumerable: !0, configurable: !0, writable: !0 }) : C[w] = A, C;
  }
  function s(C, w) {
    if (!(C instanceof w))
      throw new TypeError("Cannot call a class as a function");
  }
  function o(C, w) {
    for (var A = 0; A < w.length; A++) {
      var c = w[A];
      c.enumerable = c.enumerable || !1, c.configurable = !0, "value" in c && (c.writable = !0), Object.defineProperty(C, l(c.key), c);
    }
  }
  function u(C, w, A) {
    return w && o(C.prototype, w), Object.defineProperty(C, "prototype", { writable: !1 }), C;
  }
  function l(C) {
    var w = n(C, "string");
    return typeof w == "symbol" ? w : String(w);
  }
  function n(C, w) {
    if (typeof C != "object" || C === null) return C;
    var A = C[Symbol.toPrimitive];
    if (A !== void 0) {
      var c = A.call(C, w);
      if (typeof c != "object") return c;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return String(C);
  }
  var f = hr(), g = f.Buffer, _ = So(), k = _.inspect, R = k && k.custom || "inspect";
  function E(C, w, A) {
    g.prototype.copy.call(C, w, A);
  }
  return En = /* @__PURE__ */ function() {
    function C() {
      s(this, C), this.head = null, this.tail = null, this.length = 0;
    }
    return u(C, [{
      key: "push",
      value: function(A) {
        var c = {
          data: A,
          next: null
        };
        this.length > 0 ? this.tail.next = c : this.head = c, this.tail = c, ++this.length;
      }
    }, {
      key: "unshift",
      value: function(A) {
        var c = {
          data: A,
          next: this.head
        };
        this.length === 0 && (this.tail = c), this.head = c, ++this.length;
      }
    }, {
      key: "shift",
      value: function() {
        if (this.length !== 0) {
          var A = this.head.data;
          return this.length === 1 ? this.head = this.tail = null : this.head = this.head.next, --this.length, A;
        }
      }
    }, {
      key: "clear",
      value: function() {
        this.head = this.tail = null, this.length = 0;
      }
    }, {
      key: "join",
      value: function(A) {
        if (this.length === 0) return "";
        for (var c = this.head, y = "" + c.data; c = c.next; ) y += A + c.data;
        return y;
      }
    }, {
      key: "concat",
      value: function(A) {
        if (this.length === 0) return g.alloc(0);
        for (var c = g.allocUnsafe(A >>> 0), y = this.head, m = 0; y; )
          E(y.data, c, m), m += y.data.length, y = y.next;
        return c;
      }
      // Consumes a specified amount of bytes or characters from the buffered data.
    }, {
      key: "consume",
      value: function(A, c) {
        var y;
        return A < this.head.data.length ? (y = this.head.data.slice(0, A), this.head.data = this.head.data.slice(A)) : A === this.head.data.length ? y = this.shift() : y = c ? this._getString(A) : this._getBuffer(A), y;
      }
    }, {
      key: "first",
      value: function() {
        return this.head.data;
      }
      // Consumes a specified amount of characters from the buffered data.
    }, {
      key: "_getString",
      value: function(A) {
        var c = this.head, y = 1, m = c.data;
        for (A -= m.length; c = c.next; ) {
          var h = c.data, T = A > h.length ? h.length : A;
          if (T === h.length ? m += h : m += h.slice(0, A), A -= T, A === 0) {
            T === h.length ? (++y, c.next ? this.head = c.next : this.head = this.tail = null) : (this.head = c, c.data = h.slice(T));
            break;
          }
          ++y;
        }
        return this.length -= y, m;
      }
      // Consumes a specified amount of bytes from the buffered data.
    }, {
      key: "_getBuffer",
      value: function(A) {
        var c = g.allocUnsafe(A), y = this.head, m = 1;
        for (y.data.copy(c), A -= y.data.length; y = y.next; ) {
          var h = y.data, T = A > h.length ? h.length : A;
          if (h.copy(c, c.length - A, 0, T), A -= T, A === 0) {
            T === h.length ? (++m, y.next ? this.head = y.next : this.head = this.tail = null) : (this.head = y, y.data = h.slice(T));
            break;
          }
          ++m;
        }
        return this.length -= m, c;
      }
      // Make sure the linked list only shows the minimal necessary information.
    }, {
      key: R,
      value: function(A, c) {
        return k(this, e(e({}, c), {}, {
          // Only inspect one level.
          depth: 0,
          // It should not recurse.
          customInspect: !1
        }));
      }
    }]), C;
  }(), En;
}
var xn, rs;
function To() {
  if (rs) return xn;
  rs = 1;
  function r(l, n) {
    var f = this, g = this._readableState && this._readableState.destroyed, _ = this._writableState && this._writableState.destroyed;
    return g || _ ? (n ? n(l) : l && (this._writableState ? this._writableState.errorEmitted || (this._writableState.errorEmitted = !0, me.nextTick(o, this, l)) : me.nextTick(o, this, l)), this) : (this._readableState && (this._readableState.destroyed = !0), this._writableState && (this._writableState.destroyed = !0), this._destroy(l || null, function(k) {
      !n && k ? f._writableState ? f._writableState.errorEmitted ? me.nextTick(t, f) : (f._writableState.errorEmitted = !0, me.nextTick(e, f, k)) : me.nextTick(e, f, k) : n ? (me.nextTick(t, f), n(k)) : me.nextTick(t, f);
    }), this);
  }
  function e(l, n) {
    o(l, n), t(l);
  }
  function t(l) {
    l._writableState && !l._writableState.emitClose || l._readableState && !l._readableState.emitClose || l.emit("close");
  }
  function s() {
    this._readableState && (this._readableState.destroyed = !1, this._readableState.reading = !1, this._readableState.ended = !1, this._readableState.endEmitted = !1), this._writableState && (this._writableState.destroyed = !1, this._writableState.ended = !1, this._writableState.ending = !1, this._writableState.finalCalled = !1, this._writableState.prefinished = !1, this._writableState.finished = !1, this._writableState.errorEmitted = !1);
  }
  function o(l, n) {
    l.emit("error", n);
  }
  function u(l, n) {
    var f = l._readableState, g = l._writableState;
    f && f.autoDestroy || g && g.autoDestroy ? l.destroy(n) : l.emit("error", n);
  }
  return xn = {
    destroy: r,
    undestroy: s,
    errorOrDestroy: u
  }, xn;
}
var Sn = {}, ns;
function St() {
  if (ns) return Sn;
  ns = 1;
  function r(n, f) {
    n.prototype = Object.create(f.prototype), n.prototype.constructor = n, n.__proto__ = f;
  }
  var e = {};
  function t(n, f, g) {
    g || (g = Error);
    function _(R, E, C) {
      return typeof f == "string" ? f : f(R, E, C);
    }
    var k = /* @__PURE__ */ function(R) {
      r(E, R);
      function E(C, w, A) {
        return R.call(this, _(C, w, A)) || this;
      }
      return E;
    }(g);
    k.prototype.name = g.name, k.prototype.code = n, e[n] = k;
  }
  function s(n, f) {
    if (Array.isArray(n)) {
      var g = n.length;
      return n = n.map(function(_) {
        return String(_);
      }), g > 2 ? "one of ".concat(f, " ").concat(n.slice(0, g - 1).join(", "), ", or ") + n[g - 1] : g === 2 ? "one of ".concat(f, " ").concat(n[0], " or ").concat(n[1]) : "of ".concat(f, " ").concat(n[0]);
    } else
      return "of ".concat(f, " ").concat(String(n));
  }
  function o(n, f, g) {
    return n.substr(0, f.length) === f;
  }
  function u(n, f, g) {
    return (g === void 0 || g > n.length) && (g = n.length), n.substring(g - f.length, g) === f;
  }
  function l(n, f, g) {
    return typeof g != "number" && (g = 0), g + f.length > n.length ? !1 : n.indexOf(f, g) !== -1;
  }
  return t("ERR_INVALID_OPT_VALUE", function(n, f) {
    return 'The value "' + f + '" is invalid for option "' + n + '"';
  }, TypeError), t("ERR_INVALID_ARG_TYPE", function(n, f, g) {
    var _;
    typeof f == "string" && o(f, "not ") ? (_ = "must not be", f = f.replace(/^not /, "")) : _ = "must be";
    var k;
    if (u(n, " argument"))
      k = "The ".concat(n, " ").concat(_, " ").concat(s(f, "type"));
    else {
      var R = l(n, ".") ? "property" : "argument";
      k = 'The "'.concat(n, '" ').concat(R, " ").concat(_, " ").concat(s(f, "type"));
    }
    return k += ". Received type ".concat(typeof g), k;
  }, TypeError), t("ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF"), t("ERR_METHOD_NOT_IMPLEMENTED", function(n) {
    return "The " + n + " method is not implemented";
  }), t("ERR_STREAM_PREMATURE_CLOSE", "Premature close"), t("ERR_STREAM_DESTROYED", function(n) {
    return "Cannot call " + n + " after a stream was destroyed";
  }), t("ERR_MULTIPLE_CALLBACK", "Callback called multiple times"), t("ERR_STREAM_CANNOT_PIPE", "Cannot pipe, not readable"), t("ERR_STREAM_WRITE_AFTER_END", "write after end"), t("ERR_STREAM_NULL_VALUES", "May not write null values to stream", TypeError), t("ERR_UNKNOWN_ENCODING", function(n) {
    return "Unknown encoding: " + n;
  }, TypeError), t("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", "stream.unshift() after end event"), Sn.codes = e, Sn;
}
var Tn, is;
function Ao() {
  if (is) return Tn;
  is = 1;
  var r = St().codes.ERR_INVALID_OPT_VALUE;
  function e(s, o, u) {
    return s.highWaterMark != null ? s.highWaterMark : o ? s[u] : null;
  }
  function t(s, o, u, l) {
    var n = e(o, l, u);
    if (n != null) {
      if (!(isFinite(n) && Math.floor(n) === n) || n < 0) {
        var f = l ? u : "highWaterMark";
        throw new r(f, n);
      }
      return Math.floor(n);
    }
    return s.objectMode ? 16 : 16 * 1024;
  }
  return Tn = {
    getHighWaterMark: t
  }, Tn;
}
var An, as;
function Uc() {
  if (as) return An;
  as = 1, An = r;
  function r(t, s) {
    if (e("noDeprecation"))
      return t;
    var o = !1;
    function u() {
      if (!o) {
        if (e("throwDeprecation"))
          throw new Error(s);
        e("traceDeprecation") ? console.trace(s) : console.warn(s), o = !0;
      }
      return t.apply(this, arguments);
    }
    return u;
  }
  function e(t) {
    try {
      if (!Fe.localStorage) return !1;
    } catch {
      return !1;
    }
    var s = Fe.localStorage[t];
    return s == null ? !1 : String(s).toLowerCase() === "true";
  }
  return An;
}
var kn, ss;
function ko() {
  if (ss) return kn;
  ss = 1, kn = z;
  function r(K) {
    var x = this;
    this.next = null, this.entry = null, this.finish = function() {
      te(x, K);
    };
  }
  var e;
  z.WritableState = F;
  var t = {
    deprecate: Uc()
  }, s = ho(), o = hr().Buffer, u = (typeof Fe < "u" ? Fe : typeof window < "u" ? window : typeof self < "u" ? self : {}).Uint8Array || function() {
  };
  function l(K) {
    return o.from(K);
  }
  function n(K) {
    return o.isBuffer(K) || K instanceof u;
  }
  var f = To(), g = Ao(), _ = g.getHighWaterMark, k = St().codes, R = k.ERR_INVALID_ARG_TYPE, E = k.ERR_METHOD_NOT_IMPLEMENTED, C = k.ERR_MULTIPLE_CALLBACK, w = k.ERR_STREAM_CANNOT_PIPE, A = k.ERR_STREAM_DESTROYED, c = k.ERR_STREAM_NULL_VALUES, y = k.ERR_STREAM_WRITE_AFTER_END, m = k.ERR_UNKNOWN_ENCODING, h = f.errorOrDestroy;
  rt()(z, s);
  function T() {
  }
  function F(K, x, v) {
    e = e || vt(), K = K || {}, typeof v != "boolean" && (v = x instanceof e), this.objectMode = !!K.objectMode, v && (this.objectMode = this.objectMode || !!K.writableObjectMode), this.highWaterMark = _(this, K, "writableHighWaterMark", v), this.finalCalled = !1, this.needDrain = !1, this.ending = !1, this.ended = !1, this.finished = !1, this.destroyed = !1;
    var W = K.decodeStrings === !1;
    this.decodeStrings = !W, this.defaultEncoding = K.defaultEncoding || "utf8", this.length = 0, this.writing = !1, this.corked = 0, this.sync = !0, this.bufferProcessing = !1, this.onwrite = function(U) {
      ee(x, U);
    }, this.writecb = null, this.writelen = 0, this.bufferedRequest = null, this.lastBufferedRequest = null, this.pendingcb = 0, this.prefinished = !1, this.errorEmitted = !1, this.emitClose = K.emitClose !== !1, this.autoDestroy = !!K.autoDestroy, this.bufferedRequestCount = 0, this.corkedRequestsFree = new r(this);
  }
  F.prototype.getBuffer = function() {
    for (var x = this.bufferedRequest, v = []; x; )
      v.push(x), x = x.next;
    return v;
  }, function() {
    try {
      Object.defineProperty(F.prototype, "buffer", {
        get: t.deprecate(function() {
          return this.getBuffer();
        }, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
      });
    } catch {
    }
  }();
  var B;
  typeof Symbol == "function" && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] == "function" ? (B = Function.prototype[Symbol.hasInstance], Object.defineProperty(z, Symbol.hasInstance, {
    value: function(x) {
      return B.call(this, x) ? !0 : this !== z ? !1 : x && x._writableState instanceof F;
    }
  })) : B = function(x) {
    return x instanceof this;
  };
  function z(K) {
    e = e || vt();
    var x = this instanceof e;
    if (!x && !B.call(z, this)) return new z(K);
    this._writableState = new F(K, this, x), this.writable = !0, K && (typeof K.write == "function" && (this._write = K.write), typeof K.writev == "function" && (this._writev = K.writev), typeof K.destroy == "function" && (this._destroy = K.destroy), typeof K.final == "function" && (this._final = K.final)), s.call(this);
  }
  z.prototype.pipe = function() {
    h(this, new w());
  };
  function I(K, x) {
    var v = new y();
    h(K, v), me.nextTick(x, v);
  }
  function X(K, x, v, W) {
    var U;
    return v === null ? U = new c() : typeof v != "string" && !x.objectMode && (U = new R("chunk", ["string", "Buffer"], v)), U ? (h(K, U), me.nextTick(W, U), !1) : !0;
  }
  z.prototype.write = function(K, x, v) {
    var W = this._writableState, U = !1, O = !W.objectMode && n(K);
    return O && !o.isBuffer(K) && (K = l(K)), typeof x == "function" && (v = x, x = null), O ? x = "buffer" : x || (x = W.defaultEncoding), typeof v != "function" && (v = T), W.ending ? I(this, v) : (O || X(this, W, K, v)) && (W.pendingcb++, U = N(this, W, O, K, x, v)), U;
  }, z.prototype.cork = function() {
    this._writableState.corked++;
  }, z.prototype.uncork = function() {
    var K = this._writableState;
    K.corked && (K.corked--, !K.writing && !K.corked && !K.bufferProcessing && K.bufferedRequest && Q(this, K));
  }, z.prototype.setDefaultEncoding = function(x) {
    if (typeof x == "string" && (x = x.toLowerCase()), !(["hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "utf-16le", "raw"].indexOf((x + "").toLowerCase()) > -1)) throw new m(x);
    return this._writableState.defaultEncoding = x, this;
  }, Object.defineProperty(z.prototype, "writableBuffer", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._writableState && this._writableState.getBuffer();
    }
  });
  function oe(K, x, v) {
    return !K.objectMode && K.decodeStrings !== !1 && typeof x == "string" && (x = o.from(x, v)), x;
  }
  Object.defineProperty(z.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._writableState.highWaterMark;
    }
  });
  function N(K, x, v, W, U, O) {
    if (!v) {
      var D = oe(x, W, U);
      W !== D && (v = !0, U = "buffer", W = D);
    }
    var J = x.objectMode ? 1 : W.length;
    x.length += J;
    var d = x.length < x.highWaterMark;
    if (d || (x.needDrain = !0), x.writing || x.corked) {
      var Y = x.lastBufferedRequest;
      x.lastBufferedRequest = {
        chunk: W,
        encoding: U,
        isBuf: v,
        callback: O,
        next: null
      }, Y ? Y.next = x.lastBufferedRequest : x.bufferedRequest = x.lastBufferedRequest, x.bufferedRequestCount += 1;
    } else
      M(K, x, !1, J, W, U, O);
    return d;
  }
  function M(K, x, v, W, U, O, D) {
    x.writelen = W, x.writecb = D, x.writing = !0, x.sync = !0, x.destroyed ? x.onwrite(new A("write")) : v ? K._writev(U, x.onwrite) : K._write(U, O, x.onwrite), x.sync = !1;
  }
  function b(K, x, v, W, U) {
    --x.pendingcb, v ? (me.nextTick(U, W), me.nextTick($, K, x), K._writableState.errorEmitted = !0, h(K, W)) : (U(W), K._writableState.errorEmitted = !0, h(K, W), $(K, x));
  }
  function G(K) {
    K.writing = !1, K.writecb = null, K.length -= K.writelen, K.writelen = 0;
  }
  function ee(K, x) {
    var v = K._writableState, W = v.sync, U = v.writecb;
    if (typeof U != "function") throw new C();
    if (G(v), x) b(K, v, W, x, U);
    else {
      var O = ce(v) || K.destroyed;
      !O && !v.corked && !v.bufferProcessing && v.bufferedRequest && Q(K, v), W ? me.nextTick(q, K, v, O, U) : q(K, v, O, U);
    }
  }
  function q(K, x, v, W) {
    v || ne(K, x), x.pendingcb--, W(), $(K, x);
  }
  function ne(K, x) {
    x.length === 0 && x.needDrain && (x.needDrain = !1, K.emit("drain"));
  }
  function Q(K, x) {
    x.bufferProcessing = !0;
    var v = x.bufferedRequest;
    if (K._writev && v && v.next) {
      var W = x.bufferedRequestCount, U = new Array(W), O = x.corkedRequestsFree;
      O.entry = v;
      for (var D = 0, J = !0; v; )
        U[D] = v, v.isBuf || (J = !1), v = v.next, D += 1;
      U.allBuffers = J, M(K, x, !0, x.length, U, "", O.finish), x.pendingcb++, x.lastBufferedRequest = null, O.next ? (x.corkedRequestsFree = O.next, O.next = null) : x.corkedRequestsFree = new r(x), x.bufferedRequestCount = 0;
    } else {
      for (; v; ) {
        var d = v.chunk, Y = v.encoding, S = v.callback, i = x.objectMode ? 1 : d.length;
        if (M(K, x, !1, i, d, Y, S), v = v.next, x.bufferedRequestCount--, x.writing)
          break;
      }
      v === null && (x.lastBufferedRequest = null);
    }
    x.bufferedRequest = v, x.bufferProcessing = !1;
  }
  z.prototype._write = function(K, x, v) {
    v(new E("_write()"));
  }, z.prototype._writev = null, z.prototype.end = function(K, x, v) {
    var W = this._writableState;
    return typeof K == "function" ? (v = K, K = null, x = null) : typeof x == "function" && (v = x, x = null), K != null && this.write(K, x), W.corked && (W.corked = 1, this.uncork()), W.ending || Z(this, W, v), this;
  }, Object.defineProperty(z.prototype, "writableLength", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._writableState.length;
    }
  });
  function ce(K) {
    return K.ending && K.length === 0 && K.bufferedRequest === null && !K.finished && !K.writing;
  }
  function V(K, x) {
    K._final(function(v) {
      x.pendingcb--, v && h(K, v), x.prefinished = !0, K.emit("prefinish"), $(K, x);
    });
  }
  function P(K, x) {
    !x.prefinished && !x.finalCalled && (typeof K._final == "function" && !x.destroyed ? (x.pendingcb++, x.finalCalled = !0, me.nextTick(V, K, x)) : (x.prefinished = !0, K.emit("prefinish")));
  }
  function $(K, x) {
    var v = ce(x);
    if (v && (P(K, x), x.pendingcb === 0 && (x.finished = !0, K.emit("finish"), x.autoDestroy))) {
      var W = K._readableState;
      (!W || W.autoDestroy && W.endEmitted) && K.destroy();
    }
    return v;
  }
  function Z(K, x, v) {
    x.ending = !0, $(K, x), v && (x.finished ? me.nextTick(v) : K.once("finish", v)), x.ended = !0, K.writable = !1;
  }
  function te(K, x, v) {
    var W = K.entry;
    for (K.entry = null; W; ) {
      var U = W.callback;
      x.pendingcb--, U(v), W = W.next;
    }
    x.corkedRequestsFree.next = K;
  }
  return Object.defineProperty(z.prototype, "destroyed", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._writableState === void 0 ? !1 : this._writableState.destroyed;
    },
    set: function(x) {
      this._writableState && (this._writableState.destroyed = x);
    }
  }), z.prototype.destroy = f.destroy, z.prototype._undestroy = f.undestroy, z.prototype._destroy = function(K, x) {
    x(K);
  }, kn;
}
var Rn, os;
function vt() {
  if (os) return Rn;
  os = 1;
  var r = Object.keys || function(g) {
    var _ = [];
    for (var k in g) _.push(k);
    return _;
  };
  Rn = l;
  var e = Ro(), t = ko();
  rt()(l, e);
  for (var s = r(t.prototype), o = 0; o < s.length; o++) {
    var u = s[o];
    l.prototype[u] || (l.prototype[u] = t.prototype[u]);
  }
  function l(g) {
    if (!(this instanceof l)) return new l(g);
    e.call(this, g), t.call(this, g), this.allowHalfOpen = !0, g && (g.readable === !1 && (this.readable = !1), g.writable === !1 && (this.writable = !1), g.allowHalfOpen === !1 && (this.allowHalfOpen = !1, this.once("end", n)));
  }
  Object.defineProperty(l.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._writableState.highWaterMark;
    }
  }), Object.defineProperty(l.prototype, "writableBuffer", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._writableState && this._writableState.getBuffer();
    }
  }), Object.defineProperty(l.prototype, "writableLength", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._writableState.length;
    }
  });
  function n() {
    this._writableState.ended || me.nextTick(f, this);
  }
  function f(g) {
    g.end();
  }
  return Object.defineProperty(l.prototype, "destroyed", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._readableState === void 0 || this._writableState === void 0 ? !1 : this._readableState.destroyed && this._writableState.destroyed;
    },
    set: function(_) {
      this._readableState === void 0 || this._writableState === void 0 || (this._readableState.destroyed = _, this._writableState.destroyed = _);
    }
  }), Rn;
}
var Cn = {}, Qt = { exports: {} }, us;
function Mc() {
  return us || (us = 1, function(r, e) {
    var t = hr(), s = t.Buffer;
    function o(l, n) {
      for (var f in l)
        n[f] = l[f];
    }
    s.from && s.alloc && s.allocUnsafe && s.allocUnsafeSlow ? r.exports = t : (o(t, e), e.Buffer = u);
    function u(l, n, f) {
      return s(l, n, f);
    }
    o(s, u), u.from = function(l, n, f) {
      if (typeof l == "number")
        throw new TypeError("Argument must not be a number");
      return s(l, n, f);
    }, u.alloc = function(l, n, f) {
      if (typeof l != "number")
        throw new TypeError("Argument must be a number");
      var g = s(l);
      return n !== void 0 ? typeof f == "string" ? g.fill(n, f) : g.fill(n) : g.fill(0), g;
    }, u.allocUnsafe = function(l) {
      if (typeof l != "number")
        throw new TypeError("Argument must be a number");
      return s(l);
    }, u.allocUnsafeSlow = function(l) {
      if (typeof l != "number")
        throw new TypeError("Argument must be a number");
      return t.SlowBuffer(l);
    };
  }(Qt, Qt.exports)), Qt.exports;
}
var cs;
function Ei() {
  if (cs) return Cn;
  cs = 1;
  var r = Mc().Buffer, e = r.isEncoding || function(c) {
    switch (c = "" + c, c && c.toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
      case "raw":
        return !0;
      default:
        return !1;
    }
  };
  function t(c) {
    if (!c) return "utf8";
    for (var y; ; )
      switch (c) {
        case "utf8":
        case "utf-8":
          return "utf8";
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return "utf16le";
        case "latin1":
        case "binary":
          return "latin1";
        case "base64":
        case "ascii":
        case "hex":
          return c;
        default:
          if (y) return;
          c = ("" + c).toLowerCase(), y = !0;
      }
  }
  function s(c) {
    var y = t(c);
    if (typeof y != "string" && (r.isEncoding === e || !e(c))) throw new Error("Unknown encoding: " + c);
    return y || c;
  }
  Cn.StringDecoder = o;
  function o(c) {
    this.encoding = s(c);
    var y;
    switch (this.encoding) {
      case "utf16le":
        this.text = k, this.end = R, y = 4;
        break;
      case "utf8":
        this.fillLast = f, y = 4;
        break;
      case "base64":
        this.text = E, this.end = C, y = 3;
        break;
      default:
        this.write = w, this.end = A;
        return;
    }
    this.lastNeed = 0, this.lastTotal = 0, this.lastChar = r.allocUnsafe(y);
  }
  o.prototype.write = function(c) {
    if (c.length === 0) return "";
    var y, m;
    if (this.lastNeed) {
      if (y = this.fillLast(c), y === void 0) return "";
      m = this.lastNeed, this.lastNeed = 0;
    } else
      m = 0;
    return m < c.length ? y ? y + this.text(c, m) : this.text(c, m) : y || "";
  }, o.prototype.end = _, o.prototype.text = g, o.prototype.fillLast = function(c) {
    if (this.lastNeed <= c.length)
      return c.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal);
    c.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, c.length), this.lastNeed -= c.length;
  };
  function u(c) {
    return c <= 127 ? 0 : c >> 5 === 6 ? 2 : c >> 4 === 14 ? 3 : c >> 3 === 30 ? 4 : c >> 6 === 2 ? -1 : -2;
  }
  function l(c, y, m) {
    var h = y.length - 1;
    if (h < m) return 0;
    var T = u(y[h]);
    return T >= 0 ? (T > 0 && (c.lastNeed = T - 1), T) : --h < m || T === -2 ? 0 : (T = u(y[h]), T >= 0 ? (T > 0 && (c.lastNeed = T - 2), T) : --h < m || T === -2 ? 0 : (T = u(y[h]), T >= 0 ? (T > 0 && (T === 2 ? T = 0 : c.lastNeed = T - 3), T) : 0));
  }
  function n(c, y, m) {
    if ((y[0] & 192) !== 128)
      return c.lastNeed = 0, "�";
    if (c.lastNeed > 1 && y.length > 1) {
      if ((y[1] & 192) !== 128)
        return c.lastNeed = 1, "�";
      if (c.lastNeed > 2 && y.length > 2 && (y[2] & 192) !== 128)
        return c.lastNeed = 2, "�";
    }
  }
  function f(c) {
    var y = this.lastTotal - this.lastNeed, m = n(this, c);
    if (m !== void 0) return m;
    if (this.lastNeed <= c.length)
      return c.copy(this.lastChar, y, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal);
    c.copy(this.lastChar, y, 0, c.length), this.lastNeed -= c.length;
  }
  function g(c, y) {
    var m = l(this, c, y);
    if (!this.lastNeed) return c.toString("utf8", y);
    this.lastTotal = m;
    var h = c.length - (m - this.lastNeed);
    return c.copy(this.lastChar, 0, h), c.toString("utf8", y, h);
  }
  function _(c) {
    var y = c && c.length ? this.write(c) : "";
    return this.lastNeed ? y + "�" : y;
  }
  function k(c, y) {
    if ((c.length - y) % 2 === 0) {
      var m = c.toString("utf16le", y);
      if (m) {
        var h = m.charCodeAt(m.length - 1);
        if (h >= 55296 && h <= 56319)
          return this.lastNeed = 2, this.lastTotal = 4, this.lastChar[0] = c[c.length - 2], this.lastChar[1] = c[c.length - 1], m.slice(0, -1);
      }
      return m;
    }
    return this.lastNeed = 1, this.lastTotal = 2, this.lastChar[0] = c[c.length - 1], c.toString("utf16le", y, c.length - 1);
  }
  function R(c) {
    var y = c && c.length ? this.write(c) : "";
    if (this.lastNeed) {
      var m = this.lastTotal - this.lastNeed;
      return y + this.lastChar.toString("utf16le", 0, m);
    }
    return y;
  }
  function E(c, y) {
    var m = (c.length - y) % 3;
    return m === 0 ? c.toString("base64", y) : (this.lastNeed = 3 - m, this.lastTotal = 3, m === 1 ? this.lastChar[0] = c[c.length - 1] : (this.lastChar[0] = c[c.length - 2], this.lastChar[1] = c[c.length - 1]), c.toString("base64", y, c.length - m));
  }
  function C(c) {
    var y = c && c.length ? this.write(c) : "";
    return this.lastNeed ? y + this.lastChar.toString("base64", 0, 3 - this.lastNeed) : y;
  }
  function w(c) {
    return c.toString(this.encoding);
  }
  function A(c) {
    return c && c.length ? this.write(c) : "";
  }
  return Cn;
}
var In, ls;
function Pi() {
  if (ls) return In;
  ls = 1;
  var r = St().codes.ERR_STREAM_PREMATURE_CLOSE;
  function e(u) {
    var l = !1;
    return function() {
      if (!l) {
        l = !0;
        for (var n = arguments.length, f = new Array(n), g = 0; g < n; g++)
          f[g] = arguments[g];
        u.apply(this, f);
      }
    };
  }
  function t() {
  }
  function s(u) {
    return u.setHeader && typeof u.abort == "function";
  }
  function o(u, l, n) {
    if (typeof l == "function") return o(u, null, l);
    l || (l = {}), n = e(n || t);
    var f = l.readable || l.readable !== !1 && u.readable, g = l.writable || l.writable !== !1 && u.writable, _ = function() {
      u.writable || R();
    }, k = u._writableState && u._writableState.finished, R = function() {
      g = !1, k = !0, f || n.call(u);
    }, E = u._readableState && u._readableState.endEmitted, C = function() {
      f = !1, E = !0, g || n.call(u);
    }, w = function(m) {
      n.call(u, m);
    }, A = function() {
      var m;
      if (f && !E)
        return (!u._readableState || !u._readableState.ended) && (m = new r()), n.call(u, m);
      if (g && !k)
        return (!u._writableState || !u._writableState.ended) && (m = new r()), n.call(u, m);
    }, c = function() {
      u.req.on("finish", R);
    };
    return s(u) ? (u.on("complete", R), u.on("abort", A), u.req ? c() : u.on("request", c)) : g && !u._writableState && (u.on("end", _), u.on("close", _)), u.on("end", C), u.on("finish", R), l.error !== !1 && u.on("error", w), u.on("close", A), function() {
      u.removeListener("complete", R), u.removeListener("abort", A), u.removeListener("request", c), u.req && u.req.removeListener("finish", R), u.removeListener("end", _), u.removeListener("close", _), u.removeListener("finish", R), u.removeListener("end", C), u.removeListener("error", w), u.removeListener("close", A);
    };
  }
  return In = o, In;
}
var Nn, fs;
function jc() {
  if (fs) return Nn;
  fs = 1;
  var r;
  function e(m, h, T) {
    return h = t(h), h in m ? Object.defineProperty(m, h, { value: T, enumerable: !0, configurable: !0, writable: !0 }) : m[h] = T, m;
  }
  function t(m) {
    var h = s(m, "string");
    return typeof h == "symbol" ? h : String(h);
  }
  function s(m, h) {
    if (typeof m != "object" || m === null) return m;
    var T = m[Symbol.toPrimitive];
    if (T !== void 0) {
      var F = T.call(m, h);
      if (typeof F != "object") return F;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (h === "string" ? String : Number)(m);
  }
  var o = Pi(), u = /* @__PURE__ */ Symbol("lastResolve"), l = /* @__PURE__ */ Symbol("lastReject"), n = /* @__PURE__ */ Symbol("error"), f = /* @__PURE__ */ Symbol("ended"), g = /* @__PURE__ */ Symbol("lastPromise"), _ = /* @__PURE__ */ Symbol("handlePromise"), k = /* @__PURE__ */ Symbol("stream");
  function R(m, h) {
    return {
      value: m,
      done: h
    };
  }
  function E(m) {
    var h = m[u];
    if (h !== null) {
      var T = m[k].read();
      T !== null && (m[g] = null, m[u] = null, m[l] = null, h(R(T, !1)));
    }
  }
  function C(m) {
    me.nextTick(E, m);
  }
  function w(m, h) {
    return function(T, F) {
      m.then(function() {
        if (h[f]) {
          T(R(void 0, !0));
          return;
        }
        h[_](T, F);
      }, F);
    };
  }
  var A = Object.getPrototypeOf(function() {
  }), c = Object.setPrototypeOf((r = {
    get stream() {
      return this[k];
    },
    next: function() {
      var h = this, T = this[n];
      if (T !== null)
        return Promise.reject(T);
      if (this[f])
        return Promise.resolve(R(void 0, !0));
      if (this[k].destroyed)
        return new Promise(function(I, X) {
          me.nextTick(function() {
            h[n] ? X(h[n]) : I(R(void 0, !0));
          });
        });
      var F = this[g], B;
      if (F)
        B = new Promise(w(F, this));
      else {
        var z = this[k].read();
        if (z !== null)
          return Promise.resolve(R(z, !1));
        B = new Promise(this[_]);
      }
      return this[g] = B, B;
    }
  }, e(r, Symbol.asyncIterator, function() {
    return this;
  }), e(r, "return", function() {
    var h = this;
    return new Promise(function(T, F) {
      h[k].destroy(null, function(B) {
        if (B) {
          F(B);
          return;
        }
        T(R(void 0, !0));
      });
    });
  }), r), A), y = function(h) {
    var T, F = Object.create(c, (T = {}, e(T, k, {
      value: h,
      writable: !0
    }), e(T, u, {
      value: null,
      writable: !0
    }), e(T, l, {
      value: null,
      writable: !0
    }), e(T, n, {
      value: null,
      writable: !0
    }), e(T, f, {
      value: h._readableState.endEmitted,
      writable: !0
    }), e(T, _, {
      value: function(z, I) {
        var X = F[k].read();
        X ? (F[g] = null, F[u] = null, F[l] = null, z(R(X, !1))) : (F[u] = z, F[l] = I);
      },
      writable: !0
    }), T));
    return F[g] = null, o(h, function(B) {
      if (B && B.code !== "ERR_STREAM_PREMATURE_CLOSE") {
        var z = F[l];
        z !== null && (F[g] = null, F[u] = null, F[l] = null, z(B)), F[n] = B;
        return;
      }
      var I = F[u];
      I !== null && (F[g] = null, F[u] = null, F[l] = null, I(R(void 0, !0))), F[f] = !0;
    }), h.on("readable", C.bind(null, F)), F;
  };
  return Nn = y, Nn;
}
var On, hs;
function zc() {
  return hs || (hs = 1, On = function() {
    throw new Error("Readable.from is not available in the browser");
  }), On;
}
var Pn, ds;
function Ro() {
  if (ds) return Pn;
  ds = 1, Pn = I;
  var r;
  I.ReadableState = z, Ri().EventEmitter;
  var e = function(D, J) {
    return D.listeners(J).length;
  }, t = ho(), s = hr().Buffer, o = (typeof Fe < "u" ? Fe : typeof window < "u" ? window : typeof self < "u" ? self : {}).Uint8Array || function() {
  };
  function u(O) {
    return s.from(O);
  }
  function l(O) {
    return s.isBuffer(O) || O instanceof o;
  }
  var n = So(), f;
  n && n.debuglog ? f = n.debuglog("stream") : f = function() {
  };
  var g = Lc(), _ = To(), k = Ao(), R = k.getHighWaterMark, E = St().codes, C = E.ERR_INVALID_ARG_TYPE, w = E.ERR_STREAM_PUSH_AFTER_EOF, A = E.ERR_METHOD_NOT_IMPLEMENTED, c = E.ERR_STREAM_UNSHIFT_AFTER_END_EVENT, y, m, h;
  rt()(I, t);
  var T = _.errorOrDestroy, F = ["error", "close", "destroy", "pause", "resume"];
  function B(O, D, J) {
    if (typeof O.prependListener == "function") return O.prependListener(D, J);
    !O._events || !O._events[D] ? O.on(D, J) : Array.isArray(O._events[D]) ? O._events[D].unshift(J) : O._events[D] = [J, O._events[D]];
  }
  function z(O, D, J) {
    r = r || vt(), O = O || {}, typeof J != "boolean" && (J = D instanceof r), this.objectMode = !!O.objectMode, J && (this.objectMode = this.objectMode || !!O.readableObjectMode), this.highWaterMark = R(this, O, "readableHighWaterMark", J), this.buffer = new g(), this.length = 0, this.pipes = null, this.pipesCount = 0, this.flowing = null, this.ended = !1, this.endEmitted = !1, this.reading = !1, this.sync = !0, this.needReadable = !1, this.emittedReadable = !1, this.readableListening = !1, this.resumeScheduled = !1, this.paused = !0, this.emitClose = O.emitClose !== !1, this.autoDestroy = !!O.autoDestroy, this.destroyed = !1, this.defaultEncoding = O.defaultEncoding || "utf8", this.awaitDrain = 0, this.readingMore = !1, this.decoder = null, this.encoding = null, O.encoding && (y || (y = Ei().StringDecoder), this.decoder = new y(O.encoding), this.encoding = O.encoding);
  }
  function I(O) {
    if (r = r || vt(), !(this instanceof I)) return new I(O);
    var D = this instanceof r;
    this._readableState = new z(O, this, D), this.readable = !0, O && (typeof O.read == "function" && (this._read = O.read), typeof O.destroy == "function" && (this._destroy = O.destroy)), t.call(this);
  }
  Object.defineProperty(I.prototype, "destroyed", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._readableState === void 0 ? !1 : this._readableState.destroyed;
    },
    set: function(D) {
      this._readableState && (this._readableState.destroyed = D);
    }
  }), I.prototype.destroy = _.destroy, I.prototype._undestroy = _.undestroy, I.prototype._destroy = function(O, D) {
    D(O);
  }, I.prototype.push = function(O, D) {
    var J = this._readableState, d;
    return J.objectMode ? d = !0 : typeof O == "string" && (D = D || J.defaultEncoding, D !== J.encoding && (O = s.from(O, D), D = ""), d = !0), X(this, O, D, !1, d);
  }, I.prototype.unshift = function(O) {
    return X(this, O, null, !0, !1);
  };
  function X(O, D, J, d, Y) {
    f("readableAddChunk", D);
    var S = O._readableState;
    if (D === null)
      S.reading = !1, ee(O, S);
    else {
      var i;
      if (Y || (i = N(S, D)), i)
        T(O, i);
      else if (S.objectMode || D && D.length > 0)
        if (typeof D != "string" && !S.objectMode && Object.getPrototypeOf(D) !== s.prototype && (D = u(D)), d)
          S.endEmitted ? T(O, new c()) : oe(O, S, D, !0);
        else if (S.ended)
          T(O, new w());
        else {
          if (S.destroyed)
            return !1;
          S.reading = !1, S.decoder && !J ? (D = S.decoder.write(D), S.objectMode || D.length !== 0 ? oe(O, S, D, !1) : Q(O, S)) : oe(O, S, D, !1);
        }
      else d || (S.reading = !1, Q(O, S));
    }
    return !S.ended && (S.length < S.highWaterMark || S.length === 0);
  }
  function oe(O, D, J, d) {
    D.flowing && D.length === 0 && !D.sync ? (D.awaitDrain = 0, O.emit("data", J)) : (D.length += D.objectMode ? 1 : J.length, d ? D.buffer.unshift(J) : D.buffer.push(J), D.needReadable && q(O)), Q(O, D);
  }
  function N(O, D) {
    var J;
    return !l(D) && typeof D != "string" && D !== void 0 && !O.objectMode && (J = new C("chunk", ["string", "Buffer", "Uint8Array"], D)), J;
  }
  I.prototype.isPaused = function() {
    return this._readableState.flowing === !1;
  }, I.prototype.setEncoding = function(O) {
    y || (y = Ei().StringDecoder);
    var D = new y(O);
    this._readableState.decoder = D, this._readableState.encoding = this._readableState.decoder.encoding;
    for (var J = this._readableState.buffer.head, d = ""; J !== null; )
      d += D.write(J.data), J = J.next;
    return this._readableState.buffer.clear(), d !== "" && this._readableState.buffer.push(d), this._readableState.length = d.length, this;
  };
  var M = 1073741824;
  function b(O) {
    return O >= M ? O = M : (O--, O |= O >>> 1, O |= O >>> 2, O |= O >>> 4, O |= O >>> 8, O |= O >>> 16, O++), O;
  }
  function G(O, D) {
    return O <= 0 || D.length === 0 && D.ended ? 0 : D.objectMode ? 1 : O !== O ? D.flowing && D.length ? D.buffer.head.data.length : D.length : (O > D.highWaterMark && (D.highWaterMark = b(O)), O <= D.length ? O : D.ended ? D.length : (D.needReadable = !0, 0));
  }
  I.prototype.read = function(O) {
    f("read", O), O = parseInt(O, 10);
    var D = this._readableState, J = O;
    if (O !== 0 && (D.emittedReadable = !1), O === 0 && D.needReadable && ((D.highWaterMark !== 0 ? D.length >= D.highWaterMark : D.length > 0) || D.ended))
      return f("read: emitReadable", D.length, D.ended), D.length === 0 && D.ended ? v(this) : q(this), null;
    if (O = G(O, D), O === 0 && D.ended)
      return D.length === 0 && v(this), null;
    var d = D.needReadable;
    f("need readable", d), (D.length === 0 || D.length - O < D.highWaterMark) && (d = !0, f("length less than watermark", d)), D.ended || D.reading ? (d = !1, f("reading or ended", d)) : d && (f("do read"), D.reading = !0, D.sync = !0, D.length === 0 && (D.needReadable = !0), this._read(D.highWaterMark), D.sync = !1, D.reading || (O = G(J, D)));
    var Y;
    return O > 0 ? Y = x(O, D) : Y = null, Y === null ? (D.needReadable = D.length <= D.highWaterMark, O = 0) : (D.length -= O, D.awaitDrain = 0), D.length === 0 && (D.ended || (D.needReadable = !0), J !== O && D.ended && v(this)), Y !== null && this.emit("data", Y), Y;
  };
  function ee(O, D) {
    if (f("onEofChunk"), !D.ended) {
      if (D.decoder) {
        var J = D.decoder.end();
        J && J.length && (D.buffer.push(J), D.length += D.objectMode ? 1 : J.length);
      }
      D.ended = !0, D.sync ? q(O) : (D.needReadable = !1, D.emittedReadable || (D.emittedReadable = !0, ne(O)));
    }
  }
  function q(O) {
    var D = O._readableState;
    f("emitReadable", D.needReadable, D.emittedReadable), D.needReadable = !1, D.emittedReadable || (f("emitReadable", D.flowing), D.emittedReadable = !0, me.nextTick(ne, O));
  }
  function ne(O) {
    var D = O._readableState;
    f("emitReadable_", D.destroyed, D.length, D.ended), !D.destroyed && (D.length || D.ended) && (O.emit("readable"), D.emittedReadable = !1), D.needReadable = !D.flowing && !D.ended && D.length <= D.highWaterMark, K(O);
  }
  function Q(O, D) {
    D.readingMore || (D.readingMore = !0, me.nextTick(ce, O, D));
  }
  function ce(O, D) {
    for (; !D.reading && !D.ended && (D.length < D.highWaterMark || D.flowing && D.length === 0); ) {
      var J = D.length;
      if (f("maybeReadMore read 0"), O.read(0), J === D.length)
        break;
    }
    D.readingMore = !1;
  }
  I.prototype._read = function(O) {
    T(this, new A("_read()"));
  }, I.prototype.pipe = function(O, D) {
    var J = this, d = this._readableState;
    switch (d.pipesCount) {
      case 0:
        d.pipes = O;
        break;
      case 1:
        d.pipes = [d.pipes, O];
        break;
      default:
        d.pipes.push(O);
        break;
    }
    d.pipesCount += 1, f("pipe count=%d opts=%j", d.pipesCount, D);
    var Y = (!D || D.end !== !1) && O !== me.stdout && O !== me.stderr, S = Y ? a : fe;
    d.endEmitted ? me.nextTick(S) : J.once("end", S), O.on("unpipe", i);
    function i(de, pe) {
      f("onunpipe"), de === J && pe && pe.hasUnpiped === !1 && (pe.hasUnpiped = !0, H());
    }
    function a() {
      f("onend"), O.end();
    }
    var p = V(J);
    O.on("drain", p);
    var L = !1;
    function H() {
      f("cleanup"), O.removeListener("close", ae), O.removeListener("finish", ie), O.removeListener("drain", p), O.removeListener("error", re), O.removeListener("unpipe", i), J.removeListener("end", a), J.removeListener("end", fe), J.removeListener("data", j), L = !0, d.awaitDrain && (!O._writableState || O._writableState.needDrain) && p();
    }
    J.on("data", j);
    function j(de) {
      f("ondata");
      var pe = O.write(de);
      f("dest.write", pe), pe === !1 && ((d.pipesCount === 1 && d.pipes === O || d.pipesCount > 1 && U(d.pipes, O) !== -1) && !L && (f("false write response, pause", d.awaitDrain), d.awaitDrain++), J.pause());
    }
    function re(de) {
      f("onerror", de), fe(), O.removeListener("error", re), e(O, "error") === 0 && T(O, de);
    }
    B(O, "error", re);
    function ae() {
      O.removeListener("finish", ie), fe();
    }
    O.once("close", ae);
    function ie() {
      f("onfinish"), O.removeListener("close", ae), fe();
    }
    O.once("finish", ie);
    function fe() {
      f("unpipe"), J.unpipe(O);
    }
    return O.emit("pipe", J), d.flowing || (f("pipe resume"), J.resume()), O;
  };
  function V(O) {
    return function() {
      var J = O._readableState;
      f("pipeOnDrain", J.awaitDrain), J.awaitDrain && J.awaitDrain--, J.awaitDrain === 0 && e(O, "data") && (J.flowing = !0, K(O));
    };
  }
  I.prototype.unpipe = function(O) {
    var D = this._readableState, J = {
      hasUnpiped: !1
    };
    if (D.pipesCount === 0) return this;
    if (D.pipesCount === 1)
      return O && O !== D.pipes ? this : (O || (O = D.pipes), D.pipes = null, D.pipesCount = 0, D.flowing = !1, O && O.emit("unpipe", this, J), this);
    if (!O) {
      var d = D.pipes, Y = D.pipesCount;
      D.pipes = null, D.pipesCount = 0, D.flowing = !1;
      for (var S = 0; S < Y; S++) d[S].emit("unpipe", this, {
        hasUnpiped: !1
      });
      return this;
    }
    var i = U(D.pipes, O);
    return i === -1 ? this : (D.pipes.splice(i, 1), D.pipesCount -= 1, D.pipesCount === 1 && (D.pipes = D.pipes[0]), O.emit("unpipe", this, J), this);
  }, I.prototype.on = function(O, D) {
    var J = t.prototype.on.call(this, O, D), d = this._readableState;
    return O === "data" ? (d.readableListening = this.listenerCount("readable") > 0, d.flowing !== !1 && this.resume()) : O === "readable" && !d.endEmitted && !d.readableListening && (d.readableListening = d.needReadable = !0, d.flowing = !1, d.emittedReadable = !1, f("on readable", d.length, d.reading), d.length ? q(this) : d.reading || me.nextTick($, this)), J;
  }, I.prototype.addListener = I.prototype.on, I.prototype.removeListener = function(O, D) {
    var J = t.prototype.removeListener.call(this, O, D);
    return O === "readable" && me.nextTick(P, this), J;
  }, I.prototype.removeAllListeners = function(O) {
    var D = t.prototype.removeAllListeners.apply(this, arguments);
    return (O === "readable" || O === void 0) && me.nextTick(P, this), D;
  };
  function P(O) {
    var D = O._readableState;
    D.readableListening = O.listenerCount("readable") > 0, D.resumeScheduled && !D.paused ? D.flowing = !0 : O.listenerCount("data") > 0 && O.resume();
  }
  function $(O) {
    f("readable nexttick read 0"), O.read(0);
  }
  I.prototype.resume = function() {
    var O = this._readableState;
    return O.flowing || (f("resume"), O.flowing = !O.readableListening, Z(this, O)), O.paused = !1, this;
  };
  function Z(O, D) {
    D.resumeScheduled || (D.resumeScheduled = !0, me.nextTick(te, O, D));
  }
  function te(O, D) {
    f("resume", D.reading), D.reading || O.read(0), D.resumeScheduled = !1, O.emit("resume"), K(O), D.flowing && !D.reading && O.read(0);
  }
  I.prototype.pause = function() {
    return f("call pause flowing=%j", this._readableState.flowing), this._readableState.flowing !== !1 && (f("pause"), this._readableState.flowing = !1, this.emit("pause")), this._readableState.paused = !0, this;
  };
  function K(O) {
    var D = O._readableState;
    for (f("flow", D.flowing); D.flowing && O.read() !== null; ) ;
  }
  I.prototype.wrap = function(O) {
    var D = this, J = this._readableState, d = !1;
    O.on("end", function() {
      if (f("wrapped end"), J.decoder && !J.ended) {
        var i = J.decoder.end();
        i && i.length && D.push(i);
      }
      D.push(null);
    }), O.on("data", function(i) {
      if (f("wrapped data"), J.decoder && (i = J.decoder.write(i)), !(J.objectMode && i == null) && !(!J.objectMode && (!i || !i.length))) {
        var a = D.push(i);
        a || (d = !0, O.pause());
      }
    });
    for (var Y in O)
      this[Y] === void 0 && typeof O[Y] == "function" && (this[Y] = /* @__PURE__ */ function(a) {
        return function() {
          return O[a].apply(O, arguments);
        };
      }(Y));
    for (var S = 0; S < F.length; S++)
      O.on(F[S], this.emit.bind(this, F[S]));
    return this._read = function(i) {
      f("wrapped _read", i), d && (d = !1, O.resume());
    }, this;
  }, typeof Symbol == "function" && (I.prototype[Symbol.asyncIterator] = function() {
    return m === void 0 && (m = jc()), m(this);
  }), Object.defineProperty(I.prototype, "readableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._readableState.highWaterMark;
    }
  }), Object.defineProperty(I.prototype, "readableBuffer", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._readableState && this._readableState.buffer;
    }
  }), Object.defineProperty(I.prototype, "readableFlowing", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._readableState.flowing;
    },
    set: function(D) {
      this._readableState && (this._readableState.flowing = D);
    }
  }), I._fromList = x, Object.defineProperty(I.prototype, "readableLength", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._readableState.length;
    }
  });
  function x(O, D) {
    if (D.length === 0) return null;
    var J;
    return D.objectMode ? J = D.buffer.shift() : !O || O >= D.length ? (D.decoder ? J = D.buffer.join("") : D.buffer.length === 1 ? J = D.buffer.first() : J = D.buffer.concat(D.length), D.buffer.clear()) : J = D.buffer.consume(O, D.decoder), J;
  }
  function v(O) {
    var D = O._readableState;
    f("endReadable", D.endEmitted), D.endEmitted || (D.ended = !0, me.nextTick(W, D, O));
  }
  function W(O, D) {
    if (f("endReadableNT", O.endEmitted, O.length), !O.endEmitted && O.length === 0 && (O.endEmitted = !0, D.readable = !1, D.emit("end"), O.autoDestroy)) {
      var J = D._writableState;
      (!J || J.autoDestroy && J.finished) && D.destroy();
    }
  }
  typeof Symbol == "function" && (I.from = function(O, D) {
    return h === void 0 && (h = zc()), h(I, O, D);
  });
  function U(O, D) {
    for (var J = 0, d = O.length; J < d; J++)
      if (O[J] === D) return J;
    return -1;
  }
  return Pn;
}
var Fn, ps;
function Co() {
  if (ps) return Fn;
  ps = 1, Fn = n;
  var r = St().codes, e = r.ERR_METHOD_NOT_IMPLEMENTED, t = r.ERR_MULTIPLE_CALLBACK, s = r.ERR_TRANSFORM_ALREADY_TRANSFORMING, o = r.ERR_TRANSFORM_WITH_LENGTH_0, u = vt();
  rt()(n, u);
  function l(_, k) {
    var R = this._transformState;
    R.transforming = !1;
    var E = R.writecb;
    if (E === null)
      return this.emit("error", new t());
    R.writechunk = null, R.writecb = null, k != null && this.push(k), E(_);
    var C = this._readableState;
    C.reading = !1, (C.needReadable || C.length < C.highWaterMark) && this._read(C.highWaterMark);
  }
  function n(_) {
    if (!(this instanceof n)) return new n(_);
    u.call(this, _), this._transformState = {
      afterTransform: l.bind(this),
      needTransform: !1,
      transforming: !1,
      writecb: null,
      writechunk: null,
      writeencoding: null
    }, this._readableState.needReadable = !0, this._readableState.sync = !1, _ && (typeof _.transform == "function" && (this._transform = _.transform), typeof _.flush == "function" && (this._flush = _.flush)), this.on("prefinish", f);
  }
  function f() {
    var _ = this;
    typeof this._flush == "function" && !this._readableState.destroyed ? this._flush(function(k, R) {
      g(_, k, R);
    }) : g(this, null, null);
  }
  n.prototype.push = function(_, k) {
    return this._transformState.needTransform = !1, u.prototype.push.call(this, _, k);
  }, n.prototype._transform = function(_, k, R) {
    R(new e("_transform()"));
  }, n.prototype._write = function(_, k, R) {
    var E = this._transformState;
    if (E.writecb = R, E.writechunk = _, E.writeencoding = k, !E.transforming) {
      var C = this._readableState;
      (E.needTransform || C.needReadable || C.length < C.highWaterMark) && this._read(C.highWaterMark);
    }
  }, n.prototype._read = function(_) {
    var k = this._transformState;
    k.writechunk !== null && !k.transforming ? (k.transforming = !0, this._transform(k.writechunk, k.writeencoding, k.afterTransform)) : k.needTransform = !0;
  }, n.prototype._destroy = function(_, k) {
    u.prototype._destroy.call(this, _, function(R) {
      k(R);
    });
  };
  function g(_, k, R) {
    if (k) return _.emit("error", k);
    if (R != null && _.push(R), _._writableState.length) throw new o();
    if (_._transformState.transforming) throw new s();
    return _.push(null);
  }
  return Fn;
}
var Dn, ms;
function Wc() {
  if (ms) return Dn;
  ms = 1, Dn = e;
  var r = Co();
  rt()(e, r);
  function e(t) {
    if (!(this instanceof e)) return new e(t);
    r.call(this, t);
  }
  return e.prototype._transform = function(t, s, o) {
    o(null, t);
  }, Dn;
}
var Bn, gs;
function qc() {
  if (gs) return Bn;
  gs = 1;
  var r;
  function e(R) {
    var E = !1;
    return function() {
      E || (E = !0, R.apply(void 0, arguments));
    };
  }
  var t = St().codes, s = t.ERR_MISSING_ARGS, o = t.ERR_STREAM_DESTROYED;
  function u(R) {
    if (R) throw R;
  }
  function l(R) {
    return R.setHeader && typeof R.abort == "function";
  }
  function n(R, E, C, w) {
    w = e(w);
    var A = !1;
    R.on("close", function() {
      A = !0;
    }), r === void 0 && (r = Pi()), r(R, {
      readable: E,
      writable: C
    }, function(y) {
      if (y) return w(y);
      A = !0, w();
    });
    var c = !1;
    return function(y) {
      if (!A && !c) {
        if (c = !0, l(R)) return R.abort();
        if (typeof R.destroy == "function") return R.destroy();
        w(y || new o("pipe"));
      }
    };
  }
  function f(R) {
    R();
  }
  function g(R, E) {
    return R.pipe(E);
  }
  function _(R) {
    return !R.length || typeof R[R.length - 1] != "function" ? u : R.pop();
  }
  function k() {
    for (var R = arguments.length, E = new Array(R), C = 0; C < R; C++)
      E[C] = arguments[C];
    var w = _(E);
    if (Array.isArray(E[0]) && (E = E[0]), E.length < 2)
      throw new s("streams");
    var A, c = E.map(function(y, m) {
      var h = m < E.length - 1, T = m > 0;
      return n(y, h, T, function(F) {
        A || (A = F), F && c.forEach(f), !h && (c.forEach(f), w(A));
      });
    });
    return E.reduce(g);
  }
  return Bn = k, Bn;
}
var Ln, ws;
function Fi() {
  if (ws) return Ln;
  ws = 1, Ln = t;
  var r = Ri().EventEmitter, e = rt();
  e(t, r), t.Readable = Ro(), t.Writable = ko(), t.Duplex = vt(), t.Transform = Co(), t.PassThrough = Wc(), t.finished = Pi(), t.pipeline = qc(), t.Stream = t;
  function t() {
    r.call(this);
  }
  return t.prototype.pipe = function(s, o) {
    var u = this;
    function l(E) {
      s.writable && s.write(E) === !1 && u.pause && u.pause();
    }
    u.on("data", l);
    function n() {
      u.readable && u.resume && u.resume();
    }
    s.on("drain", n), !s._isStdio && (!o || o.end !== !1) && (u.on("end", g), u.on("close", _));
    var f = !1;
    function g() {
      f || (f = !0, s.end());
    }
    function _() {
      f || (f = !0, typeof s.destroy == "function" && s.destroy());
    }
    function k(E) {
      if (R(), r.listenerCount(this, "error") === 0)
        throw E;
    }
    u.on("error", k), s.on("error", k);
    function R() {
      u.removeListener("data", l), s.removeListener("drain", n), u.removeListener("end", g), u.removeListener("close", _), u.removeListener("error", k), s.removeListener("error", k), u.removeListener("end", R), u.removeListener("close", R), s.removeListener("close", R);
    }
    return u.on("end", R), u.on("close", R), s.on("close", R), s.emit("pipe", u), s;
  }, Ln;
}
var ys;
function Hc() {
  return ys || (ys = 1, function(r) {
    (function(e) {
      e.parser = function(x, v) {
        return new s(x, v);
      }, e.SAXParser = s, e.SAXStream = _, e.createStream = g, e.MAX_BUFFER_LENGTH = 64 * 1024;
      var t = [
        "comment",
        "sgmlDecl",
        "textNode",
        "tagName",
        "doctype",
        "procInstName",
        "procInstBody",
        "entity",
        "attribName",
        "attribValue",
        "cdata",
        "script"
      ];
      e.EVENTS = [
        "text",
        "processinginstruction",
        "sgmldeclaration",
        "doctype",
        "comment",
        "opentagstart",
        "attribute",
        "opentag",
        "closetag",
        "opencdata",
        "cdata",
        "closecdata",
        "error",
        "end",
        "ready",
        "script",
        "opennamespace",
        "closenamespace"
      ];
      function s(x, v) {
        if (!(this instanceof s))
          return new s(x, v);
        var W = this;
        u(W), W.q = W.c = "", W.bufferCheckPosition = e.MAX_BUFFER_LENGTH, W.opt = v || {}, W.opt.lowercase = W.opt.lowercase || W.opt.lowercasetags, W.looseCase = W.opt.lowercase ? "toLowerCase" : "toUpperCase", W.tags = [], W.closed = W.closedRoot = W.sawRoot = !1, W.tag = W.error = null, W.strict = !!x, W.noscript = !!(x || W.opt.noscript), W.state = I.BEGIN, W.strictEntities = W.opt.strictEntities, W.ENTITIES = W.strictEntities ? Object.create(e.XML_ENTITIES) : Object.create(e.ENTITIES), W.attribList = [], W.opt.xmlns && (W.ns = Object.create(w)), W.trackPosition = W.opt.position !== !1, W.trackPosition && (W.position = W.line = W.column = 0), oe(W, "onready");
      }
      Object.create || (Object.create = function(x) {
        function v() {
        }
        v.prototype = x;
        var W = new v();
        return W;
      }), Object.keys || (Object.keys = function(x) {
        var v = [];
        for (var W in x) x.hasOwnProperty(W) && v.push(W);
        return v;
      });
      function o(x) {
        for (var v = Math.max(e.MAX_BUFFER_LENGTH, 10), W = 0, U = 0, O = t.length; U < O; U++) {
          var D = x[t[U]].length;
          if (D > v)
            switch (t[U]) {
              case "textNode":
                M(x);
                break;
              case "cdata":
                N(x, "oncdata", x.cdata), x.cdata = "";
                break;
              case "script":
                N(x, "onscript", x.script), x.script = "";
                break;
              default:
                G(x, "Max buffer length exceeded: " + t[U]);
            }
          W = Math.max(W, D);
        }
        var J = e.MAX_BUFFER_LENGTH - W;
        x.bufferCheckPosition = J + x.position;
      }
      function u(x) {
        for (var v = 0, W = t.length; v < W; v++)
          x[t[v]] = "";
      }
      function l(x) {
        M(x), x.cdata !== "" && (N(x, "oncdata", x.cdata), x.cdata = ""), x.script !== "" && (N(x, "onscript", x.script), x.script = "");
      }
      s.prototype = {
        end: function() {
          ee(this);
        },
        write: K,
        resume: function() {
          return this.error = null, this;
        },
        close: function() {
          return this.write(null);
        },
        flush: function() {
          l(this);
        }
      };
      var n;
      try {
        n = Fi().Stream;
      } catch {
        n = function() {
        };
      }
      var f = e.EVENTS.filter(function(x) {
        return x !== "error" && x !== "end";
      });
      function g(x, v) {
        return new _(x, v);
      }
      function _(x, v) {
        if (!(this instanceof _))
          return new _(x, v);
        n.apply(this), this._parser = new s(x, v), this.writable = !0, this.readable = !0;
        var W = this;
        this._parser.onend = function() {
          W.emit("end");
        }, this._parser.onerror = function(U) {
          W.emit("error", U), W._parser.error = null;
        }, this._decoder = null, f.forEach(function(U) {
          Object.defineProperty(W, "on" + U, {
            get: function() {
              return W._parser["on" + U];
            },
            set: function(O) {
              if (!O)
                return W.removeAllListeners(U), W._parser["on" + U] = O, O;
              W.on(U, O);
            },
            enumerable: !0,
            configurable: !1
          });
        });
      }
      _.prototype = Object.create(n.prototype, {
        constructor: {
          value: _
        }
      }), _.prototype.write = function(x) {
        if (typeof Buffer == "function" && typeof Buffer.isBuffer == "function" && Buffer.isBuffer(x)) {
          if (!this._decoder) {
            var v = Ei().StringDecoder;
            this._decoder = new v("utf8");
          }
          x = this._decoder.write(x);
        }
        return this._parser.write(x.toString()), this.emit("data", x), !0;
      }, _.prototype.end = function(x) {
        return x && x.length && this.write(x), this._parser.end(), !0;
      }, _.prototype.on = function(x, v) {
        var W = this;
        return !W._parser["on" + x] && f.indexOf(x) !== -1 && (W._parser["on" + x] = function() {
          var U = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
          U.splice(0, 0, x), W.emit.apply(W, U);
        }), n.prototype.on.call(W, x, v);
      };
      var k = "[CDATA[", R = "DOCTYPE", E = "http://www.w3.org/XML/1998/namespace", C = "http://www.w3.org/2000/xmlns/", w = { xml: E, xmlns: C }, A = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/, c = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/, y = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/, m = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;
      function h(x) {
        return x === " " || x === `
` || x === "\r" || x === "	";
      }
      function T(x) {
        return x === '"' || x === "'";
      }
      function F(x) {
        return x === ">" || h(x);
      }
      function B(x, v) {
        return x.test(v);
      }
      function z(x, v) {
        return !B(x, v);
      }
      var I = 0;
      e.STATE = {
        BEGIN: I++,
        // leading byte order mark or whitespace
        BEGIN_WHITESPACE: I++,
        // leading whitespace
        TEXT: I++,
        // general stuff
        TEXT_ENTITY: I++,
        // &amp and such.
        OPEN_WAKA: I++,
        // <
        SGML_DECL: I++,
        // <!BLARG
        SGML_DECL_QUOTED: I++,
        // <!BLARG foo "bar
        DOCTYPE: I++,
        // <!DOCTYPE
        DOCTYPE_QUOTED: I++,
        // <!DOCTYPE "//blah
        DOCTYPE_DTD: I++,
        // <!DOCTYPE "//blah" [ ...
        DOCTYPE_DTD_QUOTED: I++,
        // <!DOCTYPE "//blah" [ "foo
        COMMENT_STARTING: I++,
        // <!-
        COMMENT: I++,
        // <!--
        COMMENT_ENDING: I++,
        // <!-- blah -
        COMMENT_ENDED: I++,
        // <!-- blah --
        CDATA: I++,
        // <![CDATA[ something
        CDATA_ENDING: I++,
        // ]
        CDATA_ENDING_2: I++,
        // ]]
        PROC_INST: I++,
        // <?hi
        PROC_INST_BODY: I++,
        // <?hi there
        PROC_INST_ENDING: I++,
        // <?hi "there" ?
        OPEN_TAG: I++,
        // <strong
        OPEN_TAG_SLASH: I++,
        // <strong /
        ATTRIB: I++,
        // <a
        ATTRIB_NAME: I++,
        // <a foo
        ATTRIB_NAME_SAW_WHITE: I++,
        // <a foo _
        ATTRIB_VALUE: I++,
        // <a foo=
        ATTRIB_VALUE_QUOTED: I++,
        // <a foo="bar
        ATTRIB_VALUE_CLOSED: I++,
        // <a foo="bar"
        ATTRIB_VALUE_UNQUOTED: I++,
        // <a foo=bar
        ATTRIB_VALUE_ENTITY_Q: I++,
        // <foo bar="&quot;"
        ATTRIB_VALUE_ENTITY_U: I++,
        // <foo bar=&quot
        CLOSE_TAG: I++,
        // </a
        CLOSE_TAG_SAW_WHITE: I++,
        // </a   >
        SCRIPT: I++,
        // <script> ...
        SCRIPT_ENDING: I++
        // <script> ... <
      }, e.XML_ENTITIES = {
        amp: "&",
        gt: ">",
        lt: "<",
        quot: '"',
        apos: "'"
      }, e.ENTITIES = {
        amp: "&",
        gt: ">",
        lt: "<",
        quot: '"',
        apos: "'",
        AElig: 198,
        Aacute: 193,
        Acirc: 194,
        Agrave: 192,
        Aring: 197,
        Atilde: 195,
        Auml: 196,
        Ccedil: 199,
        ETH: 208,
        Eacute: 201,
        Ecirc: 202,
        Egrave: 200,
        Euml: 203,
        Iacute: 205,
        Icirc: 206,
        Igrave: 204,
        Iuml: 207,
        Ntilde: 209,
        Oacute: 211,
        Ocirc: 212,
        Ograve: 210,
        Oslash: 216,
        Otilde: 213,
        Ouml: 214,
        THORN: 222,
        Uacute: 218,
        Ucirc: 219,
        Ugrave: 217,
        Uuml: 220,
        Yacute: 221,
        aacute: 225,
        acirc: 226,
        aelig: 230,
        agrave: 224,
        aring: 229,
        atilde: 227,
        auml: 228,
        ccedil: 231,
        eacute: 233,
        ecirc: 234,
        egrave: 232,
        eth: 240,
        euml: 235,
        iacute: 237,
        icirc: 238,
        igrave: 236,
        iuml: 239,
        ntilde: 241,
        oacute: 243,
        ocirc: 244,
        ograve: 242,
        oslash: 248,
        otilde: 245,
        ouml: 246,
        szlig: 223,
        thorn: 254,
        uacute: 250,
        ucirc: 251,
        ugrave: 249,
        uuml: 252,
        yacute: 253,
        yuml: 255,
        copy: 169,
        reg: 174,
        nbsp: 160,
        iexcl: 161,
        cent: 162,
        pound: 163,
        curren: 164,
        yen: 165,
        brvbar: 166,
        sect: 167,
        uml: 168,
        ordf: 170,
        laquo: 171,
        not: 172,
        shy: 173,
        macr: 175,
        deg: 176,
        plusmn: 177,
        sup1: 185,
        sup2: 178,
        sup3: 179,
        acute: 180,
        micro: 181,
        para: 182,
        middot: 183,
        cedil: 184,
        ordm: 186,
        raquo: 187,
        frac14: 188,
        frac12: 189,
        frac34: 190,
        iquest: 191,
        times: 215,
        divide: 247,
        OElig: 338,
        oelig: 339,
        Scaron: 352,
        scaron: 353,
        Yuml: 376,
        fnof: 402,
        circ: 710,
        tilde: 732,
        Alpha: 913,
        Beta: 914,
        Gamma: 915,
        Delta: 916,
        Epsilon: 917,
        Zeta: 918,
        Eta: 919,
        Theta: 920,
        Iota: 921,
        Kappa: 922,
        Lambda: 923,
        Mu: 924,
        Nu: 925,
        Xi: 926,
        Omicron: 927,
        Pi: 928,
        Rho: 929,
        Sigma: 931,
        Tau: 932,
        Upsilon: 933,
        Phi: 934,
        Chi: 935,
        Psi: 936,
        Omega: 937,
        alpha: 945,
        beta: 946,
        gamma: 947,
        delta: 948,
        epsilon: 949,
        zeta: 950,
        eta: 951,
        theta: 952,
        iota: 953,
        kappa: 954,
        lambda: 955,
        mu: 956,
        nu: 957,
        xi: 958,
        omicron: 959,
        pi: 960,
        rho: 961,
        sigmaf: 962,
        sigma: 963,
        tau: 964,
        upsilon: 965,
        phi: 966,
        chi: 967,
        psi: 968,
        omega: 969,
        thetasym: 977,
        upsih: 978,
        piv: 982,
        ensp: 8194,
        emsp: 8195,
        thinsp: 8201,
        zwnj: 8204,
        zwj: 8205,
        lrm: 8206,
        rlm: 8207,
        ndash: 8211,
        mdash: 8212,
        lsquo: 8216,
        rsquo: 8217,
        sbquo: 8218,
        ldquo: 8220,
        rdquo: 8221,
        bdquo: 8222,
        dagger: 8224,
        Dagger: 8225,
        bull: 8226,
        hellip: 8230,
        permil: 8240,
        prime: 8242,
        Prime: 8243,
        lsaquo: 8249,
        rsaquo: 8250,
        oline: 8254,
        frasl: 8260,
        euro: 8364,
        image: 8465,
        weierp: 8472,
        real: 8476,
        trade: 8482,
        alefsym: 8501,
        larr: 8592,
        uarr: 8593,
        rarr: 8594,
        darr: 8595,
        harr: 8596,
        crarr: 8629,
        lArr: 8656,
        uArr: 8657,
        rArr: 8658,
        dArr: 8659,
        hArr: 8660,
        forall: 8704,
        part: 8706,
        exist: 8707,
        empty: 8709,
        nabla: 8711,
        isin: 8712,
        notin: 8713,
        ni: 8715,
        prod: 8719,
        sum: 8721,
        minus: 8722,
        lowast: 8727,
        radic: 8730,
        prop: 8733,
        infin: 8734,
        ang: 8736,
        and: 8743,
        or: 8744,
        cap: 8745,
        cup: 8746,
        int: 8747,
        there4: 8756,
        sim: 8764,
        cong: 8773,
        asymp: 8776,
        ne: 8800,
        equiv: 8801,
        le: 8804,
        ge: 8805,
        sub: 8834,
        sup: 8835,
        nsub: 8836,
        sube: 8838,
        supe: 8839,
        oplus: 8853,
        otimes: 8855,
        perp: 8869,
        sdot: 8901,
        lceil: 8968,
        rceil: 8969,
        lfloor: 8970,
        rfloor: 8971,
        lang: 9001,
        rang: 9002,
        loz: 9674,
        spades: 9824,
        clubs: 9827,
        hearts: 9829,
        diams: 9830
      }, Object.keys(e.ENTITIES).forEach(function(x) {
        var v = e.ENTITIES[x], W = typeof v == "number" ? String.fromCharCode(v) : v;
        e.ENTITIES[x] = W;
      });
      for (var X in e.STATE)
        e.STATE[e.STATE[X]] = X;
      I = e.STATE;
      function oe(x, v, W) {
        x[v] && x[v](W);
      }
      function N(x, v, W) {
        x.textNode && M(x), oe(x, v, W);
      }
      function M(x) {
        x.textNode = b(x.opt, x.textNode), x.textNode && oe(x, "ontext", x.textNode), x.textNode = "";
      }
      function b(x, v) {
        return x.trim && (v = v.trim()), x.normalize && (v = v.replace(/\s+/g, " ")), v;
      }
      function G(x, v) {
        return M(x), x.trackPosition && (v += `
Line: ` + x.line + `
Column: ` + x.column + `
Char: ` + x.c), v = new Error(v), x.error = v, oe(x, "onerror", v), x;
      }
      function ee(x) {
        return x.sawRoot && !x.closedRoot && q(x, "Unclosed root tag"), x.state !== I.BEGIN && x.state !== I.BEGIN_WHITESPACE && x.state !== I.TEXT && G(x, "Unexpected end"), M(x), x.c = "", x.closed = !0, oe(x, "onend"), s.call(x, x.strict, x.opt), x;
      }
      function q(x, v) {
        if (typeof x != "object" || !(x instanceof s))
          throw new Error("bad call to strictFail");
        x.strict && G(x, v);
      }
      function ne(x) {
        x.strict || (x.tagName = x.tagName[x.looseCase]());
        var v = x.tags[x.tags.length - 1] || x, W = x.tag = { name: x.tagName, attributes: {} };
        x.opt.xmlns && (W.ns = v.ns), x.attribList.length = 0, N(x, "onopentagstart", W);
      }
      function Q(x, v) {
        var W = x.indexOf(":"), U = W < 0 ? ["", x] : x.split(":"), O = U[0], D = U[1];
        return v && x === "xmlns" && (O = "xmlns", D = ""), { prefix: O, local: D };
      }
      function ce(x) {
        if (x.strict || (x.attribName = x.attribName[x.looseCase]()), x.attribList.indexOf(x.attribName) !== -1 || x.tag.attributes.hasOwnProperty(x.attribName)) {
          x.attribName = x.attribValue = "";
          return;
        }
        if (x.opt.xmlns) {
          var v = Q(x.attribName, !0), W = v.prefix, U = v.local;
          if (W === "xmlns")
            if (U === "xml" && x.attribValue !== E)
              q(
                x,
                "xml: prefix must be bound to " + E + `
Actual: ` + x.attribValue
              );
            else if (U === "xmlns" && x.attribValue !== C)
              q(
                x,
                "xmlns: prefix must be bound to " + C + `
Actual: ` + x.attribValue
              );
            else {
              var O = x.tag, D = x.tags[x.tags.length - 1] || x;
              O.ns === D.ns && (O.ns = Object.create(D.ns)), O.ns[U] = x.attribValue;
            }
          x.attribList.push([x.attribName, x.attribValue]);
        } else
          x.tag.attributes[x.attribName] = x.attribValue, N(x, "onattribute", {
            name: x.attribName,
            value: x.attribValue
          });
        x.attribName = x.attribValue = "";
      }
      function V(x, v) {
        if (x.opt.xmlns) {
          var W = x.tag, U = Q(x.tagName);
          W.prefix = U.prefix, W.local = U.local, W.uri = W.ns[U.prefix] || "", W.prefix && !W.uri && (q(x, "Unbound namespace prefix: " + JSON.stringify(x.tagName)), W.uri = U.prefix);
          var O = x.tags[x.tags.length - 1] || x;
          W.ns && O.ns !== W.ns && Object.keys(W.ns).forEach(function(j) {
            N(x, "onopennamespace", {
              prefix: j,
              uri: W.ns[j]
            });
          });
          for (var D = 0, J = x.attribList.length; D < J; D++) {
            var d = x.attribList[D], Y = d[0], S = d[1], i = Q(Y, !0), a = i.prefix, p = i.local, L = a === "" ? "" : W.ns[a] || "", H = {
              name: Y,
              value: S,
              prefix: a,
              local: p,
              uri: L
            };
            a && a !== "xmlns" && !L && (q(x, "Unbound namespace prefix: " + JSON.stringify(a)), H.uri = a), x.tag.attributes[Y] = H, N(x, "onattribute", H);
          }
          x.attribList.length = 0;
        }
        x.tag.isSelfClosing = !!v, x.sawRoot = !0, x.tags.push(x.tag), N(x, "onopentag", x.tag), v || (!x.noscript && x.tagName.toLowerCase() === "script" ? x.state = I.SCRIPT : x.state = I.TEXT, x.tag = null, x.tagName = ""), x.attribName = x.attribValue = "", x.attribList.length = 0;
      }
      function P(x) {
        if (!x.tagName) {
          q(x, "Weird empty close tag."), x.textNode += "</>", x.state = I.TEXT;
          return;
        }
        if (x.script) {
          if (x.tagName !== "script") {
            x.script += "</" + x.tagName + ">", x.tagName = "", x.state = I.SCRIPT;
            return;
          }
          N(x, "onscript", x.script), x.script = "";
        }
        var v = x.tags.length, W = x.tagName;
        x.strict || (W = W[x.looseCase]());
        for (var U = W; v--; ) {
          var O = x.tags[v];
          if (O.name !== U)
            q(x, "Unexpected close tag");
          else
            break;
        }
        if (v < 0) {
          q(x, "Unmatched closing tag: " + x.tagName), x.textNode += "</" + x.tagName + ">", x.state = I.TEXT;
          return;
        }
        x.tagName = W;
        for (var D = x.tags.length; D-- > v; ) {
          var J = x.tag = x.tags.pop();
          x.tagName = x.tag.name, N(x, "onclosetag", x.tagName);
          var d = {};
          for (var Y in J.ns)
            d[Y] = J.ns[Y];
          var S = x.tags[x.tags.length - 1] || x;
          x.opt.xmlns && J.ns !== S.ns && Object.keys(J.ns).forEach(function(i) {
            var a = J.ns[i];
            N(x, "onclosenamespace", { prefix: i, uri: a });
          });
        }
        v === 0 && (x.closedRoot = !0), x.tagName = x.attribValue = x.attribName = "", x.attribList.length = 0, x.state = I.TEXT;
      }
      function $(x) {
        var v = x.entity, W = v.toLowerCase(), U, O = "";
        return x.ENTITIES[v] ? x.ENTITIES[v] : x.ENTITIES[W] ? x.ENTITIES[W] : (v = W, v.charAt(0) === "#" && (v.charAt(1) === "x" ? (v = v.slice(2), U = parseInt(v, 16), O = U.toString(16)) : (v = v.slice(1), U = parseInt(v, 10), O = U.toString(10))), v = v.replace(/^0+/, ""), isNaN(U) || O.toLowerCase() !== v ? (q(x, "Invalid character entity"), "&" + x.entity + ";") : String.fromCodePoint(U));
      }
      function Z(x, v) {
        v === "<" ? (x.state = I.OPEN_WAKA, x.startTagPosition = x.position) : h(v) || (q(x, "Non-whitespace before first tag."), x.textNode = v, x.state = I.TEXT);
      }
      function te(x, v) {
        var W = "";
        return v < x.length && (W = x.charAt(v)), W;
      }
      function K(x) {
        var v = this;
        if (this.error)
          throw this.error;
        if (v.closed)
          return G(
            v,
            "Cannot write after close. Assign an onready handler."
          );
        if (x === null)
          return ee(v);
        typeof x == "object" && (x = x.toString());
        for (var W = 0, U = ""; U = te(x, W++), v.c = U, !!U; )
          switch (v.trackPosition && (v.position++, U === `
` ? (v.line++, v.column = 0) : v.column++), v.state) {
            case I.BEGIN:
              if (v.state = I.BEGIN_WHITESPACE, U === "\uFEFF")
                continue;
              Z(v, U);
              continue;
            case I.BEGIN_WHITESPACE:
              Z(v, U);
              continue;
            case I.TEXT:
              if (v.sawRoot && !v.closedRoot) {
                for (var O = W - 1; U && U !== "<" && U !== "&"; )
                  U = te(x, W++), U && v.trackPosition && (v.position++, U === `
` ? (v.line++, v.column = 0) : v.column++);
                v.textNode += x.substring(O, W - 1);
              }
              U === "<" && !(v.sawRoot && v.closedRoot && !v.strict) ? (v.state = I.OPEN_WAKA, v.startTagPosition = v.position) : (!h(U) && (!v.sawRoot || v.closedRoot) && q(v, "Text data outside of root node."), U === "&" ? v.state = I.TEXT_ENTITY : v.textNode += U);
              continue;
            case I.SCRIPT:
              U === "<" ? v.state = I.SCRIPT_ENDING : v.script += U;
              continue;
            case I.SCRIPT_ENDING:
              U === "/" ? v.state = I.CLOSE_TAG : (v.script += "<" + U, v.state = I.SCRIPT);
              continue;
            case I.OPEN_WAKA:
              if (U === "!")
                v.state = I.SGML_DECL, v.sgmlDecl = "";
              else if (!h(U)) if (B(A, U))
                v.state = I.OPEN_TAG, v.tagName = U;
              else if (U === "/")
                v.state = I.CLOSE_TAG, v.tagName = "";
              else if (U === "?")
                v.state = I.PROC_INST, v.procInstName = v.procInstBody = "";
              else {
                if (q(v, "Unencoded <"), v.startTagPosition + 1 < v.position) {
                  var D = v.position - v.startTagPosition;
                  U = new Array(D).join(" ") + U;
                }
                v.textNode += "<" + U, v.state = I.TEXT;
              }
              continue;
            case I.SGML_DECL:
              (v.sgmlDecl + U).toUpperCase() === k ? (N(v, "onopencdata"), v.state = I.CDATA, v.sgmlDecl = "", v.cdata = "") : v.sgmlDecl + U === "--" ? (v.state = I.COMMENT, v.comment = "", v.sgmlDecl = "") : (v.sgmlDecl + U).toUpperCase() === R ? (v.state = I.DOCTYPE, (v.doctype || v.sawRoot) && q(
                v,
                "Inappropriately located doctype declaration"
              ), v.doctype = "", v.sgmlDecl = "") : U === ">" ? (N(v, "onsgmldeclaration", v.sgmlDecl), v.sgmlDecl = "", v.state = I.TEXT) : (T(U) && (v.state = I.SGML_DECL_QUOTED), v.sgmlDecl += U);
              continue;
            case I.SGML_DECL_QUOTED:
              U === v.q && (v.state = I.SGML_DECL, v.q = ""), v.sgmlDecl += U;
              continue;
            case I.DOCTYPE:
              U === ">" ? (v.state = I.TEXT, N(v, "ondoctype", v.doctype), v.doctype = !0) : (v.doctype += U, U === "[" ? v.state = I.DOCTYPE_DTD : T(U) && (v.state = I.DOCTYPE_QUOTED, v.q = U));
              continue;
            case I.DOCTYPE_QUOTED:
              v.doctype += U, U === v.q && (v.q = "", v.state = I.DOCTYPE);
              continue;
            case I.DOCTYPE_DTD:
              v.doctype += U, U === "]" ? v.state = I.DOCTYPE : T(U) && (v.state = I.DOCTYPE_DTD_QUOTED, v.q = U);
              continue;
            case I.DOCTYPE_DTD_QUOTED:
              v.doctype += U, U === v.q && (v.state = I.DOCTYPE_DTD, v.q = "");
              continue;
            case I.COMMENT:
              U === "-" ? v.state = I.COMMENT_ENDING : v.comment += U;
              continue;
            case I.COMMENT_ENDING:
              U === "-" ? (v.state = I.COMMENT_ENDED, v.comment = b(v.opt, v.comment), v.comment && N(v, "oncomment", v.comment), v.comment = "") : (v.comment += "-" + U, v.state = I.COMMENT);
              continue;
            case I.COMMENT_ENDED:
              U !== ">" ? (q(v, "Malformed comment"), v.comment += "--" + U, v.state = I.COMMENT) : v.state = I.TEXT;
              continue;
            case I.CDATA:
              U === "]" ? v.state = I.CDATA_ENDING : v.cdata += U;
              continue;
            case I.CDATA_ENDING:
              U === "]" ? v.state = I.CDATA_ENDING_2 : (v.cdata += "]" + U, v.state = I.CDATA);
              continue;
            case I.CDATA_ENDING_2:
              U === ">" ? (v.cdata && N(v, "oncdata", v.cdata), N(v, "onclosecdata"), v.cdata = "", v.state = I.TEXT) : U === "]" ? v.cdata += "]" : (v.cdata += "]]" + U, v.state = I.CDATA);
              continue;
            case I.PROC_INST:
              U === "?" ? v.state = I.PROC_INST_ENDING : h(U) ? v.state = I.PROC_INST_BODY : v.procInstName += U;
              continue;
            case I.PROC_INST_BODY:
              if (!v.procInstBody && h(U))
                continue;
              U === "?" ? v.state = I.PROC_INST_ENDING : v.procInstBody += U;
              continue;
            case I.PROC_INST_ENDING:
              U === ">" ? (N(v, "onprocessinginstruction", {
                name: v.procInstName,
                body: v.procInstBody
              }), v.procInstName = v.procInstBody = "", v.state = I.TEXT) : (v.procInstBody += "?" + U, v.state = I.PROC_INST_BODY);
              continue;
            case I.OPEN_TAG:
              B(c, U) ? v.tagName += U : (ne(v), U === ">" ? V(v) : U === "/" ? v.state = I.OPEN_TAG_SLASH : (h(U) || q(v, "Invalid character in tag name"), v.state = I.ATTRIB));
              continue;
            case I.OPEN_TAG_SLASH:
              U === ">" ? (V(v, !0), P(v)) : (q(v, "Forward-slash in opening tag not followed by >"), v.state = I.ATTRIB);
              continue;
            case I.ATTRIB:
              if (h(U))
                continue;
              U === ">" ? V(v) : U === "/" ? v.state = I.OPEN_TAG_SLASH : B(A, U) ? (v.attribName = U, v.attribValue = "", v.state = I.ATTRIB_NAME) : q(v, "Invalid attribute name");
              continue;
            case I.ATTRIB_NAME:
              U === "=" ? v.state = I.ATTRIB_VALUE : U === ">" ? (q(v, "Attribute without value"), v.attribValue = v.attribName, ce(v), V(v)) : h(U) ? v.state = I.ATTRIB_NAME_SAW_WHITE : B(c, U) ? v.attribName += U : q(v, "Invalid attribute name");
              continue;
            case I.ATTRIB_NAME_SAW_WHITE:
              if (U === "=")
                v.state = I.ATTRIB_VALUE;
              else {
                if (h(U))
                  continue;
                q(v, "Attribute without value"), v.tag.attributes[v.attribName] = "", v.attribValue = "", N(v, "onattribute", {
                  name: v.attribName,
                  value: ""
                }), v.attribName = "", U === ">" ? V(v) : B(A, U) ? (v.attribName = U, v.state = I.ATTRIB_NAME) : (q(v, "Invalid attribute name"), v.state = I.ATTRIB);
              }
              continue;
            case I.ATTRIB_VALUE:
              if (h(U))
                continue;
              T(U) ? (v.q = U, v.state = I.ATTRIB_VALUE_QUOTED) : (q(v, "Unquoted attribute value"), v.state = I.ATTRIB_VALUE_UNQUOTED, v.attribValue = U);
              continue;
            case I.ATTRIB_VALUE_QUOTED:
              if (U !== v.q) {
                U === "&" ? v.state = I.ATTRIB_VALUE_ENTITY_Q : v.attribValue += U;
                continue;
              }
              ce(v), v.q = "", v.state = I.ATTRIB_VALUE_CLOSED;
              continue;
            case I.ATTRIB_VALUE_CLOSED:
              h(U) ? v.state = I.ATTRIB : U === ">" ? V(v) : U === "/" ? v.state = I.OPEN_TAG_SLASH : B(A, U) ? (q(v, "No whitespace between attributes"), v.attribName = U, v.attribValue = "", v.state = I.ATTRIB_NAME) : q(v, "Invalid attribute name");
              continue;
            case I.ATTRIB_VALUE_UNQUOTED:
              if (!F(U)) {
                U === "&" ? v.state = I.ATTRIB_VALUE_ENTITY_U : v.attribValue += U;
                continue;
              }
              ce(v), U === ">" ? V(v) : v.state = I.ATTRIB;
              continue;
            case I.CLOSE_TAG:
              if (v.tagName)
                U === ">" ? P(v) : B(c, U) ? v.tagName += U : v.script ? (v.script += "</" + v.tagName, v.tagName = "", v.state = I.SCRIPT) : (h(U) || q(v, "Invalid tagname in closing tag"), v.state = I.CLOSE_TAG_SAW_WHITE);
              else {
                if (h(U))
                  continue;
                z(A, U) ? v.script ? (v.script += "</" + U, v.state = I.SCRIPT) : q(v, "Invalid tagname in closing tag.") : v.tagName = U;
              }
              continue;
            case I.CLOSE_TAG_SAW_WHITE:
              if (h(U))
                continue;
              U === ">" ? P(v) : q(v, "Invalid characters in closing tag");
              continue;
            case I.TEXT_ENTITY:
            case I.ATTRIB_VALUE_ENTITY_Q:
            case I.ATTRIB_VALUE_ENTITY_U:
              var J, d;
              switch (v.state) {
                case I.TEXT_ENTITY:
                  J = I.TEXT, d = "textNode";
                  break;
                case I.ATTRIB_VALUE_ENTITY_Q:
                  J = I.ATTRIB_VALUE_QUOTED, d = "attribValue";
                  break;
                case I.ATTRIB_VALUE_ENTITY_U:
                  J = I.ATTRIB_VALUE_UNQUOTED, d = "attribValue";
                  break;
              }
              U === ";" ? (v[d] += $(v), v.entity = "", v.state = J) : B(v.entity.length ? m : y, U) ? v.entity += U : (q(v, "Invalid character in entity name"), v[d] += "&" + v.entity + U, v.entity = "", v.state = J);
              continue;
            default:
              throw new Error(v, "Unknown state: " + v.state);
          }
        return v.position >= v.bufferCheckPosition && o(v), v;
      }
      String.fromCodePoint || function() {
        var x = String.fromCharCode, v = Math.floor, W = function() {
          var U = 16384, O = [], D, J, d = -1, Y = arguments.length;
          if (!Y)
            return "";
          for (var S = ""; ++d < Y; ) {
            var i = Number(arguments[d]);
            if (!isFinite(i) || // `NaN`, `+Infinity`, or `-Infinity`
            i < 0 || // not a valid Unicode code point
            i > 1114111 || // not a valid Unicode code point
            v(i) !== i)
              throw RangeError("Invalid code point: " + i);
            i <= 65535 ? O.push(i) : (i -= 65536, D = (i >> 10) + 55296, J = i % 1024 + 56320, O.push(D, J)), (d + 1 === Y || O.length > U) && (S += x.apply(null, O), O.length = 0);
          }
          return S;
        };
        Object.defineProperty ? Object.defineProperty(String, "fromCodePoint", {
          value: W,
          configurable: !0,
          writable: !0
        }) : String.fromCodePoint = W;
      }();
    })(r);
  }(br)), br;
}
var Un, vs;
function Di() {
  return vs || (vs = 1, Un = {
    isArray: function(r) {
      return Array.isArray ? Array.isArray(r) : Object.prototype.toString.call(r) === "[object Array]";
    }
  }), Un;
}
var Mn, bs;
function Bi() {
  if (bs) return Mn;
  bs = 1;
  var r = Di().isArray;
  return Mn = {
    copyOptions: function(e) {
      var t, s = {};
      for (t in e)
        e.hasOwnProperty(t) && (s[t] = e[t]);
      return s;
    },
    ensureFlagExists: function(e, t) {
      (!(e in t) || typeof t[e] != "boolean") && (t[e] = !1);
    },
    ensureSpacesExists: function(e) {
      (!("spaces" in e) || typeof e.spaces != "number" && typeof e.spaces != "string") && (e.spaces = 0);
    },
    ensureAlwaysArrayExists: function(e) {
      (!("alwaysArray" in e) || typeof e.alwaysArray != "boolean" && !r(e.alwaysArray)) && (e.alwaysArray = !1);
    },
    ensureKeyExists: function(e, t) {
      (!(e + "Key" in t) || typeof t[e + "Key"] != "string") && (t[e + "Key"] = t.compact ? "_" + e : e);
    },
    checkFnExists: function(e, t) {
      return e + "Fn" in t;
    }
  }, Mn;
}
var jn, _s;
function Io() {
  if (_s) return jn;
  _s = 1;
  var r = Hc(), e = Bi(), t = Di().isArray, s, o;
  function u(c) {
    return s = e.copyOptions(c), e.ensureFlagExists("ignoreDeclaration", s), e.ensureFlagExists("ignoreInstruction", s), e.ensureFlagExists("ignoreAttributes", s), e.ensureFlagExists("ignoreText", s), e.ensureFlagExists("ignoreComment", s), e.ensureFlagExists("ignoreCdata", s), e.ensureFlagExists("ignoreDoctype", s), e.ensureFlagExists("compact", s), e.ensureFlagExists("alwaysChildren", s), e.ensureFlagExists("addParent", s), e.ensureFlagExists("trim", s), e.ensureFlagExists("nativeType", s), e.ensureFlagExists("nativeTypeAttributes", s), e.ensureFlagExists("sanitize", s), e.ensureFlagExists("instructionHasAttributes", s), e.ensureFlagExists("captureSpacesBetweenElements", s), e.ensureAlwaysArrayExists(s), e.ensureKeyExists("declaration", s), e.ensureKeyExists("instruction", s), e.ensureKeyExists("attributes", s), e.ensureKeyExists("text", s), e.ensureKeyExists("comment", s), e.ensureKeyExists("cdata", s), e.ensureKeyExists("doctype", s), e.ensureKeyExists("type", s), e.ensureKeyExists("name", s), e.ensureKeyExists("elements", s), e.ensureKeyExists("parent", s), e.checkFnExists("doctype", s), e.checkFnExists("instruction", s), e.checkFnExists("cdata", s), e.checkFnExists("comment", s), e.checkFnExists("text", s), e.checkFnExists("instructionName", s), e.checkFnExists("elementName", s), e.checkFnExists("attributeName", s), e.checkFnExists("attributeValue", s), e.checkFnExists("attributes", s), s;
  }
  function l(c) {
    var y = Number(c);
    if (!isNaN(y))
      return y;
    var m = c.toLowerCase();
    return m === "true" ? !0 : m === "false" ? !1 : c;
  }
  function n(c, y) {
    var m;
    if (s.compact) {
      if (!o[s[c + "Key"]] && (t(s.alwaysArray) ? s.alwaysArray.indexOf(s[c + "Key"]) !== -1 : s.alwaysArray) && (o[s[c + "Key"]] = []), o[s[c + "Key"]] && !t(o[s[c + "Key"]]) && (o[s[c + "Key"]] = [o[s[c + "Key"]]]), c + "Fn" in s && typeof y == "string" && (y = s[c + "Fn"](y, o)), c === "instruction" && ("instructionFn" in s || "instructionNameFn" in s)) {
        for (m in y)
          if (y.hasOwnProperty(m))
            if ("instructionFn" in s)
              y[m] = s.instructionFn(y[m], m, o);
            else {
              var h = y[m];
              delete y[m], y[s.instructionNameFn(m, h, o)] = h;
            }
      }
      t(o[s[c + "Key"]]) ? o[s[c + "Key"]].push(y) : o[s[c + "Key"]] = y;
    } else {
      o[s.elementsKey] || (o[s.elementsKey] = []);
      var T = {};
      if (T[s.typeKey] = c, c === "instruction") {
        for (m in y)
          if (y.hasOwnProperty(m))
            break;
        T[s.nameKey] = "instructionNameFn" in s ? s.instructionNameFn(m, y, o) : m, s.instructionHasAttributes ? (T[s.attributesKey] = y[m][s.attributesKey], "instructionFn" in s && (T[s.attributesKey] = s.instructionFn(T[s.attributesKey], m, o))) : ("instructionFn" in s && (y[m] = s.instructionFn(y[m], m, o)), T[s.instructionKey] = y[m]);
      } else
        c + "Fn" in s && (y = s[c + "Fn"](y, o)), T[s[c + "Key"]] = y;
      s.addParent && (T[s.parentKey] = o), o[s.elementsKey].push(T);
    }
  }
  function f(c) {
    if ("attributesFn" in s && c && (c = s.attributesFn(c, o)), (s.trim || "attributeValueFn" in s || "attributeNameFn" in s || s.nativeTypeAttributes) && c) {
      var y;
      for (y in c)
        if (c.hasOwnProperty(y) && (s.trim && (c[y] = c[y].trim()), s.nativeTypeAttributes && (c[y] = l(c[y])), "attributeValueFn" in s && (c[y] = s.attributeValueFn(c[y], y, o)), "attributeNameFn" in s)) {
          var m = c[y];
          delete c[y], c[s.attributeNameFn(y, c[y], o)] = m;
        }
    }
    return c;
  }
  function g(c) {
    var y = {};
    if (c.body && (c.name.toLowerCase() === "xml" || s.instructionHasAttributes)) {
      for (var m = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\w+))\s*/g, h; (h = m.exec(c.body)) !== null; )
        y[h[1]] = h[2] || h[3] || h[4];
      y = f(y);
    }
    if (c.name.toLowerCase() === "xml") {
      if (s.ignoreDeclaration)
        return;
      o[s.declarationKey] = {}, Object.keys(y).length && (o[s.declarationKey][s.attributesKey] = y), s.addParent && (o[s.declarationKey][s.parentKey] = o);
    } else {
      if (s.ignoreInstruction)
        return;
      s.trim && (c.body = c.body.trim());
      var T = {};
      s.instructionHasAttributes && Object.keys(y).length ? (T[c.name] = {}, T[c.name][s.attributesKey] = y) : T[c.name] = c.body, n("instruction", T);
    }
  }
  function _(c, y) {
    var m;
    if (typeof c == "object" && (y = c.attributes, c = c.name), y = f(y), "elementNameFn" in s && (c = s.elementNameFn(c, o)), s.compact) {
      if (m = {}, !s.ignoreAttributes && y && Object.keys(y).length) {
        m[s.attributesKey] = {};
        var h;
        for (h in y)
          y.hasOwnProperty(h) && (m[s.attributesKey][h] = y[h]);
      }
      !(c in o) && (t(s.alwaysArray) ? s.alwaysArray.indexOf(c) !== -1 : s.alwaysArray) && (o[c] = []), o[c] && !t(o[c]) && (o[c] = [o[c]]), t(o[c]) ? o[c].push(m) : o[c] = m;
    } else
      o[s.elementsKey] || (o[s.elementsKey] = []), m = {}, m[s.typeKey] = "element", m[s.nameKey] = c, !s.ignoreAttributes && y && Object.keys(y).length && (m[s.attributesKey] = y), s.alwaysChildren && (m[s.elementsKey] = []), o[s.elementsKey].push(m);
    m[s.parentKey] = o, o = m;
  }
  function k(c) {
    s.ignoreText || !c.trim() && !s.captureSpacesBetweenElements || (s.trim && (c = c.trim()), s.nativeType && (c = l(c)), s.sanitize && (c = c.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")), n("text", c));
  }
  function R(c) {
    s.ignoreComment || (s.trim && (c = c.trim()), n("comment", c));
  }
  function E(c) {
    var y = o[s.parentKey];
    s.addParent || delete o[s.parentKey], o = y;
  }
  function C(c) {
    s.ignoreCdata || (s.trim && (c = c.trim()), n("cdata", c));
  }
  function w(c) {
    s.ignoreDoctype || (c = c.replace(/^ /, ""), s.trim && (c = c.trim()), n("doctype", c));
  }
  function A(c) {
    c.note = c;
  }
  return jn = function(c, y) {
    var m = r.parser(!0, {}), h = {};
    if (o = h, s = u(y), m.opt = { strictEntities: !0 }, m.onopentag = _, m.ontext = k, m.oncomment = R, m.onclosetag = E, m.onerror = A, m.oncdata = C, m.ondoctype = w, m.onprocessinginstruction = g, m.write(c).close(), h[s.elementsKey]) {
      var T = h[s.elementsKey];
      delete h[s.elementsKey], h[s.elementsKey] = T, delete h.text;
    }
    return h;
  }, jn;
}
var zn, Es;
function Kc() {
  if (Es) return zn;
  Es = 1;
  var r = Bi(), e = Io();
  function t(s) {
    var o = r.copyOptions(s);
    return r.ensureSpacesExists(o), o;
  }
  return zn = function(s, o) {
    var u, l, n, f;
    return u = t(o), l = e(s, u), f = "compact" in u && u.compact ? "_parent" : "parent", "addParent" in u && u.addParent ? n = JSON.stringify(l, function(g, _) {
      return g === f ? "_" : _;
    }, u.spaces) : n = JSON.stringify(l, null, u.spaces), n.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }, zn;
}
var Wn, xs;
function No() {
  if (xs) return Wn;
  xs = 1;
  var r = Bi(), e = Di().isArray, t, s;
  function o(m) {
    var h = r.copyOptions(m);
    return r.ensureFlagExists("ignoreDeclaration", h), r.ensureFlagExists("ignoreInstruction", h), r.ensureFlagExists("ignoreAttributes", h), r.ensureFlagExists("ignoreText", h), r.ensureFlagExists("ignoreComment", h), r.ensureFlagExists("ignoreCdata", h), r.ensureFlagExists("ignoreDoctype", h), r.ensureFlagExists("compact", h), r.ensureFlagExists("indentText", h), r.ensureFlagExists("indentCdata", h), r.ensureFlagExists("indentAttributes", h), r.ensureFlagExists("indentInstruction", h), r.ensureFlagExists("fullTagEmptyElement", h), r.ensureFlagExists("noQuotesForNativeAttributes", h), r.ensureSpacesExists(h), typeof h.spaces == "number" && (h.spaces = Array(h.spaces + 1).join(" ")), r.ensureKeyExists("declaration", h), r.ensureKeyExists("instruction", h), r.ensureKeyExists("attributes", h), r.ensureKeyExists("text", h), r.ensureKeyExists("comment", h), r.ensureKeyExists("cdata", h), r.ensureKeyExists("doctype", h), r.ensureKeyExists("type", h), r.ensureKeyExists("name", h), r.ensureKeyExists("elements", h), r.checkFnExists("doctype", h), r.checkFnExists("instruction", h), r.checkFnExists("cdata", h), r.checkFnExists("comment", h), r.checkFnExists("text", h), r.checkFnExists("instructionName", h), r.checkFnExists("elementName", h), r.checkFnExists("attributeName", h), r.checkFnExists("attributeValue", h), r.checkFnExists("attributes", h), r.checkFnExists("fullTagEmptyElement", h), h;
  }
  function u(m, h, T) {
    return (!T && m.spaces ? `
` : "") + Array(h + 1).join(m.spaces);
  }
  function l(m, h, T) {
    if (h.ignoreAttributes)
      return "";
    "attributesFn" in h && (m = h.attributesFn(m, s, t));
    var F, B, z, I, X = [];
    for (F in m)
      m.hasOwnProperty(F) && m[F] !== null && m[F] !== void 0 && (I = h.noQuotesForNativeAttributes && typeof m[F] != "string" ? "" : '"', B = "" + m[F], B = B.replace(/"/g, "&quot;"), z = "attributeNameFn" in h ? h.attributeNameFn(F, B, s, t) : F, X.push(h.spaces && h.indentAttributes ? u(h, T + 1, !1) : " "), X.push(z + "=" + I + ("attributeValueFn" in h ? h.attributeValueFn(B, F, s, t) : B) + I));
    return m && Object.keys(m).length && h.spaces && h.indentAttributes && X.push(u(h, T, !1)), X.join("");
  }
  function n(m, h, T) {
    return t = m, s = "xml", h.ignoreDeclaration ? "" : "<?xml" + l(m[h.attributesKey], h, T) + "?>";
  }
  function f(m, h, T) {
    if (h.ignoreInstruction)
      return "";
    var F;
    for (F in m)
      if (m.hasOwnProperty(F))
        break;
    var B = "instructionNameFn" in h ? h.instructionNameFn(F, m[F], s, t) : F;
    if (typeof m[F] == "object")
      return t = m, s = B, "<?" + B + l(m[F][h.attributesKey], h, T) + "?>";
    var z = m[F] ? m[F] : "";
    return "instructionFn" in h && (z = h.instructionFn(z, F, s, t)), "<?" + B + (z ? " " + z : "") + "?>";
  }
  function g(m, h) {
    return h.ignoreComment ? "" : "<!--" + ("commentFn" in h ? h.commentFn(m, s, t) : m) + "-->";
  }
  function _(m, h) {
    return h.ignoreCdata ? "" : "<![CDATA[" + ("cdataFn" in h ? h.cdataFn(m, s, t) : m.replace("]]>", "]]]]><![CDATA[>")) + "]]>";
  }
  function k(m, h) {
    return h.ignoreDoctype ? "" : "<!DOCTYPE " + ("doctypeFn" in h ? h.doctypeFn(m, s, t) : m) + ">";
  }
  function R(m, h) {
    return h.ignoreText ? "" : (m = "" + m, m = m.replace(/&amp;/g, "&"), m = m.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"), "textFn" in h ? h.textFn(m, s, t) : m);
  }
  function E(m, h) {
    var T;
    if (m.elements && m.elements.length)
      for (T = 0; T < m.elements.length; ++T)
        switch (m.elements[T][h.typeKey]) {
          case "text":
            if (h.indentText)
              return !0;
            break;
          case "cdata":
            if (h.indentCdata)
              return !0;
            break;
          case "instruction":
            if (h.indentInstruction)
              return !0;
            break;
          case "doctype":
          case "comment":
          case "element":
            return !0;
          default:
            return !0;
        }
    return !1;
  }
  function C(m, h, T) {
    t = m, s = m.name;
    var F = [], B = "elementNameFn" in h ? h.elementNameFn(m.name, m) : m.name;
    F.push("<" + B), m[h.attributesKey] && F.push(l(m[h.attributesKey], h, T));
    var z = m[h.elementsKey] && m[h.elementsKey].length || m[h.attributesKey] && m[h.attributesKey]["xml:space"] === "preserve";
    return z || ("fullTagEmptyElementFn" in h ? z = h.fullTagEmptyElementFn(m.name, m) : z = h.fullTagEmptyElement), z ? (F.push(">"), m[h.elementsKey] && m[h.elementsKey].length && (F.push(w(m[h.elementsKey], h, T + 1)), t = m, s = m.name), F.push(h.spaces && E(m, h) ? `
` + Array(T + 1).join(h.spaces) : ""), F.push("</" + B + ">")) : F.push("/>"), F.join("");
  }
  function w(m, h, T, F) {
    return m.reduce(function(B, z) {
      var I = u(h, T, F && !B);
      switch (z.type) {
        case "element":
          return B + I + C(z, h, T);
        case "comment":
          return B + I + g(z[h.commentKey], h);
        case "doctype":
          return B + I + k(z[h.doctypeKey], h);
        case "cdata":
          return B + (h.indentCdata ? I : "") + _(z[h.cdataKey], h);
        case "text":
          return B + (h.indentText ? I : "") + R(z[h.textKey], h);
        case "instruction":
          var X = {};
          return X[z[h.nameKey]] = z[h.attributesKey] ? z : z[h.instructionKey], B + (h.indentInstruction ? I : "") + f(X, h, T);
      }
    }, "");
  }
  function A(m, h, T) {
    var F;
    for (F in m)
      if (m.hasOwnProperty(F))
        switch (F) {
          case h.parentKey:
          case h.attributesKey:
            break;
          case h.textKey:
            if (h.indentText || T)
              return !0;
            break;
          case h.cdataKey:
            if (h.indentCdata || T)
              return !0;
            break;
          case h.instructionKey:
            if (h.indentInstruction || T)
              return !0;
            break;
          case h.doctypeKey:
          case h.commentKey:
            return !0;
          default:
            return !0;
        }
    return !1;
  }
  function c(m, h, T, F, B) {
    t = m, s = h;
    var z = "elementNameFn" in T ? T.elementNameFn(h, m) : h;
    if (typeof m > "u" || m === null || m === "")
      return "fullTagEmptyElementFn" in T && T.fullTagEmptyElementFn(h, m) || T.fullTagEmptyElement ? "<" + z + "></" + z + ">" : "<" + z + "/>";
    var I = [];
    if (h) {
      if (I.push("<" + z), typeof m != "object")
        return I.push(">" + R(m, T) + "</" + z + ">"), I.join("");
      m[T.attributesKey] && I.push(l(m[T.attributesKey], T, F));
      var X = A(m, T, !0) || m[T.attributesKey] && m[T.attributesKey]["xml:space"] === "preserve";
      if (X || ("fullTagEmptyElementFn" in T ? X = T.fullTagEmptyElementFn(h, m) : X = T.fullTagEmptyElement), X)
        I.push(">");
      else
        return I.push("/>"), I.join("");
    }
    return I.push(y(m, T, F + 1, !1)), t = m, s = h, h && I.push((B ? u(T, F, !1) : "") + "</" + z + ">"), I.join("");
  }
  function y(m, h, T, F) {
    var B, z, I, X = [];
    for (z in m)
      if (m.hasOwnProperty(z))
        for (I = e(m[z]) ? m[z] : [m[z]], B = 0; B < I.length; ++B) {
          switch (z) {
            case h.declarationKey:
              X.push(n(I[B], h, T));
              break;
            case h.instructionKey:
              X.push((h.indentInstruction ? u(h, T, F) : "") + f(I[B], h, T));
              break;
            case h.attributesKey:
            case h.parentKey:
              break;
            case h.textKey:
              X.push((h.indentText ? u(h, T, F) : "") + R(I[B], h));
              break;
            case h.cdataKey:
              X.push((h.indentCdata ? u(h, T, F) : "") + _(I[B], h));
              break;
            case h.doctypeKey:
              X.push(u(h, T, F) + k(I[B], h));
              break;
            case h.commentKey:
              X.push(u(h, T, F) + g(I[B], h));
              break;
            default:
              X.push(u(h, T, F) + c(I[B], z, h, T, A(I[B], h)));
          }
          F = F && !X.length;
        }
    return X.join("");
  }
  return Wn = function(m, h) {
    h = o(h);
    var T = [];
    return t = m, s = "_root_", h.compact ? T.push(y(m, h, 0, !0)) : (m[h.declarationKey] && T.push(n(m[h.declarationKey], h, 0)), m[h.elementsKey] && m[h.elementsKey].length && T.push(w(m[h.elementsKey], h, 0, !T.length))), T.join("");
  }, Wn;
}
var qn, Ss;
function Gc() {
  if (Ss) return qn;
  Ss = 1;
  var r = No();
  return qn = function(e, t) {
    e instanceof Buffer && (e = e.toString());
    var s = null;
    if (typeof e == "string")
      try {
        s = JSON.parse(e);
      } catch {
        throw new Error("The JSON structure is invalid");
      }
    else
      s = e;
    return r(s, t);
  }, qn;
}
var Hn, Ts;
function Vc() {
  if (Ts) return Hn;
  Ts = 1;
  var r = Io(), e = Kc(), t = No(), s = Gc();
  return Hn = {
    xml2js: r,
    xml2json: e,
    js2xml: t,
    json2xml: s
  }, Hn;
}
var Oo = Vc();
const Li = (r) => {
  switch (r.type) {
    case void 0:
    case "element":
      const e = new Xc(r.name, r.attributes), t = r.elements || [];
      for (const s of t) {
        const o = Li(s);
        o !== void 0 && e.push(o);
      }
      return e;
    case "text":
      return r.text;
    default:
      return;
  }
};
class $c extends ve {
  // noop
}
class Xc extends le {
  /**
   * Parses an XML string and converts it to an ImportedXmlComponent tree.
   *
   * This static method is the primary way to import external XML content.
   * It uses xml-js to parse the XML string into a JSON representation,
   * then converts that into a tree of XmlComponent objects.
   *
   * @param importedContent - The XML content as a string
   * @returns An ImportedXmlComponent representing the parsed XML
   *
   * @example
   * ```typescript
   * const xml = '<w:p><w:r><w:t>Hello</w:t></w:r></w:p>';
   * const component = ImportedXmlComponent.fromXmlString(xml);
   * ```
   */
  static fromXmlString(e) {
    const t = Oo.xml2js(e, { compact: !1 });
    return Li(t);
  }
  /**
   * Creates an ImportedXmlComponent.
   *
   * @param rootKey - The XML element name
   * @param _attr - Optional attributes for the root element
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(e, t) {
    super(e), t && this.root.push(new $c(t));
  }
  /**
   * Adds a child component or text to this element.
   *
   * @param xmlComponent - The child component or text string to add
   */
  push(e) {
    this.root.push(e);
  }
}
class Zc extends le {
  /**
   * Creates an ImportedRootElementAttributes component.
   *
   * @param _attr - The attributes object to pass through
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(e) {
    super(""), this._attr = e;
  }
  /**
   * Prepares the attributes for XML serialization.
   *
   * @param _ - Context (unused)
   * @returns Object with _attr key containing the raw attributes
   */
  prepForXml(e) {
    return {
      _attr: this._attr
    };
  }
}
class Po extends le {
  /**
   * Creates a new InitializableXmlComponent.
   *
   * @param rootKey - The XML element name
   * @param initComponent - Optional component to copy children from
   */
  constructor(e, t) {
    super(e), t && (this.root = t.root);
  }
}
const Oe = (r) => {
  if (isNaN(r))
    throw new Error(`Invalid value '${r}' specified. Must be an integer.`);
  return Math.floor(r);
}, mr = (r) => {
  const e = Oe(r);
  if (e < 0)
    throw new Error(`Invalid value '${r}' specified. Must be a positive integer.`);
  return e;
}, Fo = (r, e) => {
  const t = e * 2;
  if (r.length !== t || isNaN(+`0x${r}`))
    throw new Error(`Invalid hex value '${r}'. Expected ${t} digit hex value`);
  return r;
}, As = (r) => Fo(r, 1), Do = (r) => {
  const e = r.slice(-2), t = r.substring(0, r.length - 2);
  return `${Number(t)}${e}`;
}, Bo = (r) => {
  const e = Do(r);
  if (parseFloat(e) < 0)
    throw new Error(`Invalid value '${e}' specified. Expected a positive number.`);
  return e;
}, bt = (r) => {
  if (r === "auto")
    return r;
  const e = r.charAt(0) === "#" ? r.substring(1) : r;
  return Fo(e, 3);
}, ct = (r) => typeof r == "string" ? Do(r) : Oe(r), Yc = (r) => typeof r == "string" ? Bo(r) : mr(r), Le = (r) => typeof r == "string" ? Bo(r) : mr(r), Jc = mr, Qc = mr, el = (r) => r.toISOString();
class ue extends le {
  /**
   * Creates an OnOffElement.
   *
   * @param name - The XML element name (e.g., "w:b", "w:i")
   * @param val - The boolean value (defaults to true)
   */
  constructor(e, t = !0) {
    super(e), t !== !0 && this.root.push(new Ie({ val: t }));
  }
}
class Kn extends le {
  /**
   * Creates an HpsMeasureElement.
   *
   * @param name - The XML element name
   * @param val - The measurement value (number in half-points or string with units)
   */
  constructor(e, t) {
    super(e), this.root.push(new Ie({ val: Yc(t) }));
  }
}
class tl extends le {
}
class gt extends le {
  /**
   * Creates a StringValueElement.
   *
   * @param name - The XML element name
   * @param val - The string value
   */
  constructor(e, t) {
    super(e), this.root.push(new Ie({ val: t }));
  }
}
const Ct = (r, e) => new we({
  name: r,
  attributes: {
    value: { key: "w:val", value: e }
  }
});
class Dt extends le {
  /**
   * Creates a NumberValueElement.
   *
   * @param name - The XML element name
   * @param val - The numeric value
   */
  constructor(e, t) {
    super(e), this.root.push(new Ie({ val: t }));
  }
}
class at extends le {
  /**
   * Creates a StringContainer.
   *
   * @param name - The XML element name
   * @param val - The text content
   */
  constructor(e, t) {
    super(e), this.root.push(t);
  }
}
class we extends le {
  /**
   * Creates a BuilderElement with the specified configuration.
   *
   * @param config - Element configuration
   * @param config.name - The XML element name
   * @param config.attributes - Optional attributes with explicit key-value pairs
   * @param config.children - Optional child elements
   */
  constructor({
    name: e,
    attributes: t,
    children: s
  }) {
    super(e), t && this.root.push(new Yu(t)), s && this.root.push(...s);
  }
}
const ze = {
  /** Align Start */
  START: "start",
  /** Align Left */
  LEFT: "left"
}, rl = (r) => new we({
  name: "w:jc",
  attributes: {
    val: { key: "w:val", value: r }
  }
}), Re = (r, { color: e, size: t, space: s, style: o }) => new we({
  name: r,
  attributes: {
    style: { key: "w:val", value: o },
    color: { key: "w:color", value: e === void 0 ? void 0 : bt(e) },
    size: { key: "w:sz", value: t === void 0 ? void 0 : Jc(t) },
    space: { key: "w:space", value: s === void 0 ? void 0 : Qc(s) }
  }
}), Ui = {
  /** a single line */
  SINGLE: "single",
  /** no border */
  NONE: "none"
};
class nl extends fr {
  constructor(e) {
    super("w:pBdr"), e.top && this.root.push(Re("w:top", e.top)), e.bottom && this.root.push(Re("w:bottom", e.bottom)), e.left && this.root.push(Re("w:left", e.left)), e.right && this.root.push(Re("w:right", e.right)), e.between && this.root.push(Re("w:between", e.between));
  }
}
class il extends le {
  constructor() {
    super("w:pBdr");
    const e = Re("w:bottom", {
      color: "auto",
      space: 1,
      style: Ui.SINGLE,
      size: 6
    });
    this.root.push(e);
  }
}
const al = ({ start: r, end: e, left: t, right: s, hanging: o, firstLine: u }) => new we({
  name: "w:ind",
  attributes: {
    start: { key: "w:start", value: r === void 0 ? void 0 : ct(r) },
    end: { key: "w:end", value: e === void 0 ? void 0 : ct(e) },
    left: { key: "w:left", value: t === void 0 ? void 0 : ct(t) },
    right: { key: "w:right", value: s === void 0 ? void 0 : ct(s) },
    hanging: { key: "w:hanging", value: o === void 0 ? void 0 : Le(o) },
    firstLine: { key: "w:firstLine", value: u === void 0 ? void 0 : Le(u) }
  }
}), sl = () => new we({
  name: "w:br"
}), Mi = {
  BEGIN: "begin",
  END: "end",
  SEPARATE: "separate"
}, ji = (r, e) => new we({
  name: "w:fldChar",
  attributes: {
    type: { key: "w:fldCharType", value: r },
    dirty: { key: "w:dirty", value: e }
  }
}), er = (r) => ji(Mi.BEGIN, r), tr = (r) => ji(Mi.SEPARATE, r), rr = (r) => ji(Mi.END, r), _t = {
  DEFAULT: "default",
  PRESERVE: "preserve"
};
class Et extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", { space: "xml:space" });
  }
}
class ol extends le {
  constructor() {
    super("w:instrText"), this.root.push(new Et({ space: _t.PRESERVE })), this.root.push("PAGE");
  }
}
class ul extends le {
  constructor() {
    super("w:instrText"), this.root.push(new Et({ space: _t.PRESERVE })), this.root.push("NUMPAGES");
  }
}
class cl extends le {
  constructor() {
    super("w:instrText"), this.root.push(new Et({ space: _t.PRESERVE })), this.root.push("SECTIONPAGES");
  }
}
class ll extends le {
  constructor() {
    super("w:instrText"), this.root.push(new Et({ space: _t.PRESERVE })), this.root.push("SECTION");
  }
}
const Lo = ({ fill: r, color: e, type: t }) => new we({
  name: "w:shd",
  attributes: {
    fill: { key: "w:fill", value: r === void 0 ? void 0 : bt(r) },
    color: { key: "w:color", value: e === void 0 ? void 0 : bt(e) },
    type: { key: "w:val", value: t }
  }
});
class Wt extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      id: "w:id",
      author: "w:author",
      date: "w:date"
    });
  }
}
class fl extends le {
  constructor(e) {
    super("w:del"), this.root.push(
      new Wt({
        id: e.id,
        author: e.author,
        date: e.date
      })
    );
  }
}
class hl extends le {
  constructor(e) {
    super("w:ins"), this.root.push(
      new Wt({
        id: e.id,
        author: e.author,
        date: e.date
      })
    );
  }
}
const dl = {
  /** Dot emphasis mark */
  DOT: "dot"
}, pl = (r = dl.DOT) => new we({
  name: "w:em",
  attributes: {
    val: { key: "w:val", value: r }
  }
});
class ml extends le {
  constructor(e) {
    super("w:spacing"), this.root.push(
      new Ie({
        val: ct(e)
      })
    );
  }
}
class gl extends le {
  constructor(e) {
    super("w:color"), this.root.push(
      new Ie({
        val: bt(e)
      })
    );
  }
}
class wl extends le {
  constructor(e) {
    super("w:highlight"), this.root.push(
      new Ie({
        val: e
      })
    );
  }
}
class yl extends le {
  constructor(e) {
    super("w:highlightCs"), this.root.push(
      new Ie({
        val: e
      })
    );
  }
}
const vl = (r) => new we({
  name: "w:lang",
  attributes: {
    value: {
      key: "w:val",
      value: r.value
    },
    eastAsia: {
      key: "w:eastAsia",
      value: r.eastAsia
    },
    bidirectional: {
      key: "w:bidi",
      value: r.bidirectional
    }
  }
}), Gn = (r, e) => {
  if (typeof r == "string") {
    const s = r;
    return new we({
      name: "w:rFonts",
      attributes: {
        ascii: { key: "w:ascii", value: s },
        cs: { key: "w:cs", value: s },
        eastAsia: { key: "w:eastAsia", value: s },
        hAnsi: { key: "w:hAnsi", value: s },
        hint: { key: "w:hint", value: e }
      }
    });
  }
  const t = r;
  return new we({
    name: "w:rFonts",
    attributes: {
      ascii: { key: "w:ascii", value: t.ascii },
      cs: { key: "w:cs", value: t.cs },
      eastAsia: { key: "w:eastAsia", value: t.eastAsia },
      hAnsi: { key: "w:hAnsi", value: t.hAnsi },
      hint: { key: "w:hint", value: t.hint }
    }
  });
}, Uo = (r) => new we({
  name: "w:vertAlign",
  attributes: {
    val: { key: "w:val", value: r }
  }
}), bl = () => Uo("superscript"), _l = () => Uo("subscript"), Mo = {
  /** Single underline */
  SINGLE: "single"
}, El = (r = Mo.SINGLE, e) => new we({
  name: "w:u",
  attributes: {
    val: { key: "w:val", value: r },
    color: { key: "w:color", value: e === void 0 ? void 0 : bt(e) }
  }
});
class ft extends fr {
  constructor(e) {
    var t, s;
    if (super("w:rPr"), !e)
      return;
    e.style && this.push(new gt("w:rStyle", e.style)), e.font && (typeof e.font == "string" ? this.push(Gn(e.font)) : "name" in e.font ? this.push(Gn(e.font.name, e.font.hint)) : this.push(Gn(e.font))), e.bold !== void 0 && this.push(new ue("w:b", e.bold)), (e.boldComplexScript === void 0 && e.bold !== void 0 || e.boldComplexScript) && this.push(new ue("w:bCs", (t = e.boldComplexScript) != null ? t : e.bold)), e.italics !== void 0 && this.push(new ue("w:i", e.italics)), (e.italicsComplexScript === void 0 && e.italics !== void 0 || e.italicsComplexScript) && this.push(new ue("w:iCs", (s = e.italicsComplexScript) != null ? s : e.italics)), e.smallCaps !== void 0 ? this.push(new ue("w:smallCaps", e.smallCaps)) : e.allCaps !== void 0 && this.push(new ue("w:caps", e.allCaps)), e.strike !== void 0 && this.push(new ue("w:strike", e.strike)), e.doubleStrike !== void 0 && this.push(new ue("w:dstrike", e.doubleStrike)), e.emboss !== void 0 && this.push(new ue("w:emboss", e.emboss)), e.imprint !== void 0 && this.push(new ue("w:imprint", e.imprint)), e.noProof !== void 0 && this.push(new ue("w:noProof", e.noProof)), e.snapToGrid !== void 0 && this.push(new ue("w:snapToGrid", e.snapToGrid)), e.vanish && this.push(new ue("w:vanish", e.vanish)), e.color && this.push(new gl(e.color)), e.characterSpacing && this.push(new ml(e.characterSpacing)), e.scale !== void 0 && this.push(new Dt("w:w", e.scale)), e.kern && this.push(new Kn("w:kern", e.kern)), e.position && this.push(new gt("w:position", e.position)), e.size !== void 0 && this.push(new Kn("w:sz", e.size));
    const o = e.sizeComplexScript === void 0 || e.sizeComplexScript === !0 ? e.size : e.sizeComplexScript;
    o && this.push(new Kn("w:szCs", o)), e.highlight && this.push(new wl(e.highlight));
    const u = e.highlightComplexScript === void 0 || e.highlightComplexScript === !0 ? e.highlight : e.highlightComplexScript;
    u && this.push(new yl(u)), e.underline && this.push(El(e.underline.type, e.underline.color)), e.effect && this.push(new gt("w:effect", e.effect)), e.border && this.push(Re("w:bdr", e.border)), e.shading && this.push(Lo(e.shading)), e.subScript && this.push(_l()), e.superScript && this.push(bl()), e.rightToLeft !== void 0 && this.push(new ue("w:rtl", e.rightToLeft)), e.emphasisMark && this.push(pl(e.emphasisMark.type)), e.language && this.push(vl(e.language)), e.specVanish && this.push(new ue("w:specVanish", e.vanish)), e.math && this.push(new ue("w:oMath", e.math)), e.revision && this.push(new Sl(e.revision));
  }
  push(e) {
    this.root.push(e);
  }
}
class xl extends ft {
  constructor(e) {
    super(e), e != null && e.insertion && this.push(new hl(e.insertion)), e != null && e.deletion && this.push(new fl(e.deletion));
  }
}
class Sl extends le {
  constructor(e) {
    super("w:rPrChange"), this.root.push(
      new Wt({
        id: e.id,
        author: e.author,
        date: e.date
      })
    ), this.addChildElement(new ft(e));
  }
}
class ks extends le {
  constructor(e) {
    var t;
    super("w:t"), typeof e == "string" ? (this.root.push(new Et({ space: _t.PRESERVE })), this.root.push(e)) : (this.root.push(new Et({ space: (t = e.space) != null ? t : _t.DEFAULT })), this.root.push(e.text));
  }
}
const nr = {
  /** Inserts the current page number */
  CURRENT: "CURRENT",
  /** Inserts the total number of pages in the document */
  TOTAL_PAGES: "TOTAL_PAGES",
  /** Inserts the total number of pages in the current section */
  TOTAL_PAGES_IN_SECTION: "TOTAL_PAGES_IN_SECTION",
  /** Inserts the current section number */
  CURRENT_SECTION: "SECTION"
};
class qt extends le {
  constructor(e) {
    if (super("w:r"), se(this, "properties"), this.properties = new ft(e), this.root.push(this.properties), e.break)
      for (let t = 0; t < e.break; t++)
        this.root.push(sl());
    if (e.children)
      for (const t of e.children) {
        if (typeof t == "string") {
          switch (t) {
            case nr.CURRENT:
              this.root.push(er()), this.root.push(new ol()), this.root.push(tr()), this.root.push(rr());
              break;
            case nr.TOTAL_PAGES:
              this.root.push(er()), this.root.push(new ul()), this.root.push(tr()), this.root.push(rr());
              break;
            case nr.TOTAL_PAGES_IN_SECTION:
              this.root.push(er()), this.root.push(new cl()), this.root.push(tr()), this.root.push(rr());
              break;
            case nr.CURRENT_SECTION:
              this.root.push(er()), this.root.push(new ll()), this.root.push(tr()), this.root.push(rr());
              break;
            default:
              this.root.push(new ks(t));
              break;
          }
          continue;
        }
        this.root.push(t);
      }
    else e.text !== void 0 && this.root.push(new ks(e.text));
  }
}
class Ut extends qt {
  constructor(e) {
    super(typeof e == "string" ? { text: e } : e);
  }
}
var Vn = {}, _e = {}, $n, Rs;
function Ht() {
  if (Rs) return $n;
  Rs = 1, $n = r;
  function r(e, t) {
    if (!e)
      throw new Error(t || "Assertion failed");
  }
  return r.equal = function(t, s, o) {
    if (t != s)
      throw new Error(o || "Assertion failed: " + t + " != " + s);
  }, $n;
}
var Cs;
function He() {
  if (Cs) return _e;
  Cs = 1;
  var r = Ht(), e = rt();
  _e.inherits = e;
  function t(N, M) {
    return (N.charCodeAt(M) & 64512) !== 55296 || M < 0 || M + 1 >= N.length ? !1 : (N.charCodeAt(M + 1) & 64512) === 56320;
  }
  function s(N, M) {
    if (Array.isArray(N))
      return N.slice();
    if (!N)
      return [];
    var b = [];
    if (typeof N == "string")
      if (M) {
        if (M === "hex")
          for (N = N.replace(/[^a-z0-9]+/ig, ""), N.length % 2 !== 0 && (N = "0" + N), ee = 0; ee < N.length; ee += 2)
            b.push(parseInt(N[ee] + N[ee + 1], 16));
      } else for (var G = 0, ee = 0; ee < N.length; ee++) {
        var q = N.charCodeAt(ee);
        q < 128 ? b[G++] = q : q < 2048 ? (b[G++] = q >> 6 | 192, b[G++] = q & 63 | 128) : t(N, ee) ? (q = 65536 + ((q & 1023) << 10) + (N.charCodeAt(++ee) & 1023), b[G++] = q >> 18 | 240, b[G++] = q >> 12 & 63 | 128, b[G++] = q >> 6 & 63 | 128, b[G++] = q & 63 | 128) : (b[G++] = q >> 12 | 224, b[G++] = q >> 6 & 63 | 128, b[G++] = q & 63 | 128);
      }
    else
      for (ee = 0; ee < N.length; ee++)
        b[ee] = N[ee] | 0;
    return b;
  }
  _e.toArray = s;
  function o(N) {
    for (var M = "", b = 0; b < N.length; b++)
      M += n(N[b].toString(16));
    return M;
  }
  _e.toHex = o;
  function u(N) {
    var M = N >>> 24 | N >>> 8 & 65280 | N << 8 & 16711680 | (N & 255) << 24;
    return M >>> 0;
  }
  _e.htonl = u;
  function l(N, M) {
    for (var b = "", G = 0; G < N.length; G++) {
      var ee = N[G];
      M === "little" && (ee = u(ee)), b += f(ee.toString(16));
    }
    return b;
  }
  _e.toHex32 = l;
  function n(N) {
    return N.length === 1 ? "0" + N : N;
  }
  _e.zero2 = n;
  function f(N) {
    return N.length === 7 ? "0" + N : N.length === 6 ? "00" + N : N.length === 5 ? "000" + N : N.length === 4 ? "0000" + N : N.length === 3 ? "00000" + N : N.length === 2 ? "000000" + N : N.length === 1 ? "0000000" + N : N;
  }
  _e.zero8 = f;
  function g(N, M, b, G) {
    var ee = b - M;
    r(ee % 4 === 0);
    for (var q = new Array(ee / 4), ne = 0, Q = M; ne < q.length; ne++, Q += 4) {
      var ce;
      G === "big" ? ce = N[Q] << 24 | N[Q + 1] << 16 | N[Q + 2] << 8 | N[Q + 3] : ce = N[Q + 3] << 24 | N[Q + 2] << 16 | N[Q + 1] << 8 | N[Q], q[ne] = ce >>> 0;
    }
    return q;
  }
  _e.join32 = g;
  function _(N, M) {
    for (var b = new Array(N.length * 4), G = 0, ee = 0; G < N.length; G++, ee += 4) {
      var q = N[G];
      M === "big" ? (b[ee] = q >>> 24, b[ee + 1] = q >>> 16 & 255, b[ee + 2] = q >>> 8 & 255, b[ee + 3] = q & 255) : (b[ee + 3] = q >>> 24, b[ee + 2] = q >>> 16 & 255, b[ee + 1] = q >>> 8 & 255, b[ee] = q & 255);
    }
    return b;
  }
  _e.split32 = _;
  function k(N, M) {
    return N >>> M | N << 32 - M;
  }
  _e.rotr32 = k;
  function R(N, M) {
    return N << M | N >>> 32 - M;
  }
  _e.rotl32 = R;
  function E(N, M) {
    return N + M >>> 0;
  }
  _e.sum32 = E;
  function C(N, M, b) {
    return N + M + b >>> 0;
  }
  _e.sum32_3 = C;
  function w(N, M, b, G) {
    return N + M + b + G >>> 0;
  }
  _e.sum32_4 = w;
  function A(N, M, b, G, ee) {
    return N + M + b + G + ee >>> 0;
  }
  _e.sum32_5 = A;
  function c(N, M, b, G) {
    var ee = N[M], q = N[M + 1], ne = G + q >>> 0, Q = (ne < G ? 1 : 0) + b + ee;
    N[M] = Q >>> 0, N[M + 1] = ne;
  }
  _e.sum64 = c;
  function y(N, M, b, G) {
    var ee = M + G >>> 0, q = (ee < M ? 1 : 0) + N + b;
    return q >>> 0;
  }
  _e.sum64_hi = y;
  function m(N, M, b, G) {
    var ee = M + G;
    return ee >>> 0;
  }
  _e.sum64_lo = m;
  function h(N, M, b, G, ee, q, ne, Q) {
    var ce = 0, V = M;
    V = V + G >>> 0, ce += V < M ? 1 : 0, V = V + q >>> 0, ce += V < q ? 1 : 0, V = V + Q >>> 0, ce += V < Q ? 1 : 0;
    var P = N + b + ee + ne + ce;
    return P >>> 0;
  }
  _e.sum64_4_hi = h;
  function T(N, M, b, G, ee, q, ne, Q) {
    var ce = M + G + q + Q;
    return ce >>> 0;
  }
  _e.sum64_4_lo = T;
  function F(N, M, b, G, ee, q, ne, Q, ce, V) {
    var P = 0, $ = M;
    $ = $ + G >>> 0, P += $ < M ? 1 : 0, $ = $ + q >>> 0, P += $ < q ? 1 : 0, $ = $ + Q >>> 0, P += $ < Q ? 1 : 0, $ = $ + V >>> 0, P += $ < V ? 1 : 0;
    var Z = N + b + ee + ne + ce + P;
    return Z >>> 0;
  }
  _e.sum64_5_hi = F;
  function B(N, M, b, G, ee, q, ne, Q, ce, V) {
    var P = M + G + q + Q + V;
    return P >>> 0;
  }
  _e.sum64_5_lo = B;
  function z(N, M, b) {
    var G = M << 32 - b | N >>> b;
    return G >>> 0;
  }
  _e.rotr64_hi = z;
  function I(N, M, b) {
    var G = N << 32 - b | M >>> b;
    return G >>> 0;
  }
  _e.rotr64_lo = I;
  function X(N, M, b) {
    return N >>> b;
  }
  _e.shr64_hi = X;
  function oe(N, M, b) {
    var G = N << 32 - b | M >>> b;
    return G >>> 0;
  }
  return _e.shr64_lo = oe, _e;
}
var Xn = {}, Is;
function Kt() {
  if (Is) return Xn;
  Is = 1;
  var r = He(), e = Ht();
  function t() {
    this.pending = null, this.pendingTotal = 0, this.blockSize = this.constructor.blockSize, this.outSize = this.constructor.outSize, this.hmacStrength = this.constructor.hmacStrength, this.padLength = this.constructor.padLength / 8, this.endian = "big", this._delta8 = this.blockSize / 8, this._delta32 = this.blockSize / 32;
  }
  return Xn.BlockHash = t, t.prototype.update = function(o, u) {
    if (o = r.toArray(o, u), this.pending ? this.pending = this.pending.concat(o) : this.pending = o, this.pendingTotal += o.length, this.pending.length >= this._delta8) {
      o = this.pending;
      var l = o.length % this._delta8;
      this.pending = o.slice(o.length - l, o.length), this.pending.length === 0 && (this.pending = null), o = r.join32(o, 0, o.length - l, this.endian);
      for (var n = 0; n < o.length; n += this._delta32)
        this._update(o, n, n + this._delta32);
    }
    return this;
  }, t.prototype.digest = function(o) {
    return this.update(this._pad()), e(this.pending === null), this._digest(o);
  }, t.prototype._pad = function() {
    var o = this.pendingTotal, u = this._delta8, l = u - (o + this.padLength) % u, n = new Array(l + this.padLength);
    n[0] = 128;
    for (var f = 1; f < l; f++)
      n[f] = 0;
    if (o <<= 3, this.endian === "big") {
      for (var g = 8; g < this.padLength; g++)
        n[f++] = 0;
      n[f++] = 0, n[f++] = 0, n[f++] = 0, n[f++] = 0, n[f++] = o >>> 24 & 255, n[f++] = o >>> 16 & 255, n[f++] = o >>> 8 & 255, n[f++] = o & 255;
    } else
      for (n[f++] = o & 255, n[f++] = o >>> 8 & 255, n[f++] = o >>> 16 & 255, n[f++] = o >>> 24 & 255, n[f++] = 0, n[f++] = 0, n[f++] = 0, n[f++] = 0, g = 8; g < this.padLength; g++)
        n[f++] = 0;
    return n;
  }, Xn;
}
var st = {}, je = {}, Ns;
function jo() {
  if (Ns) return je;
  Ns = 1;
  var r = He(), e = r.rotr32;
  function t(_, k, R, E) {
    if (_ === 0)
      return s(k, R, E);
    if (_ === 1 || _ === 3)
      return u(k, R, E);
    if (_ === 2)
      return o(k, R, E);
  }
  je.ft_1 = t;
  function s(_, k, R) {
    return _ & k ^ ~_ & R;
  }
  je.ch32 = s;
  function o(_, k, R) {
    return _ & k ^ _ & R ^ k & R;
  }
  je.maj32 = o;
  function u(_, k, R) {
    return _ ^ k ^ R;
  }
  je.p32 = u;
  function l(_) {
    return e(_, 2) ^ e(_, 13) ^ e(_, 22);
  }
  je.s0_256 = l;
  function n(_) {
    return e(_, 6) ^ e(_, 11) ^ e(_, 25);
  }
  je.s1_256 = n;
  function f(_) {
    return e(_, 7) ^ e(_, 18) ^ _ >>> 3;
  }
  je.g0_256 = f;
  function g(_) {
    return e(_, 17) ^ e(_, 19) ^ _ >>> 10;
  }
  return je.g1_256 = g, je;
}
var Zn, Os;
function Tl() {
  if (Os) return Zn;
  Os = 1;
  var r = He(), e = Kt(), t = jo(), s = r.rotl32, o = r.sum32, u = r.sum32_5, l = t.ft_1, n = e.BlockHash, f = [
    1518500249,
    1859775393,
    2400959708,
    3395469782
  ];
  function g() {
    if (!(this instanceof g))
      return new g();
    n.call(this), this.h = [
      1732584193,
      4023233417,
      2562383102,
      271733878,
      3285377520
    ], this.W = new Array(80);
  }
  return r.inherits(g, n), Zn = g, g.blockSize = 512, g.outSize = 160, g.hmacStrength = 80, g.padLength = 64, g.prototype._update = function(k, R) {
    for (var E = this.W, C = 0; C < 16; C++)
      E[C] = k[R + C];
    for (; C < E.length; C++)
      E[C] = s(E[C - 3] ^ E[C - 8] ^ E[C - 14] ^ E[C - 16], 1);
    var w = this.h[0], A = this.h[1], c = this.h[2], y = this.h[3], m = this.h[4];
    for (C = 0; C < E.length; C++) {
      var h = ~~(C / 20), T = u(s(w, 5), l(h, A, c, y), m, E[C], f[h]);
      m = y, y = c, c = s(A, 30), A = w, w = T;
    }
    this.h[0] = o(this.h[0], w), this.h[1] = o(this.h[1], A), this.h[2] = o(this.h[2], c), this.h[3] = o(this.h[3], y), this.h[4] = o(this.h[4], m);
  }, g.prototype._digest = function(k) {
    return k === "hex" ? r.toHex32(this.h, "big") : r.split32(this.h, "big");
  }, Zn;
}
var Yn, Ps;
function zo() {
  if (Ps) return Yn;
  Ps = 1;
  var r = He(), e = Kt(), t = jo(), s = Ht(), o = r.sum32, u = r.sum32_4, l = r.sum32_5, n = t.ch32, f = t.maj32, g = t.s0_256, _ = t.s1_256, k = t.g0_256, R = t.g1_256, E = e.BlockHash, C = [
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ];
  function w() {
    if (!(this instanceof w))
      return new w();
    E.call(this), this.h = [
      1779033703,
      3144134277,
      1013904242,
      2773480762,
      1359893119,
      2600822924,
      528734635,
      1541459225
    ], this.k = C, this.W = new Array(64);
  }
  return r.inherits(w, E), Yn = w, w.blockSize = 512, w.outSize = 256, w.hmacStrength = 192, w.padLength = 64, w.prototype._update = function(c, y) {
    for (var m = this.W, h = 0; h < 16; h++)
      m[h] = c[y + h];
    for (; h < m.length; h++)
      m[h] = u(R(m[h - 2]), m[h - 7], k(m[h - 15]), m[h - 16]);
    var T = this.h[0], F = this.h[1], B = this.h[2], z = this.h[3], I = this.h[4], X = this.h[5], oe = this.h[6], N = this.h[7];
    for (s(this.k.length === m.length), h = 0; h < m.length; h++) {
      var M = l(N, _(I), n(I, X, oe), this.k[h], m[h]), b = o(g(T), f(T, F, B));
      N = oe, oe = X, X = I, I = o(z, M), z = B, B = F, F = T, T = o(M, b);
    }
    this.h[0] = o(this.h[0], T), this.h[1] = o(this.h[1], F), this.h[2] = o(this.h[2], B), this.h[3] = o(this.h[3], z), this.h[4] = o(this.h[4], I), this.h[5] = o(this.h[5], X), this.h[6] = o(this.h[6], oe), this.h[7] = o(this.h[7], N);
  }, w.prototype._digest = function(c) {
    return c === "hex" ? r.toHex32(this.h, "big") : r.split32(this.h, "big");
  }, Yn;
}
var Jn, Fs;
function Al() {
  if (Fs) return Jn;
  Fs = 1;
  var r = He(), e = zo();
  function t() {
    if (!(this instanceof t))
      return new t();
    e.call(this), this.h = [
      3238371032,
      914150663,
      812702999,
      4144912697,
      4290775857,
      1750603025,
      1694076839,
      3204075428
    ];
  }
  return r.inherits(t, e), Jn = t, t.blockSize = 512, t.outSize = 224, t.hmacStrength = 192, t.padLength = 64, t.prototype._digest = function(o) {
    return o === "hex" ? r.toHex32(this.h.slice(0, 7), "big") : r.split32(this.h.slice(0, 7), "big");
  }, Jn;
}
var Qn, Ds;
function Wo() {
  if (Ds) return Qn;
  Ds = 1;
  var r = He(), e = Kt(), t = Ht(), s = r.rotr64_hi, o = r.rotr64_lo, u = r.shr64_hi, l = r.shr64_lo, n = r.sum64, f = r.sum64_hi, g = r.sum64_lo, _ = r.sum64_4_hi, k = r.sum64_4_lo, R = r.sum64_5_hi, E = r.sum64_5_lo, C = e.BlockHash, w = [
    1116352408,
    3609767458,
    1899447441,
    602891725,
    3049323471,
    3964484399,
    3921009573,
    2173295548,
    961987163,
    4081628472,
    1508970993,
    3053834265,
    2453635748,
    2937671579,
    2870763221,
    3664609560,
    3624381080,
    2734883394,
    310598401,
    1164996542,
    607225278,
    1323610764,
    1426881987,
    3590304994,
    1925078388,
    4068182383,
    2162078206,
    991336113,
    2614888103,
    633803317,
    3248222580,
    3479774868,
    3835390401,
    2666613458,
    4022224774,
    944711139,
    264347078,
    2341262773,
    604807628,
    2007800933,
    770255983,
    1495990901,
    1249150122,
    1856431235,
    1555081692,
    3175218132,
    1996064986,
    2198950837,
    2554220882,
    3999719339,
    2821834349,
    766784016,
    2952996808,
    2566594879,
    3210313671,
    3203337956,
    3336571891,
    1034457026,
    3584528711,
    2466948901,
    113926993,
    3758326383,
    338241895,
    168717936,
    666307205,
    1188179964,
    773529912,
    1546045734,
    1294757372,
    1522805485,
    1396182291,
    2643833823,
    1695183700,
    2343527390,
    1986661051,
    1014477480,
    2177026350,
    1206759142,
    2456956037,
    344077627,
    2730485921,
    1290863460,
    2820302411,
    3158454273,
    3259730800,
    3505952657,
    3345764771,
    106217008,
    3516065817,
    3606008344,
    3600352804,
    1432725776,
    4094571909,
    1467031594,
    275423344,
    851169720,
    430227734,
    3100823752,
    506948616,
    1363258195,
    659060556,
    3750685593,
    883997877,
    3785050280,
    958139571,
    3318307427,
    1322822218,
    3812723403,
    1537002063,
    2003034995,
    1747873779,
    3602036899,
    1955562222,
    1575990012,
    2024104815,
    1125592928,
    2227730452,
    2716904306,
    2361852424,
    442776044,
    2428436474,
    593698344,
    2756734187,
    3733110249,
    3204031479,
    2999351573,
    3329325298,
    3815920427,
    3391569614,
    3928383900,
    3515267271,
    566280711,
    3940187606,
    3454069534,
    4118630271,
    4000239992,
    116418474,
    1914138554,
    174292421,
    2731055270,
    289380356,
    3203993006,
    460393269,
    320620315,
    685471733,
    587496836,
    852142971,
    1086792851,
    1017036298,
    365543100,
    1126000580,
    2618297676,
    1288033470,
    3409855158,
    1501505948,
    4234509866,
    1607167915,
    987167468,
    1816402316,
    1246189591
  ];
  function A() {
    if (!(this instanceof A))
      return new A();
    C.call(this), this.h = [
      1779033703,
      4089235720,
      3144134277,
      2227873595,
      1013904242,
      4271175723,
      2773480762,
      1595750129,
      1359893119,
      2917565137,
      2600822924,
      725511199,
      528734635,
      4215389547,
      1541459225,
      327033209
    ], this.k = w, this.W = new Array(160);
  }
  r.inherits(A, C), Qn = A, A.blockSize = 1024, A.outSize = 512, A.hmacStrength = 192, A.padLength = 128, A.prototype._prepareBlock = function(b, G) {
    for (var ee = this.W, q = 0; q < 32; q++)
      ee[q] = b[G + q];
    for (; q < ee.length; q += 2) {
      var ne = oe(ee[q - 4], ee[q - 3]), Q = N(ee[q - 4], ee[q - 3]), ce = ee[q - 14], V = ee[q - 13], P = I(ee[q - 30], ee[q - 29]), $ = X(ee[q - 30], ee[q - 29]), Z = ee[q - 32], te = ee[q - 31];
      ee[q] = _(
        ne,
        Q,
        ce,
        V,
        P,
        $,
        Z,
        te
      ), ee[q + 1] = k(
        ne,
        Q,
        ce,
        V,
        P,
        $,
        Z,
        te
      );
    }
  }, A.prototype._update = function(b, G) {
    this._prepareBlock(b, G);
    var ee = this.W, q = this.h[0], ne = this.h[1], Q = this.h[2], ce = this.h[3], V = this.h[4], P = this.h[5], $ = this.h[6], Z = this.h[7], te = this.h[8], K = this.h[9], x = this.h[10], v = this.h[11], W = this.h[12], U = this.h[13], O = this.h[14], D = this.h[15];
    t(this.k.length === ee.length);
    for (var J = 0; J < ee.length; J += 2) {
      var d = O, Y = D, S = B(te, K), i = z(te, K), a = c(te, K, x, v, W), p = y(te, K, x, v, W, U), L = this.k[J], H = this.k[J + 1], j = ee[J], re = ee[J + 1], ae = R(
        d,
        Y,
        S,
        i,
        a,
        p,
        L,
        H,
        j,
        re
      ), ie = E(
        d,
        Y,
        S,
        i,
        a,
        p,
        L,
        H,
        j,
        re
      );
      d = T(q, ne), Y = F(q, ne), S = m(q, ne, Q, ce, V), i = h(q, ne, Q, ce, V, P);
      var fe = f(d, Y, S, i), de = g(d, Y, S, i);
      O = W, D = U, W = x, U = v, x = te, v = K, te = f($, Z, ae, ie), K = g(Z, Z, ae, ie), $ = V, Z = P, V = Q, P = ce, Q = q, ce = ne, q = f(ae, ie, fe, de), ne = g(ae, ie, fe, de);
    }
    n(this.h, 0, q, ne), n(this.h, 2, Q, ce), n(this.h, 4, V, P), n(this.h, 6, $, Z), n(this.h, 8, te, K), n(this.h, 10, x, v), n(this.h, 12, W, U), n(this.h, 14, O, D);
  }, A.prototype._digest = function(b) {
    return b === "hex" ? r.toHex32(this.h, "big") : r.split32(this.h, "big");
  };
  function c(M, b, G, ee, q) {
    var ne = M & G ^ ~M & q;
    return ne < 0 && (ne += 4294967296), ne;
  }
  function y(M, b, G, ee, q, ne) {
    var Q = b & ee ^ ~b & ne;
    return Q < 0 && (Q += 4294967296), Q;
  }
  function m(M, b, G, ee, q) {
    var ne = M & G ^ M & q ^ G & q;
    return ne < 0 && (ne += 4294967296), ne;
  }
  function h(M, b, G, ee, q, ne) {
    var Q = b & ee ^ b & ne ^ ee & ne;
    return Q < 0 && (Q += 4294967296), Q;
  }
  function T(M, b) {
    var G = s(M, b, 28), ee = s(b, M, 2), q = s(b, M, 7), ne = G ^ ee ^ q;
    return ne < 0 && (ne += 4294967296), ne;
  }
  function F(M, b) {
    var G = o(M, b, 28), ee = o(b, M, 2), q = o(b, M, 7), ne = G ^ ee ^ q;
    return ne < 0 && (ne += 4294967296), ne;
  }
  function B(M, b) {
    var G = s(M, b, 14), ee = s(M, b, 18), q = s(b, M, 9), ne = G ^ ee ^ q;
    return ne < 0 && (ne += 4294967296), ne;
  }
  function z(M, b) {
    var G = o(M, b, 14), ee = o(M, b, 18), q = o(b, M, 9), ne = G ^ ee ^ q;
    return ne < 0 && (ne += 4294967296), ne;
  }
  function I(M, b) {
    var G = s(M, b, 1), ee = s(M, b, 8), q = u(M, b, 7), ne = G ^ ee ^ q;
    return ne < 0 && (ne += 4294967296), ne;
  }
  function X(M, b) {
    var G = o(M, b, 1), ee = o(M, b, 8), q = l(M, b, 7), ne = G ^ ee ^ q;
    return ne < 0 && (ne += 4294967296), ne;
  }
  function oe(M, b) {
    var G = s(M, b, 19), ee = s(b, M, 29), q = u(M, b, 6), ne = G ^ ee ^ q;
    return ne < 0 && (ne += 4294967296), ne;
  }
  function N(M, b) {
    var G = o(M, b, 19), ee = o(b, M, 29), q = l(M, b, 6), ne = G ^ ee ^ q;
    return ne < 0 && (ne += 4294967296), ne;
  }
  return Qn;
}
var ei, Bs;
function kl() {
  if (Bs) return ei;
  Bs = 1;
  var r = He(), e = Wo();
  function t() {
    if (!(this instanceof t))
      return new t();
    e.call(this), this.h = [
      3418070365,
      3238371032,
      1654270250,
      914150663,
      2438529370,
      812702999,
      355462360,
      4144912697,
      1731405415,
      4290775857,
      2394180231,
      1750603025,
      3675008525,
      1694076839,
      1203062813,
      3204075428
    ];
  }
  return r.inherits(t, e), ei = t, t.blockSize = 1024, t.outSize = 384, t.hmacStrength = 192, t.padLength = 128, t.prototype._digest = function(o) {
    return o === "hex" ? r.toHex32(this.h.slice(0, 12), "big") : r.split32(this.h.slice(0, 12), "big");
  }, ei;
}
var Ls;
function Rl() {
  return Ls || (Ls = 1, st.sha1 = Tl(), st.sha224 = Al(), st.sha256 = zo(), st.sha384 = kl(), st.sha512 = Wo()), st;
}
var ti = {}, Us;
function Cl() {
  if (Us) return ti;
  Us = 1;
  var r = He(), e = Kt(), t = r.rotl32, s = r.sum32, o = r.sum32_3, u = r.sum32_4, l = e.BlockHash;
  function n() {
    if (!(this instanceof n))
      return new n();
    l.call(this), this.h = [1732584193, 4023233417, 2562383102, 271733878, 3285377520], this.endian = "little";
  }
  r.inherits(n, l), ti.ripemd160 = n, n.blockSize = 512, n.outSize = 160, n.hmacStrength = 192, n.padLength = 64, n.prototype._update = function(A, c) {
    for (var y = this.h[0], m = this.h[1], h = this.h[2], T = this.h[3], F = this.h[4], B = y, z = m, I = h, X = T, oe = F, N = 0; N < 80; N++) {
      var M = s(
        t(
          u(y, f(N, m, h, T), A[k[N] + c], g(N)),
          E[N]
        ),
        F
      );
      y = F, F = T, T = t(h, 10), h = m, m = M, M = s(
        t(
          u(B, f(79 - N, z, I, X), A[R[N] + c], _(N)),
          C[N]
        ),
        oe
      ), B = oe, oe = X, X = t(I, 10), I = z, z = M;
    }
    M = o(this.h[1], h, X), this.h[1] = o(this.h[2], T, oe), this.h[2] = o(this.h[3], F, B), this.h[3] = o(this.h[4], y, z), this.h[4] = o(this.h[0], m, I), this.h[0] = M;
  }, n.prototype._digest = function(A) {
    return A === "hex" ? r.toHex32(this.h, "little") : r.split32(this.h, "little");
  };
  function f(w, A, c, y) {
    return w <= 15 ? A ^ c ^ y : w <= 31 ? A & c | ~A & y : w <= 47 ? (A | ~c) ^ y : w <= 63 ? A & y | c & ~y : A ^ (c | ~y);
  }
  function g(w) {
    return w <= 15 ? 0 : w <= 31 ? 1518500249 : w <= 47 ? 1859775393 : w <= 63 ? 2400959708 : 2840853838;
  }
  function _(w) {
    return w <= 15 ? 1352829926 : w <= 31 ? 1548603684 : w <= 47 ? 1836072691 : w <= 63 ? 2053994217 : 0;
  }
  var k = [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    7,
    4,
    13,
    1,
    10,
    6,
    15,
    3,
    12,
    0,
    9,
    5,
    2,
    14,
    11,
    8,
    3,
    10,
    14,
    4,
    9,
    15,
    8,
    1,
    2,
    7,
    0,
    6,
    13,
    11,
    5,
    12,
    1,
    9,
    11,
    10,
    0,
    8,
    12,
    4,
    13,
    3,
    7,
    15,
    14,
    5,
    6,
    2,
    4,
    0,
    5,
    9,
    7,
    12,
    2,
    10,
    14,
    1,
    3,
    8,
    11,
    6,
    15,
    13
  ], R = [
    5,
    14,
    7,
    0,
    9,
    2,
    11,
    4,
    13,
    6,
    15,
    8,
    1,
    10,
    3,
    12,
    6,
    11,
    3,
    7,
    0,
    13,
    5,
    10,
    14,
    15,
    8,
    12,
    4,
    9,
    1,
    2,
    15,
    5,
    1,
    3,
    7,
    14,
    6,
    9,
    11,
    8,
    12,
    2,
    10,
    0,
    4,
    13,
    8,
    6,
    4,
    1,
    3,
    11,
    15,
    0,
    5,
    12,
    2,
    13,
    9,
    7,
    10,
    14,
    12,
    15,
    10,
    4,
    1,
    5,
    8,
    7,
    6,
    2,
    13,
    14,
    0,
    3,
    9,
    11
  ], E = [
    11,
    14,
    15,
    12,
    5,
    8,
    7,
    9,
    11,
    13,
    14,
    15,
    6,
    7,
    9,
    8,
    7,
    6,
    8,
    13,
    11,
    9,
    7,
    15,
    7,
    12,
    15,
    9,
    11,
    7,
    13,
    12,
    11,
    13,
    6,
    7,
    14,
    9,
    13,
    15,
    14,
    8,
    13,
    6,
    5,
    12,
    7,
    5,
    11,
    12,
    14,
    15,
    14,
    15,
    9,
    8,
    9,
    14,
    5,
    6,
    8,
    6,
    5,
    12,
    9,
    15,
    5,
    11,
    6,
    8,
    13,
    12,
    5,
    12,
    13,
    14,
    11,
    8,
    5,
    6
  ], C = [
    8,
    9,
    9,
    11,
    13,
    15,
    15,
    5,
    7,
    7,
    8,
    11,
    14,
    14,
    12,
    6,
    9,
    13,
    15,
    7,
    12,
    8,
    9,
    11,
    7,
    7,
    12,
    7,
    6,
    15,
    13,
    11,
    9,
    7,
    15,
    11,
    8,
    6,
    6,
    14,
    12,
    13,
    5,
    14,
    13,
    13,
    7,
    5,
    15,
    5,
    8,
    11,
    14,
    14,
    6,
    14,
    6,
    9,
    12,
    9,
    12,
    5,
    15,
    8,
    8,
    5,
    12,
    9,
    12,
    5,
    14,
    6,
    8,
    13,
    6,
    5,
    15,
    13,
    11,
    11
  ];
  return ti;
}
var ri, Ms;
function Il() {
  if (Ms) return ri;
  Ms = 1;
  var r = He(), e = Ht();
  function t(s, o, u) {
    if (!(this instanceof t))
      return new t(s, o, u);
    this.Hash = s, this.blockSize = s.blockSize / 8, this.outSize = s.outSize / 8, this.inner = null, this.outer = null, this._init(r.toArray(o, u));
  }
  return ri = t, t.prototype._init = function(o) {
    o.length > this.blockSize && (o = new this.Hash().update(o).digest()), e(o.length <= this.blockSize);
    for (var u = o.length; u < this.blockSize; u++)
      o.push(0);
    for (u = 0; u < o.length; u++)
      o[u] ^= 54;
    for (this.inner = new this.Hash().update(o), u = 0; u < o.length; u++)
      o[u] ^= 106;
    this.outer = new this.Hash().update(o);
  }, t.prototype.update = function(o, u) {
    return this.inner.update(o, u), this;
  }, t.prototype.digest = function(o) {
    return this.outer.update(this.inner.digest()), this.outer.digest(o);
  }, ri;
}
var js;
function Nl() {
  return js || (js = 1, function(r) {
    var e = r;
    e.utils = He(), e.common = Kt(), e.sha = Rl(), e.ripemd = Cl(), e.hmac = Il(), e.sha1 = e.sha.sha1, e.sha256 = e.sha.sha256, e.sha224 = e.sha.sha224, e.sha384 = e.sha.sha384, e.sha512 = e.sha.sha512, e.ripemd160 = e.ripemd.ripemd160;
  }(Vn)), Vn;
}
Nl();
let Ol = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict", Pl = (r, e = 21) => (t = e) => {
  let s = "", o = t | 0;
  for (; o--; )
    s += r[Math.random() * r.length | 0];
  return s;
}, Fl = (r = 21) => {
  let e = "", t = r | 0;
  for (; t--; )
    e += Ol[Math.random() * 64 | 0];
  return e;
};
const Be = (r) => Math.floor(r * 72 * 20), zi = (r = 0) => {
  let e = r;
  return () => ++e;
}, Dl = () => zi(), Bl = () => zi(1), Ll = () => zi(), Ul = () => Fl().toLowerCase(), It = (r) => Pl("1234567890abcdef", r)(), Ml = () => `${It(8)}-${It(4)}-${It(4)}-${It(4)}-${It(12)}`, ni = (r) => new Uint8Array(new TextEncoder().encode(r));
class jl extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      xmlns: "xmlns"
    });
  }
}
const zl = {
  /** Target is external to the package (e.g., hyperlink to a URL) */
  EXTERNAL: "External"
}, Wl = (r, e, t, s) => new we({
  name: "Relationship",
  attributes: {
    id: { key: "Id", value: r },
    type: { key: "Type", value: e },
    target: { key: "Target", value: t },
    targetMode: { key: "TargetMode", value: s }
  }
});
class nt extends le {
  constructor() {
    super("Relationships"), this.root.push(
      new jl({
        xmlns: "http://schemas.openxmlformats.org/package/2006/relationships"
      })
    );
  }
  /**
   * Creates a new relationship to another part in the package.
   *
   * @param id - Unique identifier for this relationship (will be prefixed with "rId")
   * @param type - Relationship type URI (e.g., image, header, hyperlink)
   * @param target - Path to the target part
   * @param targetMode - Optional mode indicating if target is external
   */
  addRelationship(e, t, s, o) {
    this.root.push(Wl(`rId${e}`, t, s, o));
  }
  /**
   * Gets the count of relationships in this collection.
   * Excludes the attributes element from the count.
   */
  get RelationshipCount() {
    return this.root.length - 1;
  }
}
class ql extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", { id: "w:id", initials: "w:initials", author: "w:author", date: "w:date" });
  }
}
class Hl extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      "xmlns:cx": "xmlns:cx",
      "xmlns:cx1": "xmlns:cx1",
      "xmlns:cx2": "xmlns:cx2",
      "xmlns:cx3": "xmlns:cx3",
      "xmlns:cx4": "xmlns:cx4",
      "xmlns:cx5": "xmlns:cx5",
      "xmlns:cx6": "xmlns:cx6",
      "xmlns:cx7": "xmlns:cx7",
      "xmlns:cx8": "xmlns:cx8",
      "xmlns:mc": "xmlns:mc",
      "xmlns:aink": "xmlns:aink",
      "xmlns:am3d": "xmlns:am3d",
      "xmlns:o": "xmlns:o",
      "xmlns:r": "xmlns:r",
      "xmlns:m": "xmlns:m",
      "xmlns:v": "xmlns:v",
      "xmlns:wp14": "xmlns:wp14",
      "xmlns:wp": "xmlns:wp",
      "xmlns:w10": "xmlns:w10",
      "xmlns:w": "xmlns:w",
      "xmlns:w14": "xmlns:w14",
      "xmlns:w15": "xmlns:w15",
      "xmlns:w16cex": "xmlns:w16cex",
      "xmlns:w16cid": "xmlns:w16cid",
      "xmlns:w16": "xmlns:w16",
      "xmlns:w16sdtdh": "xmlns:w16sdtdh",
      "xmlns:w16se": "xmlns:w16se",
      "xmlns:wpg": "xmlns:wpg",
      "xmlns:wpi": "xmlns:wpi",
      "xmlns:wne": "xmlns:wne",
      "xmlns:wps": "xmlns:wps"
    });
  }
}
class Kl extends le {
  constructor({ id: e, initials: t, author: s, date: o = /* @__PURE__ */ new Date(), children: u }) {
    super("w:comment"), this.root.push(
      new ql({
        id: e,
        initials: t,
        author: s,
        date: o.toISOString()
      })
    );
    for (const l of u)
      this.root.push(l);
  }
}
class Gl extends le {
  constructor({ children: e }) {
    super("w:comments"), se(this, "relationships"), this.root.push(
      new Hl({
        "xmlns:cx": "http://schemas.microsoft.com/office/drawing/2014/chartex",
        "xmlns:cx1": "http://schemas.microsoft.com/office/drawing/2015/9/8/chartex",
        "xmlns:cx2": "http://schemas.microsoft.com/office/drawing/2015/10/21/chartex",
        "xmlns:cx3": "http://schemas.microsoft.com/office/drawing/2016/5/9/chartex",
        "xmlns:cx4": "http://schemas.microsoft.com/office/drawing/2016/5/10/chartex",
        "xmlns:cx5": "http://schemas.microsoft.com/office/drawing/2016/5/11/chartex",
        "xmlns:cx6": "http://schemas.microsoft.com/office/drawing/2016/5/12/chartex",
        "xmlns:cx7": "http://schemas.microsoft.com/office/drawing/2016/5/13/chartex",
        "xmlns:cx8": "http://schemas.microsoft.com/office/drawing/2016/5/14/chartex",
        "xmlns:mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
        "xmlns:aink": "http://schemas.microsoft.com/office/drawing/2016/ink",
        "xmlns:am3d": "http://schemas.microsoft.com/office/drawing/2017/model3d",
        "xmlns:o": "urn:schemas-microsoft-com:office:office",
        "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        "xmlns:m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
        "xmlns:v": "urn:schemas-microsoft-com:vml",
        "xmlns:wp14": "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
        "xmlns:wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
        "xmlns:w10": "urn:schemas-microsoft-com:office:word",
        "xmlns:w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
        "xmlns:w14": "http://schemas.microsoft.com/office/word/2010/wordml",
        "xmlns:w15": "http://schemas.microsoft.com/office/word/2012/wordml",
        "xmlns:w16cex": "http://schemas.microsoft.com/office/word/2018/wordml/cex",
        "xmlns:w16cid": "http://schemas.microsoft.com/office/word/2016/wordml/cid",
        "xmlns:w16": "http://schemas.microsoft.com/office/word/2018/wordml",
        "xmlns:w16sdtdh": "http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash",
        "xmlns:w16se": "http://schemas.microsoft.com/office/word/2015/wordml/symex",
        "xmlns:wpg": "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
        "xmlns:wpi": "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
        "xmlns:wne": "http://schemas.microsoft.com/office/word/2006/wordml",
        "xmlns:wps": "http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
      })
    );
    for (const t of e)
      this.root.push(new Kl(t));
    this.relationships = new nt();
  }
  get Relationships() {
    return this.relationships;
  }
}
class Vl extends tl {
  constructor() {
    super("w:endnoteRef");
  }
}
class $l extends le {
  constructor() {
    super("w:pageBreakBefore");
  }
}
const xt = {
  /** Line spacing is automatically determined based on content */
  AUTO: "auto"
}, Xl = ({ after: r, before: e, line: t, lineRule: s, beforeAutoSpacing: o, afterAutoSpacing: u }) => new we({
  name: "w:spacing",
  attributes: {
    after: { key: "w:after", value: r },
    before: { key: "w:before", value: e },
    line: { key: "w:line", value: t },
    lineRule: { key: "w:lineRule", value: s },
    beforeAutoSpacing: { key: "w:beforeAutospacing", value: o },
    afterAutoSpacing: { key: "w:afterAutospacing", value: u }
  }
}), xi = {
  /** Heading 1 style */
  HEADING_1: "Heading1",
  /** Title style */
  TITLE: "Title"
}, ir = (r) => new we({
  name: "w:pStyle",
  attributes: {
    val: { key: "w:val", value: r }
  }
}), zs = {
  /** Left-aligned tab stop */
  LEFT: "left",
  /** Right-aligned tab stop */
  RIGHT: "right"
}, Zl = ({ type: r, position: e, leader: t }) => new we({
  name: "w:tab",
  attributes: {
    val: { key: "w:val", value: r },
    pos: { key: "w:pos", value: e },
    leader: { key: "w:leader", value: t }
  }
}), Yl = (r) => new we({
  name: "w:tabs",
  children: r.map((e) => Zl(e))
});
class ii extends le {
  constructor(e, t) {
    super("w:numPr"), this.root.push(new Jl(t)), this.root.push(new Ql(e));
  }
}
class Jl extends le {
  constructor(e) {
    if (super("w:ilvl"), e > 9)
      throw new Error(
        "Level cannot be greater than 9. Read more here: https://answers.microsoft.com/en-us/msoffice/forum/all/does-word-support-more-than-9-list-levels/d130fdcd-1781-446d-8c84-c6c79124e4d7"
      );
    this.root.push(
      new Ie({
        val: e
      })
    );
  }
}
class Ql extends le {
  constructor(e) {
    super("w:numId"), this.root.push(
      new Ie({
        val: typeof e == "string" ? `{${e}}` : e
      })
    );
  }
}
class ef extends le {
  constructor() {
    super(...arguments), se(this, "fileChild", /* @__PURE__ */ Symbol());
  }
}
class tf extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      id: "r:id",
      history: "w:history",
      anchor: "w:anchor"
    });
  }
}
class rf extends le {
  constructor(e, t, s) {
    super("w:hyperlink"), se(this, "linkId"), this.linkId = t;
    const o = {
      history: 1,
      anchor: s || void 0,
      id: s ? void 0 : `rId${this.linkId}`
    }, u = new tf(o);
    this.root.push(u), e.forEach((l) => {
      this.root.push(l);
    });
  }
}
class nf extends le {
  constructor(e) {
    super("w:externalHyperlink"), this.options = e;
  }
}
class af extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      id: "w:id",
      name: "w:name"
    });
  }
}
class sf extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      id: "w:id"
    });
  }
}
class of {
  constructor(e) {
    se(this, "bookmarkUniqueNumericId", Ll()), se(this, "start"), se(this, "children"), se(this, "end");
    const t = this.bookmarkUniqueNumericId();
    this.start = new uf(e.id, t), this.children = e.children, this.end = new cf(t);
  }
}
class uf extends le {
  constructor(e, t) {
    super("w:bookmarkStart");
    const s = new af({
      name: e,
      id: t
    });
    this.root.push(s);
  }
}
class cf extends le {
  constructor(e) {
    super("w:bookmarkEnd");
    const t = new sf({
      id: e
    });
    this.root.push(t);
  }
}
const lf = (r) => new we({
  name: "w:outlineLvl",
  attributes: {
    val: { key: "w:val", value: r }
  }
}), ar = ({ id: r, fontKey: e, subsetted: t }, s) => new we({
  name: s,
  attributes: ge({
    id: { key: "r:id", value: r }
  }, e ? { fontKey: { key: "w:fontKey", value: `{${e}}` } } : {}),
  children: [...t ? [new ue("w:subsetted", t)] : []]
}), ff = ({
  name: r,
  altName: e,
  panose1: t,
  charset: s,
  family: o,
  notTrueType: u,
  pitch: l,
  sig: n,
  embedRegular: f,
  embedBold: g,
  embedItalic: _,
  embedBoldItalic: k
}) => new we({
  name: "w:font",
  attributes: {
    name: { key: "w:name", value: r }
  },
  children: [
    // http://www.datypic.com/sc/ooxml/e-w_altName-1.html
    ...e ? [Ct("w:altName", e)] : [],
    // http://www.datypic.com/sc/ooxml/e-w_panose1-1.html
    ...t ? [Ct("w:panose1", t)] : [],
    // http://www.datypic.com/sc/ooxml/e-w_charset-1.html
    ...s ? [Ct("w:charset", s)] : [],
    Ct("w:family", o),
    // http://www.datypic.com/sc/ooxml/e-w_notTrueType-1.html
    ...u ? [new ue("w:notTrueType", u)] : [],
    Ct("w:pitch", l),
    // http://www.datypic.com/sc/ooxml/e-w_sig-1.html
    ...n ? [
      new we({
        name: "w:sig",
        attributes: {
          usb0: { key: "w:usb0", value: n.usb0 },
          usb1: { key: "w:usb1", value: n.usb1 },
          usb2: { key: "w:usb2", value: n.usb2 },
          usb3: { key: "w:usb3", value: n.usb3 },
          csb0: { key: "w:csb0", value: n.csb0 },
          csb1: { key: "w:csb1", value: n.csb1 }
        }
      })
    ] : [],
    // http://www.datypic.com/sc/ooxml/e-w_embedRegular-1.html
    ...f ? [ar(f, "w:embedRegular")] : [],
    // http://www.datypic.com/sc/ooxml/e-w_embedBold-1.html
    ...g ? [ar(g, "w:embedBold")] : [],
    // http://www.datypic.com/sc/ooxml/e-w_embedItalic-1.html
    ..._ ? [ar(_, "w:embedItalic")] : [],
    // http://www.datypic.com/sc/ooxml/e-w_embedBoldItalic-1.html
    ...k ? [ar(k, "w:embedBoldItalic")] : []
  ]
}), hf = ({
  name: r,
  index: e,
  fontKey: t,
  characterSet: s
}) => ff({
  name: r,
  sig: {
    usb0: "E0002AFF",
    usb1: "C000247B",
    usb2: "00000009",
    usb3: "00000000",
    csb0: "000001FF",
    csb1: "00000000"
  },
  charset: s,
  family: "auto",
  pitch: "variable",
  embedRegular: {
    fontKey: t,
    id: `rId${e}`
  }
}), df = (r) => (
  // https://c-rex.net/projects/samples/ooxml/e1/Part4/OOXML_P4_DOCX_Font_topic_ID0ERNCU.html
  // http://www.datypic.com/sc/ooxml/e-w_fonts.html
  new we({
    name: "w:fonts",
    attributes: {
      mc: { key: "xmlns:mc", value: "http://schemas.openxmlformats.org/markup-compatibility/2006" },
      r: { key: "xmlns:r", value: "http://schemas.openxmlformats.org/officeDocument/2006/relationships" },
      w: { key: "xmlns:w", value: "http://schemas.openxmlformats.org/wordprocessingml/2006/main" },
      w14: { key: "xmlns:w14", value: "http://schemas.microsoft.com/office/word/2010/wordml" },
      w15: { key: "xmlns:w15", value: "http://schemas.microsoft.com/office/word/2012/wordml" },
      w16cex: { key: "xmlns:w16cex", value: "http://schemas.microsoft.com/office/word/2018/wordml/cex" },
      w16cid: { key: "xmlns:w16cid", value: "http://schemas.microsoft.com/office/word/2016/wordml/cid" },
      w16: { key: "xmlns:w16", value: "http://schemas.microsoft.com/office/word/2018/wordml" },
      w16sdtdh: { key: "xmlns:w16sdtdh", value: "http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" },
      w16se: { key: "xmlns:w16se", value: "http://schemas.microsoft.com/office/word/2015/wordml/symex" },
      Ignorable: { key: "mc:Ignorable", value: "w14 w15 w16se w16cid w16 w16cex w16sdtdh" }
    },
    children: r.map(
      (e, t) => hf({
        name: e.name,
        index: t + 1,
        fontKey: e.fontKey,
        characterSet: e.characterSet
      })
    )
  })
);
class qo {
  constructor(e) {
    se(this, "fontTable"), se(this, "relationships"), se(this, "fontOptionsWithKey", []), this.options = e, this.fontOptionsWithKey = e.map((t) => et(ge({}, t), { fontKey: Ml() })), this.fontTable = df(this.fontOptionsWithKey), this.relationships = new nt();
    for (let t = 0; t < e.length; t++)
      this.relationships.addRelationship(
        t + 1,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font",
        `fonts/${e[t].name}.odttf`
      );
  }
  get View() {
    return this.fontTable;
  }
  get Relationships() {
    return this.relationships;
  }
}
const pf = () => new we({
  name: "w:wordWrap",
  attributes: {
    val: { key: "w:val", value: 0 }
  }
}), mf = (r) => {
  var e, t;
  return new we({
    name: "w:framePr",
    attributes: {
      anchorLock: {
        key: "w:anchorLock",
        value: r.anchorLock
      },
      dropCap: {
        key: "w:dropCap",
        value: r.dropCap
      },
      width: {
        key: "w:w",
        value: r.width
      },
      height: {
        key: "w:h",
        value: r.height
      },
      x: {
        key: "w:x",
        value: r.position ? r.position.x : void 0
      },
      y: {
        key: "w:y",
        value: r.position ? r.position.y : void 0
      },
      anchorHorizontal: {
        key: "w:hAnchor",
        value: r.anchor.horizontal
      },
      anchorVertical: {
        key: "w:vAnchor",
        value: r.anchor.vertical
      },
      spaceHorizontal: {
        key: "w:hSpace",
        value: (e = r.space) == null ? void 0 : e.horizontal
      },
      spaceVertical: {
        key: "w:vSpace",
        value: (t = r.space) == null ? void 0 : t.vertical
      },
      rule: {
        key: "w:hRule",
        value: r.rule
      },
      alignmentX: {
        key: "w:xAlign",
        value: r.alignment ? r.alignment.x : void 0
      },
      alignmentY: {
        key: "w:yAlign",
        value: r.alignment ? r.alignment.y : void 0
      },
      lines: {
        key: "w:lines",
        value: r.lines
      },
      wrap: {
        key: "w:wrap",
        value: r.wrap
      }
    }
  });
};
class lt extends fr {
  constructor(e) {
    var t, s;
    if (super("w:pPr", e == null ? void 0 : e.includeIfEmpty), se(this, "numberingReferences", []), !e)
      return this;
    e.heading && this.push(ir(e.heading)), e.bullet && this.push(ir("ListParagraph")), e.numbering && !e.style && !e.heading && (e.numbering.custom || this.push(ir("ListParagraph"))), e.style && this.push(ir(e.style)), e.keepNext !== void 0 && this.push(new ue("w:keepNext", e.keepNext)), e.keepLines !== void 0 && this.push(new ue("w:keepLines", e.keepLines)), e.pageBreakBefore && this.push(new $l()), e.frame && this.push(mf(e.frame)), e.widowControl !== void 0 && this.push(new ue("w:widowControl", e.widowControl)), e.bullet && this.push(new ii(1, e.bullet.level)), e.numbering ? (this.numberingReferences.push({
      reference: e.numbering.reference,
      instance: (t = e.numbering.instance) != null ? t : 0
    }), this.push(new ii(`${e.numbering.reference}-${(s = e.numbering.instance) != null ? s : 0}`, e.numbering.level))) : e.numbering === !1 && this.push(new ii(0, 0)), e.border && this.push(new nl(e.border)), e.thematicBreak && this.push(new il()), e.shading && this.push(Lo(e.shading)), e.wordWrap && this.push(pf()), e.overflowPunctuation && this.push(new ue("w:overflowPunct", e.overflowPunctuation));
    const o = [
      ...e.rightTabStop !== void 0 ? [{ type: zs.RIGHT, position: e.rightTabStop }] : [],
      ...e.tabStops ? e.tabStops : [],
      ...e.leftTabStop !== void 0 ? [{ type: zs.LEFT, position: e.leftTabStop }] : []
    ];
    o.length > 0 && this.push(Yl(o)), e.bidirectional !== void 0 && this.push(new ue("w:bidi", e.bidirectional)), e.spacing && this.push(Xl(e.spacing)), e.indent && this.push(al(e.indent)), e.contextualSpacing !== void 0 && this.push(new ue("w:contextualSpacing", e.contextualSpacing)), e.alignment && this.push(rl(e.alignment)), e.outlineLevel !== void 0 && this.push(lf(e.outlineLevel)), e.suppressLineNumbers !== void 0 && this.push(new ue("w:suppressLineNumbers", e.suppressLineNumbers)), e.autoSpaceEastAsianText !== void 0 && this.push(new ue("w:autoSpaceDN", e.autoSpaceEastAsianText)), e.run && this.push(new xl(e.run)), e.revision && this.push(new gf(e.revision));
  }
  /**
   * Adds a property element to the paragraph properties.
   *
   * @param item - The XML component to add to the paragraph properties
   */
  push(e) {
    this.root.push(e);
  }
  /**
   * Prepares the paragraph properties for XML serialization.
   *
   * This method creates concrete numbering instances for any numbering references
   * before the properties are converted to XML.
   *
   * @param context - The XML context containing document and file information
   * @returns The prepared XML object, or undefined if the component should be ignored
   */
  prepForXml(e) {
    if (!(e.viewWrapper instanceof qo))
      for (const t of this.numberingReferences)
        e.file.Numbering.createConcreteNumberingInstance(t.reference, t.instance);
    return super.prepForXml(e);
  }
}
class gf extends le {
  constructor(e) {
    super("w:pPrChange"), this.root.push(
      new Wt({
        id: e.id,
        author: e.author,
        date: e.date
      })
    ), this.root.push(new lt(et(ge({}, e), { includeIfEmpty: !0 })));
  }
}
class Ue extends ef {
  constructor(e) {
    if (super("w:p"), se(this, "properties"), typeof e == "string")
      return this.properties = new lt({}), this.root.push(this.properties), this.root.push(new Ut(e)), this;
    if (this.properties = new lt(e), this.root.push(this.properties), e.text && this.root.push(new Ut(e.text)), e.children)
      for (const t of e.children) {
        if (t instanceof of) {
          this.root.push(t.start);
          for (const s of t.children)
            this.root.push(s);
          this.root.push(t.end);
          continue;
        }
        this.root.push(t);
      }
  }
  prepForXml(e) {
    for (const t of this.root)
      if (t instanceof nf) {
        const s = this.root.indexOf(t), o = new rf(t.options.children, Ul());
        e.viewWrapper.Relationships.addRelationship(
          o.linkId,
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
          t.options.link,
          zl.EXTERNAL
        ), this.root[s] = o;
      }
    return super.prepForXml(e);
  }
  addRunToFront(e) {
    return this.root.splice(1, 0, e), this;
  }
}
const wf = {
  TOP: "top",
  CENTER: "center",
  BOTTOM: "bottom"
};
et(ge({}, wf), {
  BOTH: "both"
});
const yf = (r) => new we({
  name: "w:vAlign",
  attributes: {
    verticalAlign: { key: "w:val", value: r }
  }
}), ht = {
  style: Ui.NONE,
  size: 0,
  color: "auto"
}, dt = {
  style: Ui.SINGLE,
  size: 4,
  color: "auto"
};
class vf extends le {
  constructor(e) {
    var t, s, o, u, l, n;
    super("w:tblBorders"), this.root.push(Re("w:top", (t = e.top) != null ? t : dt)), this.root.push(Re("w:left", (s = e.left) != null ? s : dt)), this.root.push(Re("w:bottom", (o = e.bottom) != null ? o : dt)), this.root.push(Re("w:right", (u = e.right) != null ? u : dt)), this.root.push(Re("w:insideH", (l = e.insideHorizontal) != null ? l : dt)), this.root.push(Re("w:insideV", (n = e.insideVertical) != null ? n : dt));
  }
}
se(vf, "NONE", {
  top: ht,
  bottom: ht,
  left: ht,
  right: ht,
  insideHorizontal: ht,
  insideVertical: ht
});
class bf extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      xmlns: "xmlns",
      vt: "xmlns:vt"
    });
  }
}
class _f extends le {
  constructor() {
    super("Properties"), this.root.push(
      new bf({
        xmlns: "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties",
        vt: "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"
      })
    );
  }
}
class Ef extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      xmlns: "xmlns"
    });
  }
}
const Ve = (r, e) => new we({
  name: "Default",
  attributes: {
    contentType: { key: "ContentType", value: r },
    extension: { key: "Extension", value: e }
  }
}), Pe = (r, e) => new we({
  name: "Override",
  attributes: {
    contentType: { key: "ContentType", value: r },
    partName: { key: "PartName", value: e }
  }
});
class xf extends le {
  constructor() {
    super("Types"), this.root.push(
      new Ef({
        xmlns: "http://schemas.openxmlformats.org/package/2006/content-types"
      })
    ), this.root.push(Ve("image/png", "png")), this.root.push(Ve("image/jpeg", "jpeg")), this.root.push(Ve("image/jpeg", "jpg")), this.root.push(Ve("image/bmp", "bmp")), this.root.push(Ve("image/gif", "gif")), this.root.push(Ve("image/svg+xml", "svg")), this.root.push(Ve("application/vnd.openxmlformats-package.relationships+xml", "rels")), this.root.push(Ve("application/xml", "xml")), this.root.push(Ve("application/vnd.openxmlformats-officedocument.obfuscatedFont", "odttf")), this.root.push(
      Pe("application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml", "/word/document.xml")
    ), this.root.push(Pe("application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml", "/word/styles.xml")), this.root.push(Pe("application/vnd.openxmlformats-package.core-properties+xml", "/docProps/core.xml")), this.root.push(Pe("application/vnd.openxmlformats-officedocument.custom-properties+xml", "/docProps/custom.xml")), this.root.push(Pe("application/vnd.openxmlformats-officedocument.extended-properties+xml", "/docProps/app.xml")), this.root.push(
      Pe("application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml", "/word/numbering.xml")
    ), this.root.push(
      Pe("application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml", "/word/footnotes.xml")
    ), this.root.push(Pe("application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml", "/word/endnotes.xml")), this.root.push(Pe("application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml", "/word/settings.xml")), this.root.push(Pe("application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml", "/word/comments.xml")), this.root.push(
      Pe("application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml", "/word/fontTable.xml")
    );
  }
  /**
   * Registers a footer part in the content types.
   *
   * @param index - Footer index number (e.g., 1 for footer1.xml)
   */
  addFooter(e) {
    this.root.push(
      Pe("application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml", `/word/footer${e}.xml`)
    );
  }
  /**
   * Registers a header part in the content types.
   *
   * @param index - Header index number (e.g., 1 for header1.xml)
   */
  addHeader(e) {
    this.root.push(
      Pe("application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml", `/word/header${e}.xml`)
    );
  }
}
const Ws = {
  wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
  mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
  o: "urn:schemas-microsoft-com:office:office",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
  v: "urn:schemas-microsoft-com:vml",
  wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
  wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
  w10: "urn:schemas-microsoft-com:office:word",
  w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  w14: "http://schemas.microsoft.com/office/word/2010/wordml",
  w15: "http://schemas.microsoft.com/office/word/2012/wordml",
  wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
  wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
  wne: "http://schemas.microsoft.com/office/word/2006/wordml",
  wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
  cp: "http://schemas.openxmlformats.org/package/2006/metadata/core-properties",
  dc: "http://purl.org/dc/elements/1.1/",
  dcterms: "http://purl.org/dc/terms/",
  dcmitype: "http://purl.org/dc/dcmitype/",
  xsi: "http://www.w3.org/2001/XMLSchema-instance",
  cx: "http://schemas.microsoft.com/office/drawing/2014/chartex",
  cx1: "http://schemas.microsoft.com/office/drawing/2015/9/8/chartex",
  cx2: "http://schemas.microsoft.com/office/drawing/2015/10/21/chartex",
  cx3: "http://schemas.microsoft.com/office/drawing/2016/5/9/chartex",
  cx4: "http://schemas.microsoft.com/office/drawing/2016/5/10/chartex",
  cx5: "http://schemas.microsoft.com/office/drawing/2016/5/11/chartex",
  cx6: "http://schemas.microsoft.com/office/drawing/2016/5/12/chartex",
  cx7: "http://schemas.microsoft.com/office/drawing/2016/5/13/chartex",
  cx8: "http://schemas.microsoft.com/office/drawing/2016/5/14/chartex",
  aink: "http://schemas.microsoft.com/office/drawing/2016/ink",
  am3d: "http://schemas.microsoft.com/office/drawing/2017/model3d",
  w16cex: "http://schemas.microsoft.com/office/word/2018/wordml/cex",
  w16cid: "http://schemas.microsoft.com/office/word/2016/wordml/cid",
  w16: "http://schemas.microsoft.com/office/word/2018/wordml",
  w16sdtdh: "http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash",
  w16se: "http://schemas.microsoft.com/office/word/2015/wordml/symex"
};
class gr extends ve {
  constructor(e, t) {
    super(ge({ Ignorable: t }, Object.fromEntries(e.map((s) => [s, Ws[s]])))), se(this, "xmlKeys", ge({
      Ignorable: "mc:Ignorable"
    }, Object.fromEntries(Object.keys(Ws).map((s) => [s, `xmlns:${s}`]))));
  }
}
class Sf extends le {
  constructor(e) {
    super("cp:coreProperties"), this.root.push(new gr(["cp", "dc", "dcterms", "dcmitype", "xsi"])), e.title && this.root.push(new at("dc:title", e.title)), e.subject && this.root.push(new at("dc:subject", e.subject)), e.creator && this.root.push(new at("dc:creator", e.creator)), e.keywords && this.root.push(new at("cp:keywords", e.keywords)), e.description && this.root.push(new at("dc:description", e.description)), e.lastModifiedBy && this.root.push(new at("cp:lastModifiedBy", e.lastModifiedBy)), e.revision && this.root.push(new at("cp:revision", String(e.revision))), this.root.push(new qs("dcterms:created")), this.root.push(new qs("dcterms:modified"));
  }
}
class Tf extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", { type: "xsi:type" });
  }
}
class qs extends le {
  constructor(e) {
    super(e), this.root.push(
      new Tf({
        type: "dcterms:W3CDTF"
      })
    ), this.root.push(el(/* @__PURE__ */ new Date()));
  }
}
class Af extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      xmlns: "xmlns",
      vt: "xmlns:vt"
    });
  }
}
class kf extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      formatId: "fmtid",
      pid: "pid",
      name: "name"
    });
  }
}
class Rf extends le {
  constructor(e, t) {
    super("property"), this.root.push(
      new kf({
        formatId: "{D5CDD505-2E9C-101B-9397-08002B2CF9AE}",
        pid: e.toString(),
        name: t.name
      })
    ), this.root.push(new Cf(t.value));
  }
}
class Cf extends le {
  constructor(e) {
    super("vt:lpwstr"), this.root.push(e);
  }
}
class If extends le {
  constructor(e) {
    super("Properties"), se(this, "nextId"), se(this, "properties", []), this.root.push(
      new Af({
        xmlns: "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties",
        vt: "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"
      })
    ), this.nextId = 2;
    for (const t of e)
      this.addCustomProperty(t);
  }
  prepForXml(e) {
    return this.properties.forEach((t) => this.root.push(t)), super.prepForXml(e);
  }
  addCustomProperty(e) {
    this.properties.push(new Rf(this.nextId++, e));
  }
}
const Nf = ({ space: r, count: e, separate: t, equalWidth: s, children: o }) => new we({
  name: "w:cols",
  attributes: {
    space: { key: "w:space", value: r === void 0 ? void 0 : Le(r) },
    count: { key: "w:num", value: e === void 0 ? void 0 : Oe(e) },
    separate: { key: "w:sep", value: t },
    equalWidth: { key: "w:equalWidth", value: s }
  },
  children: !s && o ? o : void 0
}), Of = ({ type: r, linePitch: e, charSpace: t }) => new we({
  name: "w:docGrid",
  attributes: {
    type: { key: "w:type", value: r },
    linePitch: { key: "w:linePitch", value: Oe(e) },
    charSpace: { key: "w:charSpace", value: t ? Oe(t) : void 0 }
  }
}), wt = {
  /** Specifies that this header or footer shall appear on every page in this section which is not overridden with a specific `even` or `first` page header/footer. In a section with all three types specified, this type shall be used on all odd numbered pages (counting from the `first` page in the section, not the section numbering). */
  DEFAULT: "default",
  /** Specifies that this header or footer shall appear on the first page in this section. The appearance of this header or footer is contingent on the setting of the `titlePg` element (§2.10.6). */
  FIRST: "first",
  /** Specifies that this header or footer shall appear on all even numbered pages in this section (counting from the first page in the section, not the section numbering). The appearance of this header or footer is contingent on the setting of the `evenAndOddHeaders` element (§2.10.1). */
  EVEN: "even"
}, Hs = {
  HEADER: "w:headerReference",
  FOOTER: "w:footerReference"
}, ai = (r, e) => new we({
  name: r,
  attributes: {
    type: { key: "w:type", value: e.type || wt.DEFAULT },
    id: { key: "r:id", value: `rId${e.id}` }
  }
}), Pf = ({ countBy: r, start: e, restart: t, distance: s }) => new we({
  name: "w:lnNumType",
  attributes: {
    countBy: { key: "w:countBy", value: r === void 0 ? void 0 : Oe(r) },
    start: { key: "w:start", value: e === void 0 ? void 0 : Oe(e) },
    restart: { key: "w:restart", value: t },
    distance: {
      key: "w:distance",
      value: s === void 0 ? void 0 : Le(s)
    }
  }
});
class Ks extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      display: "w:display",
      offsetFrom: "w:offsetFrom",
      zOrder: "w:zOrder"
    });
  }
}
class Ff extends fr {
  constructor(e) {
    if (super("w:pgBorders"), !e)
      return this;
    e.pageBorders ? this.root.push(
      new Ks({
        display: e.pageBorders.display,
        offsetFrom: e.pageBorders.offsetFrom,
        zOrder: e.pageBorders.zOrder
      })
    ) : this.root.push(new Ks({})), e.pageBorderTop && this.root.push(Re("w:top", e.pageBorderTop)), e.pageBorderLeft && this.root.push(Re("w:left", e.pageBorderLeft)), e.pageBorderBottom && this.root.push(Re("w:bottom", e.pageBorderBottom)), e.pageBorderRight && this.root.push(Re("w:right", e.pageBorderRight));
  }
}
const Df = (r, e, t, s, o, u, l) => new we({
  name: "w:pgMar",
  attributes: {
    top: { key: "w:top", value: ct(r) },
    right: { key: "w:right", value: Le(e) },
    bottom: { key: "w:bottom", value: ct(t) },
    left: { key: "w:left", value: Le(s) },
    header: { key: "w:header", value: Le(o) },
    footer: { key: "w:footer", value: Le(u) },
    gutter: { key: "w:gutter", value: Le(l) }
  }
}), Bf = ({ start: r, formatType: e, separator: t }) => new we({
  name: "w:pgNumType",
  attributes: {
    start: { key: "w:start", value: r === void 0 ? void 0 : Oe(r) },
    formatType: { key: "w:fmt", value: e },
    separator: { key: "w:chapSep", value: t }
  }
}), Si = {
  /**
   * ## Portrait Mode
   *
   * Specifies that pages in this section shall be printed in portrait mode.
   */
  PORTRAIT: "portrait",
  /**
   * ## Landscape Mode
   *
   * Specifies that pages in this section shall be printed in landscape mode, which prints the page contents with a 90 degree rotation with respect to the normal page orientation.
   */
  LANDSCAPE: "landscape"
}, Lf = ({ width: r, height: e, orientation: t, code: s }) => {
  const o = Le(r), u = Le(e);
  return new we({
    name: "w:pgSz",
    attributes: {
      width: { key: "w:w", value: t === Si.LANDSCAPE ? u : o },
      height: { key: "w:h", value: t === Si.LANDSCAPE ? o : u },
      orientation: { key: "w:orient", value: t },
      code: { key: "w:code", value: s }
    }
  });
};
class Uf extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", { val: "w:val" });
  }
}
class Mf extends le {
  constructor(e) {
    super("w:textDirection"), this.root.push(
      new Uf({
        val: e
      })
    );
  }
}
const jf = (r) => new we({
  name: "w:type",
  attributes: {
    val: { key: "w:val", value: r }
  }
}), ot = {
  /** Top margin: 1440 twips (1 inch) */
  TOP: 1440,
  /** Right margin: 1440 twips (1 inch) */
  RIGHT: 1440,
  /** Bottom margin: 1440 twips (1 inch) */
  BOTTOM: 1440,
  /** Left margin: 1440 twips (1 inch) */
  LEFT: 1440,
  /** Header margin from top: 708 twips (0.5 inches) */
  HEADER: 708,
  /** Footer margin from bottom: 708 twips (0.5 inches) */
  FOOTER: 708,
  /** Gutter margin for binding: 0 twips */
  GUTTER: 0
}, si = {
  /** Page width: 11906 twips (8.27 inches, 210mm) */
  WIDTH: 11906,
  /** Page height: 16838 twips (11.69 inches, 297mm) */
  HEIGHT: 16838,
  /** Page orientation: portrait */
  ORIENTATION: Si.PORTRAIT
};
class Ho extends le {
  constructor({
    page: {
      size: {
        width: e = si.WIDTH,
        height: t = si.HEIGHT,
        orientation: s = si.ORIENTATION
      } = {},
      margin: {
        top: o = ot.TOP,
        right: u = ot.RIGHT,
        bottom: l = ot.BOTTOM,
        left: n = ot.LEFT,
        header: f = ot.HEADER,
        footer: g = ot.FOOTER,
        gutter: _ = ot.GUTTER
      } = {},
      pageNumbers: k = {},
      borders: R,
      textDirection: E
    } = {},
    grid: { linePitch: C = 360, charSpace: w, type: A } = {},
    headerWrapperGroup: c = {},
    footerWrapperGroup: y = {},
    lineNumbers: m,
    titlePage: h,
    verticalAlign: T,
    column: F,
    type: B,
    revision: z
  } = {}) {
    super("w:sectPr"), this.addHeaderFooterGroup(Hs.HEADER, c), this.addHeaderFooterGroup(Hs.FOOTER, y), B && this.root.push(jf(B)), this.root.push(Lf({ width: e, height: t, orientation: s })), this.root.push(Df(o, u, l, n, f, g, _)), R && this.root.push(new Ff(R)), m && this.root.push(Pf(m)), this.root.push(Bf(k)), F && this.root.push(Nf(F)), T && this.root.push(yf(T)), h !== void 0 && this.root.push(new ue("w:titlePg", h)), E && this.root.push(new Mf(E)), z && this.root.push(new zf(z)), this.root.push(Of({ linePitch: C, charSpace: w, type: A }));
  }
  addHeaderFooterGroup(e, t) {
    t.default && this.root.push(
      ai(e, {
        type: wt.DEFAULT,
        id: t.default.View.ReferenceId
      })
    ), t.first && this.root.push(
      ai(e, {
        type: wt.FIRST,
        id: t.first.View.ReferenceId
      })
    ), t.even && this.root.push(
      ai(e, {
        type: wt.EVEN,
        id: t.even.View.ReferenceId
      })
    );
  }
}
class zf extends le {
  constructor(e) {
    super("w:sectPrChange"), this.root.push(
      new Wt({
        id: e.id,
        author: e.author,
        date: e.date
      })
    ), this.root.push(new Ho(e));
  }
}
class Wf extends le {
  constructor() {
    super("w:body"), se(this, "sections", []);
  }
  /**
   * Adds new section properties to the document body.
   *
   * Creates a new section by moving the previous section's properties into a paragraph
   * at the end of that section, and then adding the new section as the current section.
   *
   * According to the OOXML specification:
   * - Section properties for all sections except the last must be stored in a paragraph's
   *   properties (pPr/sectPr) at the end of each section
   * - The last section's properties are stored as a direct child of the body element (w:body/w:sectPr)
   *
   * @param options - Section properties configuration (page size, margins, headers, footers, etc.)
   */
  addSection(e) {
    const t = this.sections.pop();
    this.root.push(this.createSectionParagraph(t)), this.sections.push(new Ho(e));
  }
  /**
   * Prepares the body element for XML serialization.
   *
   * Ensures that the last section's properties are placed as a direct child of the body
   * element, as required by the OOXML specification.
   *
   * @param context - The XML serialization context
   * @returns The prepared XML object or undefined
   */
  prepForXml(e) {
    return this.sections.length === 1 && (this.root.splice(0, 1), this.root.push(this.sections.pop())), super.prepForXml(e);
  }
  /**
   * Adds a block-level component to the body.
   *
   * This method is used internally by the Document class to add paragraphs,
   * tables, and other block-level elements to the document body.
   *
   * @param component - The XML component to add (paragraph, table, etc.)
   */
  push(e) {
    this.root.push(e);
  }
  createSectionParagraph(e) {
    const t = new Ue({}), s = new lt({});
    return s.push(e), t.addChildElement(s), t;
  }
}
class qf extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      color: "w:color",
      themeColor: "w:themeColor",
      themeShade: "w:themeShade",
      themeTint: "w:themeTint"
    });
  }
}
class Hf extends le {
  constructor(e) {
    super("w:background"), this.root.push(
      new qf({
        color: e.color === void 0 ? void 0 : bt(e.color),
        themeColor: e.themeColor,
        themeShade: e.themeShade === void 0 ? void 0 : As(e.themeShade),
        themeTint: e.themeTint === void 0 ? void 0 : As(e.themeTint)
      })
    );
  }
}
class Kf extends le {
  constructor(e) {
    super("w:document"), se(this, "body"), this.root.push(
      new gr(
        [
          "wpc",
          "mc",
          "o",
          "r",
          "m",
          "v",
          "wp14",
          "wp",
          "w10",
          "w",
          "w14",
          "w15",
          "wpg",
          "wpi",
          "wne",
          "wps",
          "cx",
          "cx1",
          "cx2",
          "cx3",
          "cx4",
          "cx5",
          "cx6",
          "cx7",
          "cx8",
          "aink",
          "am3d",
          "w16cex",
          "w16cid",
          "w16",
          "w16sdtdh",
          "w16se"
        ],
        "w14 w15 wp14"
      )
    ), this.body = new Wf(), e.background && this.root.push(new Hf(e.background)), this.root.push(this.body);
  }
  /**
   * Adds a block-level element to the document body.
   *
   * @param item - The element to add (paragraph, table, table of contents, or hyperlink)
   * @returns The Document instance for method chaining
   */
  add(e) {
    return this.body.push(e), this;
  }
  /**
   * Gets the document body element.
   *
   * @returns The Body instance containing all document content
   */
  get Body() {
    return this.body;
  }
}
class Gf {
  constructor(e) {
    se(this, "document"), se(this, "relationships"), this.document = new Kf(e), this.relationships = new nt();
  }
  get View() {
    return this.document;
  }
  get Relationships() {
    return this.relationships;
  }
}
class Vf extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      wpc: "xmlns:wpc",
      mc: "xmlns:mc",
      o: "xmlns:o",
      r: "xmlns:r",
      m: "xmlns:m",
      v: "xmlns:v",
      wp14: "xmlns:wp14",
      wp: "xmlns:wp",
      w10: "xmlns:w10",
      w: "xmlns:w",
      w14: "xmlns:w14",
      w15: "xmlns:w15",
      wpg: "xmlns:wpg",
      wpi: "xmlns:wpi",
      wne: "xmlns:wne",
      wps: "xmlns:wps",
      Ignorable: "mc:Ignorable"
    });
  }
}
class $f extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      type: "w:type",
      id: "w:id"
    });
  }
}
class Xf extends qt {
  constructor() {
    super({
      style: "EndnoteReference"
    }), this.root.push(new Vl());
  }
}
const Gs = {
  SEPARATOR: "separator",
  CONTINUATION_SEPARATOR: "continuationSeparator"
};
class oi extends le {
  constructor(e) {
    super("w:endnote"), this.root.push(
      new $f({
        type: e.type,
        id: e.id
      })
    );
    for (let t = 0; t < e.children.length; t++) {
      const s = e.children[t];
      t === 0 && s.addRunToFront(new Xf()), this.root.push(s);
    }
  }
}
class Zf extends le {
  constructor() {
    super("w:continuationSeparator");
  }
}
class Ko extends qt {
  constructor() {
    super({}), this.root.push(new Zf());
  }
}
class Yf extends le {
  constructor() {
    super("w:separator");
  }
}
class Go extends qt {
  constructor() {
    super({}), this.root.push(new Yf());
  }
}
class Jf extends le {
  constructor() {
    super("w:endnotes"), this.root.push(
      new Vf({
        wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
        mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
        o: "urn:schemas-microsoft-com:office:office",
        r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
        v: "urn:schemas-microsoft-com:vml",
        wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
        wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
        w10: "urn:schemas-microsoft-com:office:word",
        w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
        w14: "http://schemas.microsoft.com/office/word/2010/wordml",
        w15: "http://schemas.microsoft.com/office/word/2012/wordml",
        wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
        wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
        wne: "http://schemas.microsoft.com/office/word/2006/wordml",
        wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
        Ignorable: "w14 w15 wp14"
      })
    );
    const e = new oi({
      id: -1,
      type: Gs.SEPARATOR,
      children: [
        new Ue({
          spacing: {
            after: 0,
            line: 240,
            lineRule: xt.AUTO
          },
          children: [new Go()]
        })
      ]
    });
    this.root.push(e);
    const t = new oi({
      id: 0,
      type: Gs.CONTINUATION_SEPARATOR,
      children: [
        new Ue({
          spacing: {
            after: 0,
            line: 240,
            lineRule: xt.AUTO
          },
          children: [new Ko()]
        })
      ]
    });
    this.root.push(t);
  }
  createEndnote(e, t) {
    const s = new oi({
      id: e,
      children: t
    });
    this.root.push(s);
  }
}
class Qf {
  constructor() {
    se(this, "endnotes"), se(this, "relationships"), this.endnotes = new Jf(), this.relationships = new nt();
  }
  get View() {
    return this.endnotes;
  }
  get Relationships() {
    return this.relationships;
  }
}
class eh extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      wpc: "xmlns:wpc",
      mc: "xmlns:mc",
      o: "xmlns:o",
      r: "xmlns:r",
      m: "xmlns:m",
      v: "xmlns:v",
      wp14: "xmlns:wp14",
      wp: "xmlns:wp",
      w10: "xmlns:w10",
      w: "xmlns:w",
      w14: "xmlns:w14",
      w15: "xmlns:w15",
      wpg: "xmlns:wpg",
      wpi: "xmlns:wpi",
      wne: "xmlns:wne",
      wps: "xmlns:wps",
      cp: "xmlns:cp",
      dc: "xmlns:dc",
      dcterms: "xmlns:dcterms",
      dcmitype: "xmlns:dcmitype",
      xsi: "xmlns:xsi",
      type: "xsi:type"
    });
  }
}
let th = class extends Po {
  constructor(e, t) {
    super("w:ftr", t), se(this, "refId"), this.refId = e, t || this.root.push(
      new eh({
        wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
        mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
        o: "urn:schemas-microsoft-com:office:office",
        r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
        v: "urn:schemas-microsoft-com:vml",
        wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
        wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
        w10: "urn:schemas-microsoft-com:office:word",
        w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
        w14: "http://schemas.microsoft.com/office/word/2010/wordml",
        w15: "http://schemas.microsoft.com/office/word/2012/wordml",
        wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
        wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
        wne: "http://schemas.microsoft.com/office/word/2006/wordml",
        wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
      })
    );
  }
  get ReferenceId() {
    return this.refId;
  }
  add(e) {
    this.root.push(e);
  }
};
class rh {
  constructor(e, t, s) {
    se(this, "footer"), se(this, "relationships"), this.media = e, this.footer = new th(t, s), this.relationships = new nt();
  }
  add(e) {
    this.footer.add(e);
  }
  addChildElement(e) {
    this.footer.addChildElement(e);
  }
  get View() {
    return this.footer;
  }
  get Relationships() {
    return this.relationships;
  }
  get Media() {
    return this.media;
  }
}
class nh extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      type: "w:type",
      id: "w:id"
    });
  }
}
class ih extends le {
  constructor() {
    super("w:footnoteRef");
  }
}
class ah extends qt {
  constructor() {
    super({
      style: "FootnoteReference"
    }), this.root.push(new ih());
  }
}
const Vs = {
  /** Separator line between body text and footnotes */
  SEPERATOR: "separator",
  /** Continuation separator for footnotes spanning pages */
  CONTINUATION_SEPERATOR: "continuationSeparator"
};
class ui extends le {
  constructor(e) {
    super("w:footnote"), this.root.push(
      new nh({
        type: e.type,
        id: e.id
      })
    );
    for (let t = 0; t < e.children.length; t++) {
      const s = e.children[t];
      t === 0 && s.addRunToFront(new ah()), this.root.push(s);
    }
  }
}
class sh extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      wpc: "xmlns:wpc",
      mc: "xmlns:mc",
      o: "xmlns:o",
      r: "xmlns:r",
      m: "xmlns:m",
      v: "xmlns:v",
      wp14: "xmlns:wp14",
      wp: "xmlns:wp",
      w10: "xmlns:w10",
      w: "xmlns:w",
      w14: "xmlns:w14",
      w15: "xmlns:w15",
      wpg: "xmlns:wpg",
      wpi: "xmlns:wpi",
      wne: "xmlns:wne",
      wps: "xmlns:wps",
      Ignorable: "mc:Ignorable"
    });
  }
}
class oh extends le {
  constructor() {
    super("w:footnotes"), this.root.push(
      new sh({
        wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
        mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
        o: "urn:schemas-microsoft-com:office:office",
        r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
        v: "urn:schemas-microsoft-com:vml",
        wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
        wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
        w10: "urn:schemas-microsoft-com:office:word",
        w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
        w14: "http://schemas.microsoft.com/office/word/2010/wordml",
        w15: "http://schemas.microsoft.com/office/word/2012/wordml",
        wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
        wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
        wne: "http://schemas.microsoft.com/office/word/2006/wordml",
        wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
        Ignorable: "w14 w15 wp14"
      })
    );
    const e = new ui({
      id: -1,
      type: Vs.SEPERATOR,
      children: [
        new Ue({
          spacing: {
            after: 0,
            line: 240,
            lineRule: xt.AUTO
          },
          children: [new Go()]
        })
      ]
    });
    this.root.push(e);
    const t = new ui({
      id: 0,
      type: Vs.CONTINUATION_SEPERATOR,
      children: [
        new Ue({
          spacing: {
            after: 0,
            line: 240,
            lineRule: xt.AUTO
          },
          children: [new Ko()]
        })
      ]
    });
    this.root.push(t);
  }
  /**
   * Creates and adds a new footnote to the collection.
   *
   * @param id - Unique numeric identifier for the footnote
   * @param paragraph - Array of paragraphs that make up the footnote content
   */
  createFootNote(e, t) {
    const s = new ui({
      id: e,
      children: t
    });
    this.root.push(s);
  }
}
class uh {
  constructor() {
    se(this, "footnotess"), se(this, "relationships"), this.footnotess = new oh(), this.relationships = new nt();
  }
  get View() {
    return this.footnotess;
  }
  get Relationships() {
    return this.relationships;
  }
}
class ch extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      wpc: "xmlns:wpc",
      mc: "xmlns:mc",
      o: "xmlns:o",
      r: "xmlns:r",
      m: "xmlns:m",
      v: "xmlns:v",
      wp14: "xmlns:wp14",
      wp: "xmlns:wp",
      w10: "xmlns:w10",
      w: "xmlns:w",
      w14: "xmlns:w14",
      w15: "xmlns:w15",
      wpg: "xmlns:wpg",
      wpi: "xmlns:wpi",
      wne: "xmlns:wne",
      wps: "xmlns:wps",
      cp: "xmlns:cp",
      dc: "xmlns:dc",
      dcterms: "xmlns:dcterms",
      dcmitype: "xmlns:dcmitype",
      xsi: "xmlns:xsi",
      type: "xsi:type",
      cx: "xmlns:cx",
      cx1: "xmlns:cx1",
      cx2: "xmlns:cx2",
      cx3: "xmlns:cx3",
      cx4: "xmlns:cx4",
      cx5: "xmlns:cx5",
      cx6: "xmlns:cx6",
      cx7: "xmlns:cx7",
      cx8: "xmlns:cx8",
      w16cid: "xmlns:w16cid",
      w16se: "xmlns:w16se"
    });
  }
}
let lh = class extends Po {
  constructor(e, t) {
    super("w:hdr", t), se(this, "refId"), this.refId = e, t || this.root.push(
      new ch({
        wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
        mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
        o: "urn:schemas-microsoft-com:office:office",
        r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
        v: "urn:schemas-microsoft-com:vml",
        wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
        wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
        w10: "urn:schemas-microsoft-com:office:word",
        w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
        w14: "http://schemas.microsoft.com/office/word/2010/wordml",
        w15: "http://schemas.microsoft.com/office/word/2012/wordml",
        wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
        wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
        wne: "http://schemas.microsoft.com/office/word/2006/wordml",
        wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
        cx: "http://schemas.microsoft.com/office/drawing/2014/chartex",
        cx1: "http://schemas.microsoft.com/office/drawing/2015/9/8/chartex",
        cx2: "http://schemas.microsoft.com/office/drawing/2015/10/21/chartex",
        cx3: "http://schemas.microsoft.com/office/drawing/2016/5/9/chartex",
        cx4: "http://schemas.microsoft.com/office/drawing/2016/5/10/chartex",
        cx5: "http://schemas.microsoft.com/office/drawing/2016/5/11/chartex",
        cx6: "http://schemas.microsoft.com/office/drawing/2016/5/12/chartex",
        cx7: "http://schemas.microsoft.com/office/drawing/2016/5/13/chartex",
        cx8: "http://schemas.microsoft.com/office/drawing/2016/5/14/chartex",
        w16cid: "http://schemas.microsoft.com/office/word/2016/wordml/cid",
        w16se: "http://schemas.microsoft.com/office/word/2015/wordml/symex"
      })
    );
  }
  get ReferenceId() {
    return this.refId;
  }
  add(e) {
    this.root.push(e);
  }
};
class fh {
  constructor(e, t, s) {
    se(this, "header"), se(this, "relationships"), this.media = e, this.header = new lh(t, s), this.relationships = new nt();
  }
  add(e) {
    return this.header.add(e), this;
  }
  addChildElement(e) {
    this.header.addChildElement(e);
  }
  get View() {
    return this.header;
  }
  get Relationships() {
    return this.relationships;
  }
  get Media() {
    return this.media;
  }
}
class hh {
  constructor() {
    se(this, "map"), this.map = /* @__PURE__ */ new Map();
  }
  /**
   * Adds an image to the media collection.
   *
   * @param key - Unique identifier for this image
   * @param mediaData - Complete image data including file name, transformation, and raw data
   */
  addImage(e, t) {
    this.map.set(e, t);
  }
  /**
   * Gets all images as an array.
   *
   * @returns Read-only array of all media data in the collection
   */
  get Array() {
    return Array.from(this.map.values());
  }
}
const $e = {
  /** Bullet points. */
  BULLET: "bullet"
};
class dh extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      ilvl: "w:ilvl",
      tentative: "w15:tentative"
    });
  }
}
class ph extends le {
  constructor(e) {
    super("w:numFmt"), this.root.push(
      new Ie({
        val: e
      })
    );
  }
}
class mh extends le {
  constructor(e) {
    super("w:lvlText"), this.root.push(
      new Ie({
        val: e
      })
    );
  }
}
class gh extends le {
  constructor(e) {
    super("w:lvlJc"), this.root.push(
      new Ie({
        val: e
      })
    );
  }
}
class wh extends le {
  constructor(e) {
    super("w:suff"), this.root.push(
      new Ie({
        val: e
      })
    );
  }
}
class yh extends le {
  constructor() {
    super("w:isLgl");
  }
}
class vh extends le {
  /**
   * Creates a new numbering level.
   *
   * @param options - Level configuration options
   * @throws Error if level is greater than 9 (Word limitation)
   */
  constructor({
    level: e,
    format: t,
    text: s,
    alignment: o = ze.START,
    start: u = 1,
    style: l,
    suffix: n,
    isLegalNumberingStyle: f
  }) {
    if (super("w:lvl"), se(this, "paragraphProperties"), se(this, "runProperties"), this.root.push(new Dt("w:start", Oe(u))), t && this.root.push(new ph(t)), n && this.root.push(new wh(n)), f && this.root.push(new yh()), s && this.root.push(new mh(s)), this.root.push(new gh(o)), this.paragraphProperties = new lt(l && l.paragraph), this.runProperties = new ft(l && l.run), this.root.push(this.paragraphProperties), this.root.push(this.runProperties), e > 9)
      throw new Error(
        "Level cannot be greater than 9. Read more here: https://answers.microsoft.com/en-us/msoffice/forum/all/does-word-support-more-than-9-list-levels/d130fdcd-1781-446d-8c84-c6c79124e4d7"
      );
    this.root.push(
      new dh({
        ilvl: Oe(e),
        tentative: 1
      })
    );
  }
}
class bh extends vh {
  // This is the level that sits under abstractNum
}
class _h extends le {
  /**
   * Creates a new multi-level type specification.
   *
   * @param value - The multi-level type: "singleLevel", "multilevel", or "hybridMultilevel"
   */
  constructor(e) {
    super("w:multiLevelType"), this.root.push(
      new Ie({
        val: e
      })
    );
  }
}
class Eh extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      abstractNumId: "w:abstractNumId",
      restartNumberingAfterBreak: "w15:restartNumberingAfterBreak"
    });
  }
}
class $s extends le {
  /**
   * Creates a new abstract numbering definition.
   *
   * @param id - Unique identifier for this abstract numbering definition
   * @param levelOptions - Array of level definitions (up to 9 levels)
   */
  constructor(e, t) {
    super("w:abstractNum"), se(this, "id"), this.root.push(
      new Eh({
        abstractNumId: Oe(e),
        restartNumberingAfterBreak: 0
      })
    ), this.root.push(new _h("hybridMultilevel")), this.id = e;
    for (const s of t)
      this.root.push(new bh(s));
  }
}
class xh extends le {
  constructor(e) {
    super("w:abstractNumId"), this.root.push(
      new Ie({
        val: e
      })
    );
  }
}
class Sh extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", { numId: "w:numId" });
  }
}
class Xs extends le {
  /**
   * Creates a new concrete numbering instance.
   *
   * @param options - Configuration options for the numbering instance
   */
  constructor(e) {
    if (super("w:num"), se(this, "numId"), se(this, "reference"), se(this, "instance"), this.numId = e.numId, this.reference = e.reference, this.instance = e.instance, this.root.push(
      new Sh({
        numId: Oe(e.numId)
      })
    ), this.root.push(new xh(Oe(e.abstractNumId))), e.overrideLevels && e.overrideLevels.length)
      for (const t of e.overrideLevels)
        this.root.push(new Ah(t.num, t.start));
  }
}
class Th extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", { ilvl: "w:ilvl" });
  }
}
class Ah extends le {
  /**
   * Creates a new level override.
   *
   * @param levelNum - The level number to override (0-8)
   * @param start - Optional starting number for the level
   */
  constructor(e, t) {
    super("w:lvlOverride"), this.root.push(new Th({ ilvl: e })), t !== void 0 && this.root.push(new Rh(t));
  }
}
class kh extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", { val: "w:val" });
  }
}
class Rh extends le {
  /**
   * Creates a new start override.
   *
   * @param start - The starting number
   */
  constructor(e) {
    super("w:startOverride"), this.root.push(new kh({ val: e }));
  }
}
class Ch extends le {
  /**
   * Creates a new numbering definition collection.
   *
   * Initializes the numbering with a default bullet list configuration and
   * any custom numbering configurations provided in the options.
   *
   * @param options - Configuration options for numbering definitions
   */
  constructor(e) {
    super("w:numbering"), se(this, "abstractNumberingMap", /* @__PURE__ */ new Map()), se(this, "concreteNumberingMap", /* @__PURE__ */ new Map()), se(this, "referenceConfigMap", /* @__PURE__ */ new Map()), se(this, "abstractNumUniqueNumericId", Dl()), se(this, "concreteNumUniqueNumericId", Bl()), this.root.push(
      new gr(
        ["wpc", "mc", "o", "r", "m", "v", "wp14", "wp", "w10", "w", "w14", "w15", "wpg", "wpi", "wne", "wps"],
        "w14 w15 wp14"
      )
    );
    const t = new $s(this.abstractNumUniqueNumericId(), [
      {
        level: 0,
        format: $e.BULLET,
        text: "●",
        alignment: ze.LEFT,
        style: {
          paragraph: {
            indent: { left: Be(0.5), hanging: Be(0.25) }
          }
        }
      },
      {
        level: 1,
        format: $e.BULLET,
        text: "○",
        alignment: ze.LEFT,
        style: {
          paragraph: {
            indent: { left: Be(1), hanging: Be(0.25) }
          }
        }
      },
      {
        level: 2,
        format: $e.BULLET,
        text: "■",
        alignment: ze.LEFT,
        style: {
          paragraph: {
            indent: { left: 2160, hanging: Be(0.25) }
          }
        }
      },
      {
        level: 3,
        format: $e.BULLET,
        text: "●",
        alignment: ze.LEFT,
        style: {
          paragraph: {
            indent: { left: 2880, hanging: Be(0.25) }
          }
        }
      },
      {
        level: 4,
        format: $e.BULLET,
        text: "○",
        alignment: ze.LEFT,
        style: {
          paragraph: {
            indent: { left: 3600, hanging: Be(0.25) }
          }
        }
      },
      {
        level: 5,
        format: $e.BULLET,
        text: "■",
        alignment: ze.LEFT,
        style: {
          paragraph: {
            indent: { left: 4320, hanging: Be(0.25) }
          }
        }
      },
      {
        level: 6,
        format: $e.BULLET,
        text: "●",
        alignment: ze.LEFT,
        style: {
          paragraph: {
            indent: { left: 5040, hanging: Be(0.25) }
          }
        }
      },
      {
        level: 7,
        format: $e.BULLET,
        text: "●",
        alignment: ze.LEFT,
        style: {
          paragraph: {
            indent: { left: 5760, hanging: Be(0.25) }
          }
        }
      },
      {
        level: 8,
        format: $e.BULLET,
        text: "●",
        alignment: ze.LEFT,
        style: {
          paragraph: {
            indent: { left: 6480, hanging: Be(0.25) }
          }
        }
      }
    ]);
    this.concreteNumberingMap.set(
      "default-bullet-numbering",
      new Xs({
        numId: 1,
        abstractNumId: t.id,
        reference: "default-bullet-numbering",
        instance: 0,
        overrideLevels: [
          {
            num: 0,
            start: 1
          }
        ]
      })
    ), this.abstractNumberingMap.set("default-bullet-numbering", t);
    for (const s of e.config)
      this.abstractNumberingMap.set(s.reference, new $s(this.abstractNumUniqueNumericId(), s.levels)), this.referenceConfigMap.set(s.reference, s.levels);
  }
  /**
   * Prepares the numbering definitions for XML serialization.
   *
   * Adds all abstract and concrete numbering definitions to the XML tree.
   *
   * @param context - The XML context
   * @returns The prepared XML object
   */
  prepForXml(e) {
    for (const t of this.abstractNumberingMap.values())
      this.root.push(t);
    for (const t of this.concreteNumberingMap.values())
      this.root.push(t);
    return super.prepForXml(e);
  }
  /**
   * Creates a concrete numbering instance from an abstract numbering definition.
   *
   * This method creates a new concrete numbering instance that references an
   * abstract numbering definition. It's used internally when paragraphs reference
   * numbering configurations.
   *
   * @param reference - The reference name of the abstract numbering definition
   * @param instance - The instance number for this concrete numbering
   */
  createConcreteNumberingInstance(e, t) {
    const s = this.abstractNumberingMap.get(e);
    if (!s)
      return;
    const o = `${e}-${t}`;
    if (this.concreteNumberingMap.has(o))
      return;
    const u = this.referenceConfigMap.get(e), l = u && u[0].start, n = {
      numId: this.concreteNumUniqueNumericId(),
      abstractNumId: s.id,
      reference: e,
      instance: t,
      overrideLevels: [
        typeof l == "number" && Number.isInteger(l) ? {
          num: 0,
          start: l
        } : {
          num: 0,
          start: 1
        }
      ]
    };
    this.concreteNumberingMap.set(o, new Xs(n));
  }
  /**
   * Gets all concrete numbering instances.
   *
   * @returns An array of all concrete numbering instances
   */
  get ConcreteNumbering() {
    return Array.from(this.concreteNumberingMap.values());
  }
  /**
   * Gets all reference configurations.
   *
   * @returns An array of all numbering reference configurations
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get ReferenceConfig() {
    return Array.from(this.referenceConfigMap.values());
  }
}
const Ih = (r) => new we({
  name: "w:compatSetting",
  attributes: {
    version: { key: "w:val", value: r },
    name: { key: "w:name", value: "compatibilityMode" },
    uri: { key: "w:uri", value: "http://schemas.microsoft.com/office/word" }
  }
});
class Nh extends le {
  constructor(e) {
    super("w:compat"), e.version && this.root.push(Ih(e.version)), e.useSingleBorderforContiguousCells && this.root.push(new ue("w:useSingleBorderforContiguousCells", e.useSingleBorderforContiguousCells)), e.wordPerfectJustification && this.root.push(new ue("w:wpJustification", e.wordPerfectJustification)), e.noTabStopForHangingIndent && this.root.push(new ue("w:noTabHangInd", e.noTabStopForHangingIndent)), e.noLeading && this.root.push(new ue("w:noLeading", e.noLeading)), e.spaceForUnderline && this.root.push(new ue("w:spaceForUL", e.spaceForUnderline)), e.noColumnBalance && this.root.push(new ue("w:noColumnBalance", e.noColumnBalance)), e.balanceSingleByteDoubleByteWidth && this.root.push(new ue("w:balanceSingleByteDoubleByteWidth", e.balanceSingleByteDoubleByteWidth)), e.noExtraLineSpacing && this.root.push(new ue("w:noExtraLineSpacing", e.noExtraLineSpacing)), e.doNotLeaveBackslashAlone && this.root.push(new ue("w:doNotLeaveBackslashAlone", e.doNotLeaveBackslashAlone)), e.underlineTrailingSpaces && this.root.push(new ue("w:ulTrailSpace", e.underlineTrailingSpaces)), e.doNotExpandShiftReturn && this.root.push(new ue("w:doNotExpandShiftReturn", e.doNotExpandShiftReturn)), e.spacingInWholePoints && this.root.push(new ue("w:spacingInWholePoints", e.spacingInWholePoints)), e.lineWrapLikeWord6 && this.root.push(new ue("w:lineWrapLikeWord6", e.lineWrapLikeWord6)), e.printBodyTextBeforeHeader && this.root.push(new ue("w:printBodyTextBeforeHeader", e.printBodyTextBeforeHeader)), e.printColorsBlack && this.root.push(new ue("w:printColBlack", e.printColorsBlack)), e.spaceWidth && this.root.push(new ue("w:wpSpaceWidth", e.spaceWidth)), e.showBreaksInFrames && this.root.push(new ue("w:showBreaksInFrames", e.showBreaksInFrames)), e.subFontBySize && this.root.push(new ue("w:subFontBySize", e.subFontBySize)), e.suppressBottomSpacing && this.root.push(new ue("w:suppressBottomSpacing", e.suppressBottomSpacing)), e.suppressTopSpacing && this.root.push(new ue("w:suppressTopSpacing", e.suppressTopSpacing)), e.suppressSpacingAtTopOfPage && this.root.push(new ue("w:suppressSpacingAtTopOfPage", e.suppressSpacingAtTopOfPage)), e.suppressTopSpacingWP && this.root.push(new ue("w:suppressTopSpacingWP", e.suppressTopSpacingWP)), e.suppressSpBfAfterPgBrk && this.root.push(new ue("w:suppressSpBfAfterPgBrk", e.suppressSpBfAfterPgBrk)), e.swapBordersFacingPages && this.root.push(new ue("w:swapBordersFacingPages", e.swapBordersFacingPages)), e.convertMailMergeEsc && this.root.push(new ue("w:convMailMergeEsc", e.convertMailMergeEsc)), e.truncateFontHeightsLikeWP6 && this.root.push(new ue("w:truncateFontHeightsLikeWP6", e.truncateFontHeightsLikeWP6)), e.macWordSmallCaps && this.root.push(new ue("w:mwSmallCaps", e.macWordSmallCaps)), e.usePrinterMetrics && this.root.push(new ue("w:usePrinterMetrics", e.usePrinterMetrics)), e.doNotSuppressParagraphBorders && this.root.push(new ue("w:doNotSuppressParagraphBorders", e.doNotSuppressParagraphBorders)), e.wrapTrailSpaces && this.root.push(new ue("w:wrapTrailSpaces", e.wrapTrailSpaces)), e.footnoteLayoutLikeWW8 && this.root.push(new ue("w:footnoteLayoutLikeWW8", e.footnoteLayoutLikeWW8)), e.shapeLayoutLikeWW8 && this.root.push(new ue("w:shapeLayoutLikeWW8", e.shapeLayoutLikeWW8)), e.alignTablesRowByRow && this.root.push(new ue("w:alignTablesRowByRow", e.alignTablesRowByRow)), e.forgetLastTabAlignment && this.root.push(new ue("w:forgetLastTabAlignment", e.forgetLastTabAlignment)), e.adjustLineHeightInTable && this.root.push(new ue("w:adjustLineHeightInTable", e.adjustLineHeightInTable)), e.autoSpaceLikeWord95 && this.root.push(new ue("w:autoSpaceLikeWord95", e.autoSpaceLikeWord95)), e.noSpaceRaiseLower && this.root.push(new ue("w:noSpaceRaiseLower", e.noSpaceRaiseLower)), e.doNotUseHTMLParagraphAutoSpacing && this.root.push(new ue("w:doNotUseHTMLParagraphAutoSpacing", e.doNotUseHTMLParagraphAutoSpacing)), e.layoutRawTableWidth && this.root.push(new ue("w:layoutRawTableWidth", e.layoutRawTableWidth)), e.layoutTableRowsApart && this.root.push(new ue("w:layoutTableRowsApart", e.layoutTableRowsApart)), e.useWord97LineBreakRules && this.root.push(new ue("w:useWord97LineBreakRules", e.useWord97LineBreakRules)), e.doNotBreakWrappedTables && this.root.push(new ue("w:doNotBreakWrappedTables", e.doNotBreakWrappedTables)), e.doNotSnapToGridInCell && this.root.push(new ue("w:doNotSnapToGridInCell", e.doNotSnapToGridInCell)), e.selectFieldWithFirstOrLastCharacter && this.root.push(new ue("w:selectFldWithFirstOrLastChar", e.selectFieldWithFirstOrLastCharacter)), e.applyBreakingRules && this.root.push(new ue("w:applyBreakingRules", e.applyBreakingRules)), e.doNotWrapTextWithPunctuation && this.root.push(new ue("w:doNotWrapTextWithPunct", e.doNotWrapTextWithPunctuation)), e.doNotUseEastAsianBreakRules && this.root.push(new ue("w:doNotUseEastAsianBreakRules", e.doNotUseEastAsianBreakRules)), e.useWord2002TableStyleRules && this.root.push(new ue("w:useWord2002TableStyleRules", e.useWord2002TableStyleRules)), e.growAutofit && this.root.push(new ue("w:growAutofit", e.growAutofit)), e.useFELayout && this.root.push(new ue("w:useFELayout", e.useFELayout)), e.useNormalStyleForList && this.root.push(new ue("w:useNormalStyleForList", e.useNormalStyleForList)), e.doNotUseIndentAsNumberingTabStop && this.root.push(new ue("w:doNotUseIndentAsNumberingTabStop", e.doNotUseIndentAsNumberingTabStop)), e.useAlternateEastAsianLineBreakRules && this.root.push(new ue("w:useAltKinsokuLineBreakRules", e.useAlternateEastAsianLineBreakRules)), e.allowSpaceOfSameStyleInTable && this.root.push(new ue("w:allowSpaceOfSameStyleInTable", e.allowSpaceOfSameStyleInTable)), e.doNotSuppressIndentation && this.root.push(new ue("w:doNotSuppressIndentation", e.doNotSuppressIndentation)), e.doNotAutofitConstrainedTables && this.root.push(new ue("w:doNotAutofitConstrainedTables", e.doNotAutofitConstrainedTables)), e.autofitToFirstFixedWidthCell && this.root.push(new ue("w:autofitToFirstFixedWidthCell", e.autofitToFirstFixedWidthCell)), e.underlineTabInNumberingList && this.root.push(new ue("w:underlineTabInNumList", e.underlineTabInNumberingList)), e.displayHangulFixedWidth && this.root.push(new ue("w:displayHangulFixedWidth", e.displayHangulFixedWidth)), e.splitPgBreakAndParaMark && this.root.push(new ue("w:splitPgBreakAndParaMark", e.splitPgBreakAndParaMark)), e.doNotVerticallyAlignCellWithSp && this.root.push(new ue("w:doNotVertAlignCellWithSp", e.doNotVerticallyAlignCellWithSp)), e.doNotBreakConstrainedForcedTable && this.root.push(new ue("w:doNotBreakConstrainedForcedTable", e.doNotBreakConstrainedForcedTable)), e.ignoreVerticalAlignmentInTextboxes && this.root.push(new ue("w:doNotVertAlignInTxbx", e.ignoreVerticalAlignmentInTextboxes)), e.useAnsiKerningPairs && this.root.push(new ue("w:useAnsiKerningPairs", e.useAnsiKerningPairs)), e.cachedColumnBalance && this.root.push(new ue("w:cachedColBalance", e.cachedColumnBalance));
  }
}
class Oh extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      wpc: "xmlns:wpc",
      mc: "xmlns:mc",
      o: "xmlns:o",
      r: "xmlns:r",
      m: "xmlns:m",
      v: "xmlns:v",
      wp14: "xmlns:wp14",
      wp: "xmlns:wp",
      w10: "xmlns:w10",
      w: "xmlns:w",
      w14: "xmlns:w14",
      w15: "xmlns:w15",
      wpg: "xmlns:wpg",
      wpi: "xmlns:wpi",
      wne: "xmlns:wne",
      wps: "xmlns:wps",
      Ignorable: "mc:Ignorable"
    });
  }
}
class Ph extends le {
  constructor(e) {
    var t, s, o, u, l, n, f, g;
    super("w:settings"), this.root.push(
      new Oh({
        wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
        mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
        o: "urn:schemas-microsoft-com:office:office",
        r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
        v: "urn:schemas-microsoft-com:vml",
        wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
        wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
        w10: "urn:schemas-microsoft-com:office:word",
        w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
        w14: "http://schemas.microsoft.com/office/word/2010/wordml",
        w15: "http://schemas.microsoft.com/office/word/2012/wordml",
        wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
        wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
        wne: "http://schemas.microsoft.com/office/word/2006/wordml",
        wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
        Ignorable: "w14 w15 wp14"
      })
    ), this.root.push(new ue("w:displayBackgroundShape", !0)), e.trackRevisions !== void 0 && this.root.push(new ue("w:trackRevisions", e.trackRevisions)), e.evenAndOddHeaders !== void 0 && this.root.push(new ue("w:evenAndOddHeaders", e.evenAndOddHeaders)), e.updateFields !== void 0 && this.root.push(new ue("w:updateFields", e.updateFields)), e.defaultTabStop !== void 0 && this.root.push(new Dt("w:defaultTabStop", e.defaultTabStop)), ((t = e.hyphenation) == null ? void 0 : t.autoHyphenation) !== void 0 && this.root.push(new ue("w:autoHyphenation", e.hyphenation.autoHyphenation)), ((s = e.hyphenation) == null ? void 0 : s.hyphenationZone) !== void 0 && this.root.push(new Dt("w:hyphenationZone", e.hyphenation.hyphenationZone)), ((o = e.hyphenation) == null ? void 0 : o.consecutiveHyphenLimit) !== void 0 && this.root.push(new Dt("w:consecutiveHyphenLimit", e.hyphenation.consecutiveHyphenLimit)), ((u = e.hyphenation) == null ? void 0 : u.doNotHyphenateCaps) !== void 0 && this.root.push(new ue("w:doNotHyphenateCaps", e.hyphenation.doNotHyphenateCaps)), this.root.push(
      new Nh(et(ge({}, (l = e.compatibility) != null ? l : {}), {
        version: (g = (f = (n = e.compatibility) == null ? void 0 : n.version) != null ? f : e.compatibilityModeVersion) != null ? g : 15
      }))
    );
  }
}
class Vo extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", { val: "w:val" });
  }
}
class Fh extends le {
  constructor(e) {
    super("w:name"), this.root.push(new Vo({ val: e }));
  }
}
class Dh extends le {
  constructor(e) {
    super("w:uiPriority"), this.root.push(new Vo({ val: Oe(e) }));
  }
}
class Bh extends ve {
  constructor() {
    super(...arguments), se(this, "xmlKeys", {
      type: "w:type",
      styleId: "w:styleId",
      default: "w:default",
      customStyle: "w:customStyle"
    });
  }
}
class $o extends le {
  constructor(e, t) {
    super("w:style"), this.root.push(new Bh(e)), t.name && this.root.push(new Fh(t.name)), t.basedOn && this.root.push(new gt("w:basedOn", t.basedOn)), t.next && this.root.push(new gt("w:next", t.next)), t.link && this.root.push(new gt("w:link", t.link)), t.uiPriority !== void 0 && this.root.push(new Dh(t.uiPriority)), t.semiHidden !== void 0 && this.root.push(new ue("w:semiHidden", t.semiHidden)), t.unhideWhenUsed !== void 0 && this.root.push(new ue("w:unhideWhenUsed", t.unhideWhenUsed)), t.quickFormat !== void 0 && this.root.push(new ue("w:qFormat", t.quickFormat));
  }
}
class Gt extends $o {
  constructor(e) {
    super({ type: "paragraph", styleId: e.id }, e), se(this, "paragraphProperties"), se(this, "runProperties"), this.paragraphProperties = new lt(e.paragraph), this.runProperties = new ft(e.run), this.root.push(this.paragraphProperties), this.root.push(this.runProperties);
  }
}
class Tt extends $o {
  constructor(e) {
    super(
      { type: "character", styleId: e.id },
      ge({
        uiPriority: 99,
        unhideWhenUsed: !0
      }, e)
    ), se(this, "runProperties"), this.runProperties = new ft(e.run), this.root.push(this.runProperties);
  }
}
class it extends Gt {
  constructor(e) {
    super(ge({
      basedOn: "Normal",
      next: "Normal",
      quickFormat: !0
    }, e));
  }
}
class Lh extends it {
  constructor(e) {
    super(ge({
      id: "Title",
      name: "Title"
    }, e));
  }
}
class Uh extends it {
  constructor(e) {
    super(ge({
      id: "Heading1",
      name: "Heading 1"
    }, e));
  }
}
class Mh extends it {
  constructor(e) {
    super(ge({
      id: "Heading2",
      name: "Heading 2"
    }, e));
  }
}
class jh extends it {
  constructor(e) {
    super(ge({
      id: "Heading3",
      name: "Heading 3"
    }, e));
  }
}
class zh extends it {
  constructor(e) {
    super(ge({
      id: "Heading4",
      name: "Heading 4"
    }, e));
  }
}
class Wh extends it {
  constructor(e) {
    super(ge({
      id: "Heading5",
      name: "Heading 5"
    }, e));
  }
}
class qh extends it {
  constructor(e) {
    super(ge({
      id: "Heading6",
      name: "Heading 6"
    }, e));
  }
}
class Hh extends it {
  constructor(e) {
    super(ge({
      id: "Strong",
      name: "Strong"
    }, e));
  }
}
class Kh extends Gt {
  constructor(e) {
    super(ge({
      id: "ListParagraph",
      name: "List Paragraph",
      basedOn: "Normal",
      quickFormat: !0
    }, e));
  }
}
class Gh extends Gt {
  constructor(e) {
    super(ge({
      id: "FootnoteText",
      name: "footnote text",
      link: "FootnoteTextChar",
      basedOn: "Normal",
      uiPriority: 99,
      semiHidden: !0,
      unhideWhenUsed: !0,
      paragraph: {
        spacing: {
          after: 0,
          line: 240,
          lineRule: xt.AUTO
        }
      },
      run: {
        size: 20
      }
    }, e));
  }
}
class Vh extends Tt {
  constructor(e) {
    super(ge({
      id: "FootnoteReference",
      name: "footnote reference",
      basedOn: "DefaultParagraphFont",
      semiHidden: !0,
      run: {
        superScript: !0
      }
    }, e));
  }
}
class $h extends Tt {
  constructor(e) {
    super(ge({
      id: "FootnoteTextChar",
      name: "Footnote Text Char",
      basedOn: "DefaultParagraphFont",
      link: "FootnoteText",
      semiHidden: !0,
      run: {
        size: 20
      }
    }, e));
  }
}
class Xh extends Gt {
  constructor(e) {
    super(ge({
      id: "EndnoteText",
      name: "endnote text",
      link: "EndnoteTextChar",
      basedOn: "Normal",
      uiPriority: 99,
      semiHidden: !0,
      unhideWhenUsed: !0,
      paragraph: {
        spacing: {
          after: 0,
          line: 240,
          lineRule: xt.AUTO
        }
      },
      run: {
        size: 20
      }
    }, e));
  }
}
class Zh extends Tt {
  constructor(e) {
    super(ge({
      id: "EndnoteReference",
      name: "endnote reference",
      basedOn: "DefaultParagraphFont",
      semiHidden: !0,
      run: {
        superScript: !0
      }
    }, e));
  }
}
class Yh extends Tt {
  constructor(e) {
    super(ge({
      id: "EndnoteTextChar",
      name: "Endnote Text Char",
      basedOn: "DefaultParagraphFont",
      link: "EndnoteText",
      semiHidden: !0,
      run: {
        size: 20
      }
    }, e));
  }
}
class Jh extends Tt {
  constructor(e) {
    super(ge({
      id: "Hyperlink",
      name: "Hyperlink",
      basedOn: "DefaultParagraphFont",
      run: {
        color: "0563C1",
        underline: {
          type: Mo.SINGLE
        }
      }
    }, e));
  }
}
class ci extends le {
  constructor(e) {
    if (super("w:styles"), e.initialStyles && this.root.push(e.initialStyles), e.importedStyles)
      for (const t of e.importedStyles)
        this.root.push(t);
    if (e.paragraphStyles)
      for (const t of e.paragraphStyles)
        this.root.push(new Gt(t));
    if (e.characterStyles)
      for (const t of e.characterStyles)
        this.root.push(new Tt(t));
  }
}
class Qh extends le {
  constructor(e) {
    super("w:pPrDefault"), this.root.push(new lt(e));
  }
}
class ed extends le {
  constructor(e) {
    super("w:rPrDefault"), this.root.push(new ft(e));
  }
}
class td extends le {
  constructor(e) {
    super("w:docDefaults"), se(this, "runPropertiesDefaults"), se(this, "paragraphPropertiesDefaults"), this.runPropertiesDefaults = new ed(e.run), this.paragraphPropertiesDefaults = new Qh(e.paragraph), this.root.push(this.runPropertiesDefaults), this.root.push(this.paragraphPropertiesDefaults);
  }
}
class rd {
  /**
   * Creates new Styles based on the given XML data.
   *
   * Parses the styles XML and converts them to XmlComponent instances.
   *
   * Example content from styles.xml:
   * ```xml
   * <?xml version="1.0"?>
   * <w:styles xmlns:mc="some schema" ...>
   *   <w:style w:type="paragraph" w:styleId="Heading1">
   *     <w:name w:val="heading 1"/>
   *     ...
   *   </w:style>
   *   <w:style w:type="paragraph" w:styleId="Heading2">
   *     <w:name w:val="heading 2"/>
   *     ...
   *   </w:style>
   *   <w:docDefaults>...</w:docDefaults>
   * </w:styles>
   * ```
   *
   * @param xmlData - XML string containing styles data from styles.xml
   * @returns Styles object containing all parsed styles
   * @throws Error if styles element cannot be found in the XML
   */
  newInstance(e) {
    const t = Oo.xml2js(e, { compact: !1 });
    let s;
    for (const u of t.elements || [])
      u.name === "w:styles" && (s = u);
    if (s === void 0)
      throw new Error("can not find styles element");
    const o = s.elements || [];
    return {
      initialStyles: new Zc(s.attributes),
      importedStyles: o.map((u) => Li(u))
    };
  }
}
class li {
  newInstance(e = {}) {
    var t;
    return {
      initialStyles: new gr(["mc", "r", "w", "w14", "w15"], "w14 w15"),
      importedStyles: [
        new td((t = e.document) != null ? t : {}),
        new Lh(ge({
          run: {
            size: 56
          }
        }, e.title)),
        new Uh(ge({
          run: {
            color: "2E74B5",
            size: 32
          }
        }, e.heading1)),
        new Mh(ge({
          run: {
            color: "2E74B5",
            size: 26
          }
        }, e.heading2)),
        new jh(ge({
          run: {
            color: "1F4D78",
            size: 24
          }
        }, e.heading3)),
        new zh(ge({
          run: {
            color: "2E74B5",
            italics: !0
          }
        }, e.heading4)),
        new Wh(ge({
          run: {
            color: "2E74B5"
          }
        }, e.heading5)),
        new qh(ge({
          run: {
            color: "1F4D78"
          }
        }, e.heading6)),
        new Hh(ge({
          run: {
            bold: !0
          }
        }, e.strong)),
        new Kh(e.listParagraph || {}),
        new Jh(e.hyperlink || {}),
        new Vh(e.footnoteReference || {}),
        new Gh(e.footnoteText || {}),
        new $h(e.footnoteTextChar || {}),
        new Zh(e.endnoteReference || {}),
        new Xh(e.endnoteText || {}),
        new Yh(e.endnoteTextChar || {})
      ]
    };
  }
}
class Xo {
  constructor(e) {
    se(this, "currentRelationshipId", 1), se(this, "documentWrapper"), se(this, "headers", []), se(this, "footers", []), se(this, "coreProperties"), se(this, "numbering"), se(this, "media"), se(this, "fileRelationships"), se(this, "footnotesWrapper"), se(this, "endnotesWrapper"), se(this, "settings"), se(this, "contentTypes"), se(this, "customProperties"), se(this, "appProperties"), se(this, "styles"), se(this, "comments"), se(this, "fontWrapper");
    var t, s, o, u, l, n, f, g, _, k, R, E, C;
    if (this.coreProperties = new Sf(et(ge({}, e), {
      creator: (t = e.creator) != null ? t : "Un-named",
      revision: (s = e.revision) != null ? s : 1,
      lastModifiedBy: (o = e.lastModifiedBy) != null ? o : "Un-named"
    })), this.numbering = new Ch(e.numbering ? e.numbering : { config: [] }), this.comments = new Gl((u = e.comments) != null ? u : { children: [] }), this.fileRelationships = new nt(), this.customProperties = new If((l = e.customProperties) != null ? l : []), this.appProperties = new _f(), this.footnotesWrapper = new uh(), this.endnotesWrapper = new Qf(), this.contentTypes = new xf(), this.documentWrapper = new Gf({ background: e.background }), this.settings = new Ph({
      compatibilityModeVersion: e.compatabilityModeVersion,
      compatibility: e.compatibility,
      evenAndOddHeaders: !!e.evenAndOddHeaderAndFooters,
      trackRevisions: (n = e.features) == null ? void 0 : n.trackRevisions,
      updateFields: (f = e.features) == null ? void 0 : f.updateFields,
      defaultTabStop: e.defaultTabStop,
      hyphenation: {
        autoHyphenation: (g = e.hyphenation) == null ? void 0 : g.autoHyphenation,
        hyphenationZone: (_ = e.hyphenation) == null ? void 0 : _.hyphenationZone,
        consecutiveHyphenLimit: (k = e.hyphenation) == null ? void 0 : k.consecutiveHyphenLimit,
        doNotHyphenateCaps: (R = e.hyphenation) == null ? void 0 : R.doNotHyphenateCaps
      }
    }), this.media = new hh(), e.externalStyles !== void 0) {
      const A = new li().newInstance((E = e.styles) == null ? void 0 : E.default), y = new rd().newInstance(e.externalStyles);
      this.styles = new ci(et(ge({}, y), {
        importedStyles: [...A.importedStyles, ...y.importedStyles]
      }));
    } else if (e.styles) {
      const A = new li().newInstance(e.styles.default);
      this.styles = new ci(ge(ge({}, A), e.styles));
    } else {
      const w = new li();
      this.styles = new ci(w.newInstance());
    }
    this.addDefaultRelationships();
    for (const w of e.sections)
      this.addSection(w);
    if (e.footnotes)
      for (const w in e.footnotes)
        this.footnotesWrapper.View.createFootNote(parseFloat(w), e.footnotes[w].children);
    if (e.endnotes)
      for (const w in e.endnotes)
        this.endnotesWrapper.View.createEndnote(parseFloat(w), e.endnotes[w].children);
    this.fontWrapper = new qo((C = e.fonts) != null ? C : []);
  }
  addSection({ headers: e = {}, footers: t = {}, children: s, properties: o }) {
    this.documentWrapper.View.Body.addSection(et(ge({}, o), {
      headerWrapperGroup: {
        default: e.default ? this.createHeader(e.default) : void 0,
        first: e.first ? this.createHeader(e.first) : void 0,
        even: e.even ? this.createHeader(e.even) : void 0
      },
      footerWrapperGroup: {
        default: t.default ? this.createFooter(t.default) : void 0,
        first: t.first ? this.createFooter(t.first) : void 0,
        even: t.even ? this.createFooter(t.even) : void 0
      }
    }));
    for (const u of s)
      this.documentWrapper.View.add(u);
  }
  createHeader(e) {
    const t = new fh(this.media, this.currentRelationshipId++);
    for (const s of e.options.children)
      t.add(s);
    return this.addHeaderToDocument(t), t;
  }
  createFooter(e) {
    const t = new rh(this.media, this.currentRelationshipId++);
    for (const s of e.options.children)
      t.add(s);
    return this.addFooterToDocument(t), t;
  }
  addHeaderToDocument(e, t = wt.DEFAULT) {
    this.headers.push({ header: e, type: t }), this.documentWrapper.Relationships.addRelationship(
      e.View.ReferenceId,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header",
      `header${this.headers.length}.xml`
    ), this.contentTypes.addHeader(this.headers.length);
  }
  addFooterToDocument(e, t = wt.DEFAULT) {
    this.footers.push({ footer: e, type: t }), this.documentWrapper.Relationships.addRelationship(
      e.View.ReferenceId,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer",
      `footer${this.footers.length}.xml`
    ), this.contentTypes.addFooter(this.footers.length);
  }
  addDefaultRelationships() {
    this.fileRelationships.addRelationship(
      1,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
      "word/document.xml"
    ), this.fileRelationships.addRelationship(
      2,
      "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
      "docProps/core.xml"
    ), this.fileRelationships.addRelationship(
      3,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties",
      "docProps/app.xml"
    ), this.fileRelationships.addRelationship(
      4,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties",
      "docProps/custom.xml"
    ), this.documentWrapper.Relationships.addRelationship(
      // eslint-disable-next-line functional/immutable-data
      this.currentRelationshipId++,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
      "styles.xml"
    ), this.documentWrapper.Relationships.addRelationship(
      // eslint-disable-next-line functional/immutable-data
      this.currentRelationshipId++,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering",
      "numbering.xml"
    ), this.documentWrapper.Relationships.addRelationship(
      // eslint-disable-next-line functional/immutable-data
      this.currentRelationshipId++,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes",
      "footnotes.xml"
    ), this.documentWrapper.Relationships.addRelationship(
      // eslint-disable-next-line functional/immutable-data
      this.currentRelationshipId++,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes",
      "endnotes.xml"
    ), this.documentWrapper.Relationships.addRelationship(
      // eslint-disable-next-line functional/immutable-data
      this.currentRelationshipId++,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings",
      "settings.xml"
    ), this.documentWrapper.Relationships.addRelationship(
      // eslint-disable-next-line functional/immutable-data
      this.currentRelationshipId++,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments",
      "comments.xml"
    );
  }
  get Document() {
    return this.documentWrapper;
  }
  get Styles() {
    return this.styles;
  }
  get CoreProperties() {
    return this.coreProperties;
  }
  get Numbering() {
    return this.numbering;
  }
  get Media() {
    return this.media;
  }
  get FileRelationships() {
    return this.fileRelationships;
  }
  get Headers() {
    return this.headers.map((e) => e.header);
  }
  get Footers() {
    return this.footers.map((e) => e.footer);
  }
  get ContentTypes() {
    return this.contentTypes;
  }
  get CustomProperties() {
    return this.customProperties;
  }
  get AppProperties() {
    return this.appProperties;
  }
  get FootNotes() {
    return this.footnotesWrapper;
  }
  get Endnotes() {
    return this.endnotesWrapper;
  }
  get Settings() {
    return this.settings;
  }
  get Comments() {
    return this.comments;
  }
  get FontTable() {
    return this.fontWrapper;
  }
}
var nd = Fi();
function sr(r) {
  throw new Error('Could not dynamically require "' + r + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var fi = { exports: {} }, Zs;
function id() {
  return Zs || (Zs = 1, function(r, e) {
    (function(t) {
      r.exports = t();
    })(function() {
      return function t(s, o, u) {
        function l(g, _) {
          if (!o[g]) {
            if (!s[g]) {
              var k = typeof sr == "function" && sr;
              if (!_ && k) return k(g, !0);
              if (n) return n(g, !0);
              var R = new Error("Cannot find module '" + g + "'");
              throw R.code = "MODULE_NOT_FOUND", R;
            }
            var E = o[g] = { exports: {} };
            s[g][0].call(E.exports, function(C) {
              var w = s[g][1][C];
              return l(w || C);
            }, E, E.exports, t, s, o, u);
          }
          return o[g].exports;
        }
        for (var n = typeof sr == "function" && sr, f = 0; f < u.length; f++) l(u[f]);
        return l;
      }({ 1: [function(t, s, o) {
        var u = t("./utils"), l = t("./support"), n = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        o.encode = function(f) {
          for (var g, _, k, R, E, C, w, A = [], c = 0, y = f.length, m = y, h = u.getTypeOf(f) !== "string"; c < f.length; ) m = y - c, k = h ? (g = f[c++], _ = c < y ? f[c++] : 0, c < y ? f[c++] : 0) : (g = f.charCodeAt(c++), _ = c < y ? f.charCodeAt(c++) : 0, c < y ? f.charCodeAt(c++) : 0), R = g >> 2, E = (3 & g) << 4 | _ >> 4, C = 1 < m ? (15 & _) << 2 | k >> 6 : 64, w = 2 < m ? 63 & k : 64, A.push(n.charAt(R) + n.charAt(E) + n.charAt(C) + n.charAt(w));
          return A.join("");
        }, o.decode = function(f) {
          var g, _, k, R, E, C, w = 0, A = 0, c = "data:";
          if (f.substr(0, c.length) === c) throw new Error("Invalid base64 input, it looks like a data url.");
          var y, m = 3 * (f = f.replace(/[^A-Za-z0-9+/=]/g, "")).length / 4;
          if (f.charAt(f.length - 1) === n.charAt(64) && m--, f.charAt(f.length - 2) === n.charAt(64) && m--, m % 1 != 0) throw new Error("Invalid base64 input, bad content length.");
          for (y = l.uint8array ? new Uint8Array(0 | m) : new Array(0 | m); w < f.length; ) g = n.indexOf(f.charAt(w++)) << 2 | (R = n.indexOf(f.charAt(w++))) >> 4, _ = (15 & R) << 4 | (E = n.indexOf(f.charAt(w++))) >> 2, k = (3 & E) << 6 | (C = n.indexOf(f.charAt(w++))), y[A++] = g, E !== 64 && (y[A++] = _), C !== 64 && (y[A++] = k);
          return y;
        };
      }, { "./support": 30, "./utils": 32 }], 2: [function(t, s, o) {
        var u = t("./external"), l = t("./stream/DataWorker"), n = t("./stream/Crc32Probe"), f = t("./stream/DataLengthProbe");
        function g(_, k, R, E, C) {
          this.compressedSize = _, this.uncompressedSize = k, this.crc32 = R, this.compression = E, this.compressedContent = C;
        }
        g.prototype = { getContentWorker: function() {
          var _ = new l(u.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new f("data_length")), k = this;
          return _.on("end", function() {
            if (this.streamInfo.data_length !== k.uncompressedSize) throw new Error("Bug : uncompressed data size mismatch");
          }), _;
        }, getCompressedWorker: function() {
          return new l(u.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
        } }, g.createWorkerFrom = function(_, k, R) {
          return _.pipe(new n()).pipe(new f("uncompressedSize")).pipe(k.compressWorker(R)).pipe(new f("compressedSize")).withStreamInfo("compression", k);
        }, s.exports = g;
      }, { "./external": 6, "./stream/Crc32Probe": 25, "./stream/DataLengthProbe": 26, "./stream/DataWorker": 27 }], 3: [function(t, s, o) {
        var u = t("./stream/GenericWorker");
        o.STORE = { magic: "\0\0", compressWorker: function() {
          return new u("STORE compression");
        }, uncompressWorker: function() {
          return new u("STORE decompression");
        } }, o.DEFLATE = t("./flate");
      }, { "./flate": 7, "./stream/GenericWorker": 28 }], 4: [function(t, s, o) {
        var u = t("./utils"), l = function() {
          for (var n, f = [], g = 0; g < 256; g++) {
            n = g;
            for (var _ = 0; _ < 8; _++) n = 1 & n ? 3988292384 ^ n >>> 1 : n >>> 1;
            f[g] = n;
          }
          return f;
        }();
        s.exports = function(n, f) {
          return n !== void 0 && n.length ? u.getTypeOf(n) !== "string" ? function(g, _, k, R) {
            var E = l, C = R + k;
            g ^= -1;
            for (var w = R; w < C; w++) g = g >>> 8 ^ E[255 & (g ^ _[w])];
            return -1 ^ g;
          }(0 | f, n, n.length, 0) : function(g, _, k, R) {
            var E = l, C = R + k;
            g ^= -1;
            for (var w = R; w < C; w++) g = g >>> 8 ^ E[255 & (g ^ _.charCodeAt(w))];
            return -1 ^ g;
          }(0 | f, n, n.length, 0) : 0;
        };
      }, { "./utils": 32 }], 5: [function(t, s, o) {
        o.base64 = !1, o.binary = !1, o.dir = !1, o.createFolders = !0, o.date = null, o.compression = null, o.compressionOptions = null, o.comment = null, o.unixPermissions = null, o.dosPermissions = null;
      }, {}], 6: [function(t, s, o) {
        var u = null;
        u = typeof Promise < "u" ? Promise : t("lie"), s.exports = { Promise: u };
      }, { lie: 37 }], 7: [function(t, s, o) {
        var u = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Uint32Array < "u", l = t("pako"), n = t("./utils"), f = t("./stream/GenericWorker"), g = u ? "uint8array" : "array";
        function _(k, R) {
          f.call(this, "FlateWorker/" + k), this._pako = null, this._pakoAction = k, this._pakoOptions = R, this.meta = {};
        }
        o.magic = "\b\0", n.inherits(_, f), _.prototype.processChunk = function(k) {
          this.meta = k.meta, this._pako === null && this._createPako(), this._pako.push(n.transformTo(g, k.data), !1);
        }, _.prototype.flush = function() {
          f.prototype.flush.call(this), this._pako === null && this._createPako(), this._pako.push([], !0);
        }, _.prototype.cleanUp = function() {
          f.prototype.cleanUp.call(this), this._pako = null;
        }, _.prototype._createPako = function() {
          this._pako = new l[this._pakoAction]({ raw: !0, level: this._pakoOptions.level || -1 });
          var k = this;
          this._pako.onData = function(R) {
            k.push({ data: R, meta: k.meta });
          };
        }, o.compressWorker = function(k) {
          return new _("Deflate", k);
        }, o.uncompressWorker = function() {
          return new _("Inflate", {});
        };
      }, { "./stream/GenericWorker": 28, "./utils": 32, pako: 38 }], 8: [function(t, s, o) {
        function u(E, C) {
          var w, A = "";
          for (w = 0; w < C; w++) A += String.fromCharCode(255 & E), E >>>= 8;
          return A;
        }
        function l(E, C, w, A, c, y) {
          var m, h, T = E.file, F = E.compression, B = y !== g.utf8encode, z = n.transformTo("string", y(T.name)), I = n.transformTo("string", g.utf8encode(T.name)), X = T.comment, oe = n.transformTo("string", y(X)), N = n.transformTo("string", g.utf8encode(X)), M = I.length !== T.name.length, b = N.length !== X.length, G = "", ee = "", q = "", ne = T.dir, Q = T.date, ce = { crc32: 0, compressedSize: 0, uncompressedSize: 0 };
          C && !w || (ce.crc32 = E.crc32, ce.compressedSize = E.compressedSize, ce.uncompressedSize = E.uncompressedSize);
          var V = 0;
          C && (V |= 8), B || !M && !b || (V |= 2048);
          var P = 0, $ = 0;
          ne && (P |= 16), c === "UNIX" ? ($ = 798, P |= function(te, K) {
            var x = te;
            return te || (x = K ? 16893 : 33204), (65535 & x) << 16;
          }(T.unixPermissions, ne)) : ($ = 20, P |= function(te) {
            return 63 & (te || 0);
          }(T.dosPermissions)), m = Q.getUTCHours(), m <<= 6, m |= Q.getUTCMinutes(), m <<= 5, m |= Q.getUTCSeconds() / 2, h = Q.getUTCFullYear() - 1980, h <<= 4, h |= Q.getUTCMonth() + 1, h <<= 5, h |= Q.getUTCDate(), M && (ee = u(1, 1) + u(_(z), 4) + I, G += "up" + u(ee.length, 2) + ee), b && (q = u(1, 1) + u(_(oe), 4) + N, G += "uc" + u(q.length, 2) + q);
          var Z = "";
          return Z += `
\0`, Z += u(V, 2), Z += F.magic, Z += u(m, 2), Z += u(h, 2), Z += u(ce.crc32, 4), Z += u(ce.compressedSize, 4), Z += u(ce.uncompressedSize, 4), Z += u(z.length, 2), Z += u(G.length, 2), { fileRecord: k.LOCAL_FILE_HEADER + Z + z + G, dirRecord: k.CENTRAL_FILE_HEADER + u($, 2) + Z + u(oe.length, 2) + "\0\0\0\0" + u(P, 4) + u(A, 4) + z + G + oe };
        }
        var n = t("../utils"), f = t("../stream/GenericWorker"), g = t("../utf8"), _ = t("../crc32"), k = t("../signature");
        function R(E, C, w, A) {
          f.call(this, "ZipFileWorker"), this.bytesWritten = 0, this.zipComment = C, this.zipPlatform = w, this.encodeFileName = A, this.streamFiles = E, this.accumulate = !1, this.contentBuffer = [], this.dirRecords = [], this.currentSourceOffset = 0, this.entriesCount = 0, this.currentFile = null, this._sources = [];
        }
        n.inherits(R, f), R.prototype.push = function(E) {
          var C = E.meta.percent || 0, w = this.entriesCount, A = this._sources.length;
          this.accumulate ? this.contentBuffer.push(E) : (this.bytesWritten += E.data.length, f.prototype.push.call(this, { data: E.data, meta: { currentFile: this.currentFile, percent: w ? (C + 100 * (w - A - 1)) / w : 100 } }));
        }, R.prototype.openedSource = function(E) {
          this.currentSourceOffset = this.bytesWritten, this.currentFile = E.file.name;
          var C = this.streamFiles && !E.file.dir;
          if (C) {
            var w = l(E, C, !1, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
            this.push({ data: w.fileRecord, meta: { percent: 0 } });
          } else this.accumulate = !0;
        }, R.prototype.closedSource = function(E) {
          this.accumulate = !1;
          var C = this.streamFiles && !E.file.dir, w = l(E, C, !0, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
          if (this.dirRecords.push(w.dirRecord), C) this.push({ data: function(A) {
            return k.DATA_DESCRIPTOR + u(A.crc32, 4) + u(A.compressedSize, 4) + u(A.uncompressedSize, 4);
          }(E), meta: { percent: 100 } });
          else for (this.push({ data: w.fileRecord, meta: { percent: 0 } }); this.contentBuffer.length; ) this.push(this.contentBuffer.shift());
          this.currentFile = null;
        }, R.prototype.flush = function() {
          for (var E = this.bytesWritten, C = 0; C < this.dirRecords.length; C++) this.push({ data: this.dirRecords[C], meta: { percent: 100 } });
          var w = this.bytesWritten - E, A = function(c, y, m, h, T) {
            var F = n.transformTo("string", T(h));
            return k.CENTRAL_DIRECTORY_END + "\0\0\0\0" + u(c, 2) + u(c, 2) + u(y, 4) + u(m, 4) + u(F.length, 2) + F;
          }(this.dirRecords.length, w, E, this.zipComment, this.encodeFileName);
          this.push({ data: A, meta: { percent: 100 } });
        }, R.prototype.prepareNextSource = function() {
          this.previous = this._sources.shift(), this.openedSource(this.previous.streamInfo), this.isPaused ? this.previous.pause() : this.previous.resume();
        }, R.prototype.registerPrevious = function(E) {
          this._sources.push(E);
          var C = this;
          return E.on("data", function(w) {
            C.processChunk(w);
          }), E.on("end", function() {
            C.closedSource(C.previous.streamInfo), C._sources.length ? C.prepareNextSource() : C.end();
          }), E.on("error", function(w) {
            C.error(w);
          }), this;
        }, R.prototype.resume = function() {
          return !!f.prototype.resume.call(this) && (!this.previous && this._sources.length ? (this.prepareNextSource(), !0) : this.previous || this._sources.length || this.generatedError ? void 0 : (this.end(), !0));
        }, R.prototype.error = function(E) {
          var C = this._sources;
          if (!f.prototype.error.call(this, E)) return !1;
          for (var w = 0; w < C.length; w++) try {
            C[w].error(E);
          } catch {
          }
          return !0;
        }, R.prototype.lock = function() {
          f.prototype.lock.call(this);
          for (var E = this._sources, C = 0; C < E.length; C++) E[C].lock();
        }, s.exports = R;
      }, { "../crc32": 4, "../signature": 23, "../stream/GenericWorker": 28, "../utf8": 31, "../utils": 32 }], 9: [function(t, s, o) {
        var u = t("../compressions"), l = t("./ZipFileWorker");
        o.generateWorker = function(n, f, g) {
          var _ = new l(f.streamFiles, g, f.platform, f.encodeFileName), k = 0;
          try {
            n.forEach(function(R, E) {
              k++;
              var C = function(y, m) {
                var h = y || m, T = u[h];
                if (!T) throw new Error(h + " is not a valid compression method !");
                return T;
              }(E.options.compression, f.compression), w = E.options.compressionOptions || f.compressionOptions || {}, A = E.dir, c = E.date;
              E._compressWorker(C, w).withStreamInfo("file", { name: R, dir: A, date: c, comment: E.comment || "", unixPermissions: E.unixPermissions, dosPermissions: E.dosPermissions }).pipe(_);
            }), _.entriesCount = k;
          } catch (R) {
            _.error(R);
          }
          return _;
        };
      }, { "../compressions": 3, "./ZipFileWorker": 8 }], 10: [function(t, s, o) {
        function u() {
          if (!(this instanceof u)) return new u();
          if (arguments.length) throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
          this.files = /* @__PURE__ */ Object.create(null), this.comment = null, this.root = "", this.clone = function() {
            var l = new u();
            for (var n in this) typeof this[n] != "function" && (l[n] = this[n]);
            return l;
          };
        }
        (u.prototype = t("./object")).loadAsync = t("./load"), u.support = t("./support"), u.defaults = t("./defaults"), u.version = "3.10.1", u.loadAsync = function(l, n) {
          return new u().loadAsync(l, n);
        }, u.external = t("./external"), s.exports = u;
      }, { "./defaults": 5, "./external": 6, "./load": 11, "./object": 15, "./support": 30 }], 11: [function(t, s, o) {
        var u = t("./utils"), l = t("./external"), n = t("./utf8"), f = t("./zipEntries"), g = t("./stream/Crc32Probe"), _ = t("./nodejsUtils");
        function k(R) {
          return new l.Promise(function(E, C) {
            var w = R.decompressed.getContentWorker().pipe(new g());
            w.on("error", function(A) {
              C(A);
            }).on("end", function() {
              w.streamInfo.crc32 !== R.decompressed.crc32 ? C(new Error("Corrupted zip : CRC32 mismatch")) : E();
            }).resume();
          });
        }
        s.exports = function(R, E) {
          var C = this;
          return E = u.extend(E || {}, { base64: !1, checkCRC32: !1, optimizedBinaryString: !1, createFolders: !1, decodeFileName: n.utf8decode }), _.isNode && _.isStream(R) ? l.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")) : u.prepareContent("the loaded zip file", R, !0, E.optimizedBinaryString, E.base64).then(function(w) {
            var A = new f(E);
            return A.load(w), A;
          }).then(function(w) {
            var A = [l.Promise.resolve(w)], c = w.files;
            if (E.checkCRC32) for (var y = 0; y < c.length; y++) A.push(k(c[y]));
            return l.Promise.all(A);
          }).then(function(w) {
            for (var A = w.shift(), c = A.files, y = 0; y < c.length; y++) {
              var m = c[y], h = m.fileNameStr, T = u.resolve(m.fileNameStr);
              C.file(T, m.decompressed, { binary: !0, optimizedBinaryString: !0, date: m.date, dir: m.dir, comment: m.fileCommentStr.length ? m.fileCommentStr : null, unixPermissions: m.unixPermissions, dosPermissions: m.dosPermissions, createFolders: E.createFolders }), m.dir || (C.file(T).unsafeOriginalName = h);
            }
            return A.zipComment.length && (C.comment = A.zipComment), C;
          });
        };
      }, { "./external": 6, "./nodejsUtils": 14, "./stream/Crc32Probe": 25, "./utf8": 31, "./utils": 32, "./zipEntries": 33 }], 12: [function(t, s, o) {
        var u = t("../utils"), l = t("../stream/GenericWorker");
        function n(f, g) {
          l.call(this, "Nodejs stream input adapter for " + f), this._upstreamEnded = !1, this._bindStream(g);
        }
        u.inherits(n, l), n.prototype._bindStream = function(f) {
          var g = this;
          (this._stream = f).pause(), f.on("data", function(_) {
            g.push({ data: _, meta: { percent: 0 } });
          }).on("error", function(_) {
            g.isPaused ? this.generatedError = _ : g.error(_);
          }).on("end", function() {
            g.isPaused ? g._upstreamEnded = !0 : g.end();
          });
        }, n.prototype.pause = function() {
          return !!l.prototype.pause.call(this) && (this._stream.pause(), !0);
        }, n.prototype.resume = function() {
          return !!l.prototype.resume.call(this) && (this._upstreamEnded ? this.end() : this._stream.resume(), !0);
        }, s.exports = n;
      }, { "../stream/GenericWorker": 28, "../utils": 32 }], 13: [function(t, s, o) {
        var u = t("readable-stream").Readable;
        function l(n, f, g) {
          u.call(this, f), this._helper = n;
          var _ = this;
          n.on("data", function(k, R) {
            _.push(k) || _._helper.pause(), g && g(R);
          }).on("error", function(k) {
            _.emit("error", k);
          }).on("end", function() {
            _.push(null);
          });
        }
        t("../utils").inherits(l, u), l.prototype._read = function() {
          this._helper.resume();
        }, s.exports = l;
      }, { "../utils": 32, "readable-stream": 16 }], 14: [function(t, s, o) {
        s.exports = { isNode: typeof Buffer < "u", newBufferFrom: function(u, l) {
          if (Buffer.from && Buffer.from !== Uint8Array.from) return Buffer.from(u, l);
          if (typeof u == "number") throw new Error('The "data" argument must not be a number');
          return new Buffer(u, l);
        }, allocBuffer: function(u) {
          if (Buffer.alloc) return Buffer.alloc(u);
          var l = new Buffer(u);
          return l.fill(0), l;
        }, isBuffer: function(u) {
          return Buffer.isBuffer(u);
        }, isStream: function(u) {
          return u && typeof u.on == "function" && typeof u.pause == "function" && typeof u.resume == "function";
        } };
      }, {}], 15: [function(t, s, o) {
        function u(T, F, B) {
          var z, I = n.getTypeOf(F), X = n.extend(B || {}, _);
          X.date = X.date || /* @__PURE__ */ new Date(), X.compression !== null && (X.compression = X.compression.toUpperCase()), typeof X.unixPermissions == "string" && (X.unixPermissions = parseInt(X.unixPermissions, 8)), X.unixPermissions && 16384 & X.unixPermissions && (X.dir = !0), X.dosPermissions && 16 & X.dosPermissions && (X.dir = !0), X.dir && (T = c(T)), X.createFolders && (z = A(T)) && y.call(this, z, !0);
          var oe = I === "string" && X.binary === !1 && X.base64 === !1;
          B && B.binary !== void 0 || (X.binary = !oe), (F instanceof k && F.uncompressedSize === 0 || X.dir || !F || F.length === 0) && (X.base64 = !1, X.binary = !0, F = "", X.compression = "STORE", I = "string");
          var N = null;
          N = F instanceof k || F instanceof f ? F : C.isNode && C.isStream(F) ? new w(T, F) : n.prepareContent(T, F, X.binary, X.optimizedBinaryString, X.base64);
          var M = new R(T, N, X);
          this.files[T] = M;
        }
        var l = t("./utf8"), n = t("./utils"), f = t("./stream/GenericWorker"), g = t("./stream/StreamHelper"), _ = t("./defaults"), k = t("./compressedObject"), R = t("./zipObject"), E = t("./generate"), C = t("./nodejsUtils"), w = t("./nodejs/NodejsStreamInputAdapter"), A = function(T) {
          T.slice(-1) === "/" && (T = T.substring(0, T.length - 1));
          var F = T.lastIndexOf("/");
          return 0 < F ? T.substring(0, F) : "";
        }, c = function(T) {
          return T.slice(-1) !== "/" && (T += "/"), T;
        }, y = function(T, F) {
          return F = F !== void 0 ? F : _.createFolders, T = c(T), this.files[T] || u.call(this, T, null, { dir: !0, createFolders: F }), this.files[T];
        };
        function m(T) {
          return Object.prototype.toString.call(T) === "[object RegExp]";
        }
        var h = { load: function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, forEach: function(T) {
          var F, B, z;
          for (F in this.files) z = this.files[F], (B = F.slice(this.root.length, F.length)) && F.slice(0, this.root.length) === this.root && T(B, z);
        }, filter: function(T) {
          var F = [];
          return this.forEach(function(B, z) {
            T(B, z) && F.push(z);
          }), F;
        }, file: function(T, F, B) {
          if (arguments.length !== 1) return T = this.root + T, u.call(this, T, F, B), this;
          if (m(T)) {
            var z = T;
            return this.filter(function(X, oe) {
              return !oe.dir && z.test(X);
            });
          }
          var I = this.files[this.root + T];
          return I && !I.dir ? I : null;
        }, folder: function(T) {
          if (!T) return this;
          if (m(T)) return this.filter(function(I, X) {
            return X.dir && T.test(I);
          });
          var F = this.root + T, B = y.call(this, F), z = this.clone();
          return z.root = B.name, z;
        }, remove: function(T) {
          T = this.root + T;
          var F = this.files[T];
          if (F || (T.slice(-1) !== "/" && (T += "/"), F = this.files[T]), F && !F.dir) delete this.files[T];
          else for (var B = this.filter(function(I, X) {
            return X.name.slice(0, T.length) === T;
          }), z = 0; z < B.length; z++) delete this.files[B[z].name];
          return this;
        }, generate: function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, generateInternalStream: function(T) {
          var F, B = {};
          try {
            if ((B = n.extend(T || {}, { streamFiles: !1, compression: "STORE", compressionOptions: null, type: "", platform: "DOS", comment: null, mimeType: "application/zip", encodeFileName: l.utf8encode })).type = B.type.toLowerCase(), B.compression = B.compression.toUpperCase(), B.type === "binarystring" && (B.type = "string"), !B.type) throw new Error("No output type specified.");
            n.checkSupport(B.type), B.platform !== "darwin" && B.platform !== "freebsd" && B.platform !== "linux" && B.platform !== "sunos" || (B.platform = "UNIX"), B.platform === "win32" && (B.platform = "DOS");
            var z = B.comment || this.comment || "";
            F = E.generateWorker(this, B, z);
          } catch (I) {
            (F = new f("error")).error(I);
          }
          return new g(F, B.type || "string", B.mimeType);
        }, generateAsync: function(T, F) {
          return this.generateInternalStream(T).accumulate(F);
        }, generateNodeStream: function(T, F) {
          return (T = T || {}).type || (T.type = "nodebuffer"), this.generateInternalStream(T).toNodejsStream(F);
        } };
        s.exports = h;
      }, { "./compressedObject": 2, "./defaults": 5, "./generate": 9, "./nodejs/NodejsStreamInputAdapter": 12, "./nodejsUtils": 14, "./stream/GenericWorker": 28, "./stream/StreamHelper": 29, "./utf8": 31, "./utils": 32, "./zipObject": 35 }], 16: [function(t, s, o) {
        s.exports = t("stream");
      }, { stream: void 0 }], 17: [function(t, s, o) {
        var u = t("./DataReader");
        function l(n) {
          u.call(this, n);
          for (var f = 0; f < this.data.length; f++) n[f] = 255 & n[f];
        }
        t("../utils").inherits(l, u), l.prototype.byteAt = function(n) {
          return this.data[this.zero + n];
        }, l.prototype.lastIndexOfSignature = function(n) {
          for (var f = n.charCodeAt(0), g = n.charCodeAt(1), _ = n.charCodeAt(2), k = n.charCodeAt(3), R = this.length - 4; 0 <= R; --R) if (this.data[R] === f && this.data[R + 1] === g && this.data[R + 2] === _ && this.data[R + 3] === k) return R - this.zero;
          return -1;
        }, l.prototype.readAndCheckSignature = function(n) {
          var f = n.charCodeAt(0), g = n.charCodeAt(1), _ = n.charCodeAt(2), k = n.charCodeAt(3), R = this.readData(4);
          return f === R[0] && g === R[1] && _ === R[2] && k === R[3];
        }, l.prototype.readData = function(n) {
          if (this.checkOffset(n), n === 0) return [];
          var f = this.data.slice(this.zero + this.index, this.zero + this.index + n);
          return this.index += n, f;
        }, s.exports = l;
      }, { "../utils": 32, "./DataReader": 18 }], 18: [function(t, s, o) {
        var u = t("../utils");
        function l(n) {
          this.data = n, this.length = n.length, this.index = 0, this.zero = 0;
        }
        l.prototype = { checkOffset: function(n) {
          this.checkIndex(this.index + n);
        }, checkIndex: function(n) {
          if (this.length < this.zero + n || n < 0) throw new Error("End of data reached (data length = " + this.length + ", asked index = " + n + "). Corrupted zip ?");
        }, setIndex: function(n) {
          this.checkIndex(n), this.index = n;
        }, skip: function(n) {
          this.setIndex(this.index + n);
        }, byteAt: function() {
        }, readInt: function(n) {
          var f, g = 0;
          for (this.checkOffset(n), f = this.index + n - 1; f >= this.index; f--) g = (g << 8) + this.byteAt(f);
          return this.index += n, g;
        }, readString: function(n) {
          return u.transformTo("string", this.readData(n));
        }, readData: function() {
        }, lastIndexOfSignature: function() {
        }, readAndCheckSignature: function() {
        }, readDate: function() {
          var n = this.readInt(4);
          return new Date(Date.UTC(1980 + (n >> 25 & 127), (n >> 21 & 15) - 1, n >> 16 & 31, n >> 11 & 31, n >> 5 & 63, (31 & n) << 1));
        } }, s.exports = l;
      }, { "../utils": 32 }], 19: [function(t, s, o) {
        var u = t("./Uint8ArrayReader");
        function l(n) {
          u.call(this, n);
        }
        t("../utils").inherits(l, u), l.prototype.readData = function(n) {
          this.checkOffset(n);
          var f = this.data.slice(this.zero + this.index, this.zero + this.index + n);
          return this.index += n, f;
        }, s.exports = l;
      }, { "../utils": 32, "./Uint8ArrayReader": 21 }], 20: [function(t, s, o) {
        var u = t("./DataReader");
        function l(n) {
          u.call(this, n);
        }
        t("../utils").inherits(l, u), l.prototype.byteAt = function(n) {
          return this.data.charCodeAt(this.zero + n);
        }, l.prototype.lastIndexOfSignature = function(n) {
          return this.data.lastIndexOf(n) - this.zero;
        }, l.prototype.readAndCheckSignature = function(n) {
          return n === this.readData(4);
        }, l.prototype.readData = function(n) {
          this.checkOffset(n);
          var f = this.data.slice(this.zero + this.index, this.zero + this.index + n);
          return this.index += n, f;
        }, s.exports = l;
      }, { "../utils": 32, "./DataReader": 18 }], 21: [function(t, s, o) {
        var u = t("./ArrayReader");
        function l(n) {
          u.call(this, n);
        }
        t("../utils").inherits(l, u), l.prototype.readData = function(n) {
          if (this.checkOffset(n), n === 0) return new Uint8Array(0);
          var f = this.data.subarray(this.zero + this.index, this.zero + this.index + n);
          return this.index += n, f;
        }, s.exports = l;
      }, { "../utils": 32, "./ArrayReader": 17 }], 22: [function(t, s, o) {
        var u = t("../utils"), l = t("../support"), n = t("./ArrayReader"), f = t("./StringReader"), g = t("./NodeBufferReader"), _ = t("./Uint8ArrayReader");
        s.exports = function(k) {
          var R = u.getTypeOf(k);
          return u.checkSupport(R), R !== "string" || l.uint8array ? R === "nodebuffer" ? new g(k) : l.uint8array ? new _(u.transformTo("uint8array", k)) : new n(u.transformTo("array", k)) : new f(k);
        };
      }, { "../support": 30, "../utils": 32, "./ArrayReader": 17, "./NodeBufferReader": 19, "./StringReader": 20, "./Uint8ArrayReader": 21 }], 23: [function(t, s, o) {
        o.LOCAL_FILE_HEADER = "PK", o.CENTRAL_FILE_HEADER = "PK", o.CENTRAL_DIRECTORY_END = "PK", o.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x07", o.ZIP64_CENTRAL_DIRECTORY_END = "PK", o.DATA_DESCRIPTOR = "PK\x07\b";
      }, {}], 24: [function(t, s, o) {
        var u = t("./GenericWorker"), l = t("../utils");
        function n(f) {
          u.call(this, "ConvertWorker to " + f), this.destType = f;
        }
        l.inherits(n, u), n.prototype.processChunk = function(f) {
          this.push({ data: l.transformTo(this.destType, f.data), meta: f.meta });
        }, s.exports = n;
      }, { "../utils": 32, "./GenericWorker": 28 }], 25: [function(t, s, o) {
        var u = t("./GenericWorker"), l = t("../crc32");
        function n() {
          u.call(this, "Crc32Probe"), this.withStreamInfo("crc32", 0);
        }
        t("../utils").inherits(n, u), n.prototype.processChunk = function(f) {
          this.streamInfo.crc32 = l(f.data, this.streamInfo.crc32 || 0), this.push(f);
        }, s.exports = n;
      }, { "../crc32": 4, "../utils": 32, "./GenericWorker": 28 }], 26: [function(t, s, o) {
        var u = t("../utils"), l = t("./GenericWorker");
        function n(f) {
          l.call(this, "DataLengthProbe for " + f), this.propName = f, this.withStreamInfo(f, 0);
        }
        u.inherits(n, l), n.prototype.processChunk = function(f) {
          if (f) {
            var g = this.streamInfo[this.propName] || 0;
            this.streamInfo[this.propName] = g + f.data.length;
          }
          l.prototype.processChunk.call(this, f);
        }, s.exports = n;
      }, { "../utils": 32, "./GenericWorker": 28 }], 27: [function(t, s, o) {
        var u = t("../utils"), l = t("./GenericWorker");
        function n(f) {
          l.call(this, "DataWorker");
          var g = this;
          this.dataIsReady = !1, this.index = 0, this.max = 0, this.data = null, this.type = "", this._tickScheduled = !1, f.then(function(_) {
            g.dataIsReady = !0, g.data = _, g.max = _ && _.length || 0, g.type = u.getTypeOf(_), g.isPaused || g._tickAndRepeat();
          }, function(_) {
            g.error(_);
          });
        }
        u.inherits(n, l), n.prototype.cleanUp = function() {
          l.prototype.cleanUp.call(this), this.data = null;
        }, n.prototype.resume = function() {
          return !!l.prototype.resume.call(this) && (!this._tickScheduled && this.dataIsReady && (this._tickScheduled = !0, u.delay(this._tickAndRepeat, [], this)), !0);
        }, n.prototype._tickAndRepeat = function() {
          this._tickScheduled = !1, this.isPaused || this.isFinished || (this._tick(), this.isFinished || (u.delay(this._tickAndRepeat, [], this), this._tickScheduled = !0));
        }, n.prototype._tick = function() {
          if (this.isPaused || this.isFinished) return !1;
          var f = null, g = Math.min(this.max, this.index + 16384);
          if (this.index >= this.max) return this.end();
          switch (this.type) {
            case "string":
              f = this.data.substring(this.index, g);
              break;
            case "uint8array":
              f = this.data.subarray(this.index, g);
              break;
            case "array":
            case "nodebuffer":
              f = this.data.slice(this.index, g);
          }
          return this.index = g, this.push({ data: f, meta: { percent: this.max ? this.index / this.max * 100 : 0 } });
        }, s.exports = n;
      }, { "../utils": 32, "./GenericWorker": 28 }], 28: [function(t, s, o) {
        function u(l) {
          this.name = l || "default", this.streamInfo = {}, this.generatedError = null, this.extraStreamInfo = {}, this.isPaused = !0, this.isFinished = !1, this.isLocked = !1, this._listeners = { data: [], end: [], error: [] }, this.previous = null;
        }
        u.prototype = { push: function(l) {
          this.emit("data", l);
        }, end: function() {
          if (this.isFinished) return !1;
          this.flush();
          try {
            this.emit("end"), this.cleanUp(), this.isFinished = !0;
          } catch (l) {
            this.emit("error", l);
          }
          return !0;
        }, error: function(l) {
          return !this.isFinished && (this.isPaused ? this.generatedError = l : (this.isFinished = !0, this.emit("error", l), this.previous && this.previous.error(l), this.cleanUp()), !0);
        }, on: function(l, n) {
          return this._listeners[l].push(n), this;
        }, cleanUp: function() {
          this.streamInfo = this.generatedError = this.extraStreamInfo = null, this._listeners = [];
        }, emit: function(l, n) {
          if (this._listeners[l]) for (var f = 0; f < this._listeners[l].length; f++) this._listeners[l][f].call(this, n);
        }, pipe: function(l) {
          return l.registerPrevious(this);
        }, registerPrevious: function(l) {
          if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
          this.streamInfo = l.streamInfo, this.mergeStreamInfo(), this.previous = l;
          var n = this;
          return l.on("data", function(f) {
            n.processChunk(f);
          }), l.on("end", function() {
            n.end();
          }), l.on("error", function(f) {
            n.error(f);
          }), this;
        }, pause: function() {
          return !this.isPaused && !this.isFinished && (this.isPaused = !0, this.previous && this.previous.pause(), !0);
        }, resume: function() {
          if (!this.isPaused || this.isFinished) return !1;
          var l = this.isPaused = !1;
          return this.generatedError && (this.error(this.generatedError), l = !0), this.previous && this.previous.resume(), !l;
        }, flush: function() {
        }, processChunk: function(l) {
          this.push(l);
        }, withStreamInfo: function(l, n) {
          return this.extraStreamInfo[l] = n, this.mergeStreamInfo(), this;
        }, mergeStreamInfo: function() {
          for (var l in this.extraStreamInfo) Object.prototype.hasOwnProperty.call(this.extraStreamInfo, l) && (this.streamInfo[l] = this.extraStreamInfo[l]);
        }, lock: function() {
          if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
          this.isLocked = !0, this.previous && this.previous.lock();
        }, toString: function() {
          var l = "Worker " + this.name;
          return this.previous ? this.previous + " -> " + l : l;
        } }, s.exports = u;
      }, {}], 29: [function(t, s, o) {
        var u = t("../utils"), l = t("./ConvertWorker"), n = t("./GenericWorker"), f = t("../base64"), g = t("../support"), _ = t("../external"), k = null;
        if (g.nodestream) try {
          k = t("../nodejs/NodejsStreamOutputAdapter");
        } catch {
        }
        function R(C, w) {
          return new _.Promise(function(A, c) {
            var y = [], m = C._internalType, h = C._outputType, T = C._mimeType;
            C.on("data", function(F, B) {
              y.push(F), w && w(B);
            }).on("error", function(F) {
              y = [], c(F);
            }).on("end", function() {
              try {
                var F = function(B, z, I) {
                  switch (B) {
                    case "blob":
                      return u.newBlob(u.transformTo("arraybuffer", z), I);
                    case "base64":
                      return f.encode(z);
                    default:
                      return u.transformTo(B, z);
                  }
                }(h, function(B, z) {
                  var I, X = 0, oe = null, N = 0;
                  for (I = 0; I < z.length; I++) N += z[I].length;
                  switch (B) {
                    case "string":
                      return z.join("");
                    case "array":
                      return Array.prototype.concat.apply([], z);
                    case "uint8array":
                      for (oe = new Uint8Array(N), I = 0; I < z.length; I++) oe.set(z[I], X), X += z[I].length;
                      return oe;
                    case "nodebuffer":
                      return Buffer.concat(z);
                    default:
                      throw new Error("concat : unsupported type '" + B + "'");
                  }
                }(m, y), T);
                A(F);
              } catch (B) {
                c(B);
              }
              y = [];
            }).resume();
          });
        }
        function E(C, w, A) {
          var c = w;
          switch (w) {
            case "blob":
            case "arraybuffer":
              c = "uint8array";
              break;
            case "base64":
              c = "string";
          }
          try {
            this._internalType = c, this._outputType = w, this._mimeType = A, u.checkSupport(c), this._worker = C.pipe(new l(c)), C.lock();
          } catch (y) {
            this._worker = new n("error"), this._worker.error(y);
          }
        }
        E.prototype = { accumulate: function(C) {
          return R(this, C);
        }, on: function(C, w) {
          var A = this;
          return C === "data" ? this._worker.on(C, function(c) {
            w.call(A, c.data, c.meta);
          }) : this._worker.on(C, function() {
            u.delay(w, arguments, A);
          }), this;
        }, resume: function() {
          return u.delay(this._worker.resume, [], this._worker), this;
        }, pause: function() {
          return this._worker.pause(), this;
        }, toNodejsStream: function(C) {
          if (u.checkSupport("nodestream"), this._outputType !== "nodebuffer") throw new Error(this._outputType + " is not supported by this method");
          return new k(this, { objectMode: this._outputType !== "nodebuffer" }, C);
        } }, s.exports = E;
      }, { "../base64": 1, "../external": 6, "../nodejs/NodejsStreamOutputAdapter": 13, "../support": 30, "../utils": 32, "./ConvertWorker": 24, "./GenericWorker": 28 }], 30: [function(t, s, o) {
        if (o.base64 = !0, o.array = !0, o.string = !0, o.arraybuffer = typeof ArrayBuffer < "u" && typeof Uint8Array < "u", o.nodebuffer = typeof Buffer < "u", o.uint8array = typeof Uint8Array < "u", typeof ArrayBuffer > "u") o.blob = !1;
        else {
          var u = new ArrayBuffer(0);
          try {
            o.blob = new Blob([u], { type: "application/zip" }).size === 0;
          } catch {
            try {
              var l = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
              l.append(u), o.blob = l.getBlob("application/zip").size === 0;
            } catch {
              o.blob = !1;
            }
          }
        }
        try {
          o.nodestream = !!t("readable-stream").Readable;
        } catch {
          o.nodestream = !1;
        }
      }, { "readable-stream": 16 }], 31: [function(t, s, o) {
        for (var u = t("./utils"), l = t("./support"), n = t("./nodejsUtils"), f = t("./stream/GenericWorker"), g = new Array(256), _ = 0; _ < 256; _++) g[_] = 252 <= _ ? 6 : 248 <= _ ? 5 : 240 <= _ ? 4 : 224 <= _ ? 3 : 192 <= _ ? 2 : 1;
        g[254] = g[254] = 1;
        function k() {
          f.call(this, "utf-8 decode"), this.leftOver = null;
        }
        function R() {
          f.call(this, "utf-8 encode");
        }
        o.utf8encode = function(E) {
          return l.nodebuffer ? n.newBufferFrom(E, "utf-8") : function(C) {
            var w, A, c, y, m, h = C.length, T = 0;
            for (y = 0; y < h; y++) (64512 & (A = C.charCodeAt(y))) == 55296 && y + 1 < h && (64512 & (c = C.charCodeAt(y + 1))) == 56320 && (A = 65536 + (A - 55296 << 10) + (c - 56320), y++), T += A < 128 ? 1 : A < 2048 ? 2 : A < 65536 ? 3 : 4;
            for (w = l.uint8array ? new Uint8Array(T) : new Array(T), y = m = 0; m < T; y++) (64512 & (A = C.charCodeAt(y))) == 55296 && y + 1 < h && (64512 & (c = C.charCodeAt(y + 1))) == 56320 && (A = 65536 + (A - 55296 << 10) + (c - 56320), y++), A < 128 ? w[m++] = A : (A < 2048 ? w[m++] = 192 | A >>> 6 : (A < 65536 ? w[m++] = 224 | A >>> 12 : (w[m++] = 240 | A >>> 18, w[m++] = 128 | A >>> 12 & 63), w[m++] = 128 | A >>> 6 & 63), w[m++] = 128 | 63 & A);
            return w;
          }(E);
        }, o.utf8decode = function(E) {
          return l.nodebuffer ? u.transformTo("nodebuffer", E).toString("utf-8") : function(C) {
            var w, A, c, y, m = C.length, h = new Array(2 * m);
            for (w = A = 0; w < m; ) if ((c = C[w++]) < 128) h[A++] = c;
            else if (4 < (y = g[c])) h[A++] = 65533, w += y - 1;
            else {
              for (c &= y === 2 ? 31 : y === 3 ? 15 : 7; 1 < y && w < m; ) c = c << 6 | 63 & C[w++], y--;
              1 < y ? h[A++] = 65533 : c < 65536 ? h[A++] = c : (c -= 65536, h[A++] = 55296 | c >> 10 & 1023, h[A++] = 56320 | 1023 & c);
            }
            return h.length !== A && (h.subarray ? h = h.subarray(0, A) : h.length = A), u.applyFromCharCode(h);
          }(E = u.transformTo(l.uint8array ? "uint8array" : "array", E));
        }, u.inherits(k, f), k.prototype.processChunk = function(E) {
          var C = u.transformTo(l.uint8array ? "uint8array" : "array", E.data);
          if (this.leftOver && this.leftOver.length) {
            if (l.uint8array) {
              var w = C;
              (C = new Uint8Array(w.length + this.leftOver.length)).set(this.leftOver, 0), C.set(w, this.leftOver.length);
            } else C = this.leftOver.concat(C);
            this.leftOver = null;
          }
          var A = function(y, m) {
            var h;
            for ((m = m || y.length) > y.length && (m = y.length), h = m - 1; 0 <= h && (192 & y[h]) == 128; ) h--;
            return h < 0 || h === 0 ? m : h + g[y[h]] > m ? h : m;
          }(C), c = C;
          A !== C.length && (l.uint8array ? (c = C.subarray(0, A), this.leftOver = C.subarray(A, C.length)) : (c = C.slice(0, A), this.leftOver = C.slice(A, C.length))), this.push({ data: o.utf8decode(c), meta: E.meta });
        }, k.prototype.flush = function() {
          this.leftOver && this.leftOver.length && (this.push({ data: o.utf8decode(this.leftOver), meta: {} }), this.leftOver = null);
        }, o.Utf8DecodeWorker = k, u.inherits(R, f), R.prototype.processChunk = function(E) {
          this.push({ data: o.utf8encode(E.data), meta: E.meta });
        }, o.Utf8EncodeWorker = R;
      }, { "./nodejsUtils": 14, "./stream/GenericWorker": 28, "./support": 30, "./utils": 32 }], 32: [function(t, s, o) {
        var u = t("./support"), l = t("./base64"), n = t("./nodejsUtils"), f = t("./external");
        function g(w) {
          return w;
        }
        function _(w, A) {
          for (var c = 0; c < w.length; ++c) A[c] = 255 & w.charCodeAt(c);
          return A;
        }
        t("setimmediate"), o.newBlob = function(w, A) {
          o.checkSupport("blob");
          try {
            return new Blob([w], { type: A });
          } catch {
            try {
              var c = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
              return c.append(w), c.getBlob(A);
            } catch {
              throw new Error("Bug : can't construct the Blob.");
            }
          }
        };
        var k = { stringifyByChunk: function(w, A, c) {
          var y = [], m = 0, h = w.length;
          if (h <= c) return String.fromCharCode.apply(null, w);
          for (; m < h; ) A === "array" || A === "nodebuffer" ? y.push(String.fromCharCode.apply(null, w.slice(m, Math.min(m + c, h)))) : y.push(String.fromCharCode.apply(null, w.subarray(m, Math.min(m + c, h)))), m += c;
          return y.join("");
        }, stringifyByChar: function(w) {
          for (var A = "", c = 0; c < w.length; c++) A += String.fromCharCode(w[c]);
          return A;
        }, applyCanBeUsed: { uint8array: function() {
          try {
            return u.uint8array && String.fromCharCode.apply(null, new Uint8Array(1)).length === 1;
          } catch {
            return !1;
          }
        }(), nodebuffer: function() {
          try {
            return u.nodebuffer && String.fromCharCode.apply(null, n.allocBuffer(1)).length === 1;
          } catch {
            return !1;
          }
        }() } };
        function R(w) {
          var A = 65536, c = o.getTypeOf(w), y = !0;
          if (c === "uint8array" ? y = k.applyCanBeUsed.uint8array : c === "nodebuffer" && (y = k.applyCanBeUsed.nodebuffer), y) for (; 1 < A; ) try {
            return k.stringifyByChunk(w, c, A);
          } catch {
            A = Math.floor(A / 2);
          }
          return k.stringifyByChar(w);
        }
        function E(w, A) {
          for (var c = 0; c < w.length; c++) A[c] = w[c];
          return A;
        }
        o.applyFromCharCode = R;
        var C = {};
        C.string = { string: g, array: function(w) {
          return _(w, new Array(w.length));
        }, arraybuffer: function(w) {
          return C.string.uint8array(w).buffer;
        }, uint8array: function(w) {
          return _(w, new Uint8Array(w.length));
        }, nodebuffer: function(w) {
          return _(w, n.allocBuffer(w.length));
        } }, C.array = { string: R, array: g, arraybuffer: function(w) {
          return new Uint8Array(w).buffer;
        }, uint8array: function(w) {
          return new Uint8Array(w);
        }, nodebuffer: function(w) {
          return n.newBufferFrom(w);
        } }, C.arraybuffer = { string: function(w) {
          return R(new Uint8Array(w));
        }, array: function(w) {
          return E(new Uint8Array(w), new Array(w.byteLength));
        }, arraybuffer: g, uint8array: function(w) {
          return new Uint8Array(w);
        }, nodebuffer: function(w) {
          return n.newBufferFrom(new Uint8Array(w));
        } }, C.uint8array = { string: R, array: function(w) {
          return E(w, new Array(w.length));
        }, arraybuffer: function(w) {
          return w.buffer;
        }, uint8array: g, nodebuffer: function(w) {
          return n.newBufferFrom(w);
        } }, C.nodebuffer = { string: R, array: function(w) {
          return E(w, new Array(w.length));
        }, arraybuffer: function(w) {
          return C.nodebuffer.uint8array(w).buffer;
        }, uint8array: function(w) {
          return E(w, new Uint8Array(w.length));
        }, nodebuffer: g }, o.transformTo = function(w, A) {
          if (A = A || "", !w) return A;
          o.checkSupport(w);
          var c = o.getTypeOf(A);
          return C[c][w](A);
        }, o.resolve = function(w) {
          for (var A = w.split("/"), c = [], y = 0; y < A.length; y++) {
            var m = A[y];
            m === "." || m === "" && y !== 0 && y !== A.length - 1 || (m === ".." ? c.pop() : c.push(m));
          }
          return c.join("/");
        }, o.getTypeOf = function(w) {
          return typeof w == "string" ? "string" : Object.prototype.toString.call(w) === "[object Array]" ? "array" : u.nodebuffer && n.isBuffer(w) ? "nodebuffer" : u.uint8array && w instanceof Uint8Array ? "uint8array" : u.arraybuffer && w instanceof ArrayBuffer ? "arraybuffer" : void 0;
        }, o.checkSupport = function(w) {
          if (!u[w.toLowerCase()]) throw new Error(w + " is not supported by this platform");
        }, o.MAX_VALUE_16BITS = 65535, o.MAX_VALUE_32BITS = -1, o.pretty = function(w) {
          var A, c, y = "";
          for (c = 0; c < (w || "").length; c++) y += "\\x" + ((A = w.charCodeAt(c)) < 16 ? "0" : "") + A.toString(16).toUpperCase();
          return y;
        }, o.delay = function(w, A, c) {
          setImmediate(function() {
            w.apply(c || null, A || []);
          });
        }, o.inherits = function(w, A) {
          function c() {
          }
          c.prototype = A.prototype, w.prototype = new c();
        }, o.extend = function() {
          var w, A, c = {};
          for (w = 0; w < arguments.length; w++) for (A in arguments[w]) Object.prototype.hasOwnProperty.call(arguments[w], A) && c[A] === void 0 && (c[A] = arguments[w][A]);
          return c;
        }, o.prepareContent = function(w, A, c, y, m) {
          return f.Promise.resolve(A).then(function(h) {
            return u.blob && (h instanceof Blob || ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(h)) !== -1) && typeof FileReader < "u" ? new f.Promise(function(T, F) {
              var B = new FileReader();
              B.onload = function(z) {
                T(z.target.result);
              }, B.onerror = function(z) {
                F(z.target.error);
              }, B.readAsArrayBuffer(h);
            }) : h;
          }).then(function(h) {
            var T = o.getTypeOf(h);
            return T ? (T === "arraybuffer" ? h = o.transformTo("uint8array", h) : T === "string" && (m ? h = l.decode(h) : c && y !== !0 && (h = function(F) {
              return _(F, u.uint8array ? new Uint8Array(F.length) : new Array(F.length));
            }(h))), h) : f.Promise.reject(new Error("Can't read the data of '" + w + "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"));
          });
        };
      }, { "./base64": 1, "./external": 6, "./nodejsUtils": 14, "./support": 30, setimmediate: 54 }], 33: [function(t, s, o) {
        var u = t("./reader/readerFor"), l = t("./utils"), n = t("./signature"), f = t("./zipEntry"), g = t("./support");
        function _(k) {
          this.files = [], this.loadOptions = k;
        }
        _.prototype = { checkSignature: function(k) {
          if (!this.reader.readAndCheckSignature(k)) {
            this.reader.index -= 4;
            var R = this.reader.readString(4);
            throw new Error("Corrupted zip or bug: unexpected signature (" + l.pretty(R) + ", expected " + l.pretty(k) + ")");
          }
        }, isSignature: function(k, R) {
          var E = this.reader.index;
          this.reader.setIndex(k);
          var C = this.reader.readString(4) === R;
          return this.reader.setIndex(E), C;
        }, readBlockEndOfCentral: function() {
          this.diskNumber = this.reader.readInt(2), this.diskWithCentralDirStart = this.reader.readInt(2), this.centralDirRecordsOnThisDisk = this.reader.readInt(2), this.centralDirRecords = this.reader.readInt(2), this.centralDirSize = this.reader.readInt(4), this.centralDirOffset = this.reader.readInt(4), this.zipCommentLength = this.reader.readInt(2);
          var k = this.reader.readData(this.zipCommentLength), R = g.uint8array ? "uint8array" : "array", E = l.transformTo(R, k);
          this.zipComment = this.loadOptions.decodeFileName(E);
        }, readBlockZip64EndOfCentral: function() {
          this.zip64EndOfCentralSize = this.reader.readInt(8), this.reader.skip(4), this.diskNumber = this.reader.readInt(4), this.diskWithCentralDirStart = this.reader.readInt(4), this.centralDirRecordsOnThisDisk = this.reader.readInt(8), this.centralDirRecords = this.reader.readInt(8), this.centralDirSize = this.reader.readInt(8), this.centralDirOffset = this.reader.readInt(8), this.zip64ExtensibleData = {};
          for (var k, R, E, C = this.zip64EndOfCentralSize - 44; 0 < C; ) k = this.reader.readInt(2), R = this.reader.readInt(4), E = this.reader.readData(R), this.zip64ExtensibleData[k] = { id: k, length: R, value: E };
        }, readBlockZip64EndOfCentralLocator: function() {
          if (this.diskWithZip64CentralDirStart = this.reader.readInt(4), this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8), this.disksCount = this.reader.readInt(4), 1 < this.disksCount) throw new Error("Multi-volumes zip are not supported");
        }, readLocalFiles: function() {
          var k, R;
          for (k = 0; k < this.files.length; k++) R = this.files[k], this.reader.setIndex(R.localHeaderOffset), this.checkSignature(n.LOCAL_FILE_HEADER), R.readLocalPart(this.reader), R.handleUTF8(), R.processAttributes();
        }, readCentralDir: function() {
          var k;
          for (this.reader.setIndex(this.centralDirOffset); this.reader.readAndCheckSignature(n.CENTRAL_FILE_HEADER); ) (k = new f({ zip64: this.zip64 }, this.loadOptions)).readCentralPart(this.reader), this.files.push(k);
          if (this.centralDirRecords !== this.files.length && this.centralDirRecords !== 0 && this.files.length === 0) throw new Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
        }, readEndOfCentral: function() {
          var k = this.reader.lastIndexOfSignature(n.CENTRAL_DIRECTORY_END);
          if (k < 0) throw this.isSignature(0, n.LOCAL_FILE_HEADER) ? new Error("Corrupted zip: can't find end of central directory") : new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html");
          this.reader.setIndex(k);
          var R = k;
          if (this.checkSignature(n.CENTRAL_DIRECTORY_END), this.readBlockEndOfCentral(), this.diskNumber === l.MAX_VALUE_16BITS || this.diskWithCentralDirStart === l.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === l.MAX_VALUE_16BITS || this.centralDirRecords === l.MAX_VALUE_16BITS || this.centralDirSize === l.MAX_VALUE_32BITS || this.centralDirOffset === l.MAX_VALUE_32BITS) {
            if (this.zip64 = !0, (k = this.reader.lastIndexOfSignature(n.ZIP64_CENTRAL_DIRECTORY_LOCATOR)) < 0) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
            if (this.reader.setIndex(k), this.checkSignature(n.ZIP64_CENTRAL_DIRECTORY_LOCATOR), this.readBlockZip64EndOfCentralLocator(), !this.isSignature(this.relativeOffsetEndOfZip64CentralDir, n.ZIP64_CENTRAL_DIRECTORY_END) && (this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(n.ZIP64_CENTRAL_DIRECTORY_END), this.relativeOffsetEndOfZip64CentralDir < 0)) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
            this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir), this.checkSignature(n.ZIP64_CENTRAL_DIRECTORY_END), this.readBlockZip64EndOfCentral();
          }
          var E = this.centralDirOffset + this.centralDirSize;
          this.zip64 && (E += 20, E += 12 + this.zip64EndOfCentralSize);
          var C = R - E;
          if (0 < C) this.isSignature(R, n.CENTRAL_FILE_HEADER) || (this.reader.zero = C);
          else if (C < 0) throw new Error("Corrupted zip: missing " + Math.abs(C) + " bytes.");
        }, prepareReader: function(k) {
          this.reader = u(k);
        }, load: function(k) {
          this.prepareReader(k), this.readEndOfCentral(), this.readCentralDir(), this.readLocalFiles();
        } }, s.exports = _;
      }, { "./reader/readerFor": 22, "./signature": 23, "./support": 30, "./utils": 32, "./zipEntry": 34 }], 34: [function(t, s, o) {
        var u = t("./reader/readerFor"), l = t("./utils"), n = t("./compressedObject"), f = t("./crc32"), g = t("./utf8"), _ = t("./compressions"), k = t("./support");
        function R(E, C) {
          this.options = E, this.loadOptions = C;
        }
        R.prototype = { isEncrypted: function() {
          return (1 & this.bitFlag) == 1;
        }, useUTF8: function() {
          return (2048 & this.bitFlag) == 2048;
        }, readLocalPart: function(E) {
          var C, w;
          if (E.skip(22), this.fileNameLength = E.readInt(2), w = E.readInt(2), this.fileName = E.readData(this.fileNameLength), E.skip(w), this.compressedSize === -1 || this.uncompressedSize === -1) throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
          if ((C = function(A) {
            for (var c in _) if (Object.prototype.hasOwnProperty.call(_, c) && _[c].magic === A) return _[c];
            return null;
          }(this.compressionMethod)) === null) throw new Error("Corrupted zip : compression " + l.pretty(this.compressionMethod) + " unknown (inner file : " + l.transformTo("string", this.fileName) + ")");
          this.decompressed = new n(this.compressedSize, this.uncompressedSize, this.crc32, C, E.readData(this.compressedSize));
        }, readCentralPart: function(E) {
          this.versionMadeBy = E.readInt(2), E.skip(2), this.bitFlag = E.readInt(2), this.compressionMethod = E.readString(2), this.date = E.readDate(), this.crc32 = E.readInt(4), this.compressedSize = E.readInt(4), this.uncompressedSize = E.readInt(4);
          var C = E.readInt(2);
          if (this.extraFieldsLength = E.readInt(2), this.fileCommentLength = E.readInt(2), this.diskNumberStart = E.readInt(2), this.internalFileAttributes = E.readInt(2), this.externalFileAttributes = E.readInt(4), this.localHeaderOffset = E.readInt(4), this.isEncrypted()) throw new Error("Encrypted zip are not supported");
          E.skip(C), this.readExtraFields(E), this.parseZIP64ExtraField(E), this.fileComment = E.readData(this.fileCommentLength);
        }, processAttributes: function() {
          this.unixPermissions = null, this.dosPermissions = null;
          var E = this.versionMadeBy >> 8;
          this.dir = !!(16 & this.externalFileAttributes), E == 0 && (this.dosPermissions = 63 & this.externalFileAttributes), E == 3 && (this.unixPermissions = this.externalFileAttributes >> 16 & 65535), this.dir || this.fileNameStr.slice(-1) !== "/" || (this.dir = !0);
        }, parseZIP64ExtraField: function() {
          if (this.extraFields[1]) {
            var E = u(this.extraFields[1].value);
            this.uncompressedSize === l.MAX_VALUE_32BITS && (this.uncompressedSize = E.readInt(8)), this.compressedSize === l.MAX_VALUE_32BITS && (this.compressedSize = E.readInt(8)), this.localHeaderOffset === l.MAX_VALUE_32BITS && (this.localHeaderOffset = E.readInt(8)), this.diskNumberStart === l.MAX_VALUE_32BITS && (this.diskNumberStart = E.readInt(4));
          }
        }, readExtraFields: function(E) {
          var C, w, A, c = E.index + this.extraFieldsLength;
          for (this.extraFields || (this.extraFields = {}); E.index + 4 < c; ) C = E.readInt(2), w = E.readInt(2), A = E.readData(w), this.extraFields[C] = { id: C, length: w, value: A };
          E.setIndex(c);
        }, handleUTF8: function() {
          var E = k.uint8array ? "uint8array" : "array";
          if (this.useUTF8()) this.fileNameStr = g.utf8decode(this.fileName), this.fileCommentStr = g.utf8decode(this.fileComment);
          else {
            var C = this.findExtraFieldUnicodePath();
            if (C !== null) this.fileNameStr = C;
            else {
              var w = l.transformTo(E, this.fileName);
              this.fileNameStr = this.loadOptions.decodeFileName(w);
            }
            var A = this.findExtraFieldUnicodeComment();
            if (A !== null) this.fileCommentStr = A;
            else {
              var c = l.transformTo(E, this.fileComment);
              this.fileCommentStr = this.loadOptions.decodeFileName(c);
            }
          }
        }, findExtraFieldUnicodePath: function() {
          var E = this.extraFields[28789];
          if (E) {
            var C = u(E.value);
            return C.readInt(1) !== 1 || f(this.fileName) !== C.readInt(4) ? null : g.utf8decode(C.readData(E.length - 5));
          }
          return null;
        }, findExtraFieldUnicodeComment: function() {
          var E = this.extraFields[25461];
          if (E) {
            var C = u(E.value);
            return C.readInt(1) !== 1 || f(this.fileComment) !== C.readInt(4) ? null : g.utf8decode(C.readData(E.length - 5));
          }
          return null;
        } }, s.exports = R;
      }, { "./compressedObject": 2, "./compressions": 3, "./crc32": 4, "./reader/readerFor": 22, "./support": 30, "./utf8": 31, "./utils": 32 }], 35: [function(t, s, o) {
        function u(C, w, A) {
          this.name = C, this.dir = A.dir, this.date = A.date, this.comment = A.comment, this.unixPermissions = A.unixPermissions, this.dosPermissions = A.dosPermissions, this._data = w, this._dataBinary = A.binary, this.options = { compression: A.compression, compressionOptions: A.compressionOptions };
        }
        var l = t("./stream/StreamHelper"), n = t("./stream/DataWorker"), f = t("./utf8"), g = t("./compressedObject"), _ = t("./stream/GenericWorker");
        u.prototype = { internalStream: function(C) {
          var w = null, A = "string";
          try {
            if (!C) throw new Error("No output type specified.");
            var c = (A = C.toLowerCase()) === "string" || A === "text";
            A !== "binarystring" && A !== "text" || (A = "string"), w = this._decompressWorker();
            var y = !this._dataBinary;
            y && !c && (w = w.pipe(new f.Utf8EncodeWorker())), !y && c && (w = w.pipe(new f.Utf8DecodeWorker()));
          } catch (m) {
            (w = new _("error")).error(m);
          }
          return new l(w, A, "");
        }, async: function(C, w) {
          return this.internalStream(C).accumulate(w);
        }, nodeStream: function(C, w) {
          return this.internalStream(C || "nodebuffer").toNodejsStream(w);
        }, _compressWorker: function(C, w) {
          if (this._data instanceof g && this._data.compression.magic === C.magic) return this._data.getCompressedWorker();
          var A = this._decompressWorker();
          return this._dataBinary || (A = A.pipe(new f.Utf8EncodeWorker())), g.createWorkerFrom(A, C, w);
        }, _decompressWorker: function() {
          return this._data instanceof g ? this._data.getContentWorker() : this._data instanceof _ ? this._data : new n(this._data);
        } };
        for (var k = ["asText", "asBinary", "asNodeBuffer", "asUint8Array", "asArrayBuffer"], R = function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, E = 0; E < k.length; E++) u.prototype[k[E]] = R;
        s.exports = u;
      }, { "./compressedObject": 2, "./stream/DataWorker": 27, "./stream/GenericWorker": 28, "./stream/StreamHelper": 29, "./utf8": 31 }], 36: [function(t, s, o) {
        (function(u) {
          var l, n, f = u.MutationObserver || u.WebKitMutationObserver;
          if (f) {
            var g = 0, _ = new f(C), k = u.document.createTextNode("");
            _.observe(k, { characterData: !0 }), l = function() {
              k.data = g = ++g % 2;
            };
          } else if (u.setImmediate || u.MessageChannel === void 0) l = "document" in u && "onreadystatechange" in u.document.createElement("script") ? function() {
            var w = u.document.createElement("script");
            w.onreadystatechange = function() {
              C(), w.onreadystatechange = null, w.parentNode.removeChild(w), w = null;
            }, u.document.documentElement.appendChild(w);
          } : function() {
            setTimeout(C, 0);
          };
          else {
            var R = new u.MessageChannel();
            R.port1.onmessage = C, l = function() {
              R.port2.postMessage(0);
            };
          }
          var E = [];
          function C() {
            var w, A;
            n = !0;
            for (var c = E.length; c; ) {
              for (A = E, E = [], w = -1; ++w < c; ) A[w]();
              c = E.length;
            }
            n = !1;
          }
          s.exports = function(w) {
            E.push(w) !== 1 || n || l();
          };
        }).call(this, typeof Fe < "u" ? Fe : typeof self < "u" ? self : typeof window < "u" ? window : {});
      }, {}], 37: [function(t, s, o) {
        var u = t("immediate");
        function l() {
        }
        var n = {}, f = ["REJECTED"], g = ["FULFILLED"], _ = ["PENDING"];
        function k(c) {
          if (typeof c != "function") throw new TypeError("resolver must be a function");
          this.state = _, this.queue = [], this.outcome = void 0, c !== l && w(this, c);
        }
        function R(c, y, m) {
          this.promise = c, typeof y == "function" && (this.onFulfilled = y, this.callFulfilled = this.otherCallFulfilled), typeof m == "function" && (this.onRejected = m, this.callRejected = this.otherCallRejected);
        }
        function E(c, y, m) {
          u(function() {
            var h;
            try {
              h = y(m);
            } catch (T) {
              return n.reject(c, T);
            }
            h === c ? n.reject(c, new TypeError("Cannot resolve promise with itself")) : n.resolve(c, h);
          });
        }
        function C(c) {
          var y = c && c.then;
          if (c && (typeof c == "object" || typeof c == "function") && typeof y == "function") return function() {
            y.apply(c, arguments);
          };
        }
        function w(c, y) {
          var m = !1;
          function h(B) {
            m || (m = !0, n.reject(c, B));
          }
          function T(B) {
            m || (m = !0, n.resolve(c, B));
          }
          var F = A(function() {
            y(T, h);
          });
          F.status === "error" && h(F.value);
        }
        function A(c, y) {
          var m = {};
          try {
            m.value = c(y), m.status = "success";
          } catch (h) {
            m.status = "error", m.value = h;
          }
          return m;
        }
        (s.exports = k).prototype.finally = function(c) {
          if (typeof c != "function") return this;
          var y = this.constructor;
          return this.then(function(m) {
            return y.resolve(c()).then(function() {
              return m;
            });
          }, function(m) {
            return y.resolve(c()).then(function() {
              throw m;
            });
          });
        }, k.prototype.catch = function(c) {
          return this.then(null, c);
        }, k.prototype.then = function(c, y) {
          if (typeof c != "function" && this.state === g || typeof y != "function" && this.state === f) return this;
          var m = new this.constructor(l);
          return this.state !== _ ? E(m, this.state === g ? c : y, this.outcome) : this.queue.push(new R(m, c, y)), m;
        }, R.prototype.callFulfilled = function(c) {
          n.resolve(this.promise, c);
        }, R.prototype.otherCallFulfilled = function(c) {
          E(this.promise, this.onFulfilled, c);
        }, R.prototype.callRejected = function(c) {
          n.reject(this.promise, c);
        }, R.prototype.otherCallRejected = function(c) {
          E(this.promise, this.onRejected, c);
        }, n.resolve = function(c, y) {
          var m = A(C, y);
          if (m.status === "error") return n.reject(c, m.value);
          var h = m.value;
          if (h) w(c, h);
          else {
            c.state = g, c.outcome = y;
            for (var T = -1, F = c.queue.length; ++T < F; ) c.queue[T].callFulfilled(y);
          }
          return c;
        }, n.reject = function(c, y) {
          c.state = f, c.outcome = y;
          for (var m = -1, h = c.queue.length; ++m < h; ) c.queue[m].callRejected(y);
          return c;
        }, k.resolve = function(c) {
          return c instanceof this ? c : n.resolve(new this(l), c);
        }, k.reject = function(c) {
          var y = new this(l);
          return n.reject(y, c);
        }, k.all = function(c) {
          var y = this;
          if (Object.prototype.toString.call(c) !== "[object Array]") return this.reject(new TypeError("must be an array"));
          var m = c.length, h = !1;
          if (!m) return this.resolve([]);
          for (var T = new Array(m), F = 0, B = -1, z = new this(l); ++B < m; ) I(c[B], B);
          return z;
          function I(X, oe) {
            y.resolve(X).then(function(N) {
              T[oe] = N, ++F !== m || h || (h = !0, n.resolve(z, T));
            }, function(N) {
              h || (h = !0, n.reject(z, N));
            });
          }
        }, k.race = function(c) {
          var y = this;
          if (Object.prototype.toString.call(c) !== "[object Array]") return this.reject(new TypeError("must be an array"));
          var m = c.length, h = !1;
          if (!m) return this.resolve([]);
          for (var T = -1, F = new this(l); ++T < m; ) B = c[T], y.resolve(B).then(function(z) {
            h || (h = !0, n.resolve(F, z));
          }, function(z) {
            h || (h = !0, n.reject(F, z));
          });
          var B;
          return F;
        };
      }, { immediate: 36 }], 38: [function(t, s, o) {
        var u = {};
        (0, t("./lib/utils/common").assign)(u, t("./lib/deflate"), t("./lib/inflate"), t("./lib/zlib/constants")), s.exports = u;
      }, { "./lib/deflate": 39, "./lib/inflate": 40, "./lib/utils/common": 41, "./lib/zlib/constants": 44 }], 39: [function(t, s, o) {
        var u = t("./zlib/deflate"), l = t("./utils/common"), n = t("./utils/strings"), f = t("./zlib/messages"), g = t("./zlib/zstream"), _ = Object.prototype.toString, k = 0, R = -1, E = 0, C = 8;
        function w(c) {
          if (!(this instanceof w)) return new w(c);
          this.options = l.assign({ level: R, method: C, chunkSize: 16384, windowBits: 15, memLevel: 8, strategy: E, to: "" }, c || {});
          var y = this.options;
          y.raw && 0 < y.windowBits ? y.windowBits = -y.windowBits : y.gzip && 0 < y.windowBits && y.windowBits < 16 && (y.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new g(), this.strm.avail_out = 0;
          var m = u.deflateInit2(this.strm, y.level, y.method, y.windowBits, y.memLevel, y.strategy);
          if (m !== k) throw new Error(f[m]);
          if (y.header && u.deflateSetHeader(this.strm, y.header), y.dictionary) {
            var h;
            if (h = typeof y.dictionary == "string" ? n.string2buf(y.dictionary) : _.call(y.dictionary) === "[object ArrayBuffer]" ? new Uint8Array(y.dictionary) : y.dictionary, (m = u.deflateSetDictionary(this.strm, h)) !== k) throw new Error(f[m]);
            this._dict_set = !0;
          }
        }
        function A(c, y) {
          var m = new w(y);
          if (m.push(c, !0), m.err) throw m.msg || f[m.err];
          return m.result;
        }
        w.prototype.push = function(c, y) {
          var m, h, T = this.strm, F = this.options.chunkSize;
          if (this.ended) return !1;
          h = y === ~~y ? y : y === !0 ? 4 : 0, typeof c == "string" ? T.input = n.string2buf(c) : _.call(c) === "[object ArrayBuffer]" ? T.input = new Uint8Array(c) : T.input = c, T.next_in = 0, T.avail_in = T.input.length;
          do {
            if (T.avail_out === 0 && (T.output = new l.Buf8(F), T.next_out = 0, T.avail_out = F), (m = u.deflate(T, h)) !== 1 && m !== k) return this.onEnd(m), !(this.ended = !0);
            T.avail_out !== 0 && (T.avail_in !== 0 || h !== 4 && h !== 2) || (this.options.to === "string" ? this.onData(n.buf2binstring(l.shrinkBuf(T.output, T.next_out))) : this.onData(l.shrinkBuf(T.output, T.next_out)));
          } while ((0 < T.avail_in || T.avail_out === 0) && m !== 1);
          return h === 4 ? (m = u.deflateEnd(this.strm), this.onEnd(m), this.ended = !0, m === k) : h !== 2 || (this.onEnd(k), !(T.avail_out = 0));
        }, w.prototype.onData = function(c) {
          this.chunks.push(c);
        }, w.prototype.onEnd = function(c) {
          c === k && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = l.flattenChunks(this.chunks)), this.chunks = [], this.err = c, this.msg = this.strm.msg;
        }, o.Deflate = w, o.deflate = A, o.deflateRaw = function(c, y) {
          return (y = y || {}).raw = !0, A(c, y);
        }, o.gzip = function(c, y) {
          return (y = y || {}).gzip = !0, A(c, y);
        };
      }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/deflate": 46, "./zlib/messages": 51, "./zlib/zstream": 53 }], 40: [function(t, s, o) {
        var u = t("./zlib/inflate"), l = t("./utils/common"), n = t("./utils/strings"), f = t("./zlib/constants"), g = t("./zlib/messages"), _ = t("./zlib/zstream"), k = t("./zlib/gzheader"), R = Object.prototype.toString;
        function E(w) {
          if (!(this instanceof E)) return new E(w);
          this.options = l.assign({ chunkSize: 16384, windowBits: 0, to: "" }, w || {});
          var A = this.options;
          A.raw && 0 <= A.windowBits && A.windowBits < 16 && (A.windowBits = -A.windowBits, A.windowBits === 0 && (A.windowBits = -15)), !(0 <= A.windowBits && A.windowBits < 16) || w && w.windowBits || (A.windowBits += 32), 15 < A.windowBits && A.windowBits < 48 && !(15 & A.windowBits) && (A.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new _(), this.strm.avail_out = 0;
          var c = u.inflateInit2(this.strm, A.windowBits);
          if (c !== f.Z_OK) throw new Error(g[c]);
          this.header = new k(), u.inflateGetHeader(this.strm, this.header);
        }
        function C(w, A) {
          var c = new E(A);
          if (c.push(w, !0), c.err) throw c.msg || g[c.err];
          return c.result;
        }
        E.prototype.push = function(w, A) {
          var c, y, m, h, T, F, B = this.strm, z = this.options.chunkSize, I = this.options.dictionary, X = !1;
          if (this.ended) return !1;
          y = A === ~~A ? A : A === !0 ? f.Z_FINISH : f.Z_NO_FLUSH, typeof w == "string" ? B.input = n.binstring2buf(w) : R.call(w) === "[object ArrayBuffer]" ? B.input = new Uint8Array(w) : B.input = w, B.next_in = 0, B.avail_in = B.input.length;
          do {
            if (B.avail_out === 0 && (B.output = new l.Buf8(z), B.next_out = 0, B.avail_out = z), (c = u.inflate(B, f.Z_NO_FLUSH)) === f.Z_NEED_DICT && I && (F = typeof I == "string" ? n.string2buf(I) : R.call(I) === "[object ArrayBuffer]" ? new Uint8Array(I) : I, c = u.inflateSetDictionary(this.strm, F)), c === f.Z_BUF_ERROR && X === !0 && (c = f.Z_OK, X = !1), c !== f.Z_STREAM_END && c !== f.Z_OK) return this.onEnd(c), !(this.ended = !0);
            B.next_out && (B.avail_out !== 0 && c !== f.Z_STREAM_END && (B.avail_in !== 0 || y !== f.Z_FINISH && y !== f.Z_SYNC_FLUSH) || (this.options.to === "string" ? (m = n.utf8border(B.output, B.next_out), h = B.next_out - m, T = n.buf2string(B.output, m), B.next_out = h, B.avail_out = z - h, h && l.arraySet(B.output, B.output, m, h, 0), this.onData(T)) : this.onData(l.shrinkBuf(B.output, B.next_out)))), B.avail_in === 0 && B.avail_out === 0 && (X = !0);
          } while ((0 < B.avail_in || B.avail_out === 0) && c !== f.Z_STREAM_END);
          return c === f.Z_STREAM_END && (y = f.Z_FINISH), y === f.Z_FINISH ? (c = u.inflateEnd(this.strm), this.onEnd(c), this.ended = !0, c === f.Z_OK) : y !== f.Z_SYNC_FLUSH || (this.onEnd(f.Z_OK), !(B.avail_out = 0));
        }, E.prototype.onData = function(w) {
          this.chunks.push(w);
        }, E.prototype.onEnd = function(w) {
          w === f.Z_OK && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = l.flattenChunks(this.chunks)), this.chunks = [], this.err = w, this.msg = this.strm.msg;
        }, o.Inflate = E, o.inflate = C, o.inflateRaw = function(w, A) {
          return (A = A || {}).raw = !0, C(w, A);
        }, o.ungzip = C;
      }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/constants": 44, "./zlib/gzheader": 47, "./zlib/inflate": 49, "./zlib/messages": 51, "./zlib/zstream": 53 }], 41: [function(t, s, o) {
        var u = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Int32Array < "u";
        o.assign = function(f) {
          for (var g = Array.prototype.slice.call(arguments, 1); g.length; ) {
            var _ = g.shift();
            if (_) {
              if (typeof _ != "object") throw new TypeError(_ + "must be non-object");
              for (var k in _) _.hasOwnProperty(k) && (f[k] = _[k]);
            }
          }
          return f;
        }, o.shrinkBuf = function(f, g) {
          return f.length === g ? f : f.subarray ? f.subarray(0, g) : (f.length = g, f);
        };
        var l = { arraySet: function(f, g, _, k, R) {
          if (g.subarray && f.subarray) f.set(g.subarray(_, _ + k), R);
          else for (var E = 0; E < k; E++) f[R + E] = g[_ + E];
        }, flattenChunks: function(f) {
          var g, _, k, R, E, C;
          for (g = k = 0, _ = f.length; g < _; g++) k += f[g].length;
          for (C = new Uint8Array(k), g = R = 0, _ = f.length; g < _; g++) E = f[g], C.set(E, R), R += E.length;
          return C;
        } }, n = { arraySet: function(f, g, _, k, R) {
          for (var E = 0; E < k; E++) f[R + E] = g[_ + E];
        }, flattenChunks: function(f) {
          return [].concat.apply([], f);
        } };
        o.setTyped = function(f) {
          f ? (o.Buf8 = Uint8Array, o.Buf16 = Uint16Array, o.Buf32 = Int32Array, o.assign(o, l)) : (o.Buf8 = Array, o.Buf16 = Array, o.Buf32 = Array, o.assign(o, n));
        }, o.setTyped(u);
      }, {}], 42: [function(t, s, o) {
        var u = t("./common"), l = !0, n = !0;
        try {
          String.fromCharCode.apply(null, [0]);
        } catch {
          l = !1;
        }
        try {
          String.fromCharCode.apply(null, new Uint8Array(1));
        } catch {
          n = !1;
        }
        for (var f = new u.Buf8(256), g = 0; g < 256; g++) f[g] = 252 <= g ? 6 : 248 <= g ? 5 : 240 <= g ? 4 : 224 <= g ? 3 : 192 <= g ? 2 : 1;
        function _(k, R) {
          if (R < 65537 && (k.subarray && n || !k.subarray && l)) return String.fromCharCode.apply(null, u.shrinkBuf(k, R));
          for (var E = "", C = 0; C < R; C++) E += String.fromCharCode(k[C]);
          return E;
        }
        f[254] = f[254] = 1, o.string2buf = function(k) {
          var R, E, C, w, A, c = k.length, y = 0;
          for (w = 0; w < c; w++) (64512 & (E = k.charCodeAt(w))) == 55296 && w + 1 < c && (64512 & (C = k.charCodeAt(w + 1))) == 56320 && (E = 65536 + (E - 55296 << 10) + (C - 56320), w++), y += E < 128 ? 1 : E < 2048 ? 2 : E < 65536 ? 3 : 4;
          for (R = new u.Buf8(y), w = A = 0; A < y; w++) (64512 & (E = k.charCodeAt(w))) == 55296 && w + 1 < c && (64512 & (C = k.charCodeAt(w + 1))) == 56320 && (E = 65536 + (E - 55296 << 10) + (C - 56320), w++), E < 128 ? R[A++] = E : (E < 2048 ? R[A++] = 192 | E >>> 6 : (E < 65536 ? R[A++] = 224 | E >>> 12 : (R[A++] = 240 | E >>> 18, R[A++] = 128 | E >>> 12 & 63), R[A++] = 128 | E >>> 6 & 63), R[A++] = 128 | 63 & E);
          return R;
        }, o.buf2binstring = function(k) {
          return _(k, k.length);
        }, o.binstring2buf = function(k) {
          for (var R = new u.Buf8(k.length), E = 0, C = R.length; E < C; E++) R[E] = k.charCodeAt(E);
          return R;
        }, o.buf2string = function(k, R) {
          var E, C, w, A, c = R || k.length, y = new Array(2 * c);
          for (E = C = 0; E < c; ) if ((w = k[E++]) < 128) y[C++] = w;
          else if (4 < (A = f[w])) y[C++] = 65533, E += A - 1;
          else {
            for (w &= A === 2 ? 31 : A === 3 ? 15 : 7; 1 < A && E < c; ) w = w << 6 | 63 & k[E++], A--;
            1 < A ? y[C++] = 65533 : w < 65536 ? y[C++] = w : (w -= 65536, y[C++] = 55296 | w >> 10 & 1023, y[C++] = 56320 | 1023 & w);
          }
          return _(y, C);
        }, o.utf8border = function(k, R) {
          var E;
          for ((R = R || k.length) > k.length && (R = k.length), E = R - 1; 0 <= E && (192 & k[E]) == 128; ) E--;
          return E < 0 || E === 0 ? R : E + f[k[E]] > R ? E : R;
        };
      }, { "./common": 41 }], 43: [function(t, s, o) {
        s.exports = function(u, l, n, f) {
          for (var g = 65535 & u | 0, _ = u >>> 16 & 65535 | 0, k = 0; n !== 0; ) {
            for (n -= k = 2e3 < n ? 2e3 : n; _ = _ + (g = g + l[f++] | 0) | 0, --k; ) ;
            g %= 65521, _ %= 65521;
          }
          return g | _ << 16 | 0;
        };
      }, {}], 44: [function(t, s, o) {
        s.exports = { Z_NO_FLUSH: 0, Z_PARTIAL_FLUSH: 1, Z_SYNC_FLUSH: 2, Z_FULL_FLUSH: 3, Z_FINISH: 4, Z_BLOCK: 5, Z_TREES: 6, Z_OK: 0, Z_STREAM_END: 1, Z_NEED_DICT: 2, Z_ERRNO: -1, Z_STREAM_ERROR: -2, Z_DATA_ERROR: -3, Z_BUF_ERROR: -5, Z_NO_COMPRESSION: 0, Z_BEST_SPEED: 1, Z_BEST_COMPRESSION: 9, Z_DEFAULT_COMPRESSION: -1, Z_FILTERED: 1, Z_HUFFMAN_ONLY: 2, Z_RLE: 3, Z_FIXED: 4, Z_DEFAULT_STRATEGY: 0, Z_BINARY: 0, Z_TEXT: 1, Z_UNKNOWN: 2, Z_DEFLATED: 8 };
      }, {}], 45: [function(t, s, o) {
        var u = function() {
          for (var l, n = [], f = 0; f < 256; f++) {
            l = f;
            for (var g = 0; g < 8; g++) l = 1 & l ? 3988292384 ^ l >>> 1 : l >>> 1;
            n[f] = l;
          }
          return n;
        }();
        s.exports = function(l, n, f, g) {
          var _ = u, k = g + f;
          l ^= -1;
          for (var R = g; R < k; R++) l = l >>> 8 ^ _[255 & (l ^ n[R])];
          return -1 ^ l;
        };
      }, {}], 46: [function(t, s, o) {
        var u, l = t("../utils/common"), n = t("./trees"), f = t("./adler32"), g = t("./crc32"), _ = t("./messages"), k = 0, R = 4, E = 0, C = -2, w = -1, A = 4, c = 2, y = 8, m = 9, h = 286, T = 30, F = 19, B = 2 * h + 1, z = 15, I = 3, X = 258, oe = X + I + 1, N = 42, M = 113, b = 1, G = 2, ee = 3, q = 4;
        function ne(d, Y) {
          return d.msg = _[Y], Y;
        }
        function Q(d) {
          return (d << 1) - (4 < d ? 9 : 0);
        }
        function ce(d) {
          for (var Y = d.length; 0 <= --Y; ) d[Y] = 0;
        }
        function V(d) {
          var Y = d.state, S = Y.pending;
          S > d.avail_out && (S = d.avail_out), S !== 0 && (l.arraySet(d.output, Y.pending_buf, Y.pending_out, S, d.next_out), d.next_out += S, Y.pending_out += S, d.total_out += S, d.avail_out -= S, Y.pending -= S, Y.pending === 0 && (Y.pending_out = 0));
        }
        function P(d, Y) {
          n._tr_flush_block(d, 0 <= d.block_start ? d.block_start : -1, d.strstart - d.block_start, Y), d.block_start = d.strstart, V(d.strm);
        }
        function $(d, Y) {
          d.pending_buf[d.pending++] = Y;
        }
        function Z(d, Y) {
          d.pending_buf[d.pending++] = Y >>> 8 & 255, d.pending_buf[d.pending++] = 255 & Y;
        }
        function te(d, Y) {
          var S, i, a = d.max_chain_length, p = d.strstart, L = d.prev_length, H = d.nice_match, j = d.strstart > d.w_size - oe ? d.strstart - (d.w_size - oe) : 0, re = d.window, ae = d.w_mask, ie = d.prev, fe = d.strstart + X, de = re[p + L - 1], pe = re[p + L];
          d.prev_length >= d.good_match && (a >>= 2), H > d.lookahead && (H = d.lookahead);
          do
            if (re[(S = Y) + L] === pe && re[S + L - 1] === de && re[S] === re[p] && re[++S] === re[p + 1]) {
              p += 2, S++;
              do
                ;
              while (re[++p] === re[++S] && re[++p] === re[++S] && re[++p] === re[++S] && re[++p] === re[++S] && re[++p] === re[++S] && re[++p] === re[++S] && re[++p] === re[++S] && re[++p] === re[++S] && p < fe);
              if (i = X - (fe - p), p = fe - X, L < i) {
                if (d.match_start = Y, H <= (L = i)) break;
                de = re[p + L - 1], pe = re[p + L];
              }
            }
          while ((Y = ie[Y & ae]) > j && --a != 0);
          return L <= d.lookahead ? L : d.lookahead;
        }
        function K(d) {
          var Y, S, i, a, p, L, H, j, re, ae, ie = d.w_size;
          do {
            if (a = d.window_size - d.lookahead - d.strstart, d.strstart >= ie + (ie - oe)) {
              for (l.arraySet(d.window, d.window, ie, ie, 0), d.match_start -= ie, d.strstart -= ie, d.block_start -= ie, Y = S = d.hash_size; i = d.head[--Y], d.head[Y] = ie <= i ? i - ie : 0, --S; ) ;
              for (Y = S = ie; i = d.prev[--Y], d.prev[Y] = ie <= i ? i - ie : 0, --S; ) ;
              a += ie;
            }
            if (d.strm.avail_in === 0) break;
            if (L = d.strm, H = d.window, j = d.strstart + d.lookahead, re = a, ae = void 0, ae = L.avail_in, re < ae && (ae = re), S = ae === 0 ? 0 : (L.avail_in -= ae, l.arraySet(H, L.input, L.next_in, ae, j), L.state.wrap === 1 ? L.adler = f(L.adler, H, ae, j) : L.state.wrap === 2 && (L.adler = g(L.adler, H, ae, j)), L.next_in += ae, L.total_in += ae, ae), d.lookahead += S, d.lookahead + d.insert >= I) for (p = d.strstart - d.insert, d.ins_h = d.window[p], d.ins_h = (d.ins_h << d.hash_shift ^ d.window[p + 1]) & d.hash_mask; d.insert && (d.ins_h = (d.ins_h << d.hash_shift ^ d.window[p + I - 1]) & d.hash_mask, d.prev[p & d.w_mask] = d.head[d.ins_h], d.head[d.ins_h] = p, p++, d.insert--, !(d.lookahead + d.insert < I)); ) ;
          } while (d.lookahead < oe && d.strm.avail_in !== 0);
        }
        function x(d, Y) {
          for (var S, i; ; ) {
            if (d.lookahead < oe) {
              if (K(d), d.lookahead < oe && Y === k) return b;
              if (d.lookahead === 0) break;
            }
            if (S = 0, d.lookahead >= I && (d.ins_h = (d.ins_h << d.hash_shift ^ d.window[d.strstart + I - 1]) & d.hash_mask, S = d.prev[d.strstart & d.w_mask] = d.head[d.ins_h], d.head[d.ins_h] = d.strstart), S !== 0 && d.strstart - S <= d.w_size - oe && (d.match_length = te(d, S)), d.match_length >= I) if (i = n._tr_tally(d, d.strstart - d.match_start, d.match_length - I), d.lookahead -= d.match_length, d.match_length <= d.max_lazy_match && d.lookahead >= I) {
              for (d.match_length--; d.strstart++, d.ins_h = (d.ins_h << d.hash_shift ^ d.window[d.strstart + I - 1]) & d.hash_mask, S = d.prev[d.strstart & d.w_mask] = d.head[d.ins_h], d.head[d.ins_h] = d.strstart, --d.match_length != 0; ) ;
              d.strstart++;
            } else d.strstart += d.match_length, d.match_length = 0, d.ins_h = d.window[d.strstart], d.ins_h = (d.ins_h << d.hash_shift ^ d.window[d.strstart + 1]) & d.hash_mask;
            else i = n._tr_tally(d, 0, d.window[d.strstart]), d.lookahead--, d.strstart++;
            if (i && (P(d, !1), d.strm.avail_out === 0)) return b;
          }
          return d.insert = d.strstart < I - 1 ? d.strstart : I - 1, Y === R ? (P(d, !0), d.strm.avail_out === 0 ? ee : q) : d.last_lit && (P(d, !1), d.strm.avail_out === 0) ? b : G;
        }
        function v(d, Y) {
          for (var S, i, a; ; ) {
            if (d.lookahead < oe) {
              if (K(d), d.lookahead < oe && Y === k) return b;
              if (d.lookahead === 0) break;
            }
            if (S = 0, d.lookahead >= I && (d.ins_h = (d.ins_h << d.hash_shift ^ d.window[d.strstart + I - 1]) & d.hash_mask, S = d.prev[d.strstart & d.w_mask] = d.head[d.ins_h], d.head[d.ins_h] = d.strstart), d.prev_length = d.match_length, d.prev_match = d.match_start, d.match_length = I - 1, S !== 0 && d.prev_length < d.max_lazy_match && d.strstart - S <= d.w_size - oe && (d.match_length = te(d, S), d.match_length <= 5 && (d.strategy === 1 || d.match_length === I && 4096 < d.strstart - d.match_start) && (d.match_length = I - 1)), d.prev_length >= I && d.match_length <= d.prev_length) {
              for (a = d.strstart + d.lookahead - I, i = n._tr_tally(d, d.strstart - 1 - d.prev_match, d.prev_length - I), d.lookahead -= d.prev_length - 1, d.prev_length -= 2; ++d.strstart <= a && (d.ins_h = (d.ins_h << d.hash_shift ^ d.window[d.strstart + I - 1]) & d.hash_mask, S = d.prev[d.strstart & d.w_mask] = d.head[d.ins_h], d.head[d.ins_h] = d.strstart), --d.prev_length != 0; ) ;
              if (d.match_available = 0, d.match_length = I - 1, d.strstart++, i && (P(d, !1), d.strm.avail_out === 0)) return b;
            } else if (d.match_available) {
              if ((i = n._tr_tally(d, 0, d.window[d.strstart - 1])) && P(d, !1), d.strstart++, d.lookahead--, d.strm.avail_out === 0) return b;
            } else d.match_available = 1, d.strstart++, d.lookahead--;
          }
          return d.match_available && (i = n._tr_tally(d, 0, d.window[d.strstart - 1]), d.match_available = 0), d.insert = d.strstart < I - 1 ? d.strstart : I - 1, Y === R ? (P(d, !0), d.strm.avail_out === 0 ? ee : q) : d.last_lit && (P(d, !1), d.strm.avail_out === 0) ? b : G;
        }
        function W(d, Y, S, i, a) {
          this.good_length = d, this.max_lazy = Y, this.nice_length = S, this.max_chain = i, this.func = a;
        }
        function U() {
          this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = y, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new l.Buf16(2 * B), this.dyn_dtree = new l.Buf16(2 * (2 * T + 1)), this.bl_tree = new l.Buf16(2 * (2 * F + 1)), ce(this.dyn_ltree), ce(this.dyn_dtree), ce(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new l.Buf16(z + 1), this.heap = new l.Buf16(2 * h + 1), ce(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new l.Buf16(2 * h + 1), ce(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
        }
        function O(d) {
          var Y;
          return d && d.state ? (d.total_in = d.total_out = 0, d.data_type = c, (Y = d.state).pending = 0, Y.pending_out = 0, Y.wrap < 0 && (Y.wrap = -Y.wrap), Y.status = Y.wrap ? N : M, d.adler = Y.wrap === 2 ? 0 : 1, Y.last_flush = k, n._tr_init(Y), E) : ne(d, C);
        }
        function D(d) {
          var Y = O(d);
          return Y === E && function(S) {
            S.window_size = 2 * S.w_size, ce(S.head), S.max_lazy_match = u[S.level].max_lazy, S.good_match = u[S.level].good_length, S.nice_match = u[S.level].nice_length, S.max_chain_length = u[S.level].max_chain, S.strstart = 0, S.block_start = 0, S.lookahead = 0, S.insert = 0, S.match_length = S.prev_length = I - 1, S.match_available = 0, S.ins_h = 0;
          }(d.state), Y;
        }
        function J(d, Y, S, i, a, p) {
          if (!d) return C;
          var L = 1;
          if (Y === w && (Y = 6), i < 0 ? (L = 0, i = -i) : 15 < i && (L = 2, i -= 16), a < 1 || m < a || S !== y || i < 8 || 15 < i || Y < 0 || 9 < Y || p < 0 || A < p) return ne(d, C);
          i === 8 && (i = 9);
          var H = new U();
          return (d.state = H).strm = d, H.wrap = L, H.gzhead = null, H.w_bits = i, H.w_size = 1 << H.w_bits, H.w_mask = H.w_size - 1, H.hash_bits = a + 7, H.hash_size = 1 << H.hash_bits, H.hash_mask = H.hash_size - 1, H.hash_shift = ~~((H.hash_bits + I - 1) / I), H.window = new l.Buf8(2 * H.w_size), H.head = new l.Buf16(H.hash_size), H.prev = new l.Buf16(H.w_size), H.lit_bufsize = 1 << a + 6, H.pending_buf_size = 4 * H.lit_bufsize, H.pending_buf = new l.Buf8(H.pending_buf_size), H.d_buf = 1 * H.lit_bufsize, H.l_buf = 3 * H.lit_bufsize, H.level = Y, H.strategy = p, H.method = S, D(d);
        }
        u = [new W(0, 0, 0, 0, function(d, Y) {
          var S = 65535;
          for (S > d.pending_buf_size - 5 && (S = d.pending_buf_size - 5); ; ) {
            if (d.lookahead <= 1) {
              if (K(d), d.lookahead === 0 && Y === k) return b;
              if (d.lookahead === 0) break;
            }
            d.strstart += d.lookahead, d.lookahead = 0;
            var i = d.block_start + S;
            if ((d.strstart === 0 || d.strstart >= i) && (d.lookahead = d.strstart - i, d.strstart = i, P(d, !1), d.strm.avail_out === 0) || d.strstart - d.block_start >= d.w_size - oe && (P(d, !1), d.strm.avail_out === 0)) return b;
          }
          return d.insert = 0, Y === R ? (P(d, !0), d.strm.avail_out === 0 ? ee : q) : (d.strstart > d.block_start && (P(d, !1), d.strm.avail_out), b);
        }), new W(4, 4, 8, 4, x), new W(4, 5, 16, 8, x), new W(4, 6, 32, 32, x), new W(4, 4, 16, 16, v), new W(8, 16, 32, 32, v), new W(8, 16, 128, 128, v), new W(8, 32, 128, 256, v), new W(32, 128, 258, 1024, v), new W(32, 258, 258, 4096, v)], o.deflateInit = function(d, Y) {
          return J(d, Y, y, 15, 8, 0);
        }, o.deflateInit2 = J, o.deflateReset = D, o.deflateResetKeep = O, o.deflateSetHeader = function(d, Y) {
          return d && d.state ? d.state.wrap !== 2 ? C : (d.state.gzhead = Y, E) : C;
        }, o.deflate = function(d, Y) {
          var S, i, a, p;
          if (!d || !d.state || 5 < Y || Y < 0) return d ? ne(d, C) : C;
          if (i = d.state, !d.output || !d.input && d.avail_in !== 0 || i.status === 666 && Y !== R) return ne(d, d.avail_out === 0 ? -5 : C);
          if (i.strm = d, S = i.last_flush, i.last_flush = Y, i.status === N) if (i.wrap === 2) d.adler = 0, $(i, 31), $(i, 139), $(i, 8), i.gzhead ? ($(i, (i.gzhead.text ? 1 : 0) + (i.gzhead.hcrc ? 2 : 0) + (i.gzhead.extra ? 4 : 0) + (i.gzhead.name ? 8 : 0) + (i.gzhead.comment ? 16 : 0)), $(i, 255 & i.gzhead.time), $(i, i.gzhead.time >> 8 & 255), $(i, i.gzhead.time >> 16 & 255), $(i, i.gzhead.time >> 24 & 255), $(i, i.level === 9 ? 2 : 2 <= i.strategy || i.level < 2 ? 4 : 0), $(i, 255 & i.gzhead.os), i.gzhead.extra && i.gzhead.extra.length && ($(i, 255 & i.gzhead.extra.length), $(i, i.gzhead.extra.length >> 8 & 255)), i.gzhead.hcrc && (d.adler = g(d.adler, i.pending_buf, i.pending, 0)), i.gzindex = 0, i.status = 69) : ($(i, 0), $(i, 0), $(i, 0), $(i, 0), $(i, 0), $(i, i.level === 9 ? 2 : 2 <= i.strategy || i.level < 2 ? 4 : 0), $(i, 3), i.status = M);
          else {
            var L = y + (i.w_bits - 8 << 4) << 8;
            L |= (2 <= i.strategy || i.level < 2 ? 0 : i.level < 6 ? 1 : i.level === 6 ? 2 : 3) << 6, i.strstart !== 0 && (L |= 32), L += 31 - L % 31, i.status = M, Z(i, L), i.strstart !== 0 && (Z(i, d.adler >>> 16), Z(i, 65535 & d.adler)), d.adler = 1;
          }
          if (i.status === 69) if (i.gzhead.extra) {
            for (a = i.pending; i.gzindex < (65535 & i.gzhead.extra.length) && (i.pending !== i.pending_buf_size || (i.gzhead.hcrc && i.pending > a && (d.adler = g(d.adler, i.pending_buf, i.pending - a, a)), V(d), a = i.pending, i.pending !== i.pending_buf_size)); ) $(i, 255 & i.gzhead.extra[i.gzindex]), i.gzindex++;
            i.gzhead.hcrc && i.pending > a && (d.adler = g(d.adler, i.pending_buf, i.pending - a, a)), i.gzindex === i.gzhead.extra.length && (i.gzindex = 0, i.status = 73);
          } else i.status = 73;
          if (i.status === 73) if (i.gzhead.name) {
            a = i.pending;
            do {
              if (i.pending === i.pending_buf_size && (i.gzhead.hcrc && i.pending > a && (d.adler = g(d.adler, i.pending_buf, i.pending - a, a)), V(d), a = i.pending, i.pending === i.pending_buf_size)) {
                p = 1;
                break;
              }
              p = i.gzindex < i.gzhead.name.length ? 255 & i.gzhead.name.charCodeAt(i.gzindex++) : 0, $(i, p);
            } while (p !== 0);
            i.gzhead.hcrc && i.pending > a && (d.adler = g(d.adler, i.pending_buf, i.pending - a, a)), p === 0 && (i.gzindex = 0, i.status = 91);
          } else i.status = 91;
          if (i.status === 91) if (i.gzhead.comment) {
            a = i.pending;
            do {
              if (i.pending === i.pending_buf_size && (i.gzhead.hcrc && i.pending > a && (d.adler = g(d.adler, i.pending_buf, i.pending - a, a)), V(d), a = i.pending, i.pending === i.pending_buf_size)) {
                p = 1;
                break;
              }
              p = i.gzindex < i.gzhead.comment.length ? 255 & i.gzhead.comment.charCodeAt(i.gzindex++) : 0, $(i, p);
            } while (p !== 0);
            i.gzhead.hcrc && i.pending > a && (d.adler = g(d.adler, i.pending_buf, i.pending - a, a)), p === 0 && (i.status = 103);
          } else i.status = 103;
          if (i.status === 103 && (i.gzhead.hcrc ? (i.pending + 2 > i.pending_buf_size && V(d), i.pending + 2 <= i.pending_buf_size && ($(i, 255 & d.adler), $(i, d.adler >> 8 & 255), d.adler = 0, i.status = M)) : i.status = M), i.pending !== 0) {
            if (V(d), d.avail_out === 0) return i.last_flush = -1, E;
          } else if (d.avail_in === 0 && Q(Y) <= Q(S) && Y !== R) return ne(d, -5);
          if (i.status === 666 && d.avail_in !== 0) return ne(d, -5);
          if (d.avail_in !== 0 || i.lookahead !== 0 || Y !== k && i.status !== 666) {
            var H = i.strategy === 2 ? function(j, re) {
              for (var ae; ; ) {
                if (j.lookahead === 0 && (K(j), j.lookahead === 0)) {
                  if (re === k) return b;
                  break;
                }
                if (j.match_length = 0, ae = n._tr_tally(j, 0, j.window[j.strstart]), j.lookahead--, j.strstart++, ae && (P(j, !1), j.strm.avail_out === 0)) return b;
              }
              return j.insert = 0, re === R ? (P(j, !0), j.strm.avail_out === 0 ? ee : q) : j.last_lit && (P(j, !1), j.strm.avail_out === 0) ? b : G;
            }(i, Y) : i.strategy === 3 ? function(j, re) {
              for (var ae, ie, fe, de, pe = j.window; ; ) {
                if (j.lookahead <= X) {
                  if (K(j), j.lookahead <= X && re === k) return b;
                  if (j.lookahead === 0) break;
                }
                if (j.match_length = 0, j.lookahead >= I && 0 < j.strstart && (ie = pe[fe = j.strstart - 1]) === pe[++fe] && ie === pe[++fe] && ie === pe[++fe]) {
                  de = j.strstart + X;
                  do
                    ;
                  while (ie === pe[++fe] && ie === pe[++fe] && ie === pe[++fe] && ie === pe[++fe] && ie === pe[++fe] && ie === pe[++fe] && ie === pe[++fe] && ie === pe[++fe] && fe < de);
                  j.match_length = X - (de - fe), j.match_length > j.lookahead && (j.match_length = j.lookahead);
                }
                if (j.match_length >= I ? (ae = n._tr_tally(j, 1, j.match_length - I), j.lookahead -= j.match_length, j.strstart += j.match_length, j.match_length = 0) : (ae = n._tr_tally(j, 0, j.window[j.strstart]), j.lookahead--, j.strstart++), ae && (P(j, !1), j.strm.avail_out === 0)) return b;
              }
              return j.insert = 0, re === R ? (P(j, !0), j.strm.avail_out === 0 ? ee : q) : j.last_lit && (P(j, !1), j.strm.avail_out === 0) ? b : G;
            }(i, Y) : u[i.level].func(i, Y);
            if (H !== ee && H !== q || (i.status = 666), H === b || H === ee) return d.avail_out === 0 && (i.last_flush = -1), E;
            if (H === G && (Y === 1 ? n._tr_align(i) : Y !== 5 && (n._tr_stored_block(i, 0, 0, !1), Y === 3 && (ce(i.head), i.lookahead === 0 && (i.strstart = 0, i.block_start = 0, i.insert = 0))), V(d), d.avail_out === 0)) return i.last_flush = -1, E;
          }
          return Y !== R ? E : i.wrap <= 0 ? 1 : (i.wrap === 2 ? ($(i, 255 & d.adler), $(i, d.adler >> 8 & 255), $(i, d.adler >> 16 & 255), $(i, d.adler >> 24 & 255), $(i, 255 & d.total_in), $(i, d.total_in >> 8 & 255), $(i, d.total_in >> 16 & 255), $(i, d.total_in >> 24 & 255)) : (Z(i, d.adler >>> 16), Z(i, 65535 & d.adler)), V(d), 0 < i.wrap && (i.wrap = -i.wrap), i.pending !== 0 ? E : 1);
        }, o.deflateEnd = function(d) {
          var Y;
          return d && d.state ? (Y = d.state.status) !== N && Y !== 69 && Y !== 73 && Y !== 91 && Y !== 103 && Y !== M && Y !== 666 ? ne(d, C) : (d.state = null, Y === M ? ne(d, -3) : E) : C;
        }, o.deflateSetDictionary = function(d, Y) {
          var S, i, a, p, L, H, j, re, ae = Y.length;
          if (!d || !d.state || (p = (S = d.state).wrap) === 2 || p === 1 && S.status !== N || S.lookahead) return C;
          for (p === 1 && (d.adler = f(d.adler, Y, ae, 0)), S.wrap = 0, ae >= S.w_size && (p === 0 && (ce(S.head), S.strstart = 0, S.block_start = 0, S.insert = 0), re = new l.Buf8(S.w_size), l.arraySet(re, Y, ae - S.w_size, S.w_size, 0), Y = re, ae = S.w_size), L = d.avail_in, H = d.next_in, j = d.input, d.avail_in = ae, d.next_in = 0, d.input = Y, K(S); S.lookahead >= I; ) {
            for (i = S.strstart, a = S.lookahead - (I - 1); S.ins_h = (S.ins_h << S.hash_shift ^ S.window[i + I - 1]) & S.hash_mask, S.prev[i & S.w_mask] = S.head[S.ins_h], S.head[S.ins_h] = i, i++, --a; ) ;
            S.strstart = i, S.lookahead = I - 1, K(S);
          }
          return S.strstart += S.lookahead, S.block_start = S.strstart, S.insert = S.lookahead, S.lookahead = 0, S.match_length = S.prev_length = I - 1, S.match_available = 0, d.next_in = H, d.input = j, d.avail_in = L, S.wrap = p, E;
        }, o.deflateInfo = "pako deflate (from Nodeca project)";
      }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./messages": 51, "./trees": 52 }], 47: [function(t, s, o) {
        s.exports = function() {
          this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
        };
      }, {}], 48: [function(t, s, o) {
        s.exports = function(u, l) {
          var n, f, g, _, k, R, E, C, w, A, c, y, m, h, T, F, B, z, I, X, oe, N, M, b, G;
          n = u.state, f = u.next_in, b = u.input, g = f + (u.avail_in - 5), _ = u.next_out, G = u.output, k = _ - (l - u.avail_out), R = _ + (u.avail_out - 257), E = n.dmax, C = n.wsize, w = n.whave, A = n.wnext, c = n.window, y = n.hold, m = n.bits, h = n.lencode, T = n.distcode, F = (1 << n.lenbits) - 1, B = (1 << n.distbits) - 1;
          e: do {
            m < 15 && (y += b[f++] << m, m += 8, y += b[f++] << m, m += 8), z = h[y & F];
            t: for (; ; ) {
              if (y >>>= I = z >>> 24, m -= I, (I = z >>> 16 & 255) === 0) G[_++] = 65535 & z;
              else {
                if (!(16 & I)) {
                  if (!(64 & I)) {
                    z = h[(65535 & z) + (y & (1 << I) - 1)];
                    continue t;
                  }
                  if (32 & I) {
                    n.mode = 12;
                    break e;
                  }
                  u.msg = "invalid literal/length code", n.mode = 30;
                  break e;
                }
                X = 65535 & z, (I &= 15) && (m < I && (y += b[f++] << m, m += 8), X += y & (1 << I) - 1, y >>>= I, m -= I), m < 15 && (y += b[f++] << m, m += 8, y += b[f++] << m, m += 8), z = T[y & B];
                r: for (; ; ) {
                  if (y >>>= I = z >>> 24, m -= I, !(16 & (I = z >>> 16 & 255))) {
                    if (!(64 & I)) {
                      z = T[(65535 & z) + (y & (1 << I) - 1)];
                      continue r;
                    }
                    u.msg = "invalid distance code", n.mode = 30;
                    break e;
                  }
                  if (oe = 65535 & z, m < (I &= 15) && (y += b[f++] << m, (m += 8) < I && (y += b[f++] << m, m += 8)), E < (oe += y & (1 << I) - 1)) {
                    u.msg = "invalid distance too far back", n.mode = 30;
                    break e;
                  }
                  if (y >>>= I, m -= I, (I = _ - k) < oe) {
                    if (w < (I = oe - I) && n.sane) {
                      u.msg = "invalid distance too far back", n.mode = 30;
                      break e;
                    }
                    if (M = c, (N = 0) === A) {
                      if (N += C - I, I < X) {
                        for (X -= I; G[_++] = c[N++], --I; ) ;
                        N = _ - oe, M = G;
                      }
                    } else if (A < I) {
                      if (N += C + A - I, (I -= A) < X) {
                        for (X -= I; G[_++] = c[N++], --I; ) ;
                        if (N = 0, A < X) {
                          for (X -= I = A; G[_++] = c[N++], --I; ) ;
                          N = _ - oe, M = G;
                        }
                      }
                    } else if (N += A - I, I < X) {
                      for (X -= I; G[_++] = c[N++], --I; ) ;
                      N = _ - oe, M = G;
                    }
                    for (; 2 < X; ) G[_++] = M[N++], G[_++] = M[N++], G[_++] = M[N++], X -= 3;
                    X && (G[_++] = M[N++], 1 < X && (G[_++] = M[N++]));
                  } else {
                    for (N = _ - oe; G[_++] = G[N++], G[_++] = G[N++], G[_++] = G[N++], 2 < (X -= 3); ) ;
                    X && (G[_++] = G[N++], 1 < X && (G[_++] = G[N++]));
                  }
                  break;
                }
              }
              break;
            }
          } while (f < g && _ < R);
          f -= X = m >> 3, y &= (1 << (m -= X << 3)) - 1, u.next_in = f, u.next_out = _, u.avail_in = f < g ? g - f + 5 : 5 - (f - g), u.avail_out = _ < R ? R - _ + 257 : 257 - (_ - R), n.hold = y, n.bits = m;
        };
      }, {}], 49: [function(t, s, o) {
        var u = t("../utils/common"), l = t("./adler32"), n = t("./crc32"), f = t("./inffast"), g = t("./inftrees"), _ = 1, k = 2, R = 0, E = -2, C = 1, w = 852, A = 592;
        function c(N) {
          return (N >>> 24 & 255) + (N >>> 8 & 65280) + ((65280 & N) << 8) + ((255 & N) << 24);
        }
        function y() {
          this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new u.Buf16(320), this.work = new u.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
        }
        function m(N) {
          var M;
          return N && N.state ? (M = N.state, N.total_in = N.total_out = M.total = 0, N.msg = "", M.wrap && (N.adler = 1 & M.wrap), M.mode = C, M.last = 0, M.havedict = 0, M.dmax = 32768, M.head = null, M.hold = 0, M.bits = 0, M.lencode = M.lendyn = new u.Buf32(w), M.distcode = M.distdyn = new u.Buf32(A), M.sane = 1, M.back = -1, R) : E;
        }
        function h(N) {
          var M;
          return N && N.state ? ((M = N.state).wsize = 0, M.whave = 0, M.wnext = 0, m(N)) : E;
        }
        function T(N, M) {
          var b, G;
          return N && N.state ? (G = N.state, M < 0 ? (b = 0, M = -M) : (b = 1 + (M >> 4), M < 48 && (M &= 15)), M && (M < 8 || 15 < M) ? E : (G.window !== null && G.wbits !== M && (G.window = null), G.wrap = b, G.wbits = M, h(N))) : E;
        }
        function F(N, M) {
          var b, G;
          return N ? (G = new y(), (N.state = G).window = null, (b = T(N, M)) !== R && (N.state = null), b) : E;
        }
        var B, z, I = !0;
        function X(N) {
          if (I) {
            var M;
            for (B = new u.Buf32(512), z = new u.Buf32(32), M = 0; M < 144; ) N.lens[M++] = 8;
            for (; M < 256; ) N.lens[M++] = 9;
            for (; M < 280; ) N.lens[M++] = 7;
            for (; M < 288; ) N.lens[M++] = 8;
            for (g(_, N.lens, 0, 288, B, 0, N.work, { bits: 9 }), M = 0; M < 32; ) N.lens[M++] = 5;
            g(k, N.lens, 0, 32, z, 0, N.work, { bits: 5 }), I = !1;
          }
          N.lencode = B, N.lenbits = 9, N.distcode = z, N.distbits = 5;
        }
        function oe(N, M, b, G) {
          var ee, q = N.state;
          return q.window === null && (q.wsize = 1 << q.wbits, q.wnext = 0, q.whave = 0, q.window = new u.Buf8(q.wsize)), G >= q.wsize ? (u.arraySet(q.window, M, b - q.wsize, q.wsize, 0), q.wnext = 0, q.whave = q.wsize) : (G < (ee = q.wsize - q.wnext) && (ee = G), u.arraySet(q.window, M, b - G, ee, q.wnext), (G -= ee) ? (u.arraySet(q.window, M, b - G, G, 0), q.wnext = G, q.whave = q.wsize) : (q.wnext += ee, q.wnext === q.wsize && (q.wnext = 0), q.whave < q.wsize && (q.whave += ee))), 0;
        }
        o.inflateReset = h, o.inflateReset2 = T, o.inflateResetKeep = m, o.inflateInit = function(N) {
          return F(N, 15);
        }, o.inflateInit2 = F, o.inflate = function(N, M) {
          var b, G, ee, q, ne, Q, ce, V, P, $, Z, te, K, x, v, W, U, O, D, J, d, Y, S, i, a = 0, p = new u.Buf8(4), L = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
          if (!N || !N.state || !N.output || !N.input && N.avail_in !== 0) return E;
          (b = N.state).mode === 12 && (b.mode = 13), ne = N.next_out, ee = N.output, ce = N.avail_out, q = N.next_in, G = N.input, Q = N.avail_in, V = b.hold, P = b.bits, $ = Q, Z = ce, Y = R;
          e: for (; ; ) switch (b.mode) {
            case C:
              if (b.wrap === 0) {
                b.mode = 13;
                break;
              }
              for (; P < 16; ) {
                if (Q === 0) break e;
                Q--, V += G[q++] << P, P += 8;
              }
              if (2 & b.wrap && V === 35615) {
                p[b.check = 0] = 255 & V, p[1] = V >>> 8 & 255, b.check = n(b.check, p, 2, 0), P = V = 0, b.mode = 2;
                break;
              }
              if (b.flags = 0, b.head && (b.head.done = !1), !(1 & b.wrap) || (((255 & V) << 8) + (V >> 8)) % 31) {
                N.msg = "incorrect header check", b.mode = 30;
                break;
              }
              if ((15 & V) != 8) {
                N.msg = "unknown compression method", b.mode = 30;
                break;
              }
              if (P -= 4, d = 8 + (15 & (V >>>= 4)), b.wbits === 0) b.wbits = d;
              else if (d > b.wbits) {
                N.msg = "invalid window size", b.mode = 30;
                break;
              }
              b.dmax = 1 << d, N.adler = b.check = 1, b.mode = 512 & V ? 10 : 12, P = V = 0;
              break;
            case 2:
              for (; P < 16; ) {
                if (Q === 0) break e;
                Q--, V += G[q++] << P, P += 8;
              }
              if (b.flags = V, (255 & b.flags) != 8) {
                N.msg = "unknown compression method", b.mode = 30;
                break;
              }
              if (57344 & b.flags) {
                N.msg = "unknown header flags set", b.mode = 30;
                break;
              }
              b.head && (b.head.text = V >> 8 & 1), 512 & b.flags && (p[0] = 255 & V, p[1] = V >>> 8 & 255, b.check = n(b.check, p, 2, 0)), P = V = 0, b.mode = 3;
            case 3:
              for (; P < 32; ) {
                if (Q === 0) break e;
                Q--, V += G[q++] << P, P += 8;
              }
              b.head && (b.head.time = V), 512 & b.flags && (p[0] = 255 & V, p[1] = V >>> 8 & 255, p[2] = V >>> 16 & 255, p[3] = V >>> 24 & 255, b.check = n(b.check, p, 4, 0)), P = V = 0, b.mode = 4;
            case 4:
              for (; P < 16; ) {
                if (Q === 0) break e;
                Q--, V += G[q++] << P, P += 8;
              }
              b.head && (b.head.xflags = 255 & V, b.head.os = V >> 8), 512 & b.flags && (p[0] = 255 & V, p[1] = V >>> 8 & 255, b.check = n(b.check, p, 2, 0)), P = V = 0, b.mode = 5;
            case 5:
              if (1024 & b.flags) {
                for (; P < 16; ) {
                  if (Q === 0) break e;
                  Q--, V += G[q++] << P, P += 8;
                }
                b.length = V, b.head && (b.head.extra_len = V), 512 & b.flags && (p[0] = 255 & V, p[1] = V >>> 8 & 255, b.check = n(b.check, p, 2, 0)), P = V = 0;
              } else b.head && (b.head.extra = null);
              b.mode = 6;
            case 6:
              if (1024 & b.flags && (Q < (te = b.length) && (te = Q), te && (b.head && (d = b.head.extra_len - b.length, b.head.extra || (b.head.extra = new Array(b.head.extra_len)), u.arraySet(b.head.extra, G, q, te, d)), 512 & b.flags && (b.check = n(b.check, G, te, q)), Q -= te, q += te, b.length -= te), b.length)) break e;
              b.length = 0, b.mode = 7;
            case 7:
              if (2048 & b.flags) {
                if (Q === 0) break e;
                for (te = 0; d = G[q + te++], b.head && d && b.length < 65536 && (b.head.name += String.fromCharCode(d)), d && te < Q; ) ;
                if (512 & b.flags && (b.check = n(b.check, G, te, q)), Q -= te, q += te, d) break e;
              } else b.head && (b.head.name = null);
              b.length = 0, b.mode = 8;
            case 8:
              if (4096 & b.flags) {
                if (Q === 0) break e;
                for (te = 0; d = G[q + te++], b.head && d && b.length < 65536 && (b.head.comment += String.fromCharCode(d)), d && te < Q; ) ;
                if (512 & b.flags && (b.check = n(b.check, G, te, q)), Q -= te, q += te, d) break e;
              } else b.head && (b.head.comment = null);
              b.mode = 9;
            case 9:
              if (512 & b.flags) {
                for (; P < 16; ) {
                  if (Q === 0) break e;
                  Q--, V += G[q++] << P, P += 8;
                }
                if (V !== (65535 & b.check)) {
                  N.msg = "header crc mismatch", b.mode = 30;
                  break;
                }
                P = V = 0;
              }
              b.head && (b.head.hcrc = b.flags >> 9 & 1, b.head.done = !0), N.adler = b.check = 0, b.mode = 12;
              break;
            case 10:
              for (; P < 32; ) {
                if (Q === 0) break e;
                Q--, V += G[q++] << P, P += 8;
              }
              N.adler = b.check = c(V), P = V = 0, b.mode = 11;
            case 11:
              if (b.havedict === 0) return N.next_out = ne, N.avail_out = ce, N.next_in = q, N.avail_in = Q, b.hold = V, b.bits = P, 2;
              N.adler = b.check = 1, b.mode = 12;
            case 12:
              if (M === 5 || M === 6) break e;
            case 13:
              if (b.last) {
                V >>>= 7 & P, P -= 7 & P, b.mode = 27;
                break;
              }
              for (; P < 3; ) {
                if (Q === 0) break e;
                Q--, V += G[q++] << P, P += 8;
              }
              switch (b.last = 1 & V, P -= 1, 3 & (V >>>= 1)) {
                case 0:
                  b.mode = 14;
                  break;
                case 1:
                  if (X(b), b.mode = 20, M !== 6) break;
                  V >>>= 2, P -= 2;
                  break e;
                case 2:
                  b.mode = 17;
                  break;
                case 3:
                  N.msg = "invalid block type", b.mode = 30;
              }
              V >>>= 2, P -= 2;
              break;
            case 14:
              for (V >>>= 7 & P, P -= 7 & P; P < 32; ) {
                if (Q === 0) break e;
                Q--, V += G[q++] << P, P += 8;
              }
              if ((65535 & V) != (V >>> 16 ^ 65535)) {
                N.msg = "invalid stored block lengths", b.mode = 30;
                break;
              }
              if (b.length = 65535 & V, P = V = 0, b.mode = 15, M === 6) break e;
            case 15:
              b.mode = 16;
            case 16:
              if (te = b.length) {
                if (Q < te && (te = Q), ce < te && (te = ce), te === 0) break e;
                u.arraySet(ee, G, q, te, ne), Q -= te, q += te, ce -= te, ne += te, b.length -= te;
                break;
              }
              b.mode = 12;
              break;
            case 17:
              for (; P < 14; ) {
                if (Q === 0) break e;
                Q--, V += G[q++] << P, P += 8;
              }
              if (b.nlen = 257 + (31 & V), V >>>= 5, P -= 5, b.ndist = 1 + (31 & V), V >>>= 5, P -= 5, b.ncode = 4 + (15 & V), V >>>= 4, P -= 4, 286 < b.nlen || 30 < b.ndist) {
                N.msg = "too many length or distance symbols", b.mode = 30;
                break;
              }
              b.have = 0, b.mode = 18;
            case 18:
              for (; b.have < b.ncode; ) {
                for (; P < 3; ) {
                  if (Q === 0) break e;
                  Q--, V += G[q++] << P, P += 8;
                }
                b.lens[L[b.have++]] = 7 & V, V >>>= 3, P -= 3;
              }
              for (; b.have < 19; ) b.lens[L[b.have++]] = 0;
              if (b.lencode = b.lendyn, b.lenbits = 7, S = { bits: b.lenbits }, Y = g(0, b.lens, 0, 19, b.lencode, 0, b.work, S), b.lenbits = S.bits, Y) {
                N.msg = "invalid code lengths set", b.mode = 30;
                break;
              }
              b.have = 0, b.mode = 19;
            case 19:
              for (; b.have < b.nlen + b.ndist; ) {
                for (; W = (a = b.lencode[V & (1 << b.lenbits) - 1]) >>> 16 & 255, U = 65535 & a, !((v = a >>> 24) <= P); ) {
                  if (Q === 0) break e;
                  Q--, V += G[q++] << P, P += 8;
                }
                if (U < 16) V >>>= v, P -= v, b.lens[b.have++] = U;
                else {
                  if (U === 16) {
                    for (i = v + 2; P < i; ) {
                      if (Q === 0) break e;
                      Q--, V += G[q++] << P, P += 8;
                    }
                    if (V >>>= v, P -= v, b.have === 0) {
                      N.msg = "invalid bit length repeat", b.mode = 30;
                      break;
                    }
                    d = b.lens[b.have - 1], te = 3 + (3 & V), V >>>= 2, P -= 2;
                  } else if (U === 17) {
                    for (i = v + 3; P < i; ) {
                      if (Q === 0) break e;
                      Q--, V += G[q++] << P, P += 8;
                    }
                    P -= v, d = 0, te = 3 + (7 & (V >>>= v)), V >>>= 3, P -= 3;
                  } else {
                    for (i = v + 7; P < i; ) {
                      if (Q === 0) break e;
                      Q--, V += G[q++] << P, P += 8;
                    }
                    P -= v, d = 0, te = 11 + (127 & (V >>>= v)), V >>>= 7, P -= 7;
                  }
                  if (b.have + te > b.nlen + b.ndist) {
                    N.msg = "invalid bit length repeat", b.mode = 30;
                    break;
                  }
                  for (; te--; ) b.lens[b.have++] = d;
                }
              }
              if (b.mode === 30) break;
              if (b.lens[256] === 0) {
                N.msg = "invalid code -- missing end-of-block", b.mode = 30;
                break;
              }
              if (b.lenbits = 9, S = { bits: b.lenbits }, Y = g(_, b.lens, 0, b.nlen, b.lencode, 0, b.work, S), b.lenbits = S.bits, Y) {
                N.msg = "invalid literal/lengths set", b.mode = 30;
                break;
              }
              if (b.distbits = 6, b.distcode = b.distdyn, S = { bits: b.distbits }, Y = g(k, b.lens, b.nlen, b.ndist, b.distcode, 0, b.work, S), b.distbits = S.bits, Y) {
                N.msg = "invalid distances set", b.mode = 30;
                break;
              }
              if (b.mode = 20, M === 6) break e;
            case 20:
              b.mode = 21;
            case 21:
              if (6 <= Q && 258 <= ce) {
                N.next_out = ne, N.avail_out = ce, N.next_in = q, N.avail_in = Q, b.hold = V, b.bits = P, f(N, Z), ne = N.next_out, ee = N.output, ce = N.avail_out, q = N.next_in, G = N.input, Q = N.avail_in, V = b.hold, P = b.bits, b.mode === 12 && (b.back = -1);
                break;
              }
              for (b.back = 0; W = (a = b.lencode[V & (1 << b.lenbits) - 1]) >>> 16 & 255, U = 65535 & a, !((v = a >>> 24) <= P); ) {
                if (Q === 0) break e;
                Q--, V += G[q++] << P, P += 8;
              }
              if (W && !(240 & W)) {
                for (O = v, D = W, J = U; W = (a = b.lencode[J + ((V & (1 << O + D) - 1) >> O)]) >>> 16 & 255, U = 65535 & a, !(O + (v = a >>> 24) <= P); ) {
                  if (Q === 0) break e;
                  Q--, V += G[q++] << P, P += 8;
                }
                V >>>= O, P -= O, b.back += O;
              }
              if (V >>>= v, P -= v, b.back += v, b.length = U, W === 0) {
                b.mode = 26;
                break;
              }
              if (32 & W) {
                b.back = -1, b.mode = 12;
                break;
              }
              if (64 & W) {
                N.msg = "invalid literal/length code", b.mode = 30;
                break;
              }
              b.extra = 15 & W, b.mode = 22;
            case 22:
              if (b.extra) {
                for (i = b.extra; P < i; ) {
                  if (Q === 0) break e;
                  Q--, V += G[q++] << P, P += 8;
                }
                b.length += V & (1 << b.extra) - 1, V >>>= b.extra, P -= b.extra, b.back += b.extra;
              }
              b.was = b.length, b.mode = 23;
            case 23:
              for (; W = (a = b.distcode[V & (1 << b.distbits) - 1]) >>> 16 & 255, U = 65535 & a, !((v = a >>> 24) <= P); ) {
                if (Q === 0) break e;
                Q--, V += G[q++] << P, P += 8;
              }
              if (!(240 & W)) {
                for (O = v, D = W, J = U; W = (a = b.distcode[J + ((V & (1 << O + D) - 1) >> O)]) >>> 16 & 255, U = 65535 & a, !(O + (v = a >>> 24) <= P); ) {
                  if (Q === 0) break e;
                  Q--, V += G[q++] << P, P += 8;
                }
                V >>>= O, P -= O, b.back += O;
              }
              if (V >>>= v, P -= v, b.back += v, 64 & W) {
                N.msg = "invalid distance code", b.mode = 30;
                break;
              }
              b.offset = U, b.extra = 15 & W, b.mode = 24;
            case 24:
              if (b.extra) {
                for (i = b.extra; P < i; ) {
                  if (Q === 0) break e;
                  Q--, V += G[q++] << P, P += 8;
                }
                b.offset += V & (1 << b.extra) - 1, V >>>= b.extra, P -= b.extra, b.back += b.extra;
              }
              if (b.offset > b.dmax) {
                N.msg = "invalid distance too far back", b.mode = 30;
                break;
              }
              b.mode = 25;
            case 25:
              if (ce === 0) break e;
              if (te = Z - ce, b.offset > te) {
                if ((te = b.offset - te) > b.whave && b.sane) {
                  N.msg = "invalid distance too far back", b.mode = 30;
                  break;
                }
                K = te > b.wnext ? (te -= b.wnext, b.wsize - te) : b.wnext - te, te > b.length && (te = b.length), x = b.window;
              } else x = ee, K = ne - b.offset, te = b.length;
              for (ce < te && (te = ce), ce -= te, b.length -= te; ee[ne++] = x[K++], --te; ) ;
              b.length === 0 && (b.mode = 21);
              break;
            case 26:
              if (ce === 0) break e;
              ee[ne++] = b.length, ce--, b.mode = 21;
              break;
            case 27:
              if (b.wrap) {
                for (; P < 32; ) {
                  if (Q === 0) break e;
                  Q--, V |= G[q++] << P, P += 8;
                }
                if (Z -= ce, N.total_out += Z, b.total += Z, Z && (N.adler = b.check = b.flags ? n(b.check, ee, Z, ne - Z) : l(b.check, ee, Z, ne - Z)), Z = ce, (b.flags ? V : c(V)) !== b.check) {
                  N.msg = "incorrect data check", b.mode = 30;
                  break;
                }
                P = V = 0;
              }
              b.mode = 28;
            case 28:
              if (b.wrap && b.flags) {
                for (; P < 32; ) {
                  if (Q === 0) break e;
                  Q--, V += G[q++] << P, P += 8;
                }
                if (V !== (4294967295 & b.total)) {
                  N.msg = "incorrect length check", b.mode = 30;
                  break;
                }
                P = V = 0;
              }
              b.mode = 29;
            case 29:
              Y = 1;
              break e;
            case 30:
              Y = -3;
              break e;
            case 31:
              return -4;
            case 32:
            default:
              return E;
          }
          return N.next_out = ne, N.avail_out = ce, N.next_in = q, N.avail_in = Q, b.hold = V, b.bits = P, (b.wsize || Z !== N.avail_out && b.mode < 30 && (b.mode < 27 || M !== 4)) && oe(N, N.output, N.next_out, Z - N.avail_out) ? (b.mode = 31, -4) : ($ -= N.avail_in, Z -= N.avail_out, N.total_in += $, N.total_out += Z, b.total += Z, b.wrap && Z && (N.adler = b.check = b.flags ? n(b.check, ee, Z, N.next_out - Z) : l(b.check, ee, Z, N.next_out - Z)), N.data_type = b.bits + (b.last ? 64 : 0) + (b.mode === 12 ? 128 : 0) + (b.mode === 20 || b.mode === 15 ? 256 : 0), ($ == 0 && Z === 0 || M === 4) && Y === R && (Y = -5), Y);
        }, o.inflateEnd = function(N) {
          if (!N || !N.state) return E;
          var M = N.state;
          return M.window && (M.window = null), N.state = null, R;
        }, o.inflateGetHeader = function(N, M) {
          var b;
          return N && N.state && 2 & (b = N.state).wrap ? ((b.head = M).done = !1, R) : E;
        }, o.inflateSetDictionary = function(N, M) {
          var b, G = M.length;
          return N && N.state ? (b = N.state).wrap !== 0 && b.mode !== 11 ? E : b.mode === 11 && l(1, M, G, 0) !== b.check ? -3 : oe(N, M, G, G) ? (b.mode = 31, -4) : (b.havedict = 1, R) : E;
        }, o.inflateInfo = "pako inflate (from Nodeca project)";
      }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./inffast": 48, "./inftrees": 50 }], 50: [function(t, s, o) {
        var u = t("../utils/common"), l = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0], n = [16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78], f = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0], g = [16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64];
        s.exports = function(_, k, R, E, C, w, A, c) {
          var y, m, h, T, F, B, z, I, X, oe = c.bits, N = 0, M = 0, b = 0, G = 0, ee = 0, q = 0, ne = 0, Q = 0, ce = 0, V = 0, P = null, $ = 0, Z = new u.Buf16(16), te = new u.Buf16(16), K = null, x = 0;
          for (N = 0; N <= 15; N++) Z[N] = 0;
          for (M = 0; M < E; M++) Z[k[R + M]]++;
          for (ee = oe, G = 15; 1 <= G && Z[G] === 0; G--) ;
          if (G < ee && (ee = G), G === 0) return C[w++] = 20971520, C[w++] = 20971520, c.bits = 1, 0;
          for (b = 1; b < G && Z[b] === 0; b++) ;
          for (ee < b && (ee = b), N = Q = 1; N <= 15; N++) if (Q <<= 1, (Q -= Z[N]) < 0) return -1;
          if (0 < Q && (_ === 0 || G !== 1)) return -1;
          for (te[1] = 0, N = 1; N < 15; N++) te[N + 1] = te[N] + Z[N];
          for (M = 0; M < E; M++) k[R + M] !== 0 && (A[te[k[R + M]]++] = M);
          if (B = _ === 0 ? (P = K = A, 19) : _ === 1 ? (P = l, $ -= 257, K = n, x -= 257, 256) : (P = f, K = g, -1), N = b, F = w, ne = M = V = 0, h = -1, T = (ce = 1 << (q = ee)) - 1, _ === 1 && 852 < ce || _ === 2 && 592 < ce) return 1;
          for (; ; ) {
            for (z = N - ne, X = A[M] < B ? (I = 0, A[M]) : A[M] > B ? (I = K[x + A[M]], P[$ + A[M]]) : (I = 96, 0), y = 1 << N - ne, b = m = 1 << q; C[F + (V >> ne) + (m -= y)] = z << 24 | I << 16 | X | 0, m !== 0; ) ;
            for (y = 1 << N - 1; V & y; ) y >>= 1;
            if (y !== 0 ? (V &= y - 1, V += y) : V = 0, M++, --Z[N] == 0) {
              if (N === G) break;
              N = k[R + A[M]];
            }
            if (ee < N && (V & T) !== h) {
              for (ne === 0 && (ne = ee), F += b, Q = 1 << (q = N - ne); q + ne < G && !((Q -= Z[q + ne]) <= 0); ) q++, Q <<= 1;
              if (ce += 1 << q, _ === 1 && 852 < ce || _ === 2 && 592 < ce) return 1;
              C[h = V & T] = ee << 24 | q << 16 | F - w | 0;
            }
          }
          return V !== 0 && (C[F + V] = N - ne << 24 | 64 << 16 | 0), c.bits = ee, 0;
        };
      }, { "../utils/common": 41 }], 51: [function(t, s, o) {
        s.exports = { 2: "need dictionary", 1: "stream end", 0: "", "-1": "file error", "-2": "stream error", "-3": "data error", "-4": "insufficient memory", "-5": "buffer error", "-6": "incompatible version" };
      }, {}], 52: [function(t, s, o) {
        var u = t("../utils/common"), l = 0, n = 1;
        function f(a) {
          for (var p = a.length; 0 <= --p; ) a[p] = 0;
        }
        var g = 0, _ = 29, k = 256, R = k + 1 + _, E = 30, C = 19, w = 2 * R + 1, A = 15, c = 16, y = 7, m = 256, h = 16, T = 17, F = 18, B = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0], z = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13], I = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7], X = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], oe = new Array(2 * (R + 2));
        f(oe);
        var N = new Array(2 * E);
        f(N);
        var M = new Array(512);
        f(M);
        var b = new Array(256);
        f(b);
        var G = new Array(_);
        f(G);
        var ee, q, ne, Q = new Array(E);
        function ce(a, p, L, H, j) {
          this.static_tree = a, this.extra_bits = p, this.extra_base = L, this.elems = H, this.max_length = j, this.has_stree = a && a.length;
        }
        function V(a, p) {
          this.dyn_tree = a, this.max_code = 0, this.stat_desc = p;
        }
        function P(a) {
          return a < 256 ? M[a] : M[256 + (a >>> 7)];
        }
        function $(a, p) {
          a.pending_buf[a.pending++] = 255 & p, a.pending_buf[a.pending++] = p >>> 8 & 255;
        }
        function Z(a, p, L) {
          a.bi_valid > c - L ? (a.bi_buf |= p << a.bi_valid & 65535, $(a, a.bi_buf), a.bi_buf = p >> c - a.bi_valid, a.bi_valid += L - c) : (a.bi_buf |= p << a.bi_valid & 65535, a.bi_valid += L);
        }
        function te(a, p, L) {
          Z(a, L[2 * p], L[2 * p + 1]);
        }
        function K(a, p) {
          for (var L = 0; L |= 1 & a, a >>>= 1, L <<= 1, 0 < --p; ) ;
          return L >>> 1;
        }
        function x(a, p, L) {
          var H, j, re = new Array(A + 1), ae = 0;
          for (H = 1; H <= A; H++) re[H] = ae = ae + L[H - 1] << 1;
          for (j = 0; j <= p; j++) {
            var ie = a[2 * j + 1];
            ie !== 0 && (a[2 * j] = K(re[ie]++, ie));
          }
        }
        function v(a) {
          var p;
          for (p = 0; p < R; p++) a.dyn_ltree[2 * p] = 0;
          for (p = 0; p < E; p++) a.dyn_dtree[2 * p] = 0;
          for (p = 0; p < C; p++) a.bl_tree[2 * p] = 0;
          a.dyn_ltree[2 * m] = 1, a.opt_len = a.static_len = 0, a.last_lit = a.matches = 0;
        }
        function W(a) {
          8 < a.bi_valid ? $(a, a.bi_buf) : 0 < a.bi_valid && (a.pending_buf[a.pending++] = a.bi_buf), a.bi_buf = 0, a.bi_valid = 0;
        }
        function U(a, p, L, H) {
          var j = 2 * p, re = 2 * L;
          return a[j] < a[re] || a[j] === a[re] && H[p] <= H[L];
        }
        function O(a, p, L) {
          for (var H = a.heap[L], j = L << 1; j <= a.heap_len && (j < a.heap_len && U(p, a.heap[j + 1], a.heap[j], a.depth) && j++, !U(p, H, a.heap[j], a.depth)); ) a.heap[L] = a.heap[j], L = j, j <<= 1;
          a.heap[L] = H;
        }
        function D(a, p, L) {
          var H, j, re, ae, ie = 0;
          if (a.last_lit !== 0) for (; H = a.pending_buf[a.d_buf + 2 * ie] << 8 | a.pending_buf[a.d_buf + 2 * ie + 1], j = a.pending_buf[a.l_buf + ie], ie++, H === 0 ? te(a, j, p) : (te(a, (re = b[j]) + k + 1, p), (ae = B[re]) !== 0 && Z(a, j -= G[re], ae), te(a, re = P(--H), L), (ae = z[re]) !== 0 && Z(a, H -= Q[re], ae)), ie < a.last_lit; ) ;
          te(a, m, p);
        }
        function J(a, p) {
          var L, H, j, re = p.dyn_tree, ae = p.stat_desc.static_tree, ie = p.stat_desc.has_stree, fe = p.stat_desc.elems, de = -1;
          for (a.heap_len = 0, a.heap_max = w, L = 0; L < fe; L++) re[2 * L] !== 0 ? (a.heap[++a.heap_len] = de = L, a.depth[L] = 0) : re[2 * L + 1] = 0;
          for (; a.heap_len < 2; ) re[2 * (j = a.heap[++a.heap_len] = de < 2 ? ++de : 0)] = 1, a.depth[j] = 0, a.opt_len--, ie && (a.static_len -= ae[2 * j + 1]);
          for (p.max_code = de, L = a.heap_len >> 1; 1 <= L; L--) O(a, re, L);
          for (j = fe; L = a.heap[1], a.heap[1] = a.heap[a.heap_len--], O(a, re, 1), H = a.heap[1], a.heap[--a.heap_max] = L, a.heap[--a.heap_max] = H, re[2 * j] = re[2 * L] + re[2 * H], a.depth[j] = (a.depth[L] >= a.depth[H] ? a.depth[L] : a.depth[H]) + 1, re[2 * L + 1] = re[2 * H + 1] = j, a.heap[1] = j++, O(a, re, 1), 2 <= a.heap_len; ) ;
          a.heap[--a.heap_max] = a.heap[1], function(pe, Ne) {
            var Qe, Me, At, Te, Vt, wr, Ke = Ne.dyn_tree, Wi = Ne.max_code, ru = Ne.stat_desc.static_tree, nu = Ne.stat_desc.has_stree, iu = Ne.stat_desc.extra_bits, qi = Ne.stat_desc.extra_base, kt = Ne.stat_desc.max_length, $t = 0;
            for (Te = 0; Te <= A; Te++) pe.bl_count[Te] = 0;
            for (Ke[2 * pe.heap[pe.heap_max] + 1] = 0, Qe = pe.heap_max + 1; Qe < w; Qe++) kt < (Te = Ke[2 * Ke[2 * (Me = pe.heap[Qe]) + 1] + 1] + 1) && (Te = kt, $t++), Ke[2 * Me + 1] = Te, Wi < Me || (pe.bl_count[Te]++, Vt = 0, qi <= Me && (Vt = iu[Me - qi]), wr = Ke[2 * Me], pe.opt_len += wr * (Te + Vt), nu && (pe.static_len += wr * (ru[2 * Me + 1] + Vt)));
            if ($t !== 0) {
              do {
                for (Te = kt - 1; pe.bl_count[Te] === 0; ) Te--;
                pe.bl_count[Te]--, pe.bl_count[Te + 1] += 2, pe.bl_count[kt]--, $t -= 2;
              } while (0 < $t);
              for (Te = kt; Te !== 0; Te--) for (Me = pe.bl_count[Te]; Me !== 0; ) Wi < (At = pe.heap[--Qe]) || (Ke[2 * At + 1] !== Te && (pe.opt_len += (Te - Ke[2 * At + 1]) * Ke[2 * At], Ke[2 * At + 1] = Te), Me--);
            }
          }(a, p), x(re, de, a.bl_count);
        }
        function d(a, p, L) {
          var H, j, re = -1, ae = p[1], ie = 0, fe = 7, de = 4;
          for (ae === 0 && (fe = 138, de = 3), p[2 * (L + 1) + 1] = 65535, H = 0; H <= L; H++) j = ae, ae = p[2 * (H + 1) + 1], ++ie < fe && j === ae || (ie < de ? a.bl_tree[2 * j] += ie : j !== 0 ? (j !== re && a.bl_tree[2 * j]++, a.bl_tree[2 * h]++) : ie <= 10 ? a.bl_tree[2 * T]++ : a.bl_tree[2 * F]++, re = j, de = (ie = 0) === ae ? (fe = 138, 3) : j === ae ? (fe = 6, 3) : (fe = 7, 4));
        }
        function Y(a, p, L) {
          var H, j, re = -1, ae = p[1], ie = 0, fe = 7, de = 4;
          for (ae === 0 && (fe = 138, de = 3), H = 0; H <= L; H++) if (j = ae, ae = p[2 * (H + 1) + 1], !(++ie < fe && j === ae)) {
            if (ie < de) for (; te(a, j, a.bl_tree), --ie != 0; ) ;
            else j !== 0 ? (j !== re && (te(a, j, a.bl_tree), ie--), te(a, h, a.bl_tree), Z(a, ie - 3, 2)) : ie <= 10 ? (te(a, T, a.bl_tree), Z(a, ie - 3, 3)) : (te(a, F, a.bl_tree), Z(a, ie - 11, 7));
            re = j, de = (ie = 0) === ae ? (fe = 138, 3) : j === ae ? (fe = 6, 3) : (fe = 7, 4);
          }
        }
        f(Q);
        var S = !1;
        function i(a, p, L, H) {
          Z(a, (g << 1) + (H ? 1 : 0), 3), function(j, re, ae, ie) {
            W(j), $(j, ae), $(j, ~ae), u.arraySet(j.pending_buf, j.window, re, ae, j.pending), j.pending += ae;
          }(a, p, L);
        }
        o._tr_init = function(a) {
          S || (function() {
            var p, L, H, j, re, ae = new Array(A + 1);
            for (j = H = 0; j < _ - 1; j++) for (G[j] = H, p = 0; p < 1 << B[j]; p++) b[H++] = j;
            for (b[H - 1] = j, j = re = 0; j < 16; j++) for (Q[j] = re, p = 0; p < 1 << z[j]; p++) M[re++] = j;
            for (re >>= 7; j < E; j++) for (Q[j] = re << 7, p = 0; p < 1 << z[j] - 7; p++) M[256 + re++] = j;
            for (L = 0; L <= A; L++) ae[L] = 0;
            for (p = 0; p <= 143; ) oe[2 * p + 1] = 8, p++, ae[8]++;
            for (; p <= 255; ) oe[2 * p + 1] = 9, p++, ae[9]++;
            for (; p <= 279; ) oe[2 * p + 1] = 7, p++, ae[7]++;
            for (; p <= 287; ) oe[2 * p + 1] = 8, p++, ae[8]++;
            for (x(oe, R + 1, ae), p = 0; p < E; p++) N[2 * p + 1] = 5, N[2 * p] = K(p, 5);
            ee = new ce(oe, B, k + 1, R, A), q = new ce(N, z, 0, E, A), ne = new ce(new Array(0), I, 0, C, y);
          }(), S = !0), a.l_desc = new V(a.dyn_ltree, ee), a.d_desc = new V(a.dyn_dtree, q), a.bl_desc = new V(a.bl_tree, ne), a.bi_buf = 0, a.bi_valid = 0, v(a);
        }, o._tr_stored_block = i, o._tr_flush_block = function(a, p, L, H) {
          var j, re, ae = 0;
          0 < a.level ? (a.strm.data_type === 2 && (a.strm.data_type = function(ie) {
            var fe, de = 4093624447;
            for (fe = 0; fe <= 31; fe++, de >>>= 1) if (1 & de && ie.dyn_ltree[2 * fe] !== 0) return l;
            if (ie.dyn_ltree[18] !== 0 || ie.dyn_ltree[20] !== 0 || ie.dyn_ltree[26] !== 0) return n;
            for (fe = 32; fe < k; fe++) if (ie.dyn_ltree[2 * fe] !== 0) return n;
            return l;
          }(a)), J(a, a.l_desc), J(a, a.d_desc), ae = function(ie) {
            var fe;
            for (d(ie, ie.dyn_ltree, ie.l_desc.max_code), d(ie, ie.dyn_dtree, ie.d_desc.max_code), J(ie, ie.bl_desc), fe = C - 1; 3 <= fe && ie.bl_tree[2 * X[fe] + 1] === 0; fe--) ;
            return ie.opt_len += 3 * (fe + 1) + 5 + 5 + 4, fe;
          }(a), j = a.opt_len + 3 + 7 >>> 3, (re = a.static_len + 3 + 7 >>> 3) <= j && (j = re)) : j = re = L + 5, L + 4 <= j && p !== -1 ? i(a, p, L, H) : a.strategy === 4 || re === j ? (Z(a, 2 + (H ? 1 : 0), 3), D(a, oe, N)) : (Z(a, 4 + (H ? 1 : 0), 3), function(ie, fe, de, pe) {
            var Ne;
            for (Z(ie, fe - 257, 5), Z(ie, de - 1, 5), Z(ie, pe - 4, 4), Ne = 0; Ne < pe; Ne++) Z(ie, ie.bl_tree[2 * X[Ne] + 1], 3);
            Y(ie, ie.dyn_ltree, fe - 1), Y(ie, ie.dyn_dtree, de - 1);
          }(a, a.l_desc.max_code + 1, a.d_desc.max_code + 1, ae + 1), D(a, a.dyn_ltree, a.dyn_dtree)), v(a), H && W(a);
        }, o._tr_tally = function(a, p, L) {
          return a.pending_buf[a.d_buf + 2 * a.last_lit] = p >>> 8 & 255, a.pending_buf[a.d_buf + 2 * a.last_lit + 1] = 255 & p, a.pending_buf[a.l_buf + a.last_lit] = 255 & L, a.last_lit++, p === 0 ? a.dyn_ltree[2 * L]++ : (a.matches++, p--, a.dyn_ltree[2 * (b[L] + k + 1)]++, a.dyn_dtree[2 * P(p)]++), a.last_lit === a.lit_bufsize - 1;
        }, o._tr_align = function(a) {
          Z(a, 2, 3), te(a, m, oe), function(p) {
            p.bi_valid === 16 ? ($(p, p.bi_buf), p.bi_buf = 0, p.bi_valid = 0) : 8 <= p.bi_valid && (p.pending_buf[p.pending++] = 255 & p.bi_buf, p.bi_buf >>= 8, p.bi_valid -= 8);
          }(a);
        };
      }, { "../utils/common": 41 }], 53: [function(t, s, o) {
        s.exports = function() {
          this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
        };
      }, {}], 54: [function(t, s, o) {
        (function(u) {
          (function(l, n) {
            if (!l.setImmediate) {
              var f, g, _, k, R = 1, E = {}, C = !1, w = l.document, A = Object.getPrototypeOf && Object.getPrototypeOf(l);
              A = A && A.setTimeout ? A : l, f = {}.toString.call(l.process) === "[object process]" ? function(h) {
                me.nextTick(function() {
                  y(h);
                });
              } : function() {
                if (l.postMessage && !l.importScripts) {
                  var h = !0, T = l.onmessage;
                  return l.onmessage = function() {
                    h = !1;
                  }, l.postMessage("", "*"), l.onmessage = T, h;
                }
              }() ? (k = "setImmediate$" + Math.random() + "$", l.addEventListener ? l.addEventListener("message", m, !1) : l.attachEvent("onmessage", m), function(h) {
                l.postMessage(k + h, "*");
              }) : l.MessageChannel ? ((_ = new MessageChannel()).port1.onmessage = function(h) {
                y(h.data);
              }, function(h) {
                _.port2.postMessage(h);
              }) : w && "onreadystatechange" in w.createElement("script") ? (g = w.documentElement, function(h) {
                var T = w.createElement("script");
                T.onreadystatechange = function() {
                  y(h), T.onreadystatechange = null, g.removeChild(T), T = null;
                }, g.appendChild(T);
              }) : function(h) {
                setTimeout(y, 0, h);
              }, A.setImmediate = function(h) {
                typeof h != "function" && (h = new Function("" + h));
                for (var T = new Array(arguments.length - 1), F = 0; F < T.length; F++) T[F] = arguments[F + 1];
                var B = { callback: h, args: T };
                return E[R] = B, f(R), R++;
              }, A.clearImmediate = c;
            }
            function c(h) {
              delete E[h];
            }
            function y(h) {
              if (C) setTimeout(y, 0, h);
              else {
                var T = E[h];
                if (T) {
                  C = !0;
                  try {
                    (function(F) {
                      var B = F.callback, z = F.args;
                      switch (z.length) {
                        case 0:
                          B();
                          break;
                        case 1:
                          B(z[0]);
                          break;
                        case 2:
                          B(z[0], z[1]);
                          break;
                        case 3:
                          B(z[0], z[1], z[2]);
                          break;
                        default:
                          B.apply(n, z);
                      }
                    })(T);
                  } finally {
                    c(h), C = !1;
                  }
                }
              }
            }
            function m(h) {
              h.source === l && typeof h.data == "string" && h.data.indexOf(k) === 0 && y(+h.data.slice(k.length));
            }
          })(typeof self > "u" ? u === void 0 ? this : u : self);
        }).call(this, typeof Fe < "u" ? Fe : typeof self < "u" ? self : typeof window < "u" ? window : {});
      }, {}] }, {}, [10])(10);
    });
  }(fi)), fi.exports;
}
var ad = id();
const sd = /* @__PURE__ */ oo(ad);
var Nt = { exports: {} }, hi, Ys;
function od() {
  if (Ys) return hi;
  Ys = 1;
  var r = {
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
    "<": "&lt;",
    ">": "&gt;"
  };
  function e(t) {
    return t && t.replace ? t.replace(/([&"<>'])/g, function(s, o) {
      return r[o];
    }) : t;
  }
  return hi = e, hi;
}
var Js;
function ud() {
  if (Js) return Nt.exports;
  Js = 1;
  var r = od(), e = Fi().Stream, t = "    ";
  function s(g, _) {
    typeof _ != "object" && (_ = {
      indent: _
    });
    var k = _.stream ? new e() : null, R = "", E = !1, C = _.indent ? _.indent === !0 ? t : _.indent : "", w = !0;
    function A(T) {
      w ? me.nextTick(T) : T();
    }
    function c(T, F) {
      if (F !== void 0 && (R += F), T && !E && (k = k || new e(), E = !0), T && E) {
        var B = R;
        A(function() {
          k.emit("data", B);
        }), R = "";
      }
    }
    function y(T, F) {
      n(c, l(T, C, C ? 1 : 0), F);
    }
    function m() {
      if (k) {
        var T = R;
        A(function() {
          k.emit("data", T), k.emit("end"), k.readable = !1, k.emit("close");
        });
      }
    }
    function h(T) {
      var F = T.encoding || "UTF-8", B = { version: "1.0", encoding: F };
      T.standalone && (B.standalone = T.standalone), y({ "?xml": { _attr: B } }), R = R.replace("/>", "?>");
    }
    return A(function() {
      w = !1;
    }), _.declaration && h(_.declaration), g && g.forEach ? g.forEach(function(T, F) {
      var B;
      F + 1 === g.length && (B = m), y(T, B);
    }) : y(g, m), k ? (k.readable = !0, k) : R;
  }
  function o() {
    var g = Array.prototype.slice.call(arguments), _ = {
      _elem: l(g)
    };
    return _.push = function(k) {
      if (!this.append)
        throw new Error("not assigned to a parent!");
      var R = this, E = this._elem.indent;
      n(
        this.append,
        l(
          k,
          E,
          this._elem.icount + (E ? 1 : 0)
        ),
        function() {
          R.append(!0);
        }
      );
    }, _.close = function(k) {
      k !== void 0 && this.push(k), this.end && this.end();
    }, _;
  }
  function u(g, _) {
    return new Array(_ || 0).join(g || "");
  }
  function l(g, _, k) {
    k = k || 0;
    var R = u(_, k), E, C = g, w = !1;
    if (typeof g == "object") {
      var A = Object.keys(g);
      if (E = A[0], C = g[E], C && C._elem)
        return C._elem.name = E, C._elem.icount = k, C._elem.indent = _, C._elem.indents = R, C._elem.interrupt = C, C._elem;
    }
    var c = [], y = [], m;
    function h(T) {
      var F = Object.keys(T);
      F.forEach(function(B) {
        c.push(f(B, T[B]));
      });
    }
    switch (typeof C) {
      case "object":
        if (C === null) break;
        C._attr && h(C._attr), C._cdata && y.push(
          ("<![CDATA[" + C._cdata).replace(/\]\]>/g, "]]]]><![CDATA[>") + "]]>"
        ), C.forEach && (m = !1, y.push(""), C.forEach(function(T) {
          if (typeof T == "object") {
            var F = Object.keys(T)[0];
            F == "_attr" ? h(T._attr) : y.push(l(
              T,
              _,
              k + 1
            ));
          } else
            y.pop(), m = !0, y.push(r(T));
        }), m || y.push(""));
        break;
      default:
        y.push(r(C));
    }
    return {
      name: E,
      interrupt: w,
      attributes: c,
      content: y,
      icount: k,
      indents: R,
      indent: _
    };
  }
  function n(g, _, k) {
    if (typeof _ != "object")
      return g(!1, _);
    var R = _.interrupt ? 1 : _.content.length;
    function E() {
      for (; _.content.length; ) {
        var w = _.content.shift();
        if (w !== void 0) {
          if (C(w)) return;
          n(g, w);
        }
      }
      g(!1, (R > 1 ? _.indents : "") + (_.name ? "</" + _.name + ">" : "") + (_.indent && !k ? `
` : "")), k && k();
    }
    function C(w) {
      return w.interrupt ? (w.interrupt.append = g, w.interrupt.end = E, w.interrupt = !1, g(!0), !0) : !1;
    }
    if (g(!1, _.indents + (_.name ? "<" + _.name : "") + (_.attributes.length ? " " + _.attributes.join(" ") : "") + (R ? _.name ? ">" : "" : _.name ? "/>" : "") + (_.indent && R > 1 ? `
` : "")), !R)
      return g(!1, _.indent ? `
` : "");
    C(_) || E();
  }
  function f(g, _) {
    return g + '="' + r(_) + '"';
  }
  return Nt.exports = s, Nt.exports.element = Nt.exports.Element = o, Nt.exports;
}
var cd = ud();
const Ee = /* @__PURE__ */ oo(cd), Ot = 0, di = 32, ld = 32, fd = (r, e) => {
  const t = e.replace(/-/g, "");
  if (t.length !== ld)
    throw new Error(`Error: Cannot extract GUID from font filename: ${e}`);
  const o = t.replace(/(..)/g, "$1 ").trim().split(" ").map((f) => parseInt(f, 16));
  o.reverse();
  const l = r.slice(Ot, di).map((f, g) => f ^ o[g % o.length]), n = new Uint8Array(Ot + l.length + Math.max(0, r.length - di));
  return n.set(r.slice(0, Ot)), n.set(l, Ot), n.set(r.slice(di), Ot + l.length), n;
};
class hd {
  /**
   * Formats an XML component into a serializable object.
   *
   * @param input - The XML component to format
   * @param context - The context containing file state and relationships
   * @returns A serializable XML object structure
   * @throws Error if the component cannot be formatted correctly
   */
  format(e, t = { stack: [] }) {
    const s = e.prepForXml(t);
    if (s)
      return s;
    throw Error("XMLComponent did not format correctly");
  }
}
class dd {
  /**
   * Replaces image placeholder tokens with relationship IDs.
   *
   * @param xmlData - The XML string containing image placeholders
   * @param mediaData - Array of media data to replace
   * @param offset - Starting offset for relationship IDs
   * @returns XML string with placeholders replaced by relationship IDs
   */
  replace(e, t, s) {
    let o = e;
    return t.forEach((u, l) => {
      o = o.replace(new RegExp(`{${u.fileName}}`, "g"), (s + l).toString());
    }), o;
  }
  /**
   * Extracts media data referenced in the XML content.
   *
   * @param xmlData - The XML string to search for media references
   * @param media - The media collection to search within
   * @returns Array of media data found in the XML
   */
  getMediaData(e, t) {
    return t.Array.filter((s) => e.search(`{${s.fileName}}`) > 0);
  }
}
class pd {
  /**
   * Replaces numbering placeholder tokens with actual numbering IDs.
   *
   * Placeholder format: {reference-instance} where reference identifies the
   * numbering definition and instance is the specific usage.
   *
   * @param xmlData - The XML string containing numbering placeholders
   * @param concreteNumberings - Array of concrete numbering instances to replace
   * @returns XML string with placeholders replaced by numbering IDs
   */
  replace(e, t) {
    let s = e;
    for (const o of t)
      s = s.replace(
        new RegExp(`{${o.reference}-${o.instance}}`, "g"),
        o.numId.toString()
      );
    return s;
  }
}
class md {
  /**
   * Creates a new Compiler instance.
   *
   * Initializes the formatter and replacer utilities used during compilation.
   */
  constructor() {
    se(this, "formatter"), se(this, "imageReplacer"), se(this, "numberingReplacer"), this.formatter = new hd(), this.imageReplacer = new dd(), this.numberingReplacer = new pd();
  }
  /**
   * Compiles a File object into a JSZip archive containing the complete OOXML package.
   *
   * This method orchestrates the entire compilation process:
   * - Converts all document components to XML
   * - Manages image and numbering placeholder replacements
   * - Creates relationship files
   * - Packages fonts and media files
   * - Assembles everything into a ZIP archive
   *
   * @param file - The document to compile
   * @param prettifyXml - Optional XML formatting style
   * @param overrides - Optional custom XML file overrides
   * @returns A JSZip instance containing the complete .docx package
   */
  compile(e, t, s = []) {
    const o = new sd(), u = this.xmlifyFile(e, t), l = new Map(Object.entries(u));
    for (const [, n] of l)
      if (Array.isArray(n))
        for (const f of n)
          o.file(f.path, ni(f.data));
      else
        o.file(n.path, ni(n.data));
    for (const n of s)
      o.file(n.path, ni(n.data));
    for (const n of e.Media.Array)
      n.type !== "svg" ? o.file(`word/media/${n.fileName}`, n.data) : (o.file(`word/media/${n.fileName}`, n.data), o.file(`word/media/${n.fallback.fileName}`, n.fallback.data));
    for (const { data: n, name: f, fontKey: g } of e.FontTable.fontOptionsWithKey) {
      const [_] = f.split(".");
      o.file(`word/fonts/${_}.odttf`, fd(n, g));
    }
    return o;
  }
  xmlifyFile(e, t) {
    const s = e.Document.Relationships.RelationshipCount + 1, o = Ee(
      this.formatter.format(e.Document.View, {
        viewWrapper: e.Document,
        file: e,
        stack: []
      }),
      {
        indent: t,
        declaration: {
          standalone: "yes",
          encoding: "UTF-8"
        }
      }
    ), u = e.Comments.Relationships.RelationshipCount + 1, l = Ee(
      this.formatter.format(e.Comments, {
        viewWrapper: {
          View: e.Comments,
          Relationships: e.Comments.Relationships
        },
        file: e,
        stack: []
      }),
      {
        indent: t,
        declaration: {
          standalone: "yes",
          encoding: "UTF-8"
        }
      }
    ), n = e.FootNotes.Relationships.RelationshipCount + 1, f = Ee(
      this.formatter.format(e.FootNotes.View, {
        viewWrapper: e.FootNotes,
        file: e,
        stack: []
      }),
      {
        indent: t,
        declaration: {
          standalone: "yes",
          encoding: "UTF-8"
        }
      }
    ), g = this.imageReplacer.getMediaData(o, e.Media), _ = this.imageReplacer.getMediaData(l, e.Media), k = this.imageReplacer.getMediaData(f, e.Media);
    return {
      Relationships: {
        data: (g.forEach((R, E) => {
          e.Document.Relationships.addRelationship(
            s + E,
            "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
            `media/${R.fileName}`
          );
        }), e.Document.Relationships.addRelationship(
          e.Document.Relationships.RelationshipCount + 1,
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable",
          "fontTable.xml"
        ), Ee(
          this.formatter.format(e.Document.Relationships, {
            viewWrapper: e.Document,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              encoding: "UTF-8"
            }
          }
        )),
        path: "word/_rels/document.xml.rels"
      },
      Document: {
        data: (() => {
          const R = this.imageReplacer.replace(o, g, s);
          return this.numberingReplacer.replace(R, e.Numbering.ConcreteNumbering);
        })(),
        path: "word/document.xml"
      },
      Styles: {
        data: (() => {
          const R = Ee(
            this.formatter.format(e.Styles, {
              viewWrapper: e.Document,
              file: e,
              stack: []
            }),
            {
              indent: t,
              declaration: {
                standalone: "yes",
                encoding: "UTF-8"
              }
            }
          );
          return this.numberingReplacer.replace(R, e.Numbering.ConcreteNumbering);
        })(),
        path: "word/styles.xml"
      },
      Properties: {
        data: Ee(
          this.formatter.format(e.CoreProperties, {
            viewWrapper: e.Document,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              standalone: "yes",
              encoding: "UTF-8"
            }
          }
        ),
        path: "docProps/core.xml"
      },
      Numbering: {
        data: Ee(
          this.formatter.format(e.Numbering, {
            viewWrapper: e.Document,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              standalone: "yes",
              encoding: "UTF-8"
            }
          }
        ),
        path: "word/numbering.xml"
      },
      FileRelationships: {
        data: Ee(
          this.formatter.format(e.FileRelationships, {
            viewWrapper: e.Document,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              encoding: "UTF-8"
            }
          }
        ),
        path: "_rels/.rels"
      },
      HeaderRelationships: e.Headers.map((R, E) => {
        const C = Ee(
          this.formatter.format(R.View, {
            viewWrapper: R,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              encoding: "UTF-8"
            }
          }
        );
        return this.imageReplacer.getMediaData(C, e.Media).forEach((A, c) => {
          R.Relationships.addRelationship(
            c,
            "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
            `media/${A.fileName}`
          );
        }), {
          data: Ee(
            this.formatter.format(R.Relationships, {
              viewWrapper: R,
              file: e,
              stack: []
            }),
            {
              indent: t,
              declaration: {
                encoding: "UTF-8"
              }
            }
          ),
          path: `word/_rels/header${E + 1}.xml.rels`
        };
      }),
      FooterRelationships: e.Footers.map((R, E) => {
        const C = Ee(
          this.formatter.format(R.View, {
            viewWrapper: R,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              encoding: "UTF-8"
            }
          }
        );
        return this.imageReplacer.getMediaData(C, e.Media).forEach((A, c) => {
          R.Relationships.addRelationship(
            c,
            "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
            `media/${A.fileName}`
          );
        }), {
          data: Ee(
            this.formatter.format(R.Relationships, {
              viewWrapper: R,
              file: e,
              stack: []
            }),
            {
              indent: t,
              declaration: {
                encoding: "UTF-8"
              }
            }
          ),
          path: `word/_rels/footer${E + 1}.xml.rels`
        };
      }),
      Headers: e.Headers.map((R, E) => {
        const C = Ee(
          this.formatter.format(R.View, {
            viewWrapper: R,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              encoding: "UTF-8"
            }
          }
        ), w = this.imageReplacer.getMediaData(C, e.Media), A = this.imageReplacer.replace(C, w, 0);
        return {
          data: this.numberingReplacer.replace(A, e.Numbering.ConcreteNumbering),
          path: `word/header${E + 1}.xml`
        };
      }),
      Footers: e.Footers.map((R, E) => {
        const C = Ee(
          this.formatter.format(R.View, {
            viewWrapper: R,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              encoding: "UTF-8"
            }
          }
        ), w = this.imageReplacer.getMediaData(C, e.Media), A = this.imageReplacer.replace(C, w, 0);
        return {
          data: this.numberingReplacer.replace(A, e.Numbering.ConcreteNumbering),
          path: `word/footer${E + 1}.xml`
        };
      }),
      ContentTypes: {
        data: Ee(
          this.formatter.format(e.ContentTypes, {
            viewWrapper: e.Document,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              encoding: "UTF-8"
            }
          }
        ),
        path: "[Content_Types].xml"
      },
      CustomProperties: {
        data: Ee(
          this.formatter.format(e.CustomProperties, {
            viewWrapper: e.Document,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              standalone: "yes",
              encoding: "UTF-8"
            }
          }
        ),
        path: "docProps/custom.xml"
      },
      AppProperties: {
        data: Ee(
          this.formatter.format(e.AppProperties, {
            viewWrapper: e.Document,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              standalone: "yes",
              encoding: "UTF-8"
            }
          }
        ),
        path: "docProps/app.xml"
      },
      FootNotes: {
        data: (() => {
          const R = this.imageReplacer.replace(f, k, n);
          return this.numberingReplacer.replace(R, e.Numbering.ConcreteNumbering);
        })(),
        path: "word/footnotes.xml"
      },
      FootNotesRelationships: {
        data: (k.forEach((R, E) => {
          e.FootNotes.Relationships.addRelationship(
            n + E,
            "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
            `media/${R.fileName}`
          );
        }), Ee(
          this.formatter.format(e.FootNotes.Relationships, {
            viewWrapper: e.FootNotes,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              encoding: "UTF-8"
            }
          }
        )),
        path: "word/_rels/footnotes.xml.rels"
      },
      Endnotes: {
        data: Ee(
          this.formatter.format(e.Endnotes.View, {
            viewWrapper: e.Endnotes,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              encoding: "UTF-8"
            }
          }
        ),
        path: "word/endnotes.xml"
      },
      EndnotesRelationships: {
        data: Ee(
          this.formatter.format(e.Endnotes.Relationships, {
            viewWrapper: e.Endnotes,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              encoding: "UTF-8"
            }
          }
        ),
        path: "word/_rels/endnotes.xml.rels"
      },
      Settings: {
        data: Ee(
          this.formatter.format(e.Settings, {
            viewWrapper: e.Document,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              standalone: "yes",
              encoding: "UTF-8"
            }
          }
        ),
        path: "word/settings.xml"
      },
      Comments: {
        data: (() => {
          const R = this.imageReplacer.replace(l, _, u);
          return this.numberingReplacer.replace(R, e.Numbering.ConcreteNumbering);
        })(),
        path: "word/comments.xml"
      },
      CommentsRelationships: {
        data: (_.forEach((R, E) => {
          e.Comments.Relationships.addRelationship(
            u + E,
            "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
            `media/${R.fileName}`
          );
        }), Ee(
          this.formatter.format(e.Comments.Relationships, {
            viewWrapper: {
              View: e.Comments,
              Relationships: e.Comments.Relationships
            },
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              encoding: "UTF-8"
            }
          }
        )),
        path: "word/_rels/comments.xml.rels"
      },
      FontTable: {
        data: Ee(
          this.formatter.format(e.FontTable.View, {
            viewWrapper: e.Document,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              standalone: "yes",
              encoding: "UTF-8"
            }
          }
        ),
        path: "word/fontTable.xml"
      },
      FontTableRelationships: {
        data: Ee(
          this.formatter.format(e.FontTable.Relationships, {
            viewWrapper: e.Document,
            file: e,
            stack: []
          }),
          {
            indent: t,
            declaration: {
              encoding: "UTF-8"
            }
          }
        ),
        path: "word/_rels/fontTable.xml.rels"
      }
    };
  }
}
const gd = {
  /** Indent with 2 spaces */
  WITH_2_BLANKS: "  "
}, Qs = (r) => r === !0 ? gd.WITH_2_BLANKS : r === !1 ? void 0 : r, Zo = class pt {
  /**
   * Exports a document to the specified output format.
   *
   * @param file - The document to export
   * @param type - The output format type (e.g., "nodebuffer", "blob", "string")
   * @param prettify - Whether to prettify the XML output (boolean or PrettifyType)
   * @param overrides - Optional array of file overrides for custom XML content
   * @returns A promise resolving to the exported document in the specified format
   */
  // eslint-disable-next-line require-await
  static pack(e, t, s) {
    return Xu(this, arguments, function* (o, u, l, n = []) {
      return this.compiler.compile(o, Qs(l), n).generateAsync({
        type: u,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        compression: "DEFLATE"
      });
    });
  }
  /**
   * Exports a document to a string representation.
   *
   * @param file - The document to export
   * @param prettify - Whether to prettify the XML output
   * @param overrides - Optional array of file overrides
   * @returns A promise resolving to the document as a string
   */
  static toString(e, t, s = []) {
    return pt.pack(e, "string", t, s);
  }
  /**
   * Exports a document to a Node.js Buffer.
   *
   * @param file - The document to export
   * @param prettify - Whether to prettify the XML output
   * @param overrides - Optional array of file overrides
   * @returns A promise resolving to the document as a Buffer
   */
  static toBuffer(e, t, s = []) {
    return pt.pack(e, "nodebuffer", t, s);
  }
  /**
   * Exports a document to a base64-encoded string.
   *
   * @param file - The document to export
   * @param prettify - Whether to prettify the XML output
   * @param overrides - Optional array of file overrides
   * @returns A promise resolving to the document as a base64 string
   */
  static toBase64String(e, t, s = []) {
    return pt.pack(e, "base64", t, s);
  }
  /**
   * Exports a document to a Blob (for browser environments).
   *
   * @param file - The document to export
   * @param prettify - Whether to prettify the XML output
   * @param overrides - Optional array of file overrides
   * @returns A promise resolving to the document as a Blob
   */
  static toBlob(e, t, s = []) {
    return pt.pack(e, "blob", t, s);
  }
  /**
   * Exports a document to an ArrayBuffer.
   *
   * @param file - The document to export
   * @param prettify - Whether to prettify the XML output
   * @param overrides - Optional array of file overrides
   * @returns A promise resolving to the document as an ArrayBuffer
   */
  static toArrayBuffer(e, t, s = []) {
    return pt.pack(e, "arraybuffer", t, s);
  }
  /**
   * Exports a document to a Node.js Stream.
   *
   * @param file - The document to export
   * @param prettify - Whether to prettify the XML output
   * @param overrides - Optional array of file overrides
   * @returns A readable stream containing the document data
   */
  static toStream(e, t, s = []) {
    const o = new nd.Stream();
    return this.compiler.compile(e, Qs(t), s).generateAsync({
      type: "nodebuffer",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      compression: "DEFLATE"
    }).then((l) => {
      o.emit("data", l), o.emit("end");
    }), o;
  }
};
se(Zo, "compiler", new md());
let Yo = Zo, pi;
async function wd() {
  if (!pi)
    try {
      pi = (await import("./index-B883strI.js").then((r) => r.i)).default;
    } catch {
      throw new Error("缺少 jszip 依赖，请运行 npm install jszip");
    }
  return pi;
}
class yd {
  constructor() {
    ye(this, "direction", "pptx-to-docx");
    ye(this, "requiresLibreOffice", !1);
  }
  async convert(e) {
    var A;
    const { inputPath: t, outputDir: s, onProgress: o } = e;
    o(10);
    const u = await wd(), l = await Ye(t), n = await u.loadAsync(l), f = [];
    n.forEach((c) => {
      /^ppt\/slides\/slide\d+\.xml$/.test(c) && f.push(c);
    }), f.sort((c, y) => {
      var T, F;
      const m = parseInt(((T = c.match(/slide(\d+)/)) == null ? void 0 : T[1]) || "0"), h = parseInt(((F = y.match(/slide(\d+)/)) == null ? void 0 : F[1]) || "0");
      return m - h;
    }), o(30);
    const g = [];
    for (let c = 0; c < f.length; c++) {
      const y = await ((A = n.file(f[c])) == null ? void 0 : A.async("string"));
      if (!y) continue;
      const m = this.extractTextsFromSlideXml(y);
      g.push({
        title: `幻灯片 ${c + 1}`,
        texts: m
      }), o(30 + Math.round(c / f.length * 40));
    }
    o(70);
    const _ = [], k = he.basename(t, he.extname(t));
    _.push(
      new Ue({
        text: k,
        heading: xi.TITLE
      })
    );
    for (const c of g) {
      _.push(
        new Ue({
          text: c.title,
          heading: xi.HEADING_1,
          spacing: { before: 400 }
        })
      );
      for (const y of c.texts)
        y.trim() && _.push(
          new Ue({
            children: [new Ut(y)],
            spacing: { after: 100 }
          })
        );
    }
    const R = new Xo({
      sections: [{ children: _ }]
    }), E = await Yo.toBuffer(R);
    o(90);
    const C = he.join(s, `${k}.docx`);
    await Ze(C, E);
    const w = await De(C);
    return o(100), {
      outputPath: C,
      outputSize: w.size
    };
  }
  /**
   * 从幻灯片 XML 中提取纯文字
   * pptx slide XML 中文字在 <a:t> 标签内
   */
  extractTextsFromSlideXml(e) {
    const t = [], s = e.match(/<a:p\b[^>]*>[\s\S]*?<\/a:p>/gi) || [];
    for (const o of s) {
      const n = (o.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi) || []).map(
        (f) => f.replace(/<\/?a:t[^>]*>/gi, "").trim()
      ).join("");
      n && t.push(n);
    }
    return t;
  }
}
class vd {
  constructor() {
    ye(this, "direction", "pptx-to-pdf");
    ye(this, "requiresLibreOffice", !0);
  }
  async convert(e) {
    const { inputPath: t, outputDir: s, onProgress: o } = e;
    o(10);
    const u = await ki(t, s, "pdf");
    o(90);
    const l = await De(u);
    return o(100), {
      outputPath: u,
      outputSize: l.size
    };
  }
}
class bd {
  constructor() {
    ye(this, "direction", "pptx-to-image");
    ye(this, "requiresLibreOffice", !0);
  }
  async convert(e) {
    const { inputPath: t, outputDir: s, onProgress: o } = e;
    o(10);
    const u = he.basename(t, he.extname(t)), l = he.join(s, `${u}_slides`);
    await io(l, { recursive: !0 }), o(20);
    const n = await ki(t, l, "pdf");
    o(90);
    const f = await De(n);
    return o(100), {
      outputPath: n,
      outputSize: f.size,
      assets: [l]
    };
  }
}
const _d = tt(import.meta.url), Ed = _d("pdf-parse");
class xd {
  constructor() {
    ye(this, "direction", "pdf-to-docx");
    ye(this, "requiresLibreOffice", !1);
  }
  async convert(e) {
    var w;
    const { inputPath: t, outputDir: s, onProgress: o } = e;
    o(10);
    const u = await Ye(t);
    let l;
    try {
      l = await Ed(u);
    } catch (A) {
      throw new Error(`PDF 解析失败: ${A.message}`);
    }
    o(40);
    const n = (w = l.text) == null ? void 0 : w.trim();
    if (!n)
      throw new Error("此为扫描件或无文字内容的 PDF，无法提取文字");
    const f = n.split(`
`), g = he.basename(t, he.extname(t)), _ = [
      new Ue({
        text: g,
        heading: xi.TITLE
      }),
      new Ue({
        children: [
          new Ut({
            text: `来源: ${he.basename(t)} (${l.numpages} 页)`,
            italics: !0,
            color: "888888"
          })
        ],
        spacing: { after: 200 }
      })
    ];
    o(60);
    for (const A of f)
      A.trim() && _.push(
        new Ue({
          children: [new Ut(A)],
          spacing: { after: 80 }
        })
      );
    const k = new Xo({
      sections: [{ children: _ }]
    }), R = await Yo.toBuffer(k);
    o(90);
    const E = he.join(s, `${g}.docx`);
    await Ze(E, R);
    const C = await De(E);
    return o(100), {
      outputPath: E,
      outputSize: C.size
    };
  }
}
const Sd = tt(import.meta.url), Td = Sd("pdf-parse");
class Ad {
  constructor() {
    ye(this, "direction", "pdf-to-md");
    ye(this, "requiresLibreOffice", !1);
  }
  async convert(e) {
    var C;
    const { inputPath: t, outputDir: s, onProgress: o } = e;
    o(10);
    const u = await Ye(t);
    let l;
    try {
      l = await Td(u);
    } catch (w) {
      throw new Error(`PDF 解析失败: ${w.message}`);
    }
    o(40);
    const n = (C = l.text) == null ? void 0 : C.trim();
    if (!n)
      throw new Error("此为扫描件或无文字内容的 PDF，无法提取文字");
    const f = he.basename(t, he.extname(t)), g = n.split(`
`), _ = [
      `# ${f}`,
      "",
      `> 来源: ${he.basename(t)} (${l.numpages} 页)`,
      ""
    ];
    for (const w of g)
      _.push(w);
    const k = _.join(`
`);
    o(80);
    const R = he.join(s, `${f}.md`);
    await Ze(R, k, "utf-8");
    const E = await De(R);
    return o(100), {
      outputPath: R,
      outputSize: E.size
    };
  }
}
const kd = tt(import.meta.url), { marked: eo } = kd("marked");
class Rd {
  constructor() {
    ye(this, "direction", "md-to-html");
    ye(this, "requiresLibreOffice", !1);
  }
  async convert(e) {
    const { inputPath: t, outputDir: s, onProgress: o } = e;
    o(10);
    const u = await Ye(t, "utf-8"), l = he.basename(t, he.extname(t));
    o(30), eo.setOptions({
      gfm: !0,
      breaks: !0
    });
    const n = await eo.parse(u), f = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${l}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f8f8f8; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding: 0 16px; color: #666; }
    img { max-width: 100%; }
    h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; }
  </style>
</head>
<body>
${n}
</body>
</html>`;
    o(80);
    const g = he.join(s, `${l}.html`);
    await Ze(g, f, "utf-8");
    const _ = await De(g);
    return o(100), {
      outputPath: g,
      outputSize: _.size
    };
  }
}
const Jo = tt(import.meta.url), { marked: to } = Jo("marked"), Cd = Jo("html-docx-js-typescript");
class Id {
  constructor() {
    ye(this, "direction", "md-to-docx");
    ye(this, "requiresLibreOffice", !1);
  }
  async convert(e) {
    const { inputPath: t, outputDir: s, onProgress: o } = e;
    o(10);
    const u = await Ye(t, "utf-8"), l = he.basename(t, he.extname(t));
    o(20), to.setOptions({ gfm: !0, breaks: !0 });
    const f = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Microsoft YaHei', Arial, sans-serif; font-size: 12pt; line-height: 1.6;">
${await to.parse(u)}
</body>
</html>`;
    o(50);
    const g = await Cd.asBlob(f);
    o(80);
    const _ = he.join(s, `${l}.docx`), k = Buffer.isBuffer(g) ? g : Buffer.from(g instanceof ArrayBuffer ? g : await g.arrayBuffer());
    await Ze(_, k);
    const R = await De(_);
    return o(100), {
      outputPath: _,
      outputSize: R.size
    };
  }
}
const Nd = tt(import.meta.url), Od = Nd("turndown");
class Pd {
  constructor() {
    ye(this, "direction", "html-to-md");
    ye(this, "requiresLibreOffice", !1);
  }
  async convert(e) {
    const { inputPath: t, outputDir: s, onProgress: o } = e;
    o(10);
    const u = await Ye(t, "utf-8"), l = he.basename(t, he.extname(t));
    o(30);
    const n = new Od({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-"
    });
    n.addRule("table", {
      filter: "table",
      replacement: (k, R) => Fd(R)
    });
    let f = n.turndown(u);
    f = f.replace(/\n{3,}/g, `

`), o(80);
    const g = he.join(s, `${l}.md`);
    await Ze(g, f, "utf-8");
    const _ = await De(g);
    return o(100), {
      outputPath: g,
      outputSize: _.size
    };
  }
}
function Fd(r) {
  var u, l, n, f;
  const e = [], t = ((u = r.querySelectorAll) == null ? void 0 : u.call(r, "tr")) || ((l = r.getElementsByTagName) == null ? void 0 : l.call(r, "tr")) || [];
  for (const g of t) {
    const _ = [], k = ((n = g.querySelectorAll) == null ? void 0 : n.call(g, "td, th")) || ((f = g.getElementsByTagName) == null ? void 0 : f.call(g, "td")) || [];
    for (const R of k)
      _.push((R.textContent || "").trim().replace(/\|/g, "\\|"));
    e.push(_);
  }
  if (e.length === 0) return "";
  const s = Math.max(...e.map((g) => g.length)), o = [];
  for (let g = 0; g < e.length; g++) {
    const _ = e[g];
    for (; _.length < s; ) _.push("");
    o.push(`| ${_.join(" | ")} |`), g === 0 && o.push(`| ${_.map(() => "---").join(" | ")} |`);
  }
  return `
` + o.join(`
`) + `
`;
}
let Ft = null, xe = null;
function Dd() {
  Ft = new Du(), xe = new Bu(Ft), Ft.registerAll([
    new Mu(),
    new ju(),
    new qu(),
    new yd(),
    new vd(),
    new bd(),
    new xd(),
    new Ad(),
    new Rd(),
    new Id(),
    new Pd()
  ]), be.handle("docConvert:start", async (r, e) => {
    if (!xe || !Ft) return { success: !1, error: "引擎未初始化" };
    console.log("[docConvert] 开始转换, 文件数:", e.files.length, "方向:", e.config.direction);
    try {
      const t = xe.addTasks(e.files, e.config), s = Lt.getAllWindows()[0];
      if (s) {
        const o = (u, l) => {
          s.isDestroyed() || s.webContents.send(u, l);
        };
        xe.removeAllListeners(), xe.on("taskStart", (u) => o("docConvert:taskStart", u)), xe.on("progress", (u) => o("docConvert:progress", u)), xe.on("taskDone", (u) => o("docConvert:taskDone", u)), xe.on("taskError", (u) => o("docConvert:taskError", u)), xe.on("batchDone", (u) => o("docConvert:batchDone", u));
      }
      return xe.start(e.config).catch((o) => {
        console.error("[docConvert] 批量转换异常:", o);
      }), { success: !0, taskIds: t.map((o) => o.id) };
    } catch (t) {
      return console.error("[docConvert] 启动失败:", t), { success: !1, error: t.message };
    }
  }), be.handle("docConvert:cancel", async () => (xe == null || xe.cancel(), { success: !0 })), be.handle("docConvert:getStatus", async () => (xe == null ? void 0 : xe.getStatus()) ?? { running: !1, queueLength: 0, tasks: [] }), be.handle("docConvert:checkLibreOffice", async () => await ao()), be.handle("docConvert:selectOutputDir", async () => {
    const r = Lt.getAllWindows()[0];
    if (!r) return { success: !1, error: "无窗口" };
    const e = await yt.showOpenDialog(r, {
      title: "选择输出目录",
      properties: ["openDirectory"]
    });
    return e.canceled || e.filePaths.length === 0 ? { success: !1, canceled: !0 } : { success: !0, path: e.filePaths[0] };
  }), be.handle("docConvert:openOutputDir", async (r, e) => {
    try {
      return await mi.openPath(e), { success: !0 };
    } catch (t) {
      return { success: !1, error: t.message };
    }
  }), be.handle("file:readText", async (r, e) => {
    try {
      return await Ye(e, "utf-8");
    } catch (t) {
      throw new Error(`无法读取文件: ${t.message}`);
    }
  }), console.log("[docConvert] IPC handlers 已注册");
}
function Bd() {
  xe == null || xe.cancel(), xe == null || xe.removeAllListeners(), Ft = null, xe = null;
}
const Ld = tt(import.meta.url), Qo = he.dirname(uu(import.meta.url));
process.env.APP_ROOT = he.join(Qo, "..");
const Ti = process.env.VITE_DEV_SERVER_URL, Jd = he.join(process.env.APP_ROOT, "dist-electron"), eu = he.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = Ti ? he.join(process.env.APP_ROOT, "public") : eu;
let Ce;
function tu() {
  ro.themeSource = "light", ou.setApplicationMenu(null), Ce = new Lt({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: "Universal Toolkit",
    icon: he.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: he.join(Qo, "preload.mjs")
    }
  }), Ti ? Ce.loadURL(Ti) : Ce.loadFile(he.join(eu, "index.html"));
}
be.handle("dialog:openFiles", async (r, e) => (await yt.showOpenDialog({
  properties: e.properties || ["openFile", "multiSelections"],
  filters: e.filters || []
})).filePaths);
be.handle("dialog:openFolder", async () => (await yt.showOpenDialog({ properties: ["openDirectory"] })).filePaths[0] || null);
be.handle("dialog:saveDir", async () => (await yt.showOpenDialog({ properties: ["openDirectory", "createDirectory"] })).filePaths[0] || null);
be.handle("file:readText", async (r, e) => (await import("node:fs")).readFileSync(e, "utf-8"));
const Ud = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".tiff", ".tif", ".bmp", ".ico", ".svg"];
be.handle("file:listImages", async (r, e) => {
  const t = await import("node:fs"), s = [];
  function o(u) {
    const l = t.readdirSync(u, { withFileTypes: !0 });
    for (const n of l) {
      const f = he.join(u, n.name);
      n.isDirectory() ? o(f) : Ud.includes(he.extname(n.name).toLowerCase()) && s.push(f);
    }
  }
  return o(e), s;
});
be.handle("theme:toggle", async (r, e) => {
  ro.themeSource = e ? "dark" : "light", Ce && Ce.setBackgroundColor(e ? "#0f1123" : "#ffffff");
});
hu();
du();
pu();
mu();
wu();
Ou();
Dd();
Bt.on("window-all-closed", () => {
  process.platform !== "darwin" && (Fu(), Bd(), Bt.quit(), Ce = null);
});
Bt.on("activate", () => {
  Lt.getAllWindows().length === 0 && tu();
});
Bt.whenReady().then(() => {
  tu(), Pu();
  const { globalShortcut: r } = Ld("electron");
  r.register("CmdOrCtrl+O", () => {
    Ce && yt.showOpenDialog(Ce, {
      properties: ["openFile", "multiSelections"]
    }).then((e) => {
      e.filePaths.length > 0 && (Ce == null || Ce.webContents.send("shortcut:openFiles", e.filePaths));
    });
  }), r.register("CmdOrCtrl+Shift+O", () => {
    Ce && yt.showOpenDialog(Ce, {
      properties: ["openDirectory"]
    }).then((e) => {
      e.filePaths[0] && (Ce == null || Ce.webContents.send("shortcut:openFolder", e.filePaths[0]));
    });
  });
});
export {
  Jd as MAIN_DIST,
  eu as RENDERER_DIST,
  Ti as VITE_DEV_SERVER_URL
};
