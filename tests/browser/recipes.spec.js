import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const DOCS = "http://127.0.0.1:4321";
const recipes = ["studio", "console", "journal", "store"];

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

test("console: the command palette opens on Ctrl+K and only moves within the page", async ({ page }) => {
  await page.goto(`${DOCS}/examples/console/index.html`);
  await page.locator("#cn-cmd-q").waitFor({ state: "attached" });
  await page.keyboard.press("Control+k");
  const dialog = page.locator("#cn-cmd");
  await expect(dialog).toHaveAttribute("open", "");
  await page.locator("#cn-cmd-q").fill("feeders");
  const first = dialog.locator(".iv-command__item:visible").first();
  await expect(first).toContainText("Feeders");
  await first.click();
  await expect(dialog).not.toHaveAttribute("open", "");
  expect(page.url()).toContain("#feeders");
});

test("studio: the gallery opens the viewer and Escape returns focus to the tile", async ({ page }) => {
  await page.goto(`${DOCS}/examples/studio/index.html`);
  const tile = page.locator(".iv-gallery__item").first();
  await tile.waitFor();
  await tile.click();
  const viewer = page.locator("dialog[open]").first();
  await expect(viewer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(tile).toBeFocused();
});

test("store: the basket drawer opens, says nothing can be bought and closes again", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${DOCS}/examples/store/index.html`);
  // On a phone the basket link lives inside the folded navbar panel, so open it first.
  await page.locator(".iv-navbar__toggle").click();
  await page.locator("[data-iv-open=sr-cart]").first().click();
  const drawer = page.locator("#sr-cart");
  await expect(drawer).toHaveAttribute("open", "");
  await expect(drawer).toContainText("Nothing here can be bought");
  await drawer.locator("[data-iv-close]").first().click();
  await expect(drawer).not.toHaveAttribute("open", "");
});

test("journal: the reading bar grows as the page scrolls", async ({ page }) => {
  await page.goto(`${DOCS}/examples/journal/index.html`);
  const bar = page.locator(".iv-scroll-progress");
  await bar.waitFor({ state: "attached" });
  const width = async () => (await bar.boundingBox())?.width ?? 0;
  const before = await width();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  expect(await width()).toBeGreaterThan(before);
});
