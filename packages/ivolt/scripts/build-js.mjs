// ESM copy (unbundled, per module), bundled IIFE (global IVOLT) and sourcemaps with esbuild.
import { build } from "esbuild";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const src = resolve(root, "src/js");
const out = resolve(root, "dist/js");
mkdirSync(out, { recursive: true });
const target = ["chrome111", "edge111", "firefox113", "safari16.4"];

const entries = globSync("**/*.js", { cwd: src }).filter((f) => f !== "iife.js").map((f) => join(src, f));

// 1) ESM, one output per module, not bundled: keeps tree-shaking and per-component imports.
await build({ entryPoints: entries, outdir: out, outbase: src, format: "esm", target, bundle: false, minify: false, sourcemap: false, define: { __IVOLT_VERSION__: JSON.stringify(pkg.version) } });

// 2) IIFE bundle with global IVOLT, minified, sourcemap.
await build({ entryPoints: [join(src, "iife.js")], outfile: join(out, "ivolt.iife.min.js"), format: "iife", globalName: "IVOLT", target, bundle: true, minify: true, sourcemap: true, define: { __IVOLT_VERSION__: JSON.stringify(pkg.version) } });

// 3) auto.min.js (1.1): the auto-starting entry in one minified file, for a single
// `<script type="module">` from a CDN; it also starts `Copy`, which the grouped
// entry leaves out (ADR-053). Not counted in the default bundle budget.
// The start is written here, not re-exported from auto.js: package.json declares src/ free of side
// effects, so the bundler kept auto.js's exports and dropped its init(document). 1.1.0 shipped that
// way — a CDN page where only Copy woke up (tests/browser/auto-min.spec.js).
const autoEntry = [
  'export * from "./index.js";',
  'import { init } from "./index.js";',
  'import { Copy } from "./components/copy.js";',
  "export { Copy };",
  'if (typeof document !== "undefined") {',
  "  const go = () => { init(document); Copy.initAll(document); };",
  '  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go, { once: true });',
  "  else go();",
  "}",
].join("\n");
await build({
  stdin: { contents: autoEntry, resolveDir: src, sourcefile: "auto.min.entry.js", loader: "js" },
  outfile: join(out, "auto.min.js"), format: "esm", target, bundle: true, minify: true, sourcemap: true, define: { __IVOLT_VERSION__: JSON.stringify(pkg.version) },
});

console.log(`js: ${entries.length} ESM modules + ivolt.iife.min.js + auto.min.js`);
