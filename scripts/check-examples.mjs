// Verifies that every local asset referenced by the starters and recipes exists (run after sync-examples),
// and that no page advertises npm install or a CDN before publication.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pages = ["examples/plain-html/index.html"];
for (const d of readdirSync(join(root, "examples/recipes"), { withFileTypes: true })) {
  if (d.isDirectory() && d.name !== "ivolt" && existsSync(join(root, "examples/recipes", d.name, "index.html"))) pages.push(`examples/recipes/${d.name}/index.html`);
}
let errors = 0;
for (const rel of pages) {
  const html = readFileSync(join(root, rel), "utf8");
  const refs = [...html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)].map((m) => m[1]).filter((r) => !/^(https?:)?\/\//.test(r) && !r.startsWith("mailto:") && !r.startsWith("data:"));
  for (const r of refs) {
    const target = join(dirname(join(root, rel)), r.split("?")[0]);
    if (!existsSync(target)) { console.error(`${rel}: missing ${r}`); errors++; }
  }
  if (/npm install|cdn\./i.test(html)) { console.error(`${rel}: must not show npm install or a CDN before publication`); errors++; }
}
if (errors) process.exit(1);
console.log(`check-examples: ok (${pages.length} pages: ${pages.map((p) => p.split("/").slice(-2, -1)[0]).join(", ")})`);
