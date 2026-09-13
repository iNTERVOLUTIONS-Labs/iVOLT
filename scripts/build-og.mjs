// Renders apps/docs/public/og.svg to og.png (1200×630) with the local Chromium, for Open Graph cards.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pub = join(root, "apps/docs/public");
mkdirSync(pub, { recursive: true });
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#081310"/>
<path d="M150 150 L246 204 L246 312 L150 366 L54 312 L54 252" fill="none" stroke="#29F59A" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M168 180 L108 270 L150 270 L132 342 L198 246 L156 246 Z" fill="#29F59A"/>
<text x="300" y="300" font-family="system-ui, 'Segoe UI', Roboto, sans-serif" font-size="128" font-weight="700" letter-spacing="4" fill="#F3FAF6">iVOLT</text>
<text x="742" y="300" font-family="system-ui, 'Segoe UI', Roboto, sans-serif" font-size="60" font-weight="500" letter-spacing="8" fill="#29F59A">CSS</text>
<text x="300" y="380" font-family="system-ui, 'Segoe UI', Roboto, sans-serif" font-size="40" fill="#90A49E">The interface starts here.</text>
<text x="300" y="470" font-family="system-ui, 'Segoe UI', Roboto, sans-serif" font-size="28" fill="#90A49E" letter-spacing="3">BY iNTERVOLUTIONS · v0.1 ALPHA</text>
</svg>`;
writeFileSync(join(pub, "og.svg"), svg);
try {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(pathToFileURL(join(pub, "og.svg")).href);
  await page.screenshot({ path: join(pub, "og.png"), type: "png" });
  await browser.close();
  console.log("og: og.svg and og.png written");
} catch (err) {
  console.warn("og: PNG not rendered (" + err.message + "); og.svg written");
  if (!existsSync(join(pub, "og.png"))) process.exitCode = 0;
}
