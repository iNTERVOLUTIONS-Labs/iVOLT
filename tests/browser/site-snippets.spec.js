// Every snippet the site offers to paste, pasted (persona round, 2026-11-09): in 1.1.1 the
// Bootstrap comparison loaded the IIFE without IVOLT.init() and its dialog never opened. Each
// code block that links iVOLT is lifted out of the built page, served as a page of its own, and
// run; jsDelivr and the local `ivolt/` folder both answer from packages/ivolt/dist, so this needs
// no network. Against the built site on 4321.
import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";

const DOCS = "http://127.0.0.1:4321";
const DIST = resolve("packages/ivolt/dist");
const HOST = "https://snippet.test";
const PAGES = ["/", "/es", "/getting-started", "/es/getting-started", "/compare/bootstrap", "/es/compare/bootstrap", "/compare/bulma", "/es/compare/bulma", "/compare/pico", "/es/compare/pico", "/compare/tailwind", "/es/compare/tailwind"];
const TYPES = { ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript" };

async function serveDist(page) {
  const fulfil = (route, rel) => {
    const file = resolve(DIST, rel);
    if (!file.startsWith(DIST) || !existsSync(file)) return route.fulfill({ status: 404, body: "not found" });
    return route.fulfill({ status: 200, body: readFileSync(file), headers: { "content-type": TYPES[extname(file)] || "application/octet-stream", "access-control-allow-origin": "*" } });
  };
  await page.route(/^https:\/\/cdn\.jsdelivr\.net\/npm\/@intervolutions\/ivolt@[^/]+\/dist\/(.+)$/, (route) => fulfil(route, route.request().url().replace(/^.*?\/dist\//, "")));
  await page.route(`${HOST}/ivolt/**`, (route) => fulfil(route, new URL(route.request().url()).pathname.replace(/^\/ivolt\//, "")));
}

/** The text of every code block on the page that loads iVOLT's CSS or JS. */
async function snippetsOf(page, path) {
  await page.goto(DOCS + path);
  return page.$$eval("pre code", (codes) => codes.map((c) => c.textContent).filter((t) => /ivolt[^"]*\.(css|js)"/.test(t) && /<(link|script)\b/.test(t)));
}

const asPage = (code) => (/<html[\s>]/i.test(code) ? code : `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>snippet</title></head><body>\n${code}\n</body></html>`);

test.describe("Snippets, run as copied", () => {
  test.setTimeout(120_000);
  for (const path of PAGES) {
    test(`${path}: every snippet that loads iVOLT works on a page of its own`, async ({ page, context }) => {
      const res = await page.request.get(DOCS + path);
      test.skip(res.status() === 404, "no such page");
      const snippets = await snippetsOf(page, path);
      const probe = await context.newPage();
      await serveDist(probe);
      const served = new Map();
      probe.on("response", (r) => served.set(r.url(), r.status()));
      let n = 0;
      for (const code of snippets) {
        const html = asPage(code);
        await probe.route(`${HOST}/`, (route) => route.fulfill({ status: 200, body: html, headers: { "content-type": "text/html" } }));
        const errors = [];
        probe.on("pageerror", (e) => errors.push(e.message));
        await probe.goto(`${HOST}/`);
        await probe.unroute(`${HOST}/`);
        // The stylesheet arrived and applies.
        if (/\.css"/.test(code)) await expect.poll(() => probe.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--iv-color-primary").trim()), { message: code }).not.toBe("");
        // The script ran and started the components: init marks the document.
        // The script arrived (a wrong path is a 404 here, as it would be on a real page)…
        const scripts = [...code.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => new URL(m[1], `${HOST}/`).href);
        for (const src of scripts) expect(served.get(src), `${src} in\n${code}`).toBe(200);
        // …and started the components: init marks the document once it has something to start.
        if (scripts.length && /data-iv-(component|open)/.test(code)) await expect(probe.locator("html"), code).toHaveAttribute("data-iv-js", "", { timeout: 5_000 });
        // What the snippet shows off, working.
        const opener = probe.locator("[data-iv-open]").first();
        if (await opener.count()) {
          await opener.click();
          await expect(probe.locator("dialog[open]"), code).toHaveCount(1);
        }
        if (await probe.locator('[data-iv-component="tabs"]').count()) await expect(probe.locator('[role="tablist"]'), code).toHaveCount(1);
        expect(errors, code).toEqual([]);
        n++;
      }
      // The pages that show an install snippet must still show one (a selector that matches nothing passes in silence).
      if (/compare\/(bootstrap|bulma|pico|tailwind)$|getting-started$|^\/(es)?$/.test(path)) expect(n, path).toBeGreaterThan(0);
      await probe.close();
    });
  }
});
