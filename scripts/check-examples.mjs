// Verifies that every local asset referenced by the starters exists (run after sync-examples).
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pages = ["examples/plain-html/index.html"];
let errors = 0;
for (const rel of pages) {
  const html = readFileSync(join(root, rel), "utf8");
  const refs = [...html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)].map((m) => m[1]).filter((r) => !/^(https?:)?\/\//.test(r) && !r.startsWith("mailto:"));
  for (const r of refs) {
    const target = join(dirname(join(root, rel)), r.split("?")[0]);
    if (!existsSync(target)) { console.error(`${rel}: missing ${r}`); errors++; }
  }
  if (/npm install|cdn\./i.test(html)) { console.error(`${rel}: must not show npm install or a CDN before publication`); errors++; }
}
if (errors) process.exit(1);
console.log(`check-examples: ok (${pages.length} pages)`);
