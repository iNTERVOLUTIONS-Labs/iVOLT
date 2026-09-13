import { test, expect } from "@playwright/test";

const bg = (page, selector) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor);
const LIGHT = "rgb(255, 255, 255)"; // surface-raised light
const DARK = "rgb(27, 44, 37)"; // surface-raised dark (#1B2C25)

test.describe("Theme scopes", () => {
  test("explicit scopes win; system follows the OS, even nested inside dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/fixture/theme/nested");
    expect(await bg(page, "[data-iv-theme=light].iv-card")).toBe(LIGHT);
    expect(await bg(page, "[data-iv-theme=dark].iv-card")).toBe(DARK);
    expect(await bg(page, "[data-iv-theme=dark] [data-iv-theme=system]")).toBe(LIGHT);
    expect(await bg(page, "[data-iv-theme=system].iv-card")).toBe(LIGHT);
    await page.emulateMedia({ colorScheme: "dark" });
    expect(await bg(page, "[data-iv-theme=dark] [data-iv-theme=system]")).toBe(DARK);
    expect(await bg(page, "[data-iv-theme=system].iv-card")).toBe(DARK);
    expect(await bg(page, "[data-iv-theme=light].iv-card")).toBe(LIGHT);
  });

  test("root theme via query and setTheme without storage", async ({ page }) => {
    await page.goto("/fixture/card/basic?theme=dark");
    expect(await bg(page, ".iv-card")).toBe(DARK);
    const res = await page.evaluate(async () => {
      const { setTheme, getTheme, resolveTheme } = await import("/packages/ivolt/dist/js/theme.js");
      let evt = null;
      document.addEventListener("iv:themechange", (e) => (evt = e.detail));
      setTheme("light");
      return { theme: getTheme(), resolved: resolveTheme(), evt, stored: localStorage.getItem("iv-theme") };
    });
    expect(res).toEqual({ theme: "light", resolved: "light", evt: { theme: "light", resolved: "light" }, stored: null });
    expect(await bg(page, ".iv-card")).toBe(LIGHT);
  });
});
