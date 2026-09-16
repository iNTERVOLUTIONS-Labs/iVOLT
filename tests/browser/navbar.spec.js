import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const FIXTURES = ["navbar/basic", "navbar/transparent", "navbar/megamenu", "navbar/hide"];

/**
 * Runs axe on the page and returns the serious findings, already formatted.
 *
 * @param {import("@playwright/test").Page} page The page.
 * @returns {Promise<string[]>} One line per serious or critical violation.
 */
async function serious(page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  return results.violations
    .filter((v) => ["critical", "serious"].includes(v.impact))
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test.describe("Navbar", () => {
  test("wide viewport: the panel is the bar and the toggle stays out", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/fixture/navbar/basic");
    await expect(page.locator("html")).toHaveAttribute("data-iv-js", "");
    const header = page.locator(".iv-navbar");
    await expect(header).not.toHaveAttribute("data-iv-collapsible", "");
    await expect(page.locator(".iv-navbar__toggle")).toBeHidden();
    await expect(page.locator(".iv-navbar__panel")).toBeVisible();
    await expect(page.locator(".iv-navbar__link").first()).toBeVisible();

    // The bar and the first link sit on the same row: the panel is in line.
    const bar = await page.locator(".iv-navbar__brand").boundingBox();
    const link = await page.locator(".iv-navbar__link").first().boundingBox();
    expect(Math.abs(bar.y - link.y)).toBeLessThan(bar.height);
    expect(link.x).toBeGreaterThan(bar.x + bar.width);
  });

  test("sticky: condenses past the offset and comes back at the top", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/fixture/navbar/basic");
    const header = page.locator(".iv-navbar");
    const tall = await header.boundingBox();

    const condensed = page.evaluate(
      () =>
        new Promise((resolve) => {
          document.querySelector(".iv-navbar").addEventListener(
            "iv:condense",
            (event) => resolve(event.detail.condensed),
            { once: true }
          );
        })
    );
    await page.mouse.wheel(0, 400);
    expect(await condensed).toBe(true);
    await expect(header).toHaveAttribute("data-iv-condensed", "");
    // The condensed height arrives with a transition, so the box right after
    // the event is still the tall one: wait until it has actually shrunk.
    await expect
      .poll(async () => (await header.boundingBox()).height)
      .toBeLessThan(tall.height);
    const short = await header.boundingBox();
    // Sticky: the header is still at the top of the viewport after scrolling.
    expect(short.y).toBeLessThanOrEqual(1);

    // A wheel step back does not always reach the top in WebKit; the state is about the position.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(header).not.toHaveAttribute("data-iv-condensed", "");
  });

  test("narrow viewport: the burger folds and unfolds the panel", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/fixture/navbar/basic");
    const header = page.locator(".iv-navbar");
    const toggle = page.locator(".iv-navbar__toggle");
    const panel = page.locator(".iv-navbar__panel");
    await expect(header).toHaveAttribute("data-iv-collapsible", "");
    await expect(toggle).toBeVisible();
    await expect(panel).toBeHidden();

    await toggle.click();
    await expect(header).toHaveAttribute("data-iv-open", "");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toBeVisible();
    // The unfolded panel never grows past the viewport.
    const box = await panel.boundingBox();
    expect(box.height).toBeLessThanOrEqual(800);
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(over).toBeLessThanOrEqual(0);

    // Escape closes and hands the focus back.
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(toggle).toBeFocused();

    // A click outside closes it too.
    await toggle.click();
    await expect(panel).toBeVisible();
    await page.locator("#nav-note").click();
    await expect(panel).toBeHidden();
  });

  test("crossing the breakpoint folds the panel and destroy restores the markup", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/fixture/navbar/basic");
    await page.locator(".iv-navbar__toggle").click();
    await expect(page.locator(".iv-navbar")).toHaveAttribute("data-iv-open", "");
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator(".iv-navbar")).not.toHaveAttribute("data-iv-open", "");
    await expect(page.locator(".iv-navbar__panel")).toBeVisible();

    const restored = await page.evaluate(async () => {
      const mod = await import("/packages/ivolt/dist/js/components/navbar.js");
      const el = document.querySelector(".iv-navbar");
      const before = el.outerHTML;
      mod.Navbar.get(el).destroy();
      return {
        changed: before !== el.outerHTML,
        toggleHidden: el.querySelector(".iv-navbar__toggle").hidden,
        state: el.hasAttribute("data-iv-open") || el.hasAttribute("data-iv-collapsible") || el.hasAttribute("data-iv-condensed"),
        padding: document.documentElement.style.getPropertyValue("scroll-padding-block-start"),
      };
    });
    expect(restored.changed).toBe(true);
    expect(restored.toggleHidden).toBe(true);
    expect(restored.state).toBe(false);
    expect(restored.padding).toBe("");
  });

  test("hideOnScroll: slides away on the way down, returns on the way up, never while the panel is open", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/fixture/navbar/hide");
    const header = page.locator(".iv-navbar");
    await expect(header).not.toHaveAttribute("data-iv-hidden", "");
    await page.mouse.wheel(0, 600);
    await expect(header).toHaveAttribute("data-iv-hidden", "");
    // The bar is translated out of the viewport, not display: none, so it can slide back.
    // The bar slides over a transition; a loaded machine can take seconds to paint it.
    await expect.poll(async () => (await header.boundingBox()).y, { timeout: 15_000 }).toBeLessThan(0);
    await page.mouse.wheel(0, -200);
    await expect(header).not.toHaveAttribute("data-iv-hidden", "");
    await expect.poll(async () => (await header.boundingBox()).y, { timeout: 15_000 }).toBeGreaterThanOrEqual(0);

    // Narrow: an open panel pins the bar even while scrolling down.
    await page.setViewportSize({ width: 390, height: 800 });
    await page.mouse.wheel(0, -2000);
    await page.locator(".iv-navbar__toggle").click();
    await expect(header).toHaveAttribute("data-iv-open", "");
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(250);
    await expect(header).not.toHaveAttribute("data-iv-hidden", "");
  });

  test("transparent: light text over the cover, page colours once condensed", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/fixture/navbar/transparent");
    const header = page.locator(".iv-navbar");
    const over = await header.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(over).toBe("rgba(0, 0, 0, 0)");
    await page.mouse.wheel(0, 500);
    await expect(header).toHaveAttribute("data-iv-condensed", "");
    // The surface fades in over one transition: poll it instead of reading the
    // first frame, which still holds the transparent value.
    await expect
      .poll(() => header.evaluate((el) => getComputedStyle(el).backgroundColor))
      .not.toBe("rgba(0, 0, 0, 0)");
  });

  test("megamenu inside the panel keeps working", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/fixture/navbar/megamenu");
    const toggle = page.locator(".iv-megamenu__toggle").first();
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".iv-megamenu__panel").first()).toBeVisible();
    // The panel drops from the whole bar and stays inside the viewport: inside a
    // header the list is a handful of links at the end of the row, and placing
    // the panel against it would push it off screen.
    const header = await page.locator(".iv-navbar").boundingBox();
    const panel = await page.locator(".iv-megamenu__panel").first().boundingBox();
    expect(panel.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(1200);
  });

  test("a root marked data-iv-js before init folds the panel from the first paint below lg and keeps the bar above it", async ({ page }) => {
    // The marker without the script is exactly the state between the first paint and `init`.
    // Init scripts run before <html> exists, so the marker waits for it.
    await page.addInitScript(() => {
      const mark = () => document.documentElement && (document.documentElement.setAttribute("data-iv-js", ""), true);
      if (!mark()) new MutationObserver((_, o) => { if (mark()) o.disconnect(); }).observe(document, { childList: true });
    });
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/fixture/navbar/basic?nojs=1");
    await expect(page.locator(".iv-navbar__panel")).toBeHidden();
    await expect(page.locator(".iv-navbar__toggle")).toBeHidden();
    const bar = await page.locator(".iv-navbar").boundingBox();
    expect(bar.height).toBeLessThan(120);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator(".iv-navbar__panel")).toBeVisible();
    await expect(page.locator(".iv-navbar__link").first()).toBeVisible();
  });

  test("without JavaScript the panel is served open", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/fixture/navbar/basic?nojs=1");
    await expect(page.locator(".iv-navbar__panel")).toBeVisible();
    await expect(page.locator(".iv-navbar__toggle")).toBeHidden();
    await expect(page.locator(".iv-navbar__link").first()).toBeVisible();
  });

  for (const theme of ["light", "dark"]) {
    for (const fixture of FIXTURES) {
      test(`axe ${fixture} (${theme})`, async ({ page }) => {
        // Entrance animations fade content in over time and axe folds opacity into
        // the foreground colour; the audited state is the settled one.
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(`/fixture/${fixture}?theme=${theme}`);
        expect(await serious(page)).toEqual([]);
      });
    }

    test(`axe navbar/basic with the panel open (${theme})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 390, height: 800 });
      await page.goto(`/fixture/navbar/basic?theme=${theme}`);
      await page.locator(".iv-navbar__toggle").click();
      await expect(page.locator(".iv-navbar__panel")).toBeVisible();
      expect(await serious(page)).toEqual([]);
    });

    test(`axe navbar/transparent condensed (${theme})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`/fixture/navbar/transparent?theme=${theme}`);
      await page.mouse.wheel(0, 500);
      await expect(page.locator(".iv-navbar")).toHaveAttribute("data-iv-condensed", "");
      expect(await serious(page)).toEqual([]);
    });

    test(`axe navbar/megamenu with a panel open (${theme})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`/fixture/navbar/megamenu?theme=${theme}`);
      await page.locator(".iv-megamenu__toggle").first().click();
      await expect(page.locator(".iv-megamenu__panel").first()).toBeVisible();
      expect(await serious(page)).toEqual([]);
    });
  }
});
