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

console.log(`js: ${entries.length} ESM modules + ivolt.iife.min.js`);
