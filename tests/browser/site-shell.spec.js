// The shell: header, search, theme, copy, navigation, footer site map, CSP hash, no sitemap
// without SITE_URL, and no sideways scroll at any width. Against the built site on 4321.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

// Read, not typed: the footer said 1.0.0-rc.0 for a whole cycle after the package was tagged
// 1.0.0-rc.1, and a literal in this file would have agreed with it.
const version = JSON.parse(readFileSync(new URL("../../packages/ivolt/package.json", import.meta.url), "utf8")).version;

const DOCS = "http://127.0.0.1:4321";
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("Site shell", () => {
  test.setTimeout(180_000);

  test("search opens with /, finds a page and walks with the arrows", async ({ page }) => {
    await page.goto(DOCS + "/");
    await page.keyboard.press("/");
    await expect(page.locator("#docs-search")).toHaveAttribute("open", "");
    await expect(page.locator("#docs-search-input")).toBeFocused();
    await page.locator("#docs-search-input").fill("dialog");
    const first = page.locator("#docs-search-results a").first();
    await expect(first).toBeVisible();
    await expect(page.locator("#docs-search-status")).toContainText(/result|resultado/);
    await page.keyboard.press("ArrowDown");
    await expect(first).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/dialog/);
  });

  test("the theme choice persists and the copy button gives feedback", async ({ page, context, browserName }) => {
    if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(DOCS + "/components/button");
    await page.locator(".docs-header [data-set-theme=dark]").click();
    await expect(page.locator("html")).toHaveAttribute("data-iv-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-iv-theme", "dark");
    const copy = page.locator(".docs-copy").first();
    await copy.click();
    await expect(copy).toHaveText(/Copied|Selected/);
    if (browserName === "chromium") expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("iv-button");
  });

  test("the mobile menu opens the navigation dialog and the home fits a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(DOCS + "/");
    await page.locator(".docs-menu-toggle").click();
    await expect(page.locator("#docs-nav")).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(page.locator("#docs-nav")).not.toHaveAttribute("open", "");
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });

  test("headings carry anchors and the site map has no sitemap.xml without SITE_URL", async ({ page, request }) => {
    await page.goto(DOCS + "/components/button");
    const anchors = page.locator(".docs-prose h2 .docs-anchor");
    expect(await anchors.count()).toBeGreaterThan(2);
    const href = await anchors.first().getAttribute("href");
    expect(href).toMatch(/^#[a-z0-9-]+$/);
    expect(await page.locator(href).count()).toBe(1);
    expect((await request.get(DOCS + "/sitemap-index.xml")).status()).toBe(404);
    expect((await request.get(DOCS + "/og.png")).status()).toBe(200);
  });

  test("the footer carries the whole site map in both languages", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [route, start] of [["/components/button", "Getting started"], ["/es/components/button", "Primeros pasos"]]) {
      await page.goto(DOCS + route);
      expect(await page.locator(".docs-sitemap__col").count(), route).toBe(4);
      await expect(page.locator(`.docs-sitemap a:text-is("${start}")`)).toHaveCount(1);
    }
  });

  test("the footer and the home publish the version of the package, derived at build time", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of ["/components/button", "/es/components/button"]) {
      await page.goto(DOCS + route);
      await expect(page.locator(".docs-footer__inner"), route).toContainText(`iVOLT v${version}`);
      await expect(page.locator(".docs-footer__inner"), route).toContainText(version);
      expect(await page.locator(`.docs-footer :text("1.0.0-rc.0")`).count(), route).toBe(0);
    }
    for (const route of ["/", "/es"]) {
      await page.goto(DOCS + route);
      await expect(page.locator(".docs-invert__foot"), route).toContainText(version);
    }
  });

  test("the sidebar marks the kind of every component", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of ["/components/button", "/es/components/button"]) {
      await page.goto(DOCS + route);
      const kinds = await page.evaluate(() => [...document.querySelectorAll(".docs-sidebar a[href*='/components/'] .docs-sidebar__kind")].map((k) => k.textContent));
      expect(kinds.length, route).toBe(33);
      expect(new Set(kinds)).toEqual(new Set(["css", "js"]));
    }
  });

  test("no route scrolls sideways at 390, 1024 or 1440", async ({ page }) => {
    const routes = ["/", "/es", "/getting-started", "/components/navbar", "/components/dialog", "/foundations/tokens-and-themes", "/examples", "/reference", "/404", "/es/getting-started", "/es/components/navbar", "/es/examples"];
    for (const width of [390, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await page.goto(DOCS + route);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(80);
        expect(await overflow(page), `${route} at ${width}`).toBeLessThanOrEqual(1);
      }
    }
  });

  test("a fragment target stops below the sticky header", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(DOCS + "/foundations/accessibility");
    const ids = await page.evaluate(() => [...document.querySelectorAll(".docs-prose h2[id]")].map((h) => h.id).slice(0, 3));
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      await page.evaluate((t) => { location.hash = ""; location.hash = `#${t}`; }, id);
      await page.waitForTimeout(250);
      const { top, headerBottom } = await page.evaluate((t) => ({
        top: document.getElementById(t).getBoundingClientRect().top,
        headerBottom: document.querySelector(".docs-header").getBoundingClientRect().bottom,
      }), id);
      expect(top, `#${id}`).toBeGreaterThanOrEqual(headerBottom - 1);
    }
  });

  test("the published CSP hash still matches the one inline script the site ships", async ({ page, request }) => {
    const { createHash } = await import("node:crypto");
    const home = await (await request.get(DOCS + "/")).text();
    // A JSON-LD block is a data block, not a script block: it never executes and CSP does not
    // hash it. Only executable inline scripts count against the published hash.
    const inline = [...home.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)]
      .filter((m) => !/type=["']application\/ld\+json["']/.test(m[0]))
      .map((m) => m[1]).filter((s) => s.trim());
    expect(inline.length, "the site ships exactly one executable inline script").toBe(1);
    const hash = "sha256-" + createHash("sha256").update(inline[0]).digest("base64");
    await page.goto(DOCS + "/foundations/coexistence");
    await expect(page.locator("#csp-hash")).toHaveText(hash);
  });

  test("a migrated page is built from sections and code blocks that copy themselves", async ({ page, context, browserName }) => {
    if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(DOCS + "/getting-started");
    // Section: its own landmark, named by its heading, and the numerals keep running down the page.
    const sections = page.locator(".docs-prose > section.docs-sec");
    expect(await sections.count()).toBeGreaterThan(4);
    for (const s of await sections.all()) {
      await expect(s.locator("h2"), "a section carries a real h2").toHaveCount(1);
      expect(await s.locator("h2").getAttribute("id"), "the heading is addressable").toBeTruthy();
    }
    // The table of contents sees the headings inside the sections, not only the top-level ones.
    expect(await page.locator("#docs-toc a, .docs-toc a").count()).toBeGreaterThan(4);
    // The install line is the one the published package really answers to: 1.0 ships on latest.
    // The install line lives in one of the code blocks, whichever order the page settles on.
    await expect(page.locator(".docs-code-block code", { hasText: "npm install @intervolutions/ivolt" }).first()).toBeVisible();
    const block = page.locator(".docs-code-block").first();
    const copy = block.locator(".docs-copy");
    await copy.click();
    await expect(copy).toHaveText(/Copied|Copiado|Selected|Seleccionado/);
    // The Spanish twin says the same thing in Spanish.
    await page.goto(DOCS + "/es/getting-started");
    await expect(page.locator(".docs-code-block code", { hasText: "npm install @intervolutions/ivolt" }).first()).toBeVisible();
    await expect(page.locator(".docs-code-block .docs-copy").first()).toHaveText(/Copiar/);
  });

  test("the home counts real figures and serves them complete", async ({ page }) => {
    await page.goto(DOCS + "/");
    const figures = page.locator(".docs-facts .iv-count");
    expect(await figures.count()).toBe(4);
    for (const f of await figures.all()) await expect(f).toHaveAttribute("data-iv-component", "countup");
    // The served text is the answer: no JavaScript, no loss.
    const raw = await page.request.get(DOCS + "/");
    const html = await raw.text();
    expect(html).toMatch(/class="iv-count" data-iv-component="countup">\d/);
    expect(html).toContain("KiB");
  });
});
