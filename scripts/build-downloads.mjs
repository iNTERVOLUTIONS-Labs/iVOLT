// Builds the downloadable zips served by the docs site.
//
// Produces apps/docs/public/downloads/:
//   ivolt-dist.zip                 the built package (dist + LICENSE + README.md)
//   ivolt-starter-plain-html.zip   the plain HTML starter with its synced ivolt/ folder
//   ivolt-recipe-<name>.zip        one per recipe in examples/recipes/, with ivolt/
//   manifest.json                  name, byte size and file list of every zip
//
// No dependencies: the zip writer below is a minimal "stored" (uncompressed) writer
// with its own CRC-32, local headers, central directory and end-of-central-directory
// record. Paths always use "/" and dates are fixed so builds are reproducible.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outDir = join(root, "apps/docs/public/downloads");

/* ---------- CRC-32 ---------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ---------- minimal zip writer (stored) ---------- */

const DOS_TIME = 0; // 00:00:00
const DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1; // 2020-01-01

function zip(entries) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = entry.data;
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed to extract (2.0)
    local.writeUInt16LE(0x0800, 6); // general purpose flags: UTF-8 names
    local.writeUInt16LE(0, 8); // method: stored
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); // compressed size
    local.writeUInt32LE(data.length, 22); // uncompressed size
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra field length
    parts.push(local, name, data);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0); // central directory header signature
    dir.writeUInt16LE(20, 4); // version made by
    dir.writeUInt16LE(20, 6); // version needed
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(0, 10);
    dir.writeUInt16LE(DOS_TIME, 12);
    dir.writeUInt16LE(DOS_DATE, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(data.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt16LE(0, 30); // extra
    dir.writeUInt16LE(0, 32); // comment
    dir.writeUInt16LE(0, 34); // disk number start
    dir.writeUInt16LE(0, 36); // internal attributes
    dir.writeUInt32LE((0o100644 << 16) >>> 0, 38); // external attributes: regular file 0644
    dir.writeUInt32LE(offset, 42);
    central.push(dir, name);

    offset += local.length + name.length + data.length;
  }

  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory signature
  end.writeUInt16LE(0, 4); // this disk
  end.writeUInt16LE(0, 6); // disk with central directory
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20); // comment length
  return Buffer.concat([...parts, directory, end]);
}

/* ---------- collecting files ---------- */

function walk(dir, prefix, into) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const zipName = prefix ? `${prefix}/${name}` : name;
    if (statSync(full).isDirectory()) walk(full, zipName, into);
    else into.push({ name: zipName, data: readFileSync(full) });
  }
  return into;
}

function file(path, zipName, into) {
  if (!existsSync(path)) throw new Error(`missing file: ${path}`);
  into.push({ name: zipName, data: readFileSync(path) });
  return into;
}

function require_(path, hint) {
  if (!existsSync(path)) {
    console.error(`build-downloads: ${path} is missing. ${hint}`);
    process.exit(1);
  }
}

const dist = join(root, "packages/ivolt/dist");
const plain = join(root, "examples/plain-html");
const recipes = join(root, "examples/recipes");
require_(dist, "Run `npm run build` first.");
require_(join(plain, "ivolt"), "Run `node scripts/sync-examples.mjs` first.");
require_(join(recipes, "ivolt"), "Run `node scripts/sync-examples.mjs` first.");

const bundles = [];

// 1. The built package.
{
  const entries = walk(dist, "", []);
  file(join(root, "packages/ivolt/LICENSE"), "LICENSE", entries);
  file(join(root, "packages/ivolt/README.md"), "README.md", entries);
  bundles.push({ name: "ivolt-dist.zip", entries });
}

// 2. The plain HTML starter.
{
  const entries = [];
  file(join(plain, "index.html"), "index.html", entries);
  file(join(plain, "README.md"), "README.md", entries);
  walk(join(plain, "ivolt"), "ivolt", entries);
  bundles.push({ name: "ivolt-starter-plain-html.zip", entries });
}

// 3. One zip per recipe, each with its own copy of the assets.
const recipeNames = readdirSync(recipes)
  .sort()
  // A recipe is a folder with an index.html; assets prepared ahead of a recipe (photos, README) are not zipped alone.
  .filter((name) => name !== "ivolt" && statSync(join(recipes, name)).isDirectory() && existsSync(join(recipes, name, "index.html")));
for (const name of recipeNames) {
  const entries = walk(join(recipes, name), "", []);
  walk(join(recipes, "ivolt"), "ivolt", entries);
  bundles.push({ name: `ivolt-recipe-${name}.zip`, entries });
}

/* ---------- writing ---------- */

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const manifest = [];
for (const bundle of bundles) {
  const buffer = zip(bundle.entries);
  writeFileSync(join(outDir, bundle.name), buffer);
  manifest.push({
    name: bundle.name,
    bytes: buffer.length,
    files: bundle.entries.map((entry) => entry.name),
  });
  console.log(`downloads: ${bundle.name} — ${bundle.entries.length} files, ${buffer.length} bytes`);
}

writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify({ zips: manifest }, null, 2)}\n`);
console.log(`downloads: manifest.json written (${manifest.length} archives) in apps/docs/public/downloads`);
