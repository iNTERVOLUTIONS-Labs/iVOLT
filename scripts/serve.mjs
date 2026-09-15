// Tiny static server for browser tests and manual checks. Serves the repo root and renders
// /fixture/<component>/<name>[?theme=dark&nojs=1] into a full page around a fixture fragment.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT || 4180);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".map": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

const page = (body, { theme = "light", nojs = false, title = "fixture", dir = "ltr", lang = "en" }) => `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}" class="iv-root" data-iv-theme="${theme}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="/packages/ivolt/dist/css/ivolt.css">
${nojs ? "" : '<script type="module" src="/packages/ivolt/dist/js/auto.js"></script>'}
</head>
<body class="iv-u-p-6">
<main id="fixture">
${body}
</main>
</body>
</html>`;

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  try {
    const m = url.pathname.match(/^\/fixture\/([\w-]+)\/([\w-]+)$/);
    if (m) {
      // Package fixtures first; documentation-only fixtures (photographs, site-specific demos) live in apps/docs/fixtures.
      const body = await readFile(join(root, "packages/ivolt/fixtures", m[1], `${m[2]}.html`), "utf8").catch(() => readFile(join(root, "apps/docs/fixtures", m[1], `${m[2]}.html`), "utf8"));
      res.writeHead(200, { "content-type": types[".html"] });
      // `?dir=rtl` renders the same fragment in a right-to-left document (Arabic locale) for the RTL audit.
      const dir = url.searchParams.get("dir") === "rtl" ? "rtl" : "ltr";
      res.end(page(body, { theme: url.searchParams.get("theme") || "light", nojs: url.searchParams.has("nojs"), title: `${m[1]}/${m[2]}`, dir, lang: dir === "rtl" ? "ar" : "en" }));
      return;
    }
    // The documentation site serves /photos from its public folder; fixtures reference the same paths.
    const pathname = url.pathname.startsWith("/photos/") ? "/apps/docs/public" + url.pathname : url.pathname;
    let file = normalize(join(root, decodeURIComponent(pathname)));
    if (!file.startsWith(root)) throw Object.assign(new Error("forbidden"), { code: "EACCES" });
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    const data = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch (err) {
    res.writeHead(err.code === "ENOENT" ? 404 : 500, { "content-type": "text/plain" });
    res.end(err.code === "ENOENT" ? "not found" : "error");
  }
}).listen(port, () => console.log(`serve: http://localhost:${port}`));
