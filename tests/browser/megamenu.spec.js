import { test, expect } from "@playwright/test";

test.describe("Megamenu", () => {
  test("toggles open panels, keyboard moves and closes, overlay and inert follow the state, destroy restores", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/fixture/megamenu/basic");
    await expect(page.locator("html")).toHaveAttribute("data-iv-js", "");
    const root = page.locator(".iv-megamenu").first();
    const toggles = root.locator(".iv-megamenu__toggle");
    expect(await toggles.count()).toBeGreaterThanOrEqual(2);
    await expect(toggles.first()).toBeVisible();
    await expect(toggles.first()).toHaveAttribute("aria-expanded", "false");
    const panels = root.locator(".iv-megamenu__panel");
    expect(await panels.first().getAttribute("inert")).not.toBeNull();

    await toggles.first().click();
    await expect(toggles.first()).toHaveAttribute("aria-expanded", "true");
    await expect(panels.first()).toBeVisible();
    expect(await panels.first().getAttribute("inert")).toBeNull();
    await expect(root.locator(".iv-megamenu__overlay")).toBeVisible();

    // Opening another item closes the first.
    await toggles.nth(1).click();
    await expect(toggles.first()).toHaveAttribute("aria-expanded", "false");
    await expect(toggles.nth(1)).toHaveAttribute("aria-expanded", "true");

    // Escape closes and returns focus to the toggle.
    await page.keyboard.press("Escape");
    await expect(toggles.nth(1)).toHaveAttribute("aria-expanded", "false");
    await expect(toggles.nth(1)).toBeFocused();
    await expect(root.locator(".iv-megamenu__overlay")).toBeHidden();

    // Arrow keys move between toggles; Down opens.
    await toggles.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(toggles.nth(1)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(toggles.nth(1)).toHaveAttribute("aria-expanded", "true");
    const firstControl = panels.nth(1).locator("button, a").first();
    await expect(firstControl).toBeFocused();
    await page.keyboard.press("Escape");

    // Click outside closes.
    await toggles.first().click();
    await page.mouse.click(5, 790);
    await expect(toggles.first()).toHaveAttribute("aria-expanded", "false");

    const restored = await page.evaluate(async () => {
      const mod = await import("/packages/ivolt/dist/js/components/megamenu.js");
      const el = document.querySelector(".iv-megamenu");
      const before = el.innerHTML;
      mod.Megamenu.get(el).destroy();
      return { overlay: !!el.querySelector(".iv-megamenu__overlay"), inert: el.querySelectorAll("[inert]").length, hiddenToggles: [...el.querySelectorAll(".iv-megamenu__toggle")].every((t) => t.hidden), changed: before !== el.innerHTML };
    });
    expect(restored.overlay).toBe(false);
    expect(restored.inert).toBe(0);
    expect(restored.hiddenToggles).toBe(true);
    expect(restored.changed).toBe(true);
  });

  test("small screens: accordion without overlay", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/fixture/megamenu/basic");
    const root = page.locator(".iv-megamenu").first();
    const toggle = root.locator(".iv-megamenu__toggle").first();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(root.locator(".iv-megamenu__panel").first()).toBeVisible();
    await expect(root.locator(".iv-megamenu__overlay")).toBeHidden();
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over).toBeLessThanOrEqual(0);
  });

  test("without JS: links navigate, panels open on focus within, toggles stay hidden", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/fixture/megamenu/basic?nojs=1");
    const root = page.locator(".iv-megamenu").first();
    await expect(root.locator(".iv-megamenu__toggle").first()).toBeHidden();
    const link = root.locator(".iv-megamenu__link").first();
    await link.focus();
    await expect(root.locator(".iv-megamenu__panel").first()).toBeVisible();
  });

  test("panel head: the close button closes and hands focus back to the toggle", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/fixture/megamenu/basic");
    const root = page.locator(".iv-megamenu").first();
    const toggle = root.locator(".iv-megamenu__toggle").first();
    await toggle.click();
    const close = root.locator(".iv-megamenu__close").first();
    await expect(close).toBeVisible();
    await close.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
  });

  // The caret is a pseudo-element, so it is measured from its used `left` /
  // `right` against the box of the panel: the three engines resolve both.
  const caretCentre = (page, index) =>
    page.evaluate((n) => {
      const panel = document.querySelectorAll(".iv-megamenu__panel")[n];
      const style = getComputedStyle(panel, "::after");
      const rect = panel.getBoundingClientRect();
      return rect.x + Number.parseFloat(style.left) + Number.parseFloat(style.width) / 2;
    }, index);

  test("the caret lands under the open toggle, in both directions", async ({ page }) => {
    // `dir=rtl` used to put it a whole caret width off its toggle: the half-width
    // step was a percentage translation, which is physical and does not mirror.
    for (const dir of ["ltr", "rtl"]) {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/fixture/megamenu/basic?dir=${dir}`);
      const root = page.locator(".iv-megamenu").first();
      const toggles = root.locator(".iv-megamenu__toggle");
      await toggles.nth(1).click();
      // The panel lands with a scale: its box is only final once it settles.
      await expect(root.locator(".iv-megamenu__panel").nth(1)).toHaveCSS("opacity", "1");
      await page.waitForTimeout(300);
      const caret = await page.evaluate(() => {
        const el = document.querySelector(".iv-megamenu");
        return el.style.getPropertyValue("--iv-megamenu-caret-x");
      });
      expect(caret, `caret variable in ${dir}`).not.toBe("");
      const mark = await toggles.nth(1).boundingBox();
      const centre = await caretCentre(page, 1);
      expect(
        Math.abs(centre - (mark.x + mark.width / 2)),
        `caret against its toggle in ${dir}`
      ).toBeLessThanOrEqual(4);
    }
  });

  test("the caret follows its toggle across a resize", async ({ page }) => {
    // In a header the bar is not centred on the page and the panel is: a resize
    // moves one and not the other, and the caret was measured only on opening.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/fixture/navbar/megamenu");
    const root = page.locator(".iv-megamenu").first();
    const toggle = root.locator(".iv-megamenu__toggle").first();
    // Opened from the keyboard on purpose: a click parks the pointer on the
    // toggle, and the resize would slide the item out from under it and close
    // the panel by hover intent halfway through the measurement.
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(root.locator(".iv-megamenu__panel").first()).toHaveCSS("opacity", "1");
    await page.waitForTimeout(300);
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.waitForTimeout(400);
    const mark = await toggle.boundingBox();
    const centre = await caretCentre(page, 0);
    expect(Math.abs(centre - (mark.x + mark.width / 2))).toBeLessThanOrEqual(4);
  });

  test("intentional hover opens after the delay and the bridge keeps it open", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/fixture/megamenu/basic");
    const root = page.locator(".iv-megamenu").first();
    const item = root.locator(".iv-megamenu__item").first();
    const toggle = root.locator(".iv-megamenu__toggle").first();
    const box = await item.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width / 2 + 4, box.y + box.height / 2 + 1);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    // Crossing the gap between the bar and the panel must not close it.
    const panel = await root.locator(".iv-megamenu__panel").first().boundingBox();
    await page.mouse.move(panel.x + panel.width / 2, box.y + box.height + 4);
    await page.mouse.move(panel.x + panel.width / 2, panel.y + 40);
    await page.waitForTimeout(600);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  test("panel tabs swap the card set and emit iv:changed", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/fixture/megamenu/basic");
    const root = page.locator(".iv-megamenu").first();
    await root.locator(".iv-megamenu__toggle").first().click();
    await page.evaluate(() => {
      globalThis.__changed = [];
      document.querySelector(".iv-megamenu").addEventListener("iv:changed", (e) => {
        globalThis.__changed.push(e.detail.tab.id);
      });
    });
    const tabs = root.locator(".iv-megamenu__item[data-iv-open] .iv-megamenu__tab");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#mm-games-set-1")).toBeVisible();
    await expect(page.locator("#mm-games-set-0")).toBeHidden();
    expect(await page.evaluate(() => globalThis.__changed)).toEqual(["mm-games-tab-1"]);
    // Arrow keys move along the strip.
    await tabs.nth(1).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await expect(tabs.first()).toBeFocused();
  });

  test("the in-panel filter keeps only what matches and announces the count", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1100 });
    await page.goto("/fixture/megamenu/filter");
    const root = page.locator(".iv-megamenu").first();
    await root.locator(".iv-megamenu__toggle").first().click();
    const input = root.locator(".iv-megamenu__filter-input");
    await expect(input).toBeVisible();
    const cards = root.locator(".iv-megamenu__card");
    expect(await cards.count()).toBe(9);
    await input.fill("signals");
    await expect(root.locator(".iv-megamenu__card:visible")).toHaveCount(1);
    const status = root.locator(".iv-megamenu__status.iv-u-sr-only");
    await expect(status).toHaveText("1 results");
    await input.fill("zzzz");
    await expect(root.locator(".iv-megamenu__empty")).toBeVisible();
    await expect(status).toHaveText("0 results");
    // Escape empties the filter before it closes the panel.
    await input.press("Escape");
    await expect(input).toHaveValue("");
    await expect(root.locator(".iv-megamenu__toggle").first()).toHaveAttribute("aria-expanded", "true");
    await input.press("Escape");
    await expect(root.locator(".iv-megamenu__toggle").first()).toHaveAttribute("aria-expanded", "false");
  });

  test("edge to edge: the full panel spans the bar and closes with a ticker", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto("/fixture/megamenu/full");
    const root = page.locator(".iv-megamenu").first();
    await root.locator(".iv-megamenu__toggle").first().click();
    // The panel lands with a scale: measure it once the transition is over.
    await expect(root.locator(".iv-megamenu__panel").first()).toHaveCSS("opacity", "1");
    await page.waitForTimeout(300);
    const panel = await root.locator(".iv-megamenu__panel").first().boundingBox();
    const bar = await root.locator(".iv-megamenu__list").boundingBox();
    expect(Math.abs(panel.width - bar.width)).toBeLessThanOrEqual(2);
    await expect(root.locator(".iv-megamenu__ticker li")).toHaveCount(6);
    await expect(root.locator(".iv-megamenu__ticker a").first()).toBeVisible();
  });

  test("destroy hands the three fixtures back as they were served", async ({ page }) => {
    for (const fixture of ["basic", "full", "filter"]) {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/fixture/megamenu/${fixture}`);
      const state = await page.evaluate(async () => {
        const mod = await import("/packages/ivolt/dist/js/components/megamenu.js");
        const el = document.querySelector(".iv-megamenu");
        const inst = mod.Megamenu.get(el);
        inst.open(0);
        inst.close();
        inst.destroy();
        const q = (s) => [...el.querySelectorAll(s)];
        return {
          overlay: q(".iv-megamenu__overlay").length,
          generated: q(".iv-megamenu__empty").length + q(".iv-megamenu__status.iv-u-sr-only").length,
          inert: q("[inert]").length,
          openItems: q("[data-iv-open]").length,
          toggles: q(".iv-megamenu__toggle").every((t) => t.hidden),
          closes: q(".iv-megamenu__close").every((c) => c.hidden),
          filters: q(".iv-megamenu__filter").every((f) => f.hidden),
          style: el.getAttribute("style"),
          expanded: q('.iv-megamenu__toggle[aria-expanded="true"]').length,
        };
      });
      expect(state.overlay, fixture).toBe(0);
      expect(state.generated, fixture).toBe(0);
      expect(state.inert, fixture).toBe(0);
      expect(state.openItems, fixture).toBe(0);
      expect(state.toggles, fixture).toBe(true);
      expect(state.closes, fixture).toBe(true);
      expect(state.filters, fixture).toBe(true);
      expect(state.expanded, fixture).toBe(0);
      // `full` is the only fixture served with an inline style of its own.
      expect(state.style, fixture).toBe(fixture === "full" ? "--iv-megamenu-art-ratio: 16 / 10; --iv-megamenu-cols: 3" : null);
    }
  });

  test("without JS the tabs are links that reveal their own set", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/fixture/megamenu/basic?nojs=1");
    await expect(page.locator("#mm-games-set-1")).toBeHidden();
    await page.goto("/fixture/megamenu/basic?nojs=1#mm-games-set-1");
    await expect(page.locator("#mm-games-set-1")).toBeVisible();
    await expect(page.locator("#mm-games-set-0")).toBeHidden();
  });

});
