// Persona round 2026-11-09, site chrome: forced colours, contrast, the shapes screen readers hear,
// Spanish leftovers and the phone layout. Against the built site on 4321.
import { test, expect } from "@playwright/test";

const DOCS = "http://127.0.0.1:4321";
const PHONE = { width: 390, height: 844 };

function lum(rgb) {
  const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test.describe("Site polish", () => {
  test("forced colours keep pressed and selected controls visible, and the header label is drawn once", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "forced-colors emulation is Chromium-only in Playwright");
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto(DOCS + "/components/dialog");
    const pressed = page.locator('.docs-header .docs-theme [aria-pressed="true"]');
    const other = page.locator('.docs-header .docs-theme [aria-pressed="false"]').first();
    await expect(pressed).toHaveCount(1);
    const [bgOn, bgOff] = await Promise.all([pressed.evaluate((el) => getComputedStyle(el).backgroundColor), other.evaluate((el) => getComputedStyle(el).backgroundColor)]);
    expect(bgOn).not.toBe(bgOff);
    const seg = page.locator('[data-stage] .docs-stage__seg button[aria-pressed="true"]').first();
    const segOff = page.locator('[data-stage] .docs-stage__seg button[aria-pressed="false"]').first();
    expect(await seg.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(await segOff.evaluate((el) => getComputedStyle(el).backgroundColor));
    await expect(page.locator(".docs-roll__b").first()).toBeHidden();
  });

  test("the page has no browser margin and the active showreel tab reads at 4.5:1 in light", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(DOCS + "/");
    await page.evaluate(() => document.querySelector('[data-set-theme="light"]').click());
    expect(await page.evaluate(() => getComputedStyle(document.body).margin)).toBe("0px");
    const tab = page.locator('.docs-showreel__tab[aria-selected="true"]');
    await tab.scrollIntoViewIfNeeded();
    const { fg, bg } = await tab.evaluate((el) => {
      // The fill is a gradient: measure the ink against both of its ends.
      const cs = getComputedStyle(el);
      const probe = document.createElement("span");
      el.append(probe);
      probe.style.color = "var(--iv-color-primary)"; const a = getComputedStyle(probe).color;
      probe.style.color = "var(--iv-color-accent)"; const b = getComputedStyle(probe).color;
      probe.remove();
      return { fg: cs.color, bg: [a, b] };
    });
    for (const c of bg) expect(ratio(fg, c), `${fg} on ${c}`).toBeGreaterThanOrEqual(4.5);
  });

  test("headings are heard once, and the home index says what kind each component is", async ({ page }) => {
    await page.goto(DOCS + "/components/button");
    const h2 = page.locator(".docs-prose h2").first();
    await expect(h2.locator("a.docs-anchor")).toHaveCount(1);
    const name = await h2.textContent();
    expect(name).not.toMatch(/Link to this section|#/);
    await expect(page.getByRole("heading", { level: 2, name: name.trim(), exact: true })).toHaveCount(1);
    await page.goto(DOCS + "/");
    await expect(page.getByRole("link", { name: /^Button\s*,\s*CSS only$/ })).toHaveCount(1);
    await expect(page.getByRole("link", { name: /^Dialog\s*,\s*with JavaScript$/ })).toHaveCount(1);
  });

  test("the Spanish home speaks Spanish in its stages and copy buttons", async ({ page }) => {
    await page.goto(DOCS + "/es");
    const titles = await page.locator("iframe[data-stage-frame]").evaluateAll((els) => els.map((e) => e.title));
    expect(titles.length).toBeGreaterThan(0);
    for (const t of titles) expect(t).toMatch(/en vivo$/);
    await expect(page.locator(".docs-copy").first()).toHaveText("Copiar");
  });

  test("on a phone the footer does not repeat the navigation, and option tables read as cards", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto(DOCS + "/components/dialog");
    await expect(page.locator(".docs-sitemap")).toBeHidden();
    const table = page.locator(".docs-scroller > table[data-stack]").first();
    await expect(table).toHaveCount(1);
    const fits = await table.evaluate((t) => t.scrollWidth <= t.parentElement.clientWidth + 1);
    expect(fits).toBe(true);
    await expect(table.locator("td[data-label]").first()).toHaveAttribute("data-label", /\S/);
  });

  test("the one-colour section takes any colour, with the ink and the ratio measured", async ({ page }) => {
    await page.goto(DOCS + "/foundations/tokens-and-themes");
    const field = page.locator("[data-oc-custom]");
    await expect(field).toBeVisible();
    await field.evaluate((el) => { el.value = "#ffb000"; el.dispatchEvent(new Event("input", { bubbles: true })); });
    await expect(page.locator(".docs-oc__stage .iv-button--primary")).toHaveCSS("background-color", "rgb(255, 176, 0)");
    await expect(page.locator("[data-oc-value]")).toHaveText("#FFB000");
    await expect(page.locator("[data-oc-on]")).toHaveText("#06122B");
    await expect(page.locator("[data-oc-custom-ratio]")).toBeVisible();
    await expect(page.locator("[data-oc-custom-ratio]")).toContainText(":1");
  });

  test("the new pages exist in both languages and are linked from the navigation and the footer", async ({ page, request }) => {
    for (const p of ["/maintenance", "/foundations/frameworks"]) {
      for (const path of [p, `/es${p}`]) expect((await request.get(DOCS + path)).status(), path).toBe(200);
    }
    await page.goto(DOCS + "/foundations/stability");
    await expect(page.locator('.docs-footer a[href="/maintenance"]').first()).toBeVisible();
    await expect(page.locator('main a[href="/maintenance"]')).toHaveCount(1);
    await page.goto(DOCS + "/maintenance");
    await expect(page.locator('a[href$="/security/advisories/new"]')).toHaveCount(1);
    await expect(page.locator("main")).toContainText("12 months");
  });
});
