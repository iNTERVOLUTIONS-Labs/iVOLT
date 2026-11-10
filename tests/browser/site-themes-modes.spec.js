// Themes in both modes (persona round, 2026-11-09): the builder printed one mode only and every
// gallery theme.css forced color-scheme and hijacked every [data-iv-theme], so a page with a
// light/dark switch stopped switching. Now a theme is a pair and the switch keeps working.
import { test, expect } from "@playwright/test";

const DOCS = "http://127.0.0.1:4321";
const setColour = (page, name, hex) => page.locator(`input[name="${name}"]`).evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }, hex);

test.describe("Themes in light and dark", () => {
  test("a gallery theme.css keeps the page's own switch working: light, dark and system", async ({ page, request }) => {
    const css = await (await request.get(`${DOCS}/themes/ocean.css`)).text();
    expect(css).not.toMatch(/(?<!-)color-scheme\s*:/);
    expect(css).not.toMatch(/\[data-iv-theme\]\s*\{[^}]*--iv-color-/);
    expect(css).toContain('[data-iv-theme="dark"]');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    // Applied to a real page: the switch on <html> picks the block.
    await page.goto(`${DOCS}/stage/button/variants.html`);
    await page.addStyleTag({ content: css });
    const primary = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--iv-color-primary").trim().toUpperCase());
    await page.evaluate(() => document.documentElement.setAttribute("data-iv-theme", "light"));
    expect(await primary()).toBe("#0F766E");
    await page.evaluate(() => document.documentElement.setAttribute("data-iv-theme", "dark"));
    expect(await primary()).toBe("#2DD4BF");
    await page.emulateMedia({ colorScheme: "dark" });
    await page.evaluate(() => document.documentElement.setAttribute("data-iv-theme", "system"));
    expect(await primary()).toBe("#2DD4BF");
    await page.emulateMedia({ colorScheme: "light" });
    expect(await primary()).toBe("#0F766E");
  });

  test("every preset passes 4.5:1 in both of its modes", async () => {
    const { presets, checks } = await import("../../apps/docs/src/data/themes.js");
    for (const p of presets) for (const c of checks(p)) {
      expect(c.light, `${p.slug} ${c.key} light`).toBeGreaterThanOrEqual(4.5);
      expect(c.dark, `${p.slug} ${c.key} dark`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("the gallery cards follow the site's mode", async ({ page }) => {
    await page.goto(DOCS + "/themes");
    await page.locator('.docs-header [data-set-theme="light"]').click().catch(async () => { await page.evaluate(() => document.querySelector('[data-set-theme="light"]').click()); });
    await expect(page.locator("#ocean [data-tcard-stage]")).toHaveAttribute("data-iv-theme", "light");
    await expect(page.locator("#ocean .iv-button--primary")).toHaveCSS("background-color", "rgb(15, 118, 110)");
    await page.evaluate(() => document.querySelector('[data-set-theme="dark"]').click());
    await expect(page.locator("#ocean [data-tcard-stage]")).toHaveAttribute("data-iv-theme", "dark");
    await expect(page.locator("#ocean .iv-button--primary")).toHaveCSS("background-color", "rgb(45, 212, 191)");
  });

  test("the builder keeps both modes, prints both blocks and shares both", async ({ page }) => {
    await page.goto(DOCS + "/foundations/theme-builder");
    const out = page.locator("[data-tb-output]");
    await page.locator('input[name="theme"][value="dark"]').check();
    await setColour(page, "primary", "#ffb000");
    await page.locator('input[name="theme"][value="light"]').check();
    await setColour(page, "primary", "#7a1fd6");
    await expect(out).toContainText(':root, [data-iv-theme="light"]');
    await expect(out).toContainText('[data-iv-theme="dark"]');
    await expect(out).toContainText('@media (prefers-color-scheme: dark)');
    const text = await out.textContent();
    expect(text).toContain("--iv-color-primary: #7a1fd6");
    expect(text).toContain("--iv-color-primary: #ffb000");
    // The ink on each primary is picked by contrast: navy on amber, white on violet.
    expect(text).toContain("--iv-color-on-primary: #06122b");
    expect(text).toContain("--iv-color-on-primary: #ffffff");
    await expect(page.locator("[data-tb-ratio]")).toContainText(/:1/);
    // Switching the mode shows that mode's own values.
    await page.locator('input[name="theme"][value="dark"]').check();
    await expect(page.locator('input[name="primary"]')).toHaveValue("#ffb000");
    await expect(page.locator("[data-tb-preview] .iv-button--primary").first()).toHaveCSS("background-color", "rgb(255, 176, 0)");
    // The link carries both.
    const hash = await page.evaluate(() => location.hash);
    expect(hash).toContain("light-primary=7a1fd6");
    expect(hash).toContain("dark-primary=ffb000");
    await page.goto("about:blank");
    await page.goto(DOCS + "/foundations/theme-builder" + hash);
    await expect(out).toContainText("--iv-color-primary: #7a1fd6");
    await expect(out).toContainText("--iv-color-primary: #ffb000");
    // Download theme.css is offered and gives the same text.
    const dl = page.locator("[data-tb-download]");
    await expect(dl).toBeVisible();
    const [file] = await Promise.all([page.waitForEvent("download"), dl.click()]);
    expect(file.suggestedFilename()).toBe("theme.css");
  });

  test("a low ink is flagged, and old one-mode links still open", async ({ page }) => {
    await page.goto(DOCS + "/foundations/theme-builder#theme=dark&primary=2dd4bf");
    await expect(page.locator("[data-tb-output]")).toContainText('[data-iv-theme="dark"]');
    await expect(page.locator("[data-tb-output]")).toContainText("--iv-color-primary: #2dd4bf");
    await setColour(page, "on-primary", "#7fe0d0");
    await expect(page.locator("[data-tb-ratio]")).toHaveClass(/is-low/);
    await expect(page.locator("[data-tb-ratio]")).toContainText("4.5");
  });
});
