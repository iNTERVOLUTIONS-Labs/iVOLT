// v0.9 documentation: the generated reference, localisation and stability, in both languages.
// The reference has to carry the whole surface, filter it in the page and stay inside its
// scrollers at phone and desktop width. Against the built site on 127.0.0.1:4321.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const DOCS = "http://127.0.0.1:4321";
const bare = ["/reference", "/foundations/localisation", "/foundations/stability"];
const routes = [...bare, ...bare.map((r) => `/es${r}`)];
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const seriousOf = (results) => results.violations
  .filter((v) => ["critical", "serious"].includes(v.impact))
  .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);

test.describe("Docs v0.9", () => {
  test.setTimeout(180_000);

  test("the six new pages answer and carry their sections", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of routes) {
      expect((await request.get(DOCS + route)).status(), `${route} status`).toBe(200);
      await page.goto(DOCS + route);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(".docs-prose h1"), `${route} title`).toBeVisible();
      expect(await page.locator(".docs-prose h2").count(), `${route} sections`).toBeGreaterThan(2);
      expect(await page.locator(".docs-scroller > table").count(), `${route} tables`).toBeGreaterThan(0);
      // Every table on these pages lives inside a scroller, never loose in the prose.
      expect(await page.locator(".docs-prose table:not(.docs-scroller table)").count(), `${route} loose tables`).toBe(0);
    }
  });

  test("the navigation and the footer carry the three pages in both languages", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [home, hrefs] of [["/", bare], ["/es", bare.map((r) => `/es${r}`)]]) {
      await page.goto(DOCS + home);
      for (const href of hrefs) {
        expect(await page.locator(`.docs-sidebar a[href="${href}"], .docs-sitemap a[href="${href}"]`).count(), `${home} links ${href}`).toBeGreaterThan(0);
      }
      await expect(page.locator(".docs-footer__links"), `${home} footer stability link`).toContainText(home === "/es" ? "Estabilidad" : "Stability");
      await expect(page.locator(".docs-footer__inner"), `${home} version`).toContainText("v1.0.0-rc.0");
      await expect(page.locator(".docs-footer__inner"), `${home} beta notice`).toContainText("1.0.0");
      await expect(page.locator(".docs-invert__foot"), `${home} home notice`).toContainText("1.0");
    }
  });

  test("the reference lists the whole generated surface", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${DOCS}/reference`);
    await page.evaluate(() => document.fonts.ready);
    const counts = await page.evaluate(() => ({
      classes: [...document.querySelectorAll("#classes ~ * [data-ref-row], [data-ref-row]")].length,
      classRows: [...document.querySelectorAll("[data-ref-key^='iv-']")].length,
      tokens: [...document.querySelectorAll("[data-ref-key^='--iv-']")].length,
      sheets: document.querySelectorAll("[data-ref-group]").length,
    }));
    expect(counts.classRows, "classes listed").toBeGreaterThanOrEqual(700);
    expect(counts.tokens, "tokens listed").toBeGreaterThanOrEqual(120);
    expect(counts.sheets, "groups listed").toBeGreaterThan(30);
    // A class links to the page that documents its family.
    await expect(page.locator("[data-ref-key='iv-button'] a").first()).toHaveAttribute("href", "/components/button");
    await expect(page.locator("[data-ref-key='iv-card'] a").first()).toHaveAttribute("href", "/components/card");
  });

  test("the filter runs in the page and reduces the rows", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${DOCS}/reference`);
    await page.evaluate(() => document.fonts.ready);
    const visible = () => page.locator("[data-ref-row]:not([hidden])").count();
    const before = await visible();
    expect(before, "rows before filtering").toBeGreaterThan(700);
    await page.fill("#ref-filter", "combobox");
    await expect.poll(visible, { timeout: 5000 }).toBeLessThan(before / 2);
    const after = await visible();
    expect(after, "rows after filtering").toBeGreaterThan(0);
    await expect(page.locator("[data-ref-status]")).toContainText("rows match");
    // Every surviving row really matches, and empty sheets are folded away.
    const keys = await page.locator("[data-ref-row]:not([hidden])").evaluateAll((els) => els.map((e) => e.dataset.refKey));
    expect(keys.every((k) => k.toLowerCase().includes("combobox")), "matching rows").toBe(true);
    await page.fill("#ref-filter", "zzzznothing");
    await expect(page.locator("[data-ref-empty]")).toBeVisible();
    await page.fill("#ref-filter", "");
    await expect.poll(visible, { timeout: 5000 }).toBe(before);
  });

  test("the Spanish twins are complete, not stubs", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of bare) {
      const shape = async (url) => {
        await page.goto(DOCS + url);
        await page.evaluate(() => document.fonts.ready);
        return page.evaluate(() => ({
          sections: document.querySelectorAll(".docs-prose h2").length,
          tables: document.querySelectorAll(".docs-scroller > table").length,
          rows: document.querySelectorAll("[data-ref-row]").length,
          words: (document.querySelector(".docs-prose")?.textContent || "").split(/\s+/).length,
        }));
      };
      const en = await shape(route);
      const es = await shape(`/es${route}`);
      expect(es.sections, `${route} sections in Spanish`).toBe(en.sections);
      expect(es.tables, `${route} tables in Spanish`).toBe(en.tables);
      expect(es.rows, `${route} reference rows in Spanish`).toBe(en.rows);
      expect(es.words, `${route} length in Spanish`).toBeGreaterThan(en.words * 0.8);
    }
  });

  test("no sideways scroll at 390 or at 1440", async ({ page }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await page.goto(DOCS + route);
        await page.evaluate(() => document.fonts.ready);
        expect(await overflow(page), `${route} at ${width}`).toBeLessThanOrEqual(1);
        const cut = await page.evaluate(() => [...document.querySelectorAll(".docs-prose > :is(h1, h2, h3, p, li)")].filter((el) => el.scrollWidth > el.clientWidth + 2).length);
        expect(cut, `${route} clipped prose at ${width}`).toBe(0);
      }
    }
  });

  test.describe("axe, with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("the three pages pass axe in light and in dark, in both languages", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      for (const theme of ["light", "dark"]) {
        for (const route of routes) {
          await page.goto(DOCS + route);
          await page.evaluate((t) => document.documentElement.setAttribute("data-iv-theme", t), theme);
          await page.evaluate(() => document.fonts.ready);
          const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
          expect(seriousOf(results), `axe on ${route} in ${theme}`).toEqual([]);
        }
      }
    });
  });
});
