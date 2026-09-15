// Both languages, twin for twin: same furniture, nothing clipped, nothing left in English.
import { test, expect } from "@playwright/test";

const DOCS = "http://127.0.0.1:4321";
const pairs = [
  ["/getting-started", "/es/getting-started"],
  ["/components/navbar", "/es/components/navbar"],
  ["/components/dialog", "/es/components/dialog"],
  ["/foundations/tokens-and-themes", "/es/foundations/tokens-and-themes"],
  ["/examples", "/es/examples"],
  ["/components/button", "/es/components/button"],
];

test.describe("Both languages", () => {
  test.setTimeout(120_000);

  test("every twin carries the same sections, the same stages and no clipped text", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const shape = async (route) => {
      await page.goto(DOCS + route);
      await page.evaluate(() => document.fonts.ready);
      return page.evaluate(() => ({
        sections: document.querySelectorAll(".docs-prose > h2").length,
        stages: [...document.querySelectorAll("[data-stage]")].map((s) => s.id).join(","),
        fixtures: [...document.querySelectorAll(".docs-fixture")].map((f) => f.id).join(","),
        cut: [...document.querySelectorAll(".docs-prose > :is(h1, h2, h3, p, li)")].filter((el) => el.scrollWidth > el.clientWidth + 2).length,
        h1: document.querySelectorAll("h1").length,
      }));
    };
    for (const [en, es] of pairs) {
      const a = await shape(en);
      const b = await shape(es);
      expect(b.sections, `${es} sections`).toBe(a.sections);
      expect(b.stages, `${es} stages`).toBe(a.stages);
      expect(b.fixtures, `${es} fixtures`).toBe(a.fixtures);
      expect(a.cut, `${en} clipped`).toBe(0);
      expect(b.cut, `${es} clipped`).toBe(0);
      expect(a.h1, `${en} h1`).toBe(1);
      expect(b.h1, `${es} h1`).toBe(1);
    }
  });

  test("the Spanish shell is Spanish, including the stage controls", async ({ page }) => {
    await page.goto(DOCS + "/es/components/navbar");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    const stage = page.locator("#fx-navbar-basic");
    await expect(stage.locator("[data-stage-controls]")).toContainText("Movimiento reducido");
    await expect(stage.locator("[data-stage-controls]")).toContainText("Hoja plana");
    await expect(stage.locator("[data-stage-theme=light]")).toHaveText("Claro");
    await expect(stage.locator(".docs-stage__open")).toContainText("Abrir sola");
    await expect(page.locator(".docs-header .docs-lang")).toHaveText("English");
  });

  test("the language switch reaches the twin and back", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(DOCS + "/components/navbar");
    await page.locator(".docs-header .docs-lang").click();
    await page.waitForTimeout(600);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    expect(page.url()).toContain("/es/components/navbar");
  });
});
