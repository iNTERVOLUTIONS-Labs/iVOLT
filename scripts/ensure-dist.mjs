// Builds the package when its dist/ output is missing (fresh clones), so the docs site can resolve
// the @intervolutions/ivolt exports. Pass --force to rebuild unconditionally.
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const marker = resolve(root, "packages/ivolt/dist/js/index.js");
if (!existsSync(marker) || process.argv.includes("--force")) {
  console.log("ensure-dist: building @intervolutions/ivolt");
  execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build", "-w", "@intervolutions/ivolt"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
}
