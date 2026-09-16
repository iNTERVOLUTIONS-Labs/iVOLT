import { test, expect } from "@playwright/test";

const bg = (page, selector) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor);
// Cobalt (ADR-049): the card is a translucent surface, so the computed value is the raised surface
// at the card's own alpha — white in light, navy #0C1330 in dark. The assertion is still "which
// scope painted this card", only the literals moved with the palette and with the glass treatment.
const LIGHT = "color(srgb 1 1 1 / 0.86)"; // surface-raised light (#FFFFFF)
const DARK = "color(srgb 0.0470588 0.0745098 0.188235 / 0.86)"; // surface-raised dark (#0C1330)

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
