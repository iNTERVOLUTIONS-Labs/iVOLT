// Draws the site's share cards and icons from the brand artwork in assets/brand/: the home cards
// (en, es), one card per documentation page, the favicons, the touch icon and the web manifest.
//
// PNGs are rendered with resvg (a Rust SVG renderer shipped as a prebuilt Node binary), not with a
// browser. The previous version screenshotted the SVG in Playwright's Chromium; the server has no
// Chromium, so it printed a warning, exited 0, and every page on the live site advertised an
// og:image that answered 404. A share card that silently does not exist is worse than a failed
// build, so this script now fails the build when it cannot produce the PNGs.
//
// Text is set in Outfit from the TTFs in apps/docs/og-fonts (the site's own face; resvg cannot
// read the woff2 the site serves). System fonts are never loaded: the card must look the same on
// a laptop, in CI and on a server with no fonts at all.
import { existsSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pub = join(root, "apps/docs/public");
const fontDir = join(root, "apps/docs/og-fonts");
mkdirSync(pub, { recursive: true });
process.chdir(root);

function fail(message) {
  console.error(`og: ${message}`);
  console.error("og: the share cards are part of the site; fix the cause instead of shipping a page whose og:image is a 404.");
  process.exit(1);
}

let Resvg;
try { ({ Resvg } = await import("@resvg/resvg-js")); }
catch (err) { fail(`@resvg/resvg-js is not installed (${err.message}). Run npm ci at the repository root.`); }
const fontFiles = existsSync(fontDir) ? readdirSync(fontDir).filter((f) => f.endsWith(".ttf")).map((f) => join(fontDir, f)) : [];
if (!fontFiles.length) fail(`no Outfit TTF in ${fontDir}`);

const { lockup, mark, isOfficial } = await import(pathToFileURL(join(root, "apps/docs/src/brand.js")).href);
const { ogPages, ogFile } = await import(pathToFileURL(join(root, "apps/docs/src/lib/og-pages.js")).href);
const { version } = await import(pathToFileURL(join(root, "apps/docs/src/lib/version.js")).href);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const INK = "#04070F", IVORY = "#EEF2FB", SKY = "#8FC6FF", MUTED = "#A3AECB", CORAL = "#FF665C";
const FONT = "Outfit";

function render(svg, width) {
  const r = new Resvg(svg, { fitTo: { mode: "width", value: width }, font: { fontFiles, loadSystemFonts: false, defaultFontFamily: FONT }, background: "rgba(0,0,0,0)" });
  const png = r.render().asPng();
  if (!png || png.length < 100) throw new Error("empty render");
  return png;
}
function write(rel, data) {
  const file = join(pub, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
}

const defs = `<defs>
  <linearGradient id="og-brand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8FE3FF"/><stop offset=".55" stop-color="#66B1FF"/><stop offset="1" stop-color="#8B95FF"/></linearGradient>
  <radialGradient id="og-orb-a" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#66B1FF" stop-opacity=".34"/><stop offset="1" stop-color="#66B1FF" stop-opacity="0"/></radialGradient>
  <radialGradient id="og-orb-b" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#6674FF" stop-opacity=".30"/><stop offset="1" stop-color="#6674FF" stop-opacity="0"/></radialGradient>
</defs>`;
const field = `<rect width="1200" height="630" fill="${INK}"/>
<ellipse cx="1010" cy="90" rx="520" ry="400" fill="url(#og-orb-a)"/>
<ellipse cx="120" cy="600" rx="440" ry="340" fill="url(#og-orb-b)"/>`;
const brandFill = (svg) => svg.replace(/#66B1FF/gi, "url(#og-brand)").replace(/var\(--iv-color-accent[^)]*\)/g, "url(#og-brand)").replace(/currentColor/g, IVORY);
const placed = (svg, x, y, w, h) => brandFill(svg).replace(/<svg /, `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
const kicker = `v${version.replace(/-.*$/, "")} · MIT`;

// Home cards: the full lockup, the headline of the hero, the measured facts that never change.
const home = {
  en: { file: "og/index.png", line: "The CSS framework with no build step.", sub: "Accessible components · design tokens · dark mode · zero runtime dependencies" },
  es: { file: "og/es.png", line: "El framework CSS sin paso de build.", sub: "Componentes accesibles · tokens de diseño · modo oscuro · cero dependencias" },
};
function homeCard({ line, sub }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">${defs}${field}
${placed(lockup, 130, 92, 940, 270)}
<rect x="150" y="410" width="48" height="4" rx="2" fill="url(#og-brand)"/>
<text x="150" y="476" font-family="${FONT}" font-weight="600" font-size="50" fill="${IVORY}">${esc(line)}</text>
<text x="150" y="530" font-family="${FONT}" font-weight="400" font-size="25" fill="${SKY}">${esc(sub)}</text>
<text x="150" y="584" font-family="${FONT}" font-weight="500" font-size="22" letter-spacing="2" fill="${MUTED}">IVOLT.INTERVOLUTIONS.COM · ${esc(kicker.toUpperCase())}</text>
<circle cx="1072" cy="577" r="9" fill="${CORAL}"/>
</svg>`;
}

// Page cards: a small lockup, the section, the page name set large, one line of context, and the
// isotype as the art on the right — the same bolt the home hero carries, never a pattern (ADR-028).
function wrap(text, max) {
  const lines = [""];
  for (const w of text.split(" ")) {
    const cur = lines[lines.length - 1];
    if (cur && (cur + " " + w).length > max) lines.push(w); else lines[lines.length - 1] = cur ? `${cur} ${w}` : w;
  }
  return lines;
}
function pageCard({ eyebrow, title, tagline }) {
  // The title is the subject of the card: as large as its length allows inside the left 700 px.
  const size = Math.max(60, Math.min(116, Math.floor(1300 / Math.max(6, title.length))));
  const top = 250, base = top + 26 + size;
  const sub = wrap(tagline, 46).map((l, i) => `<tspan x="80" dy="${i ? 38 : 0}">${esc(l)}</tspan>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">${defs}${field}
<ellipse cx="1040" cy="330" rx="300" ry="260" fill="url(#og-orb-a)"/>
<g opacity=".9">${placed(mark, 820, 110, 440, 440)}</g>
${placed(lockup, 64, 52, 280, 80)}
<text x="80" y="${top}" font-family="${FONT}" font-weight="500" font-size="24" letter-spacing="3" fill="${SKY}">${esc(eyebrow.toUpperCase())}</text>
<text x="74" y="${base}" font-family="${FONT}" font-weight="700" font-size="${size}" fill="${IVORY}">${esc(title)}</text>
<text x="80" y="${base + 58}" font-family="${FONT}" font-weight="400" font-size="28" fill="${MUTED}">${sub}</text>
<rect x="80" y="548" width="48" height="4" rx="2" fill="url(#og-brand)"/>
<text x="148" y="558" font-family="${FONT}" font-weight="500" font-size="22" letter-spacing="2" fill="${MUTED}">IVOLT.INTERVOLUTIONS.COM · ${esc(kicker.toUpperCase())}</text>
</svg>`;
}

// Favicon: the isotype on a navy rounded plate so the cobalt frame stays visible on light tab strips.
const inner = mark.replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const [vx, vy, vw, vh] = ((mark.match(/viewBox="([^"]+)"/) || [null, "0 0 88 88"])[1]).split(/\s+/).map(Number);
function plate(scale, radius) {
  const side = Math.max(vw, vh) * scale;
  const ox = vx - (side - vw) / 2, oy = vy - (side - vh) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ox} ${oy} ${side} ${side}"><rect x="${ox}" y="${oy}" width="${side}" height="${side}" rx="${side * radius}" fill="${INK}"/>${inner}</svg>`;
}
const favicon = plate(1.3, 0.18);
// ICO with PNG payloads (supported by every browser that still asks for /favicon.ico).
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e); header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(png.length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.png)]);
}

