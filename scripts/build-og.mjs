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

const artwork = lockup.replace(/#66B1FF/gi, "url(#og-brand)").replace(/var\(--iv-color-accent[^)]*\)/g, "url(#og-brand)").replace(/currentColor/g, "#EEF2FB").replace(/<svg /, '<svg x="130" y="110" width="940" height="270" ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
  <linearGradient id="og-brand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8FE3FF"/><stop offset=".55" stop-color="#66B1FF"/><stop offset="1" stop-color="#8B95FF"/></linearGradient>
  <radialGradient id="og-orb-a" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#66B1FF" stop-opacity=".34"/><stop offset="1" stop-color="#66B1FF" stop-opacity="0"/></radialGradient>
  <radialGradient id="og-orb-b" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#6674FF" stop-opacity=".30"/><stop offset="1" stop-color="#6674FF" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="630" fill="#04070F"/>
<ellipse cx="1010" cy="90" rx="520" ry="400" fill="url(#og-orb-a)"/>
<ellipse cx="120" cy="600" rx="440" ry="340" fill="url(#og-orb-b)"/>
${artwork}
<rect x="150" y="432" width="48" height="4" rx="2" fill="url(#og-brand)"/>
<text x="150" y="492" font-family="system-ui, 'Segoe UI', Roboto, sans-serif" font-size="40" fill="#EEF2FB">The interface starts here.</text>
<text x="150" y="548" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="24" fill="#8FC6FF" letter-spacing="3">RELEASE CANDIDATE 1.0${isOfficial ? "" : " · TEMPORARY WORDMARK"}</text>
<circle cx="1120" cy="548" r="9" fill="#FF665C"/>
</svg>`;
writeFileSync(join(pub, "og.svg"), svg);

// Favicon: isotype on a navy rounded plate so the cobalt frame stays visible on light tab strips.
const inner = mark.replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const vb = (mark.match(/viewBox="([^"]+)"/) || [null, "0 0 88 88"])[1].split(/\s+/).map(Number);
const [vx, vy, vw, vh] = vb;
const side = Math.max(vw, vh) * 1.3;
const ox = vx - (side - vw) / 2, oy = vy - (side - vh) / 2;
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ox} ${oy} ${side} ${side}"><rect x="${ox}" y="${oy}" width="${side}" height="${side}" rx="${side * 0.18}" fill="#04070F"/>${inner}</svg>`;
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
