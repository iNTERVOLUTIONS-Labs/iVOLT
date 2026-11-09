// Build-time sizes of the package as it ships (min + gzip -9), read from packages/ivolt/dist so a
// figure on the site is never typed by hand. null when the package has not been built.
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve, dirname } from "node:path";

let dir = process.cwd();
while (!existsSync(resolve(dir, "packages/ivolt/dist")) && dirname(dir) !== dir) dir = dirname(dir);
const dist = resolve(dir, "packages/ivolt/dist");

/** KiB with one decimal, as a string, e.g. "32.1". */
export function kib(rel) {
  const f = resolve(dist, rel);
  return existsSync(f) ? (gzipSync(readFileSync(f), { level: 9 }).length / 1024).toFixed(1) : null;
}
