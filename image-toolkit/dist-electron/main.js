import { ipcMain as f, dialog as w, nativeTheme as _, app as y, BrowserWindow as j, Menu as x } from "electron";
import { createRequire as O } from "node:module";
import { fileURLToPath as R } from "node:url";
import o from "node:path";
import p from "node:fs";
import b from "sharp";
function $() {
  f.handle("svg:readFolder", async (i, e) => p.readdirSync(e).filter((t) => t.toLowerCase().endsWith(".svg")).map((t) => {
    const r = o.join(e, t), c = p.statSync(r), a = p.readFileSync(r, "utf-8");
    return { name: t, path: r, size: c.size, content: a };
  })), f.handle("svg:changeColor", async (i, e, s) => {
    let t = e.replace(/fill="(?!none)[^"]*"/g, `fill="${s}"`);
    return t = t.replace(/stroke="(?!none)[^"]*"/g, `stroke="${s}"`), t = t.replace(/fill:\s*(?!none)[^;}"]+/g, `fill: ${s}`), t = t.replace(/stroke:\s*(?!none)[^;}"]+/g, `stroke: ${s}`), t;
  }), f.handle("svg:saveFiles", async (i, e) => {
    let s = 0;
    for (const t of e)
      try {
        p.writeFileSync(t.path, t.content, "utf-8"), s++;
      } catch (r) {
        console.error(`Failed to save ${t.path}:`, r);
      }
    return { saved: s, total: e.length };
  }), f.handle("svg:exportPng", async (i, e) => {
    try {
      const s = [];
      for (const t of e.scales) {
        const r = Buffer.from(e.svgContent), c = o.join(
          e.outputDir,
          `${e.fileName}@${t}x.png`
        );
        await b(r, { density: 72 * t }).png().toFile(c), s.push(c);
      }
      return { success: !0, files: s };
    } catch (s) {
      return { success: !1, error: s.message };
    }
  });
}
function E() {
  f.handle("compress:start", async (i, e) => {
    const s = [];
    for (let t = 0; t < e.files.length; t++) {
      const r = e.files[t], c = o.basename(r), a = o.extname(r).toLowerCase();
      try {
        const u = p.readFileSync(r), d = u.length;
        let n = b(u);
        const g = e.mode === "lossless" ? 100 : e.quality;
        [".jpg", ".jpeg"].includes(a) ? n = n.jpeg({
          quality: g,
          mozjpeg: e.mode !== "lossless"
        }) : a === ".png" ? n = n.png({
          compressionLevel: e.mode === "lossless" ? 9 : 6,
          quality: e.mode === "lossless" ? 100 : g
        }) : a === ".webp" ? n = n.webp({
          quality: g,
          lossless: e.mode === "lossless"
        }) : a === ".avif" ? n = n.avif({
          quality: g,
          lossless: e.mode === "lossless"
        }) : [".tiff", ".tif"].includes(a) ? n = n.tiff({
          quality: g,
          compression: "lzw"
        }) : a === ".gif" && (n = n.gif());
        const h = await n.toBuffer(), m = h.length, z = Math.round((1 - m / d) * 100), B = e.outputDir || o.dirname(r), k = e.outputDir ? c : `${o.basename(c, a)}_compressed${a}`, P = o.join(B, k);
        p.writeFileSync(P, h);
        const S = {
          file: r,
          fileName: c,
          originalSize: d,
          compressedSize: m,
          savedPercent: z,
          outputPath: P,
          status: "success"
        };
        s.push(S), i.sender.send("compress:progress", { index: t, ...S });
      } catch (u) {
        const d = {
          file: r,
          fileName: c,
          status: "error",
          error: u.message
        };
        s.push(d), i.sender.send("compress:progress", { index: t, ...d });
      }
    }
    return s;
  }), f.handle("file:getInfo", async (i, e) => e.map((s) => {
    try {
      const t = p.statSync(s), r = o.basename(s), c = o.extname(s).toLowerCase().slice(1).toUpperCase();
      return { path: s, name: r, size: t.size, type: c, exists: !0 };
    } catch {
      return { path: s, name: o.basename(s), size: 0, type: "", exists: !1 };
    }
  }));
}
function T() {
  f.handle("convert:start", async (i, e) => {
    const s = [];
    for (let t = 0; t < e.files.length; t++) {
      const r = e.files[t], c = o.basename(r, o.extname(r));
      try {
        let a = b(p.readFileSync(r));
        e.size && e.size > 0 && (a = a.resize(e.size, e.size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }));
        const u = e.targetFormat.toLowerCase(), d = u === "jpeg" ? "jpg" : u;
        let n;
        switch (u) {
          case "png":
            n = await a.png().toBuffer();
            break;
          case "jpeg":
          case "jpg":
            n = await a.flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer();
            break;
          case "webp":
            n = await a.webp({ quality: 85 }).toBuffer();
            break;
          case "avif":
            n = await a.avif({ quality: 80 }).toBuffer();
            break;
          case "tiff":
            n = await a.tiff().toBuffer();
            break;
          case "bmp":
            n = await a.png().toBuffer();
            break;
          case "ico":
            n = await a.resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
            break;
          default:
            n = await a.toBuffer();
        }
        const g = e.outputDir || o.dirname(r), h = o.join(g, `${c}.${d}`);
        p.writeFileSync(h, n);
        const m = {
          file: r,
          fileName: `${c}.${d}`,
          originalSize: p.statSync(r).size,
          convertedSize: n.length,
          outputPath: h,
          status: "success"
        };
        s.push(m), i.sender.send("convert:progress", { index: t, ...m });
      } catch (a) {
        const u = {
          file: r,
          fileName: o.basename(r),
          status: "error",
          error: a.message
        };
        s.push(u), i.sender.send("convert:progress", { index: t, ...u });
      }
    }
    return s;
  });
}
const L = O(import.meta.url), D = o.dirname(R(import.meta.url));
process.env.APP_ROOT = o.join(D, "..");
const v = process.env.VITE_DEV_SERVER_URL, M = o.join(process.env.APP_ROOT, "dist-electron"), C = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = v ? o.join(process.env.APP_ROOT, "public") : C;
let l;
function F() {
  _.themeSource = "light", x.setApplicationMenu(null), l = new j({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: "Universal Toolkit",
    icon: o.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: o.join(D, "preload.mjs")
    }
  }), v ? l.loadURL(v) : l.loadFile(o.join(C, "index.html"));
}
f.handle("dialog:openFiles", async (i, e) => (await w.showOpenDialog({
  properties: e.properties || ["openFile", "multiSelections"],
  filters: e.filters || []
})).filePaths);
f.handle("dialog:openFolder", async () => (await w.showOpenDialog({ properties: ["openDirectory"] })).filePaths[0] || null);
f.handle("dialog:saveDir", async () => (await w.showOpenDialog({ properties: ["openDirectory", "createDirectory"] })).filePaths[0] || null);
f.handle("file:readText", async (i, e) => (await import("node:fs")).readFileSync(e, "utf-8"));
f.handle("theme:toggle", async (i, e) => {
  _.themeSource = e ? "dark" : "light", l && l.setBackgroundColor(e ? "#0f1123" : "#ffffff");
});
$();
E();
T();
y.on("window-all-closed", () => {
  process.platform !== "darwin" && (y.quit(), l = null);
});
y.on("activate", () => {
  j.getAllWindows().length === 0 && F();
});
y.whenReady().then(() => {
  F();
  const { globalShortcut: i } = L("electron");
  i.register("CmdOrCtrl+O", () => {
    l && w.showOpenDialog(l, {
      properties: ["openFile", "multiSelections"]
    }).then((e) => {
      e.filePaths.length > 0 && (l == null || l.webContents.send("shortcut:openFiles", e.filePaths));
    });
  }), i.register("CmdOrCtrl+Shift+O", () => {
    l && w.showOpenDialog(l, {
      properties: ["openDirectory"]
    }).then((e) => {
      e.filePaths[0] && (l == null || l.webContents.send("shortcut:openFolder", e.filePaths[0]));
    });
  });
});
export {
  M as MAIN_DIST,
  C as RENDERER_DIST,
  v as VITE_DEV_SERVER_URL
};
