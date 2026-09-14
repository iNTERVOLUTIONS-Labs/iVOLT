import { test, expect } from "@playwright/test";

const url = "/fixture/dialog/basic";

test.describe("Dialog", () => {
  test("opens from trigger, moves focus inside, Escape closes and focus returns", async ({ page }) => {
    await page.goto(url);
    const trigger = page.locator("[data-iv-open=signup]");
    const dialog = page.locator("#signup");
    await trigger.click();
    await expect(dialog).toHaveAttribute("open", "");
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => document.activeElement?.closest("#signup") !== null)).toBe(true);
    expect(await page.evaluate(() => location.hash)).toBe("");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toHaveAttribute("open", "");
    await expect(trigger).toBeFocused();
  });

  test("data-iv-close, form submit and backdrop close with reasons; iv:close can be cancelled", async ({ page }) => {
    await page.goto(url);
    await page.evaluate(() => {
      window.__reasons = [];
      document.getElementById("signup").addEventListener("iv:closed", (e) => window.__reasons.push(e.detail.reason));
    });
    const trigger = page.locator("[data-iv-open=signup]");
    const dialog = page.locator("#signup");
    await trigger.click();
    await page.locator("#signup [data-iv-close][aria-label=Close]").click();
    await expect(dialog).not.toHaveAttribute("open", "");
    await trigger.click();
    await page.locator("#signup button[value=confirm]").click();
    await expect(dialog).not.toHaveAttribute("open", "");
    await trigger.click();
    await page.mouse.click(5, 5);
    await expect(dialog).not.toHaveAttribute("open", "");
    // The native `close` event, and with it `iv:closed`, arrives a task after `open` is
    // removed, so the reasons are polled rather than read as soon as the attribute is gone.
    await expect.poll(() => page.evaluate(() => window.__reasons)).toEqual(["trigger", "form", "backdrop"]);
    // cancel
    await page.evaluate(() => document.getElementById("signup").addEventListener("iv:close", (e) => e.preventDefault(), { once: true }));
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toHaveAttribute("open", "");
  });

  test("init is idempotent and destroy cleans up", async ({ page }) => {
    await page.goto(url);
    const result = await page.evaluate(async () => {
      const mod = await import("/packages/ivolt/dist/js/index.js");
      const el = document.getElementById("signup");
      let opened = 0;
      el.addEventListener("iv:opened", () => opened++);
      const a = mod.init(document);
      const b = mod.init(document);
      document.querySelector("[data-iv-open=signup]").click();
      const openedAfterClick = opened;
      mod.Dialog.get(el).close();
      mod.destroy(document);
      const hasInstance = Boolean(mod.Dialog.get(el));
      const again = mod.init(document);
      return { a: a.length, b: b.length, openedAfterClick, hasInstance, again: again.length, marked: document.documentElement.hasAttribute("data-iv-js") };
    });
    expect(result.a).toBe(0); // auto.js already initialised
    expect(result.b).toBe(0);
    expect(result.openedAfterClick).toBe(1);
    expect(result.hasInstance).toBe(false);
    expect(result.again).toBe(1);
    expect(result.marked).toBe(true);
  });

  test("without JS the :target fallback shows the dialog statically", async ({ page }) => {
    await page.goto(url + "?nojs=1");
    const dialog = page.locator("#signup");
    await expect(dialog).toBeHidden();
    await page.locator("[data-iv-open=signup]").click();
    await expect(dialog).toBeVisible();
    await expect(page.locator("#signup a[href='#']")).toBeVisible();
  });
});