// Page cards go out as JPEG through sharp (Astro's own image dependency, always installed with the
// site): the orbs are smooth gradients, and as PNG each card weighed ~180 KB — 19 MB for the set.
let sharp;
try { sharp = (await import("sharp")).default; }
catch (err) { fail(`sharp is not installed (${err.message}); it ships with Astro, run npm ci at the repository root.`); }
const jpeg = (png) => sharp(png).jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: "4:4:4" }).toBuffer();

let cards = 0;
try {
  writeFileSync(join(pub, "og.svg"), homeCard(home.en));
  writeFileSync(join(pub, "favicon.svg"), favicon);
  for (const h of Object.values(home)) { write(h.file, render(homeCard(h), 1200)); cards++; }
  // og.png stays for links shared before 1.1, but nothing points at it any more: the CDN cached
  // its old 404 for weeks, and a new URL is the only fix that needs no purge.
  write("og.png", render(homeCard(home.en), 1200));
  for (const p of ogPages()) { write(ogFile(p.path), await jpeg(render(pageCard(p), 1200))); cards++; }
  write("favicon.ico", ico([16, 32, 48].map((size) => ({ size, png: render(favicon, size) }))));
  // Touch and install icons are full-bleed squares: the platform rounds the corners itself, and
  // the maskable one keeps the mark inside the central safe zone (80 %).
  write("apple-touch-icon.png", render(plate(1.5, 0), 180));
  write("icon-192.png", render(plate(1.5, 0), 192));
  write("icon-512.png", render(plate(1.5, 0), 512));
  write("icon-maskable-512.png", render(plate(2, 0), 512));
} catch (err) {
  fail(`rendering failed: ${err.stack || err.message}`);
}
write("manifest.webmanifest", JSON.stringify({
  name: "iVOLT — the CSS framework with no build step",
  short_name: "iVOLT",
  description: "Accessible CSS framework and design system: components, design tokens, light and dark themes, optional JavaScript.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: INK,
  theme_color: INK,
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}, null, 2) + "\n");
console.log(`og: ${cards} share cards, favicon.svg/.ico, touch and manifest icons written with resvg (${isOfficial ? "official" : "temporary"} artwork)`);
