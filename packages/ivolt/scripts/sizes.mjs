// Reports minified + gzip (level 9) sizes against the budgets in docs/QUALITY.md.
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { execSync } from "node:child_process";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const KiB = 1024;
const commit = (() => { try { return execSync("git rev-parse --short HEAD", { cwd: root }).toString().trim(); } catch { return "n/a"; } })();

const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const rows = [];
function report(label, file, budget) {
  if (!existsSync(file)) { rows.push({ label, file, error: "missing" }); return; }
  const buf = readFileSync(file);
  rows.push({ label, file: file.replace(root + "/", ""), raw: buf.length, gzip: gz(buf), budget, ok: gz(buf) <= budget * KiB });
}
report("core.min.css", join(root, "dist/css/core.min.css"), 8);
report("ivolt.min.css", join(root, "dist/css/ivolt.min.css"), 40);
report("ivolt.flat.min.css", join(root, "dist/css/ivolt.flat.min.css"), 40);
// Full JS: temporary bundle of index.js, minified, only for measurement.
const js = await build({ entryPoints: [join(root, "src/js/index.js")], bundle: true, minify: true, format: "esm", write: false, define: { __IVOLT_VERSION__: JSON.stringify(pkg.version) } });
const jsBuf = Buffer.from(js.outputFiles[0].contents);
rows.push({ label: "index.js (bundled, minified, measurement only)", file: "src/js/index.js", raw: jsBuf.length, gzip: gz(jsBuf), budget: 48, ok: gz(jsBuf) <= 48 * KiB });
report("ivolt.iife.min.js", join(root, "dist/js/ivolt.iife.min.js"), 48);

const lines = [`# Sizes — @intervolutions/ivolt ${pkg.version} @ ${commit} (${new Date().toISOString().slice(0, 10)})`, "", "Method: minified output, gzip level 9 via node:zlib. Each artifact measured separately.", "", "| Artifact | raw | gzip | budget | ok |", "|---|---|---|---|---|"];
let fail = false;
for (const r of rows) {
  if (r.error) { lines.push(`| ${r.label} | — | — | — | ${r.error} |`); fail = true; continue; }
  lines.push(`| ${r.label} | ${(r.raw / KiB).toFixed(2)} KiB | ${(r.gzip / KiB).toFixed(2)} KiB | ${r.budget} KiB | ${r.ok ? "yes" : "NO"} |`);
  if (!r.ok) fail = true;
}
// Per-module cost: each component bundled on its own with the core it pulls in (what a consumer
// importing `@intervolutions/ivolt/<name>` pays), informational, no budget.
import { readdirSync } from "node:fs";
lines.push("", "Per-module JavaScript (each component bundled alone with its share of the core; no budget):", "", "| Module | gzip |", "|---|---|");
const comps = readdirSync(join(root, "src/js/components")).filter((f) => f.endsWith(".js")).sort();
for (const f of comps) {
  const one = await build({ entryPoints: [join(root, "src/js/components", f)], bundle: true, minify: true, format: "esm", write: false, define: { __IVOLT_VERSION__: JSON.stringify(pkg.version) } });
  lines.push(`| ${f.replace(".js", "")} | ${(gz(Buffer.from(one.outputFiles[0].contents)) / KiB).toFixed(2)} KiB |`);
}
const cssMods = readdirSync(join(root, "dist/css/components")).filter((f) => f.endsWith(".css") && !f.endsWith(".min.css")).sort();
lines.push("", "Per-module CSS (`dist/css/components/*.css` and the root sheets, minified, gzip):", "", "| Module | gzip |", "|---|---|");
for (const f of [...cssMods.map((f) => `components/${f}`), "surfaces.css", "effects.css", "motion.css", "text.css"]) {
  const file = join(root, "dist/css", f);
  if (existsSync(file)) lines.push(`| ${f.replace(".css", "")} | ${(gz(readFileSync(file)) / KiB).toFixed(2)} KiB |`);
}
const text = lines.join("\n") + "\n";
console.log(text);
writeFileSync(join(root, "dist/SIZES.md"), text);
if (fail) { console.error("sizes: over budget or missing artifact"); process.exit(1); }
