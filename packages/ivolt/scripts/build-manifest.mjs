// Builds the machine-readable surface of the package (1.1, API_CONTRACT §9.5):
//   dist/ivolt.manifest.json   — classes and locals per sheet, JS components with options
//                                and events, data-iv-* attributes with known values, tokens
//   dist/vscode.html-data.json — VS Code `html.customData` generated from the manifest
//   dist/types/events.d.ts     — typed `iv:*` event map, merged into HTMLElementEventMap
//   dist/types/global.d.ts     — `window.IVOLT` for the IIFE
// Pure reads of src/ and dist/tokens; run after build-tokens, build-css and build-types.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

// ---- CSS: classes and locals per sheet, attribute values seen in selectors ----
const cssDir = join(root, "src/css");
const sheets = ["base.css", "surfaces.css", "effects.css", "motion.css", "text.css", "utilities.css", ...readdirSync(join(cssDir, "layout")).map((f) => `layout/${f}`), ...readdirSync(join(cssDir, "components")).map((f) => `components/${f}`)].filter((f) => f.endsWith(".css"));
/** @type {Map<string, Set<string>>} */
const attributes = new Map();
const addAttr = (name, value) => {
  if (!attributes.has(name)) attributes.set(name, new Set());
  if (value !== undefined && value !== "") attributes.get(name).add(value);
};
const css = sheets.map((rel) => {
  const text = strip(readFileSync(join(cssDir, rel), "utf8"));
  for (const [, name, value] of text.matchAll(/\[(data-iv-[a-z0-9-]+)(?:[~|^$*]?="([^"]*)")?\]/g)) addAttr(name, value);
  const classes = [...new Set((text.match(/\.iv-[a-zA-Z0-9_-]+/g) || []).map((c) => c.slice(1)))].sort();
  const locals = [...new Set(text.match(/(?<![\w-])--iv-[a-zA-Z0-9-]+(?=\s*:)/g) || [])].sort();
  return { sheet: rel, name: rel.replace(/^.*\//, "").replace(".css", ""), classes, locals };
});
// Themes and palettes are written by the token generator, not by a sheet.
for (const v of ["light", "dark", "system"]) addAttr("data-iv-theme", v);
for (const v of ["accent", "success", "warning", "danger", "info", "neutral"]) addAttr("data-iv-palette", v);

// ---- JavaScript components ----
const jsDir = join(root, "src/js/components");
const indexSrc = readFileSync(join(root, "src/js/index.js"), "utf8");
const events = new Set(["iv:themechange", "iv:init", "iv:destroy"]);
const components = readdirSync(jsDir).filter((f) => f.endsWith(".js")).sort().map((f) => {
  const src = readFileSync(join(jsDir, f), "utf8");
  const name = (src.match(/static componentName = "([a-z-]+)"/) || [])[1] || f.replace(".js", "");
  const cls = (src.match(/export class (\w+) extends/) || [])[1] || name;
  const freeze = (src.match(/static defaults = Object\.freeze\(([\s\S]*?)\n  \);?\n/) || src.match(/static defaults = Object\.freeze\(([\s\S]*?)\);/) || [])[1] || "";
  const block = freeze.slice(freeze.indexOf("{") + 1, freeze.lastIndexOf("}"));
  const options = [...block.matchAll(/^\s*([a-zA-Z]+):\s*([^,\n]+)/gm)].map(([, key, value]) => ({ name: key, attribute: `data-iv-${kebab(key)}`, default: value.trim().replace(/,$/, "") }));
  const own = [...new Set([...src.matchAll(/emit\(\s*[^,]+,\s*"([a-z-]+)"/g)].map((m) => `iv:${m[1]}`))].sort();
  own.forEach((e) => events.add(e));
  for (const o of options) addAttr(o.attribute);
  for (const a of src.match(/data-iv-[a-z0-9-]+/g) || []) addAttr(a);
  addAttr("data-iv-component", name);
  return { name, class: cls, module: `@intervolutions/ivolt/${name}`, defaultBundle: indexSrc.includes(`./components/${f}`), options, events: own };
});

// ---- Tokens ----
const tokenJson = JSON.parse(readFileSync(join(root, "dist/tokens/tokens.json"), "utf8"));
const tokens = Object.entries(tokenJson).map(([name, t]) => ({ name, type: t.type, ...(typeof t.value === "object" ? { light: t.value.light, dark: t.value.dark } : { value: t.value }), ...(t.css ? { css: t.css } : {}) }));

const manifest = {
  name: pkg.name,
  version: pkg.version,
  homepage: pkg.homepage,
  classes: css,
  components,
  attributes: [...attributes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, values]) => ({ name, values: [...values].sort() })),
  events: [...events].sort(),
  tokens,
};
writeFileSync(join(root, "dist/ivolt.manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

// ---- VS Code custom data ----
const docs = `${pkg.homepage}/reference`;
const describe = (name) => {
  const c = components.find((x) => x.options.some((o) => o.attribute === name));
  if (name === "data-iv-component") return "iVOLT component this element hosts.";
  if (name === "data-iv-theme") return "iVOLT theme of this scope: light, dark or system.";
  if (name === "data-iv-palette") return "iVOLT palette: points the primary of this subtree at another role (1.1).";
  if (c) {
    const o = c.options.find((x) => x.attribute === name);
    return `iVOLT ${c.class} option \`${o.name}\` (default ${o.default}).`;
  }
  return "iVOLT attribute.";
};
const htmlData = {
  version: 1.1,
  globalAttributes: manifest.attributes.map((a) => ({
    name: a.name,
    description: describe(a.name),
    ...(a.values.length ? { values: a.values.map((v) => ({ name: v })) } : {}),
    references: [{ name: "iVOLT reference", url: docs }],
  })),
};
writeFileSync(join(root, "dist/vscode.html-data.json"), JSON.stringify(htmlData, null, 2) + "\n");

// ---- Types ----
mkdirSync(join(root, "dist/types"), { recursive: true });
const eventLines = manifest.events.map((e) => `  ${JSON.stringify(e)}: CustomEvent<IvEventDetail>;`);
writeFileSync(
  join(root, "dist/types/events.d.ts"),
  [
    "// GENERATED by scripts/build-manifest.mjs. Every iVOLT event is a bubbling CustomEvent.",
    "/** Common shape of the `detail` of an iVOLT event; components add their own fields (API_CONTRACT §5.3). */",
    "export interface IvEventDetail {",
    "  instance?: unknown;",
    "  [key: string]: unknown;",
    "}",
    "/** Every `iv:*` event the package dispatches. */",
    "export interface IvEventMap {",
    ...eventLines,
    "}",
    "declare global {",
    "  interface HTMLElementEventMap extends IvEventMap {}",
    "  interface DocumentEventMap extends IvEventMap {}",
    "}",
    "",
  ].join("\n"),
);
writeFileSync(
  join(root, "dist/types/global.d.ts"),
  [
    "// GENERATED by scripts/build-manifest.mjs. The IIFE build exposes the grouped entry as `window.IVOLT`.",
    'import type * as IVOLTModule from "./index.js";',
    "declare global {",
    "  interface Window {",
    "    IVOLT: typeof IVOLTModule;",
    "  }",
    "  const IVOLT: typeof IVOLTModule;",
    "}",
    "export {};",
    "",
  ].join("\n"),
);
// The entry declarations pull the generated ones in, so `import "@intervolutions/ivolt"`
// types `addEventListener("iv:open", …)` and the IIFE types `window.IVOLT`.
const reference = (file, target) => {
  const path = join(root, "dist/types", file);
  const text = readFileSync(path, "utf8");
  const line = `/// <reference path="./${target}" />`;
  if (!text.includes(line)) writeFileSync(path, `${line}\n${text}`);
};
reference("index.d.ts", "events.d.ts");
reference("iife.d.ts", "global.d.ts");
console.log(`manifest: ${css.reduce((n, s) => n + s.classes.length, 0)} classes, ${components.length} JS components, ${manifest.attributes.length} attributes, ${manifest.events.length} events, ${tokens.length} tokens`);
