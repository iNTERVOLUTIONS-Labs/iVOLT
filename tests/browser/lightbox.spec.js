import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Records the events of a gallery from the first paint, before `init` runs.
 *
 * @param {import("@playwright/test").Page} page Page under test.
 * @returns {Promise<void>} Resolves once the hook is installed.
 */
async function recordEvents(page) {
  await page.addInitScript(() => {
    /** @type {Array<Array<unknown>>} */
    window.__ev = [];
    for (const type of ["iv:open", "iv:opened", "iv:close", "iv:closed", "iv:change", "iv:changed", "iv:zoom"]) {
      document.addEventListener(
        type,
        (event) => {
          const target = /** @type {Element} */ (event.target);
          if (!target.classList || !target.classList.contains("iv-gallery")) return;
          const detail = /** @type {CustomEvent} */ (event).detail ?? {};
          window.__ev.push([type, detail.index, detail.previousIndex ?? null, detail.reason ?? null, detail.zoomed ?? null]);
        },
        true
      );
    }
  });
}

test.describe("Lightbox", () => {
  test("generates the viewer, opens on the item clicked and returns focus on close", async ({ page }) => {
    await recordEvents(page);
    await page.goto("/fixture/lightbox/basic");
    await expect(page.locator("html")).toHaveAttribute("data-iv-js", "");

    const gallery = page.locator(".iv-gallery");
    const items = gallery.locator(".iv-gallery__item");
    await expect(items).toHaveCount(6);

    const dialog = page.locator("dialog.iv-lightbox");
    await expect(dialog).toHaveCount(1);
    await expect(dialog).toHaveAttribute("aria-label", "Image viewer");
    // Generated right after the gallery, inside the same root.
    expect(await page.evaluate(() => document.querySelector(".iv-gallery").nextElementSibling.tagName)).toBe("DIALOG");
    await expect(dialog).not.toBeVisible();

    await items.nth(2).click();
    await expect(dialog).toBeVisible();
    const img = dialog.locator(".iv-lightbox__img");
    const href = await items.nth(2).getAttribute("href");
    await expect(img).toHaveAttribute("src", href ?? "");
    await expect(img).toHaveAttribute("alt", /Abstract landscape/);
    await expect(dialog.locator(".iv-lightbox__counter")).toHaveText("3 / 6");
    await expect(dialog.locator(".iv-lightbox__caption")).toContainText("sample artwork for the fixture");
    await expect(dialog.locator(".iv-lightbox__close")).toBeFocused();

    await page.keyboard.press("Escape");
    // The native close, and with it `iv:closed`, lands one task later than the
    // `open` attribute (ADR-040): poll the event, never read it straight away.
    await expect.poll(async () => (await page.evaluate(() => window.__ev)).map((e) => e[0])).toContain("iv:closed");
    await expect(dialog).not.toBeVisible();
    await expect(items.nth(2)).toBeFocused();

    const log = await page.evaluate(() => window.__ev);
    expect(log.map((e) => e[0])).toEqual(["iv:open", "iv:opened", "iv:close", "iv:closed"]);
    expect(log[1][1]).toBe(2);
    expect(log[3][1]).toBe(2);
    expect(log[3][3]).toBe("escape");
  });

  test("changes with the buttons and the keyboard, loops and reports every move", async ({ page }) => {
    await recordEvents(page);
    await page.goto("/fixture/lightbox/basic");
    const dialog = page.locator("dialog.iv-lightbox");
    const counter = dialog.locator(".iv-lightbox__counter");
    await page.locator(".iv-gallery__item").first().click();
    await expect(counter).toHaveText("1 / 6");

    await dialog.locator(".iv-lightbox__next").click();
    await expect(counter).toHaveText("2 / 6");
    await dialog.locator(".iv-lightbox__prev").click();
    await expect(counter).toHaveText("1 / 6");
    // Wraps backwards from the first image.
    await dialog.locator(".iv-lightbox__prev").click();
    await expect(counter).toHaveText("6 / 6");

    await page.keyboard.press("Home");
    await expect(counter).toHaveText("1 / 6");
    await page.keyboard.press("ArrowRight");
    await expect(counter).toHaveText("2 / 6");
    await page.keyboard.press("End");
    await expect(counter).toHaveText("6 / 6");
    await page.keyboard.press("ArrowRight");
    await expect(counter).toHaveText("1 / 6");

    const src = await dialog.locator(".iv-lightbox__img").getAttribute("src");
    const first = await page.locator(".iv-gallery__item").first().getAttribute("href");
    expect(src).toBe(first);

    const changes = (await page.evaluate(() => window.__ev)).filter((e) => e[0] === "iv:changed");
    expect(changes).toHaveLength(7);
    expect(changes[0].slice(1, 4)).toEqual([1, 0, "next"]);
    expect(changes[2].slice(1, 4)).toEqual([5, 0, "prev"]);
    expect(changes.slice(3).every((e) => e[3] === "keyboard")).toBe(true);
  });

  test("zooms with the button and with Z, and scrolls the stage instead of the page", async ({ page }) => {
    await recordEvents(page);
    await page.goto("/fixture/lightbox/basic");
    const dialog = page.locator("dialog.iv-lightbox");
    const stage = dialog.locator(".iv-lightbox__stage");
    await page.locator(".iv-gallery__item").nth(1).click();

    await dialog.locator(".iv-lightbox__zoom").click();
    await expect(stage).toHaveAttribute("data-iv-zoomed", "");
    await expect(dialog.locator(".iv-lightbox__zoom")).toHaveAttribute("aria-pressed", "true");
    expect(await stage.evaluate((el) => getComputedStyle(el).overflowY)).toBe("auto");

    // A scroll container reachable from the keyboard, and the arrows are its own.
    await expect(stage).toHaveAttribute("tabindex", "0");
    await page.keyboard.press("ArrowRight");
    await expect(dialog.locator(".iv-lightbox__counter")).toHaveText("2 / 6");

    await page.keyboard.press("z");
    await expect(stage).not.toHaveAttribute("data-iv-zoomed", "");
    await expect(stage).not.toHaveAttribute("tabindex", "0");
    await expect(dialog.locator(".iv-lightbox__zoom")).toHaveAttribute("aria-pressed", "false");

    // Zooming and moving on never leaves the stage zoomed behind.
    await page.keyboard.press("z");
    await expect(stage).toHaveAttribute("data-iv-zoomed", "");
    await dialog.locator(".iv-lightbox__next").click();
    await expect(stage).not.toHaveAttribute("data-iv-zoomed", "");

    const zooms = (await page.evaluate(() => window.__ev)).filter((e) => e[0] === "iv:zoom");
    expect(zooms.map((e) => e[4])).toEqual([true, false, true, false]);
  });

  test("changes with a horizontal drag over the stage", async ({ page }) => {
    await page.goto("/fixture/lightbox/basic");
    const dialog = page.locator("dialog.iv-lightbox");
    const counter = dialog.locator(".iv-lightbox__counter");
    await page.locator(".iv-gallery__item").first().click();
    await expect(counter).toHaveText("1 / 6");

    const box = await dialog.locator(".iv-lightbox__stage").boundingBox();
    expect(box).not.toBeNull();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.7, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.3, y, { steps: 8 });
    await page.mouse.up();
    await expect(counter).toHaveText("2 / 6");

    await page.mouse.move(box.x + box.width * 0.3, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, y, { steps: 8 });
    await page.mouse.up();
    await expect(counter).toHaveText("1 / 6");
  });

  test("a click on the dark surround closes, a click on the picture does not", async ({ page }) => {
    await page.goto("/fixture/lightbox/basic");
    const dialog = page.locator("dialog.iv-lightbox");
    await page.locator(".iv-gallery__item").first().click();
    await dialog.locator(".iv-lightbox__img").click();
    await expect(dialog).toBeVisible();
    // Far from the picture, the chips and the caption bar: the dark surround.
    const box = await dialog.locator(".iv-lightbox__stage").boundingBox();
    await page.mouse.click(box.x + 10, box.y + 120);
    await expect.poll(async () => dialog.evaluate((el) => el.hasAttribute("open"))).toBe(false);
  });

  test("destroy removes the generated viewer and leaves the gallery as served", async ({ page }) => {
    await page.goto("/fixture/lightbox/basic");
    await page.locator(".iv-gallery__item").first().click();
    const result = await page.evaluate(async () => {
      const mod = await import("/packages/ivolt/dist/js/components/lightbox.js");
      const el = document.querySelector(".iv-gallery");
      const before = el.outerHTML;
      mod.Lightbox.get(el).destroy();
      return {
        dialogs: document.querySelectorAll(".iv-lightbox").length,
        same: el.outerHTML === before,
        instance: mod.Lightbox.get(el) === undefined,
      };
    });
    expect(result).toEqual({ dialogs: 0, same: true, instance: true });
  });

  test("without JavaScript the gallery is still a list of links to the full image", async ({ page }) => {
    await page.goto("/fixture/lightbox/basic?nojs=1");
    await expect(page.locator("html")).not.toHaveAttribute("data-iv-js", "");
    await expect(page.locator("dialog.iv-lightbox")).toHaveCount(0);
    const items = page.locator(".iv-gallery__item");
    await expect(items).toHaveCount(6);
    for (const item of await items.all()) {
      const href = await item.getAttribute("href");
      const src = await item.locator("img").getAttribute("src");
      expect(href).toBe(src);
      expect(href.startsWith("data:image/svg+xml,")).toBe(true);
    }
  });

  for (const fixture of ["basic", "masonry", "strip"]) {
    test(`${fixture}: lays out without sideways scrolling at 390 and at 1200`, async ({ page }) => {
      for (const width of [390, 1200]) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`/fixture/lightbox/${fixture}`);
        const overflow = await page.evaluate(() =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow, `${fixture} at ${width}`).toBeLessThanOrEqual(1);
        await expect(page.locator(".iv-gallery__item").first()).toBeVisible();
      }
    });
  }

  test("the strip snaps and the masonry flows in columns", async ({ page }) => {
    await page.goto("/fixture/lightbox/strip");
    const strip = page.locator(".iv-gallery--strip");
    expect(await strip.evaluate((el) => getComputedStyle(el).scrollSnapType)).toContain("x");
    expect(await strip.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await strip.locator(".iv-gallery__item").nth(1).click();
    await expect(page.locator("dialog.iv-lightbox")).toBeVisible();

    await page.goto("/fixture/lightbox/masonry");
    const masonry = page.locator(".iv-gallery--masonry");
    expect(await masonry.evaluate((el) => getComputedStyle(el).columnWidth)).not.toBe("auto");
    const heights = await masonry
      .locator(".iv-gallery__img")
      .evaluateAll((nodes) => nodes.map((n) => Math.round(n.getBoundingClientRect().height)));
    expect(new Set(heights).size).toBeGreaterThan(1);
  });

  for (const theme of ["light", "dark"]) {
    for (const fixture of ["basic", "masonry", "strip"]) {
      test(`axe lightbox/${fixture} (${theme})`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(`/fixture/lightbox/${fixture}?theme=${theme}`);
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        const serious = results.violations.filter((v) => ["critical", "serious"].includes(v.impact));
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      });
    }

    test(`axe the open viewer, zoomed and not (${theme})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/fixture/lightbox/basic?theme=${theme}`);
      await page.locator(".iv-gallery__item").nth(1).click();
      const dialog = page.locator("dialog.iv-lightbox");
      await expect(dialog).toBeVisible();
      for (const zoomed of [false, true]) {
        if (zoomed) {
          await dialog.locator(".iv-lightbox__zoom").click();
          await expect(dialog.locator(".iv-lightbox__stage")).toHaveAttribute("data-iv-zoomed", "");
        }
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        const serious = results.violations.filter((v) => ["critical", "serious"].includes(v.impact));
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), `zoomed=${zoomed}`).toEqual([]);
      }
    });
  }
});
