// Renders the Open Graph image (1200×630) and the favicon from the brand artwork: the official
// assets/brand SVGs when present, the temporary wordmark otherwise. PNG via the local Chromium.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pub = join(root, "apps/docs/public");
mkdirSync(pub, { recursive: true });
process.chdir(root);
const { wordmark, mark, isOfficial } = await import(pathToFileURL(join(root, "apps/docs/src/brand.js")).href);

const artwork = wordmark.replace(/var\(--iv-color-accent[^)]*\)/g, "#29F59A").replace(/currentColor/g, "#F3FAF6").replace(/<svg /, '<svg x="150" y="120" width="900" height="240" ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#081310"/>
${artwork}
<text x="150" y="450" font-family="system-ui, 'Segoe UI', Roboto, sans-serif" font-size="40" fill="#90A49E">The interface starts here.</text>
<text x="150" y="520" font-family="system-ui, 'Segoe UI', Roboto, sans-serif" font-size="28" fill="#90A49E" letter-spacing="3">BY iNTERVOLUTIONS · v0.1 ALPHA${isOfficial ? "" : " · TEMPORARY WORDMARK"}</text>
</svg>`;
writeFileSync(join(pub, "og.svg"), svg);
writeFileSync(join(pub, "favicon.svg"), mark.replace(/<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/ aria-hidden="true"/, ""));
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
