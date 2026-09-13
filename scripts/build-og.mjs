// Renders the Open Graph image (1200×630) and the favicon from the brand artwork in assets/brand/
// (temporary wordmark when the official files are absent). PNG via the local Chromium.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pub = join(root, "apps/docs/public");
mkdirSync(pub, { recursive: true });
process.chdir(root);
const { lockup, mark, isOfficial } = await import(pathToFileURL(join(root, "apps/docs/src/brand.js")).href);

const artwork = lockup.replace(/var\(--iv-color-accent[^)]*\)/g, "#29F59A").replace(/currentColor/g, "#F3FAF6").replace(/<svg /, '<svg x="130" y="110" width="940" height="270" ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#081310"/>
${artwork}
<text x="150" y="470" font-family="system-ui, 'Segoe UI', Roboto, sans-serif" font-size="40" fill="#90A49E">The interface starts here.</text>
<text x="150" y="535" font-family="system-ui, 'Segoe UI', Roboto, sans-serif" font-size="26" fill="#90A49E" letter-spacing="3">v0.1 ALPHA${isOfficial ? "" : " · TEMPORARY WORDMARK"}</text>
</svg>`;
writeFileSync(join(pub, "og.svg"), svg);

// Favicon: isotype on a dark rounded plate so the green frame stays visible on light tab strips.
const inner = mark.replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const vb = (mark.match(/viewBox="([^"]+)"/) || [null, "0 0 88 88"])[1].split(/\s+/).map(Number);
const [vx, vy, vw, vh] = vb;
const side = Math.max(vw, vh) * 1.3;
const ox = vx - (side - vw) / 2, oy = vy - (side - vh) / 2;
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ox} ${oy} ${side} ${side}"><rect x="${ox}" y="${oy}" width="${side}" height="${side}" rx="${side * 0.18}" fill="#081310"/>${inner}</svg>`;
writeFileSync(join(pub, "favicon.svg"), favicon);

try {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(pathToFileURL(join(pub, "og.svg")).href);
  await page.screenshot({ path: join(pub, "og.png"), type: "png" });
  await browser.close();
  console.log(`og: og.svg, og.png and favicon.svg written (${isOfficial ? "official" : "temporary"} artwork)`);
} catch (err) {
  console.warn("og: PNG not rendered (" + err.message + "); og.svg written");
  if (!existsSync(join(pub, "og.png"))) process.exitCode = 0;
}
