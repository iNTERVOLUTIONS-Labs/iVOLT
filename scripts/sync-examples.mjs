// Copies built dist assets into the starters and recipes so they work without Node,
// and mirrors the recipes into the docs site (apps/docs/public/examples) for browsing.
import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "packages/ivolt/dist");

function syncAssets(dest) {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(join(dist, "css"), join(dest, "css"), { recursive: true });
  cpSync(join(dist, "js"), join(dest, "js"), { recursive: true });
  cpSync(join(root, "packages/ivolt/LICENSE"), join(dest, "LICENSE"));
}
syncAssets(join(root, "examples/plain-html/ivolt"));
syncAssets(join(root, "examples/recipes/ivolt"));

const pub = join(root, "apps/docs/public/examples");
rmSync(pub, { recursive: true, force: true });
if (existsSync(join(root, "examples/recipes"))) cpSync(join(root, "examples/recipes"), pub, { recursive: true });
console.log("examples: assets synced (plain-html, recipes) and recipes mirrored into apps/docs/public/examples");
