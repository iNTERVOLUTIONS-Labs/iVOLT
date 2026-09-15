// One reader for every fixture the site shows. The stage route, the Stage component and the
// starters all take the same file, so a snippet, a preview and a browser test can never drift.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";

/** Walks up from the working directory until the repository root is found (Astro moves import.meta.url). */
export function repoRoot() {
  let dir = process.cwd();
  while (!existsSync(resolve(dir, "packages/ivolt/fixtures")) && dirname(dir) !== dir) dir = dirname(dir);
  return dir;
}

const ROOTS = ["packages/ivolt/fixtures", "apps/docs/fixtures"];

/** Every fixture on disk as { name: "family/file", source: "package" | "docs", file }. */
export function listFixtures() {
  const root = repoRoot();
  const out = new Map(); // a documentation fixture never shadows a packaged one
  for (const rel of ROOTS) {
    const base = resolve(root, rel);
    if (!existsSync(base)) continue;
    for (const family of readdirSync(base)) {
      const dir = join(base, family);
      if (!statSync(dir).isDirectory()) continue;
      for (const entry of readdirSync(dir)) {
        if (!entry.endsWith(".html")) continue;
        const name = `${family}/${entry.slice(0, -5)}`;
        if (!out.has(name)) out.set(name, { name, family, file: join(dir, entry), source: rel.startsWith("packages") ? "package" : "docs" });
      }
    }
  }
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** The markup of one fixture, trimmed, exactly as it ships. */
export function readFixture(name) {
  const root = repoRoot();
  const packaged = resolve(root, "packages/ivolt/fixtures", `${name}.html`);
  const file = existsSync(packaged) ? packaged : resolve(root, "apps/docs/fixtures", `${name}.html`);
  return readFileSync(file, "utf8").trim();
}

/**
 * The contract the file itself declares. Nothing is invented: a local is listed only when the
 * markup writes it, and an option only when a data-iv-* attribute carries it.
 */
export function readContract(html) {
  const locals = new Map();
  for (const [, prop, value] of html.matchAll(/(--iv-[a-z0-9-]+)\s*:\s*([^;"'}]+)/g)) {
    const v = value.trim();
    if (!locals.has(prop)) locals.set(prop, v);
  }
  const options = new Map();
  for (const [, attr, value] of html.matchAll(/\s(data-iv-[a-z0-9-]+)(?:="([^"]*)")?/g)) {
    if (attr === "data-iv-component") continue;
    if (!options.has(attr)) options.set(attr, value ?? "");
  }
  const components = [...new Set([...html.matchAll(/data-iv-component="([^"]+)"/g)].map((m) => m[1]))];
  return {
    locals: [...locals].map(([prop, value]) => ({ prop, value })),
    options: [...options].map(([attr, value]) => ({ attr, value })),
    components,
  };
}

/** The CSS a reader would paste to retune the fixture, or null when the file declares none. */
export function localsSnippet(contract, selector = ".iv-root") {
  if (!contract.locals.length) return null;
  return `${selector} {\n${contract.locals.map((l) => `  ${l.prop}: ${l.value};`).join("\n")}\n}`;
}

/** The JS options the same fixture sets through attributes, as the object init() would receive. */
export function optionsSnippet(contract) {
  if (!contract.options.length || !contract.components.length) return null;
  const camel = (a) => a.replace(/^data-iv-/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const lit = (v) => (v === "" ? "true" : /^(true|false|-?\d+(\.\d+)?)$/.test(v) ? v : JSON.stringify(v));
  const lines = contract.options.map((o) => `  ${camel(o.attr)}: ${lit(o.value)},`);
  return `${contract.components.map((c) => `// data-iv-component="${c}"`).join("\n")}\n{\n${lines.join("\n")}\n}`;
}
