// dist/js/auto.min.js is the one file the CDN snippet loads: it has to start every component on
// its own. 1.1.0 shipped one that started only Copy — the bundler dropped auto.js's top-level
// init(document) because src/ is declared free of side effects — so a dialog trigger fell back to
// the :target link and nothing else woke up.
import { test, expect } from "@playwright/test";

const withOnly = async (page, fixture, src) => {
  await page.goto(`/fixture/${fixture}?nojs`);
  await page.evaluate((s) => new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.type = "module";
    el.src = s;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`could not load ${s}`));
    document.head.append(el);
  }), src);
};

test.describe("auto.min.js on its own", () => {
  test("starts the components: a dialog trigger opens a modal dialog", async ({ page }) => {
    await withOnly(page, "dialog/basic", "/packages/ivolt/dist/js/auto.min.js");
    await expect(page.locator("html[data-iv-js]")).toBeAttached();
    await page.locator('[data-iv-open="signup"]').click();
    await expect(page.locator("#signup")).toBeVisible();
    expect(await page.locator("#signup").evaluate((d) => d.matches(":modal"))).toBe(true);
  });

  test("starts Copy as well: the code block's copy button shows", async ({ page }) => {
    await withOnly(page, "code/basic", "/packages/ivolt/dist/js/auto.min.js");
    await expect(page.locator(".iv-code__copy").first()).toBeVisible();
  });
});
