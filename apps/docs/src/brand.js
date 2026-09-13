// Brand artwork for the docs shell, read at build time from assets/brand/.
// Official files: ivolt-logo-balanced.svg (full lockup, designed for dark surfaces) and ivolt-isotipo.svg
// (split O with the bolt). The header copy maps the ivory and muted greys to theme tokens so the lockup
// follows light/dark; the source files are never modified. A temporary wordmark remains as fallback so a
// checkout without the assets still builds.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

let dir = process.cwd();
while (!existsSync(resolve(dir, "assets/brand")) && dirname(dir) !== dir) dir = dirname(dir);
const brandDir = resolve(dir, "assets/brand");

function readSvg(...names) {
  for (const name of names) {
    const file = resolve(brandDir, name);
    if (!existsSync(file)) continue;
    const svg = readFileSync(file, "utf8").replace(/<\?xml[^>]*>/, "").replace(/<!DOCTYPE[^>]*>/, "").trim();
    if (svg.startsWith("<svg")) return svg;
  }
  return null;
}

/** Strip the file's own title/desc/aria (the link that wraps it provides the name) and comments. */
const inlineable = (svg) => svg
  .replace(/<title[^>]*>[\s\S]*?<\/title>/g, "")
  .replace(/<desc[^>]*>[\s\S]*?<\/desc>/g, "")
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<svg[^>]*>/, (tag) => tag.replace(/\s(role|aria-labelledby|width|height)="[^"]*"/g, "").replace(/<svg/, '<svg aria-hidden="true" focusable="false"'));

/** Header variant: theme-aware colours and no signature line (illegible below ~120px wide). */
const forHeader = (svg) => inlineable(svg)
  .replace(/<g fill="#90A49E">[\s\S]*?<\/g>/, "")
  .replace(/#F3FAF6/gi, "currentColor")
  .replace(/viewBox="0 0 1120 320"/, 'viewBox="20 40 1070 240"');

const TEMP_WORDMARK = `<svg viewBox="0 0 340 96" aria-hidden="true" focusable="false">
  <g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M40 36 A28 28 0 0 1 96 36"/><path d="M96 60 A28 28 0 0 1 40 60"/></g>
  <path d="M74 20 L52 52 L66 52 L60 78 L84 44 L70 44 Z" fill="var(--iv-color-accent, #29F59A)"/>
  <text x="118" y="60" font-family="system-ui, sans-serif" font-size="46" font-weight="700" letter-spacing="2" fill="currentColor">iVOLT</text>
  <text x="262" y="60" font-family="system-ui, sans-serif" font-size="22" font-weight="500" letter-spacing="3" fill="var(--iv-color-accent, #29F59A)">CSS</text>
</svg>`;
const TEMP_MARK = `<svg viewBox="0 0 88 88" aria-hidden="true" focusable="false"><rect width="88" height="88" rx="16" fill="#081310"/><g fill="none" stroke="#F3FAF6" stroke-width="7" stroke-linecap="round"><path d="M18 34 A28 28 0 0 1 70 34"/><path d="M70 54 A28 28 0 0 1 18 54"/></g><path d="M50 16 L28 48 L42 48 L36 74 L60 40 L46 40 Z" fill="#29F59A"/></svg>`;

const logo = readSvg("ivolt-logo-balanced.svg", "ivolt-logo.svg");
const isotype = readSvg("ivolt-isotipo.svg", "ivolt-mark.svg");

export const isOfficial = Boolean(logo);
/** Full lockup as shipped (dark surfaces), for the OG image. */
export const lockup = logo ? inlineable(logo) : TEMP_WORDMARK;
/** Header wordmark, theme-aware. */
export const wordmark = logo ? forHeader(logo) : TEMP_WORDMARK;
/** Isotype (split O + bolt) for favicon and compact uses. */
export const mark = isotype ? inlineable(isotype) : TEMP_MARK;
