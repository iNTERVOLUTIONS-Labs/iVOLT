// Adversarial review of the documentation shell: nothing may scroll sideways, the header has to fit
// in both languages, and a fragment target must land below the sticky header.
// These run against the built site on 127.0.0.1:4321, which the Playwright config starts.
import { test, expect } from "@playwright/test";

const DOCS = "http://127.0.0.1:4321";
const widths = [320, 390, 768, 1024, 1366, 1440];
const routes = [
  "/",
  "/es",
  "/getting-started",
  "/contributing",
  "/examples",
  "/foundations/coexistence",
  "/components/badge",
  "/es/contributing",
  "/es/examples",
  "/es/foundations/coexistence",
  "/es/components/badge",
  "/es/components/combobox",
];

const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const route of routes) {
  test(`no sideways scroll on ${route}`, async ({ page }) => {
    await page.goto(DOCS + route);
    await page.evaluate(() => document.fonts.ready);
    for (const width of widths) {
      await page.setViewportSize({ width, height: width === 1366 ? 610 : 800 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      expect(await overflow(page), `${route} at ${width}px`).toBeLessThanOrEqual(1);
    }
  });
}

// The Spanish labels are longer than the English ones: the header used to push the page 73px wide
// at 1024, where the whole primary nav was still on display.
test("the header fits at 1024 in both languages", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  for (const route of ["/components/badge", "/es/components/badge"]) {
    await page.goto(DOCS + route);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    const right = await page.evaluate(() => {
      const inner = document.querySelector(".docs-header__inner");
      return Math.max(...[...inner.children].map((c) => c.getBoundingClientRect().right));
    });
    expect(right, `${route} header`).toBeLessThanOrEqual(1024);
    expect(await overflow(page), route).toBeLessThanOrEqual(1);
  }
});

// A word with no break opportunity inside inline code used to widen every page that carried one.
test("long inline code wraps instead of widening the page", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(DOCS + "/getting-started");
  await page.evaluate(() => document.fonts.ready);
  const widened = await page.evaluate(() => {
    const p = document.querySelector(".docs-prose p");
    const code = document.createElement("code");
    code.textContent = "supercalifragilisticexpialidociousantidisestablishmentarianism";
    p.append(" ", code);
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });
  expect(widened).toBeLessThanOrEqual(1);
});

test("a fragment target stops below the sticky header", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of ["/foundations/accessibility", "/es/components/form"]) {
    await page.goto(DOCS + route);
    const ids = await page.evaluate(() => [...document.querySelectorAll(".docs-prose h2[id], .docs-prose h3[id]")].map((h) => h.id).slice(0, 3));
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      await page.evaluate((target) => { window.location.hash = ""; window.location.hash = `#${target}`; }, id);
      await page.waitForTimeout(300);
      const { top, headerBottom } = await page.evaluate((target) => ({
        top: document.getElementById(target).getBoundingClientRect().top,
        headerBottom: document.querySelector(".docs-header").getBoundingClientRect().bottom,
      }), id);
      expect(top, `${route}#${id}`).toBeGreaterThanOrEqual(headerBottom - 1);
    }
  }
});

// Three client-side navigations and a language switch: the shell has to survive all of them.
test("the shell still works after three navigations and a language switch", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(DOCS + "/");
  for (const href of ["/getting-started", "/components/button", "/foundations/typography"]) {
    await page.locator(`a[href="${href}"]:visible`).first().click();
    await page.waitForTimeout(600);
  }
  await expect(page.locator(".docs-sidebar .docs-sidebar__list a").first()).toBeVisible();
  await expect(page.locator("#docs-toc-list li").first()).toBeVisible();
  await page.click('[data-set-theme="light"]');
  await expect(page.locator("html")).toHaveAttribute("data-iv-theme", "light");
  await page.keyboard.press("/");
  await expect(page.locator("#docs-search")).toHaveAttribute("open", "");
  await page.fill("#docs-search-input", "button");
  await expect(page.locator("#docs-search-results > li").first()).toBeVisible();
  // The first Escape is eaten by the search input, which clears its own value; the second closes.
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.locator("#docs-search")).not.toHaveAttribute("open", "");
  await page.locator(".docs-header .docs-lang").click();
  await page.waitForTimeout(700);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator(".docs-sidebar .docs-sidebar__list a").first()).toBeVisible();
  await page.keyboard.press("/");
  await expect(page.locator("#docs-search")).toHaveAttribute("open", "");
});
