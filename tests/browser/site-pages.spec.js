// The pages themselves: every route answers with one h1 and no console error, the internal links
// resolve, the downloads manifest is complete, the playground still generates, and axe is clean
// under reduced motion in both themes.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const DOCS = "http://127.0.0.1:4321";
const enRoutes = ["/", "/getting-started", "/foundations/tokens-and-themes", "/foundations/layout", "/foundations/typography", "/foundations/accessibility", "/foundations/coexistence", "/foundations/surfaces", "/foundations/effects", "/foundations/theme-builder", "/foundations/localisation", "/foundations/stability", "/reference", "/examples", "/playground", "/changelog", "/roadmap", "/contributing", "/404", ...["button", "card", "form", "validation", "combobox", "datepicker", "datatable", "picker", "carousel", "lightbox", "navbar", "megamenu", "hero", "stepper", "popover", "command", "dialog", "badge", "alert", "table", "timeline", "stat", "avatar", "breadcrumb", "pagination", "progress", "skeleton", "countup", "disclosure", "tabs", "dropdown", "drawer", "toast"].map((c) => `/components/${c}`)];
const routes = [...enRoutes, ...enRoutes.filter((r) => r !== "/").map((r) => `/es${r}`)];

test.describe("Site pages", () => {
  test.setTimeout(240_000);

  test("every route renders with one h1, a title and no console error", async ({ page }) => {
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(`${page.url()}: ${m.text()}`); });
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    for (const r of routes) {
      await page.goto(DOCS + r);
      expect(await page.locator("h1").count(), r).toBe(1);
      expect(await page.title(), r).toMatch(/· iVOLT$/);
    }
    expect(errors).toEqual([]);
  });

  test("internal links resolve", async ({ page, request }) => {
    const seen = new Set();
    for (const r of routes) {
      await page.goto(DOCS + r);
      const hrefs = await page.locator("a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
      for (const h of hrefs) {
        const path = h.split("#")[0].split("?")[0];
        if (!path || seen.has(path)) continue;
        seen.add(path);
        expect((await request.get(DOCS + path)).status(), `${r} -> ${h}`).toBeLessThan(400);
      }
    }
  });

  test("the downloads manifest carries the starter, the package and every recipe on disk", async ({ request }) => {
    const manifest = await (await request.get(DOCS + "/downloads/manifest.json")).json();
    const names = manifest.zips.map((z) => z.name).sort();
    expect(names).toContain("ivolt-dist.zip");
    expect(names).toContain("ivolt-starter-plain-html.zip");
    const recipes = names.filter((n) => n.startsWith("ivolt-recipe-"));
    expect(recipes.length, "one zip per recipe folder").toBeGreaterThan(0);
    for (const name of recipes) expect((await request.get(DOCS + "/downloads/" + name)).status()).toBe(200);
  });

  test("the toast demo and the playground still work", async ({ page }) => {
    await page.goto(DOCS + "/components/toast");
    await page.locator("[data-toast-variant=success]").click();
    await expect(page.locator(".iv-toast--success")).toBeVisible();
    await page.goto(DOCS + "/playground");
    const code = page.locator("#pg-code");
    await expect(code).toContainText("iv-button--primary");
    const classes = await page.locator("#pg-preview [class]").evaluateAll((els) => els.flatMap((e) => [...e.classList]));
    expect(classes.every((c) => c.startsWith("iv-"))).toBe(true);
  });

  test.describe("axe, with reduced motion", () => {
    const audited = ["/", "/getting-started", "/components/navbar", "/components/dialog", "/foundations/tokens-and-themes", "/examples", "/es/components/navbar", "/es/examples"];
    for (const theme of ["light", "dark"]) {
      test(`the migrated pages pass axe in ${theme}`, async ({ page }) => {
        test.setTimeout(180_000);
        await page.emulateMedia({ reducedMotion: "reduce" });
        for (const route of audited) {
          await page.goto(DOCS + route);
          await page.evaluate((t) => document.documentElement.setAttribute("data-iv-theme", t), theme);
          await page.waitForTimeout(150);
          const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
          const serious = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
          expect(serious.map((v) => `${route} ${v.id}`), `${route} (${theme})`).toEqual([]);
        }
      });
    }
  });
});
