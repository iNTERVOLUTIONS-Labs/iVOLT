// Runs the repository scripts the docs site depends on: example sync, downloads and the OG image.
// Each step is skipped with a note when its script does not exist yet (keeps partial checkouts building).
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
for (const s of ["scripts/ensure-dist.mjs", "scripts/sync-examples.mjs", "scripts/build-downloads.mjs", "scripts/build-og.mjs"]) {
  const file = resolve(root, s);
  if (!existsSync(file)) { console.warn(`prebuild: ${s} not found, skipped`); continue; }
  execFileSync(process.execPath, [file], { stdio: "inherit", cwd: root });
}
