// The version the site publishes is the version on disk. A literal in the footer goes stale the
// day the package is tagged — it did, between rc.0 and rc.1 — so every place that names the
// version reads this one value at build time and interpolates it into the {version} marker.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

let dir = process.cwd();
while (!existsSync(resolve(dir, "packages/ivolt/package.json")) && dirname(dir) !== dir) dir = dirname(dir);
export const version = JSON.parse(readFileSync(resolve(dir, "packages/ivolt/package.json"), "utf8")).version;
export const npmTag = /-rc/.test(version) ? "next" : /beta/.test(version) ? "beta" : "latest";
