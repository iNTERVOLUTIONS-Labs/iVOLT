// Share cards, icons, crawler files and the weight of the shell (1.1 "Spark", track W).
import { test, expect } from "@playwright/test";

const DOCS = "http://127.0.0.1:4321";
const SITE = "https://ivolt.intervolutions.com";
const local = (url) => url.replace(SITE, DOCS);
const meta = (html, attr, key) => (html.match(new RegExp(`<meta ${attr}="${key.replace(/[:+]/g, "\\$&")}" content="([^"]*)"`)) || [])[1];

test.describe("SEO and sharing", () => {
  test.setTimeout(120_000);

  test("every page links a share card that exists, with the full Open Graph and Twitter set", async ({ request }) => {
    for (const [path, lang, kind] of [["/", "en", "png"], ["/es", "es", "png"], ["/components/button", "en", "jpeg"], ["/es/foundations/coexistence", "es", "jpeg"], ["/foundations/theme-builder", "en", "jpeg"]]) {
      const html = await (await request.get(DOCS + path)).text();
      const image = meta(html, "property", "og:image");
      expect(image, path).toMatch(new RegExp(`^${SITE}/og`));
      const res = await request.get(local(image));
      expect(res.status(), `${path} → ${image}`).toBe(200);
      expect(res.headers()["content-type"], image).toContain(`image/${kind}`);
      expect((await res.body()).length, image).toBeGreaterThan(20_000);
      expect(meta(html, "property", "og:url"), path).toBe(SITE + path);
      expect(meta(html, "property", "og:site_name")).toBe("iVOLT");
      expect(meta(html, "property", "og:locale"), path).toBe(lang === "es" ? "es_ES" : "en_US");
      expect(meta(html, "property", "og:image:alt"), path).toBeTruthy();
      expect(meta(html, "name", "twitter:image"), path).toBe(image);
      expect(meta(html, "name", "twitter:title"), path).toBe(meta(html, "property", "og:title"));
    }
  });

  test("icons and the web manifest are served", async ({ request }) => {
    for (const [file, type] of [["/favicon.ico", "image/"], ["/favicon.svg", "image/svg"], ["/apple-touch-icon.png", "image/png"], ["/icon-512.png", "image/png"]]) {
      const res = await request.get(DOCS + file);
      expect(res.status(), file).toBe(200);
      expect(res.headers()["content-type"], file).toContain(type);
    }
    const manifest = await (await request.get(DOCS + "/manifest.webmanifest")).json();
    expect(manifest.name).toContain("iVOLT");
    expect(manifest.icons.some((i) => i.purpose === "maskable")).toBe(true);
  });

  test("the sitemap dates its pages and leaves out the 404s", async ({ request }) => {
    const xml = await (await request.get(DOCS + "/sitemap-0.xml")).text();
    const urls = [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map((m) => m[0]);
    expect(urls.length).toBeGreaterThan(100);
    for (const u of urls) expect(u, u.slice(0, 120)).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T/);
    expect(xml).not.toMatch(/\/404</);
  });

  test("the 404 exists in both languages and is not indexable", async ({ request }) => {
    for (const [path, lang] of [["/404", "en"], ["/es/404", "es"]]) {
      const res = await request.get(DOCS + path);
      expect(res.status(), path).toBe(200);
      const html = await res.text();
      expect(html).toContain(`<html lang="${lang}"`);
      expect(html).toContain('<meta name="robots" content="noindex">');
      expect(html).not.toContain('rel="canonical"');
    }
  });

  test("no heading comes before the page's h1", async ({ page }) => {
    for (const path of ["/components/button", "/es/foundations/theme-builder", "/foundations/theme-builder"]) {
      await page.goto(DOCS + path);
      const before = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        return [...document.querySelectorAll("h2, h3, h4, h5, h6")].filter((h) => h.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).map((h) => h.textContent.trim());
      });
      expect(before, path).toEqual([]);
    }
  });

  test("the shell loads only the components a page carries", async ({ page }) => {
    const scripts = [];
    page.on("request", (r) => { if (/\/_astro\/.*\.js$/.test(r.url())) scripts.push(r.url()); });
    await page.goto(DOCS + "/getting-started", { waitUntil: "networkidle" });
    expect(scripts.filter((u) => /\/(datepicker|carousel|combobox|picker|command|datatable)\.[\w-]+\.js$/.test(u))).toEqual([]);
    // …and the dialogs of the shell still open and close without the package's full init.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(".docs-menu-toggle").click();
    await expect(page.locator("#docs-nav")).toHaveAttribute("open", "");
    await page.locator("#docs-nav [data-iv-close]").click();
    await expect(page.locator("#docs-nav")).not.toHaveAttribute("open", "");
  });

  test("language models get llms.txt, llms-full.txt and a Markdown twin per page", async ({ request }) => {
    const llms = await (await request.get(DOCS + "/llms.txt")).text();
    expect(llms).toMatch(/^# iVOLT\n\n> /);
    expect(llms).toContain(`${SITE}/components/button.md`);
    const md = await (await request.get(DOCS + "/components/button.md")).text();
    expect(md).toMatch(/^# Button/);
    expect(md).toContain('class="iv-button iv-button--primary"');
    expect(md).not.toContain("<nav");
    const full = await (await request.get(DOCS + "/llms-full.txt")).text();
    expect(full.length).toBeGreaterThan(200_000);
    const html = await (await request.get(DOCS + "/es/components/tabs")).text();
    expect(html).toContain(`href="${SITE}/es/components/tabs.md"`);
  });

  test("the homes define iVOLT and answer the FAQ in structured data", async ({ request }) => {
    for (const [path, word] of [["/", "iVOLT is an open-source CSS framework"], ["/es", "iVOLT es un framework CSS"]]) {
      const html = await (await request.get(DOCS + path)).text();
      expect(html, path).toContain(word);
      const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => [JSON.parse(m[1])].flat());
      const types = blocks.map((b) => b["@type"]);
      for (const t of ["FAQPage", "SoftwareApplication", "Organization"]) expect(types, path).toContain(t);
      const faq = blocks.find((b) => b["@type"] === "FAQPage");
      expect(faq.mainEntity.length).toBeGreaterThanOrEqual(8);
    }
  });

  test("comparison sizes come from the measured JSON", async ({ request }) => {
    const { readFileSync } = await import("node:fs");
    const data = JSON.parse(readFileSync(new URL("../../apps/docs/src/data/competitor-sizes.json", import.meta.url), "utf8"));
    const bs = data.files.find((f) => f.id === "bootstrap" && f.role === "css");
    const html = await (await request.get(DOCS + "/compare/bootstrap")).text();
    expect(html).toContain(`${(bs.gzip / 1024).toFixed(1)} KiB`);
    expect(html).toContain(data.measured);
    for (const p of ["/compare", "/compare/tailwind", "/compare/pico", "/compare/bulma", "/es/compare", "/es/compare/bootstrap"]) {
      expect((await request.get(DOCS + p)).status(), p).toBe(200);
    }
  });

  test("UI strings follow the page language", async ({ page }) => {
    await page.goto(DOCS + "/es/getting-started");
    const strings = await page.evaluate(() => JSON.parse(document.getElementById("docs-strings").textContent));
    expect(strings.copied).toBe("Copiado");
    expect(strings.searchResultsMany).toContain("{n}");
  });
});
