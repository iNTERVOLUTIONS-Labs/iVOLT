import { defineConfig } from "astro/config";

// SITE_URL is only set when a real public base URL exists (canonical/sitemap are added then).
export default defineConfig({
  output: "static",
  site: process.env.SITE_URL || undefined,
  trailingSlash: "never",
  build: { format: "file" },
  vite: { server: { fs: { allow: [".."] } } },
});
