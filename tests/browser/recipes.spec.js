import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const DOCS = "http://127.0.0.1:4321";
const recipes = ["landing", "catalog", "admin", "showcase"];

for (const r of recipes) {
  test(`recipe ${r}: no console errors, no overflow, no serious axe findings`, async ({ page }) => {
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(e.message));
    // Entrance animations (hero actions rising, text reveals) fade text in over time and axe folds
    // element opacity into the foreground colour; the audited state is the settled one (ADR-039).
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const [w, h] of [[390, 844], [1366, 768]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`${DOCS}/examples/${r}/index.html`);
      expect(await page.locator("h1").count(), `${r} h1 @ ${w}`).toBe(1);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, `${r} overflow @ ${w}`).toBeLessThanOrEqual(0);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const serious = results.violations.filter((v) => ["critical", "serious"].includes(v.impact));
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), `${r} axe @ ${w}`).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}

test("catalog filters and sorting work", async ({ page }) => {
  await page.goto(`${DOCS}/examples/catalog/index.html`);
  const status = page.locator("#catalog-status");
  await expect(status).toContainText("9 of 9");
  await page.locator("input[type=checkbox]").first().uncheck();
  await expect(status).not.toContainText("9 of 9");
  expect(await page.locator(".iv-card[hidden]").count()).toBeGreaterThan(0);
});

test("admin drawer, form toast and delete confirmation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${DOCS}/examples/admin/index.html`);
  await page.locator("[data-iv-open=admin-nav]").first().click();
  await expect(page.locator("#admin-nav")).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(page.locator("#admin-nav")).not.toHaveAttribute("open", "");
  await page.locator("form button[type=submit]").first().click();
  await expect(page.locator(".iv-toast--success")).toBeVisible();
  await page.locator(".iv-button--danger[data-iv-open]").first().click();
  await page.locator("dialog[open] button[value=confirm], dialog[open] .iv-button--danger").last().click();
  await expect(page.locator(".iv-toast--danger")).toBeVisible();
  await expect(page.locator(".iv-toast--danger")).toHaveAttribute("role", "alert");
});
