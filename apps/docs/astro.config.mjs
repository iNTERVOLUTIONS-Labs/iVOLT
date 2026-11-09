import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const pagesDir = fileURLToPath(new URL("./src/pages/", import.meta.url));
const buildDate = new Date().toISOString();

// <lastmod> is the date of the last commit that touched the page's source file: a crawler should
// re-read a page when it changed, not every time the site was rebuilt. Outside a git checkout (or
// for a file git has not seen yet) the build date stands in.
function lastmod(url) {
  const p = new URL(url).pathname.replace(/\/$/, "") || "/";
  const file = resolve(pagesDir, p === "/" ? "index.astro" : p === "/es" ? "es/index.astro" : `${p.slice(1)}.astro`);
  if (!existsSync(file)) return buildDate;
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", file], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return out ? new Date(out).toISOString() : buildDate;
  } catch { return buildDate; }
}

// The public base URL: canonical links, hreflang alternates, Open Graph, JSON-LD and the sitemap
// are absolute against it. SITE_URL overrides it for a preview host.
export default defineConfig({
  output: "static",
  site: process.env.SITE_URL || "https://ivolt.intervolutions.com",
  integrations: [sitemap({
    // The stage pages are the fixture frames the component pages embed: not landing pages.
    // The 404 pages are noindex.
    filter: (page) => !page.includes("/stage/") && !/\/404\/?$/.test(page),
    i18n: { defaultLocale: "en", locales: { en: "en", es: "es" } },
    serialize: (item) => ({ ...item, lastmod: lastmod(item.url) }),
  })],
  trailingSlash: "never",
  build: { format: "file" },
  vite: { server: { fs: { allow: [".."] } } },
});
