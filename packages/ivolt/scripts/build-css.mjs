// Bundles and minifies CSS entries and standalone modules with lightningcss.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle, transform, browserslistToTargets } from "lightningcss";
import browserslist from "browserslist";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const targets = browserslistToTargets(browserslist(pkg.browserslist));
const src = resolve(root, "src/css");
const out = resolve(root, "dist/css");
mkdirSync(join(out, "components"), { recursive: true });
mkdirSync(join(out, "layout"), { recursive: true });

const customMedia = readFileSync(join(src, "custom-media.css"), "utf8");
const common = { targets, drafts: { customMedia: true }, errorRecovery: false };

function write(name, css, map) {
  writeFileSync(join(out, name), css);
  if (map) writeFileSync(join(out, name + ".map"), map);
}

/** Bundle an entry file (resolves @import … layer()). */
function bundleEntry(file) {
  const base = basename(file, ".css");
  const plain = bundle({ filename: file, ...common, minify: false });
  write(`${base}.css`, plain.code.toString());
  const min = bundle({ filename: file, ...common, minify: true, sourceMap: true });
  write(`${base}.min.css`, min.code.toString() + `\n/*# sourceMappingURL=${base}.min.css.map */`, min.map?.toString());
}

/** Transform a standalone module (no layer), prepending custom media definitions. */
function transformModule(rel) {
  const code = customMedia + readFileSync(join(src, rel), "utf8");
  const res = transform({ filename: rel, code: Buffer.from(code), ...common, minify: false });
  write(rel, res.code.toString());
}

for (const entry of ["core.css", "ivolt.css", "ivolt.flat.css"]) bundleEntry(join(src, entry));

// reset: plain (no layer) and wrapped in @layer iv.reset for <link> usage.
const reset = readFileSync(join(src, "reset.css"), "utf8");
write("reset.css", transform({ filename: "reset.css", code: Buffer.from(reset), ...common }).code.toString());
write("reset.layer.css", transform({ filename: "reset.layer.css", code: Buffer.from(`@layer iv.reset {\n${reset}\n}\n`), ...common }).code.toString());

// standalone modules
for (const rel of ["tokens.css", "base.css", "utilities.css"]) transformModule(rel);
for (const dir of ["layout", "components"]) {
  if (!existsSync(join(src, dir))) continue;
  for (const f of readdirSync(join(src, dir))) if (f.endsWith(".css")) transformModule(join(dir, f));
}
console.log("css: built to dist/css");
