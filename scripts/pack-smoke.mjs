// npm pack → install the tarball in a temporary external consumer → import, bundle, resolve CSS.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pkgDir = join(root, "packages/ivolt");
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: ["ignore", "pipe", "inherit"] }).toString();

const tmp = mkdtempSync(join(tmpdir(), "ivolt-consumer-"));
try {
  const packOut = JSON.parse(run("npm", ["pack", "--json", "--pack-destination", tmp], pkgDir));
  const tarball = join(tmp, packOut[0].filename);
  const files = packOut[0].files.map((f) => f.path);
  for (const must of ["dist/css/ivolt.css", "dist/css/ivolt.min.css", "dist/css/core.min.css", "dist/js/index.js", "dist/js/auto.js", "dist/js/ivolt.iife.min.js", "dist/types/index.d.ts", "dist/tokens/tokens.json", "LICENSE", "README.md"]) {
    if (!files.includes(must)) throw new Error(`tarball missing ${must}`);
  }
  if (files.some((f) => f.startsWith("src/") || f.startsWith("fixtures/"))) throw new Error("tarball must not ship src/ or fixtures/");

  writeFileSync(join(tmp, "package.json"), JSON.stringify({ name: "consumer", private: true, type: "module" }));
  run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error", tarball], tmp);

  // 1) Node/SSR import of the real exports.
  writeFileSync(join(tmp, "ssr.mjs"), `
    const m = await import("@intervolutions/ivolt");
    const d = await import("@intervolutions/ivolt/dialog");
    const t = await import("@intervolutions/ivolt/theme");
    await import("@intervolutions/ivolt/auto");
    if (typeof m.init !== "function" || typeof m.destroy !== "function" || d.Dialog !== m.Dialog || typeof t.setTheme !== "function") throw new Error("exports mismatch");
    const css = import.meta.resolve("@intervolutions/ivolt/css/ivolt.css");
    console.log(JSON.stringify({ ok: true, version: m.version, css }));
  `);
  const ssr = JSON.parse(run(process.execPath, ["ssr.mjs"], tmp));
  if (!ssr.css.endsWith("/dist/css/ivolt.css")) throw new Error("css export did not resolve");

  // 2) Tree-shaking: theme-only bundle must not contain dialog code; unused bundle must be near-empty.
  const bundle = async (code) => { const r = await build({ stdin: { contents: code, resolveDir: tmp, loader: "js" }, bundle: true, minify: true, format: "esm", write: false, logLevel: "error" }); return r.outputFiles[0].text; };
  const themeOnly = await bundle(`import { setTheme } from "@intervolutions/ivolt/theme"; setTheme("dark");`);
  if (/showModal/.test(themeOnly)) throw new Error("theme bundle pulled in Dialog");
  const unused = await bundle(`import "@intervolutions/ivolt";`);
  if (unused.length > 200) throw new Error(`side-effect free import produced ${unused.length} bytes`);
  const dialogOnly = await bundle(`import { Dialog } from "@intervolutions/ivolt/dialog"; new Dialog(document.querySelector("dialog"));`);
  if (/themechange/.test(dialogOnly)) throw new Error("dialog bundle pulled in theme");

  // 3) IIFE global.
  const iife = readFileSync(join(tmp, "node_modules/@intervolutions/ivolt/dist/js/ivolt.iife.min.js"), "utf8");
  if (!/var IVOLT\s*=/.test(iife)) throw new Error("IIFE global IVOLT missing");

  // 4) Plain HTML starter copied outside the monorepo, served statically and driven in Chromium.
  const starterSrc = join(root, "examples/plain-html");
  if (!existsSync(join(starterSrc, "ivolt/css/ivolt.min.css"))) throw new Error("run node scripts/sync-examples.mjs before pack-smoke");
  const starter = join(tmp, "starter");
  cpSync(starterSrc, starter, { recursive: true });
  const { createServer } = await import("node:http");
  const { readFile: rf } = await import("node:fs/promises");
  const { extname } = await import("node:path");
  const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".map": "application/json" };
  const server = createServer(async (req, res) => {
    try { const f = join(starter, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html")); res.writeHead(200, { "content-type": types[extname(f)] || "application/octet-stream" }); res.end(await rf(f)); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.locator("[data-iv-open=signup]").first().click();
  const open = await page.locator("#signup").getAttribute("open");
  await page.keyboard.press("Escape");
  const closed = await page.locator("#signup").getAttribute("open");
  await browser.close();
  server.close();
  if (open === null || closed !== null || errors.length) throw new Error(`starter smoke failed: open=${open} closed=${closed} errors=${errors.join(" | ")}`);

  console.log(`pack-smoke: ok (${packOut[0].filename}, ${files.length} files, theme-only ${themeOnly.length} B, dialog-only ${dialogOnly.length} B, unused ${unused.length} B; starter served from ${starter} works)`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
