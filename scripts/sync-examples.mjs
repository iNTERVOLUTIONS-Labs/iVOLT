// Copies built dist assets into the plain-html starter so it works without Node.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dest = join(root, "examples/plain-html/ivolt");
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(join(root, "packages/ivolt/dist/css"), join(dest, "css"), { recursive: true });
cpSync(join(root, "packages/ivolt/dist/js"), join(dest, "js"), { recursive: true });
cpSync(join(root, "packages/ivolt/LICENSE"), join(dest, "LICENSE"));
console.log("examples: assets synced to examples/plain-html/ivolt");
