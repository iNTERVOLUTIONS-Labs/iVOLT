import { test, expect } from "@playwright/test";

const DOCS = "http://127.0.0.1:4321";

test("the theme builder applies overrides to the preview and prints the CSS", async ({ page }) => {
  await page.goto(DOCS + "/foundations/theme-builder");
  const preview = page.locator("[data-tb-preview]");
  // Colour inputs do not accept fill() in every engine: set the value and dispatch the event the builder listens to.
  await page.locator('input[name="primary"]').evaluate((el) => { el.value = "#ff6600"; el.dispatchEvent(new Event("input", { bubbles: true })); });
  await expect(page.locator("[data-tb-output]")).toContainText("--iv-color-primary: #ff6600");
  // The button transitions its background: wait for the settled colour.
  await expect(preview.locator(".iv-button--primary").first()).toHaveCSS("background-color", "rgb(255, 102, 0)");
  // The preview follows the checked radio in both directions: it once read the first radio
  // of the group and stayed light whatever the reader chose.
  await expect(preview).toHaveAttribute("data-iv-theme", "dark");
  await expect(page.locator("[data-tb-output]")).toContainText('[data-iv-theme="dark"]');
  await page.locator('input[name="theme"][value="light"]').check();
  await expect(preview).toHaveAttribute("data-iv-theme", "light");
  await expect(preview).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.locator('input[name="theme"][value="dark"]').check();
  await expect(preview).toHaveAttribute("data-iv-theme", "dark");
  await expect(preview).toHaveCSS("background-color", "rgb(4, 7, 15)");
  await page.locator('input[name="theme"][value="light"]').check();
  await expect(page.locator("[data-tb-output]")).toContainText(':root, [data-iv-theme="light"]');
  await page.locator("[data-tb-reset]").click();
  await expect(page.locator("[data-tb-output]")).not.toContainText("#ff6600");
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over).toBeLessThanOrEqual(0);
});
