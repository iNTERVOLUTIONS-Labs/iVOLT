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
report("ivolt.min.css", join(root, "dist/css/ivolt.min.css"), 30);
report("ivolt.flat.min.css", join(root, "dist/css/ivolt.flat.min.css"), 30);
// Full JS: temporary bundle of index.js, minified, only for measurement.
const js = await build({ entryPoints: [join(root, "src/js/index.js")], bundle: true, minify: true, format: "esm", write: false, define: { __IVOLT_VERSION__: JSON.stringify(pkg.version) } });
const jsBuf = Buffer.from(js.outputFiles[0].contents);
rows.push({ label: "index.js (bundled, minified, measurement only)", file: "src/js/index.js", raw: jsBuf.length, gzip: gz(jsBuf), budget: 18, ok: gz(jsBuf) <= 18 * KiB });
report("ivolt.iife.min.js", join(root, "dist/js/ivolt.iife.min.js"), 18);

const lines = [`# Sizes — @intervolutions/ivolt ${pkg.version} @ ${commit} (${new Date().toISOString().slice(0, 10)})`, "", "Method: minified output, gzip level 9 via node:zlib. Each artifact measured separately.", "", "| Artifact | raw | gzip | budget | ok |", "|---|---|---|---|---|"];
let fail = false;
for (const r of rows) {
  if (r.error) { lines.push(`| ${r.label} | — | — | — | ${r.error} |`); fail = true; continue; }
  lines.push(`| ${r.label} | ${(r.raw / KiB).toFixed(2)} KiB | ${(r.gzip / KiB).toFixed(2)} KiB | ${r.budget} KiB | ${r.ok ? "yes" : "NO"} |`);
  if (!r.ok) fail = true;
}
const text = lines.join("\n") + "\n";
console.log(text);
writeFileSync(join(root, "dist/SIZES.md"), text);
if (fail) { console.error("sizes: over budget or missing artifact"); process.exit(1); }
