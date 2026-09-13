// Builds the docs site and serves it with Astro's preview API in this same process, so that
// stopping the process (Playwright's webServer, Ctrl+C) also stops the server. No orphaned previews.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { preview } from "astro";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.DOCS_PORT || 4321);
if (!process.env.DOCS_SKIP_BUILD) execFileSync("npm", ["run", "build", "-w", "docs"], { cwd: root, stdio: "inherit" });
const server = await preview({ root: resolve(root, "apps/docs"), server: { port, host: "127.0.0.1" }, logLevel: "warn" });
console.log(`docs-server: http://127.0.0.1:${port}/`);
const stop = async () => { await server.stop(); process.exit(0); };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
