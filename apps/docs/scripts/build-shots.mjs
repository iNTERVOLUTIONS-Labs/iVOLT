// Screenshots of the recipes for the device frames on the home and the examples gallery.
// Honest by construction: a recipe that is not on disk produces no image, and the frame then
// says so instead of showing a picture of something that does not exist.
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const out = resolve(root, "apps/docs/public/shots");
const recipes = ["studio", "console", "journal", "store"];
const present = recipes.filter((r) => existsSync(resolve(root, "examples/recipes", r, "index.html")));
if (!present.length) { console.warn("build-shots: no recipe folders yet, frames stay empty"); process.exit(0); }

let chromium;
try { ({ chromium } = await import("playwright")); }
catch { console.warn("build-shots: playwright is not installed, frames keep the last images"); process.exit(0); }

mkdirSync(out, { recursive: true });
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  try {
    let file = normalize(join(root, decodeURIComponent(new URL(req.url, "http://x").pathname)));
    if (!file.startsWith(root)) throw Object.assign(new Error("forbidden"), { code: "EACCES" });
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    res.end(await readFile(file));
  } catch (err) { res.writeHead(err.code === "ENOENT" ? 404 : 500); res.end(""); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

// A checkout without the Playwright browsers (a fresh machine, CI without `npx playwright
// install`) must still build the site: the frames keep the images already on disk, or stay
// empty and say so, exactly like the OG image falls back to its SVG.
let browser;
try { browser = await chromium.launch(); }
catch (err) {
  server.close();
  console.warn("build-shots: browser not available (" + String(err.message).split("\n")[0] + "); frames keep the last images. Run `npx playwright install chromium` to refresh them.");
  process.exit(0);
}
for (const slug of present) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    await page.goto(`http://127.0.0.1:${port}/examples/recipes/${slug}/index.html`, { waitUntil: "load" });
    await page.waitForTimeout(700);
    // JPEG, not PNG: these are photographs of photographic pages. The studio cover alone was
    // 1.2 MB as a PNG, and eight of them sat on the home and the gallery.
    await page.screenshot({ path: resolve(out, `${slug}-${w}.jpg`), type: "jpeg", quality: 82 });
    await page.close();
    console.log(`build-shots: ${slug} at ${w}`);
  }
}
await browser.close();
server.close();
