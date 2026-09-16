import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// The public base URL: canonical links, hreflang alternates, Open Graph, JSON-LD and the sitemap
// are absolute against it. SITE_URL overrides it for a preview host.
export default defineConfig({
  output: "static",
  site: process.env.SITE_URL || "https://ivolt.intervolutions.com",
  integrations: [sitemap({
    // The stage pages are the fixture frames the component pages embed: not landing pages.
    filter: (page) => !page.includes("/stage/"),
    i18n: { defaultLocale: "en", locales: { en: "en", es: "es" } },
  })],
  trailingSlash: "never",
  build: { format: "file" },
  vite: { server: { fs: { allow: [".."] } } },
});
