import { test, expect } from "@playwright/test";

const widths = [320, 390, 768, 1024, 1366, 1920];
const fixtures = ["layout/grid", "layout/stack-cluster", "layout/container", "form/basic", "card/media", "button/variants"];

for (const w of widths) {
  test(`no horizontal overflow at ${w}px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 800 });
    for (const f of fixtures) {
      await page.goto(`/fixture/${f}`);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, `${f} @ ${w}`).toBeLessThanOrEqual(0);
    }
  });
}

test("grid columns respond to breakpoints", async ({ page }) => {
  await page.goto("/fixture/layout/grid");
  const cols = () => page.locator(".iv-grid").first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  await page.setViewportSize({ width: 390, height: 800 });
  expect(await cols()).toBe(1);
  await page.setViewportSize({ width: 800, height: 800 });
  expect(await cols()).toBe(2);
  await page.setViewportSize({ width: 1100, height: 800 });
  expect(await cols()).toBe(4);
});

test("RTL: inline-start utilities flip", async ({ page }) => {
  await page.goto("/fixture/button/variants");
  const dir = await page.evaluate(() => {
    document.documentElement.dir = "rtl";
    const el = document.querySelector(".iv-button");
    el.classList.add("iv-u-ms-6");
    return getComputedStyle(el).marginRight;
  });
  expect(dir).toBe("24px");
});
