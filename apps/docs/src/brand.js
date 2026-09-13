// Brand artwork for the docs shell. Reads the official SVGs from assets/brand/ when present and
// falls back to a clearly temporary wordmark otherwise. Inline SVG keeps currentColor theming.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

let dir = process.cwd();
while (!existsSync(resolve(dir, "assets/brand")) && dirname(dir) !== dir) dir = dirname(dir);
const brandDir = resolve(dir, "assets/brand");

function readSvg(name) {
  const file = resolve(brandDir, name);
  if (!existsSync(file)) return null;
  const svg = readFileSync(file, "utf8").replace(/<\?xml[^>]*>/, "").replace(/<!DOCTYPE[^>]*>/, "").trim();
  return svg.startsWith("<svg") ? svg : null;
}

// Temporary wordmark: split "O" with a bolt inside, geometric letters. Replace by dropping the official file.
const TEMP_WORDMARK = `<svg viewBox="0 0 340 96" aria-hidden="true">
  <g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round">
    <path d="M40 36 A28 28 0 0 1 96 36"/>
    <path d="M96 60 A28 28 0 0 1 40 60"/>
  </g>
  <path d="M74 20 L52 52 L66 52 L60 78 L84 44 L70 44 Z" fill="var(--iv-color-accent, #29F59A)"/>
  <text x="118" y="60" font-family="system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="46" font-weight="700" letter-spacing="2" fill="currentColor">iVOLT</text>
  <text x="262" y="60" font-family="system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="22" font-weight="500" letter-spacing="3" fill="var(--iv-color-accent, #29F59A)">CSS</text>
</svg>`;

const TEMP_MARK = `<svg viewBox="0 0 88 88" aria-hidden="true">
  <rect width="88" height="88" rx="16" fill="#081310"/>
  <g fill="none" stroke="#F3FAF6" stroke-width="7" stroke-linecap="round">
    <path d="M18 34 A28 28 0 0 1 70 34"/>
    <path d="M70 54 A28 28 0 0 1 18 54"/>
  </g>
  <path d="M50 16 L28 48 L42 48 L36 74 L60 40 L46 40 Z" fill="#29F59A"/>
</svg>`;

const official = readSvg("ivolt-logo.svg");
const officialMark = readSvg("ivolt-mark.svg");

export const wordmark = official || TEMP_WORDMARK;
export const mark = officialMark || (official ? official : TEMP_MARK);
export const isOfficial = Boolean(official);
