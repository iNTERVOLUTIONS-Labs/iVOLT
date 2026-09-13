import { test, expect } from "@playwright/test";

const DOCS = "http://127.0.0.1:4321";
const routes = ["/", "/getting-started", "/foundations/tokens-and-themes", "/foundations/layout", "/examples", "/404", ...["button", "card", "form", "dialog", "badge", "alert", "table", "breadcrumb", "pagination", "progress", "skeleton", "disclosure", "tabs", "dropdown", "drawer", "toast"].map((c) => `/components/${c}`)];

test.describe("Docs site", () => {
  test("key routes render without console errors and with one h1", async ({ page }) => {
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
        const path = h.split("#")[0];
        if (!path || seen.has(path)) continue;
        seen.add(path);
        const res = await request.get(DOCS + path);
        expect(res.status(), `${r} -> ${h}`).toBeLessThan(400);
      }
    }
  });

  test("theme switch persists and copy button gives feedback", async ({ page, context, browserName }) => {
    if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(DOCS + "/components/button");
    await page.locator("[data-set-theme=dark]").click();
    await expect(page.locator("html")).toHaveAttribute("data-iv-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-iv-theme", "dark");
    const copy = page.locator(".docs-copy").first();
    await copy.click();
    await expect(copy).toHaveText(/Copied|Selected/);
    if (browserName === "chromium") expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("iv-button");
  });

  test("mobile menu opens the navigation dialog and the hero dialog works", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(DOCS + "/");
    await page.locator(".docs-menu-toggle").click();
    await expect(page.locator("#docs-nav")).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(page.locator("#docs-nav")).not.toHaveAttribute("open", "");
    await page.locator("[data-iv-open=signup]").first().click();
    await expect(page.locator("#signup")).toHaveAttribute("open", "");
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over).toBeLessThanOrEqual(0);
  });
});

test("toast demo on the docs page shows a toast", async ({ page }) => {
  await page.goto(DOCS + "/components/toast");
  await page.locator("[data-toast-variant=success]").click();
  await expect(page.locator(".iv-toast--success")).toBeVisible();
  await expect(page.locator(".iv-toast-region")).toHaveAttribute("role", "region");
});
