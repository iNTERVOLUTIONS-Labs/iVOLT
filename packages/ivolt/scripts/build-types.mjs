// Emits .d.ts from JSDoc with tsc (declaration only).
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tsc = resolve(root, "../../node_modules/typescript/bin/tsc");
execFileSync(process.execPath, [tsc, "-p", resolve(root, "tsconfig.json"), "--noEmit", "false", "--declaration", "--emitDeclarationOnly", "--outDir", resolve(root, "dist/types"), "--rootDir", resolve(root, "src/js")], { stdio: "inherit" });
console.log("types: emitted to dist/types");
