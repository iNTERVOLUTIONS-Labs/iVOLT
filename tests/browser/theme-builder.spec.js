import { test, expect } from "@playwright/test";

const DOCS = "http://127.0.0.1:4321";

test("the theme builder applies overrides to the preview and prints the CSS", async ({ page }) => {
  await page.goto(DOCS + "/foundations/theme-builder");
  const preview = page.locator("[data-tb-preview]");
  const primary = page.locator('input[name="primary"]');
  await primary.fill("#ff6600");
  await primary.dispatchEvent("input");
  await expect(page.locator("[data-tb-output]")).toContainText("--iv-color-primary: #ff6600");
  const bg = await preview.locator(".iv-button--primary").first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe("rgb(255, 102, 0)");
  await page.locator('input[name="theme"][value="light"]').check();
  await expect(preview).toHaveAttribute("data-iv-theme", "light");
  await expect(page.locator("[data-tb-output]")).toContainText(':root, [data-iv-theme="light"]');
  await page.locator("[data-tb-reset]").click();
  await expect(page.locator("[data-tb-output]")).not.toContainText("#ff6600");
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over).toBeLessThanOrEqual(0);
});
