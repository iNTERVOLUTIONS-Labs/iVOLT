// Builds apps/docs/src/data/reference.json from the package sources: every public class per
// stylesheet, every token with its light and dark value, every data-iv-* attribute and every
// iv:* event the JavaScript emits. The reference page of the docs renders it, and a contract
// test can compare it with what the pages document. Pure functions over files; no DOM.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pkgDir = join(root, "packages/ivolt");
const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

// ---- classes per stylesheet (sources, so the module boundary is real) ----
const cssDir = join(pkgDir, "src/css");
const sheets = ["base.css", "utilities.css", "surfaces.css", "effects.css", "motion.css", "text.css", ...readdirSync(join(cssDir, "layout")).map((f) => `layout/${f}`), ...readdirSync(join(cssDir, "components")).map((f) => `components/${f}`)].filter((f) => f.endsWith(".css"));
const classes = {};
const locals = {};
const attributes = new Set();
for (const rel of sheets) {
  const css = strip(readFileSync(join(cssDir, rel), "utf8"));
  const names = new Set(css.match(/\.iv-[a-zA-Z0-9_-]+/g) || []);
  classes[rel.replace(".css", "")] = [...names].map((c) => c.slice(1)).sort();
  // Locals: custom properties declared inside the sheet (not tokens).
  const declared = new Set((css.match(/(?<![\w-])--iv-[a-zA-Z0-9-]+(?=\s*:)/g) || []));
  locals[rel.replace(".css", "")] = [...declared].sort();
  for (const a of css.match(/data-iv-[a-zA-Z0-9-]+/g) || []) attributes.add(a);
}

// ---- tokens with light and dark values from the built sheet ----
const tokensCss = readFileSync(join(pkgDir, "dist/css/tokens.css"), "utf8");
const tokens = {};
const blocks = [...tokensCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
for (const [, selector, body] of blocks) {
  const theme = /data-iv-theme="dark"\]/.test(selector) && !/prefers-color-scheme/.test(selector) ? "dark" : /^\s*:root|\[data-iv-theme="light"\]/.test(selector) && !/dark/.test(selector) ? "light" : null;
  if (!theme) continue;
  for (const [, name, value] of body.matchAll(/(--iv-[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
    tokens[name] = tokens[name] || {};
    if (!(theme in tokens[name])) tokens[name][theme] = value.trim();
  }
}
const tokenList = Object.keys(tokens).sort().map((name) => ({ name, light: tokens[name].light ?? null, dark: tokens[name].dark ?? tokens[name].light ?? null }));

// ---- JavaScript: components, options, events, attributes ----
const jsDir = join(pkgDir, "src/js/components");
const components = [];
for (const f of readdirSync(jsDir).filter((f) => f.endsWith(".js")).sort()) {
  const src = readFileSync(join(jsDir, f), "utf8");
  const name = (src.match(/static componentName = "([a-z-]+)"/) || [])[1] || f.replace(".js", "");
  const cls = (src.match(/export class (\w+) extends/) || [])[1] || name;
  // Two shapes in the sources: `Object.freeze({ … })` and, when the block carries a type
  // annotation, `Object.freeze(/** @type {X} */ ({ … }))`. Take the whole call and keep what
  // lies between the first "{" and the last "}" so both parse.
  const freezeCall = (src.match(/static defaults = Object\.freeze\(([\s\S]*?)\n  \);?\n/) || src.match(/static defaults = Object\.freeze\(([\s\S]*?)\);/) || [])[1] || "";
  const defaultsBlock = freezeCall.slice(freezeCall.indexOf("{") + 1, freezeCall.lastIndexOf("}"));
  const options = [...defaultsBlock.matchAll(/^\s*([a-zA-Z]+):\s*([^,\n]+)/gm)].map(([, key, value]) => ({ key, default: value.trim().replace(/,$/, "") }));
  const events = [...new Set([...src.matchAll(/emit\(\s*[^,]+,\s*"([a-z-]+)"/g)].map((m) => `iv:${m[1]}`))].sort();
  for (const a of src.match(/data-iv-[a-zA-Z0-9-]+/g) || []) attributes.add(a);
  components.push({ name, class: cls, module: `@intervolutions/ivolt/${name}`, options, events });
}
// Option attributes: every option is also a data-iv-<kebab> attribute.
for (const c of components) for (const o of c.options) attributes.add(`data-iv-${o.key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)}`);

const out = { version: pkg.version, sheets: classes, locals, tokens: tokenList, components, attributes: [...attributes].sort() };
const dest = join(root, "apps/docs/src/data");
if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
writeFileSync(join(dest, "reference.json"), JSON.stringify(out, null, 2) + "\n");
const total = Object.values(classes).reduce((n, l) => n + l.length, 0);
console.log(`reference: ${total} classes in ${sheets.length} sheets, ${tokenList.length} tokens, ${components.length} components, ${out.attributes.length} attributes`);
