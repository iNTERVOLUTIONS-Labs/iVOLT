import { test, expect } from "@playwright/test";

test.describe("Tooltip", () => {
  test("shows on focus at once and on hover after the delay, describes the target, hides on Escape", async ({ page }) => {
    await page.goto("/fixture/tooltip/basic");
    const target = page.locator("[data-iv-tooltip]").first();
    const text = await target.getAttribute("data-iv-tooltip");
    await target.focus();
    const tip = page.locator(".iv-tooltip");
    await expect(tip).toBeVisible();
    await expect(tip).toHaveAttribute("role", "tooltip");
    await expect(tip).toHaveText(text);
    const described = await target.getAttribute("aria-describedby");
    expect(described).toContain(await tip.getAttribute("id"));
    await page.keyboard.press("Escape");
    await expect(tip).toBeHidden();
    expect(await target.getAttribute("aria-describedby") || "").not.toContain(await tip.getAttribute("id") || "#");
    await page.mouse.move(0, 0);
    const second = page.locator("[data-iv-tooltip]").nth(1);
    await second.hover();
    await expect(tip).toBeVisible({ timeout: 2000 });
    await expect(tip).toHaveText(await second.getAttribute("data-iv-tooltip"));
    await page.mouse.move(0, 0);
    await expect(tip).toBeHidden();
  });

  test("without JS there is no tooltip element", async ({ page }) => {
    await page.goto("/fixture/tooltip/basic?nojs=1");
    await expect(page.locator(".iv-tooltip")).toHaveCount(0);
  });
});

test.describe("Popover", () => {
  test("opens next to its invoker, moves focus in and back, closes on Escape and outside, events fire", async ({ page }) => {
    await page.goto("/fixture/popover/basic");
    const invoker = page.locator("[popovertarget]").first();
    const id = await invoker.getAttribute("popovertarget");
    const pop = page.locator(`#${id}`);
    await page.evaluate((id) => { window.__ev = []; const el = document.getElementById(id); ["iv:open", "iv:opened", "iv:close", "iv:closed"].forEach((t) => el.addEventListener(t, (e) => window.__ev.push([t, e.detail.reason]))); }, id);
    await invoker.click();
    await expect(pop).toBeVisible();
    const placement = await pop.getAttribute("data-iv-placement");
    expect(["top", "bottom"]).toContain(placement);
    const [ib, pb] = await Promise.all([invoker.boundingBox(), pop.boundingBox()]);
    if (placement === "bottom") expect(pb.y).toBeGreaterThanOrEqual(ib.y + ib.height);
    else expect(pb.y + pb.height).toBeLessThanOrEqual(ib.y);
    expect(pb.x).toBeGreaterThanOrEqual(0);
    const focusInside = await page.evaluate((id) => document.getElementById(id).contains(document.activeElement), id);
    expect(focusInside).toBe(true);
    await page.keyboard.press("Escape");
    await expect(pop).toBeHidden();
    await expect(invoker).toBeFocused();
    await invoker.click();
    await expect(pop).toBeVisible();
    // iv:opened follows the native toggle event, which the browser coalesces if the state flips again in the same task: wait for it.
    await expect.poll(() => page.evaluate(() => window.__ev.filter((e) => e[0] === "iv:opened").length)).toBe(2);
    await page.mouse.click(5, 5);
    await expect(pop).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.__ev.filter((e) => e[0] === "iv:closed").length)).toBe(2);
    const ev = await page.evaluate(() => window.__ev);
    expect(ev.filter((e) => e[0] === "iv:opened").length).toBe(2);
    expect(ev.filter((e) => e[0] === "iv:closed").length).toBe(2);
  });

  test("without JS the native popover still toggles", async ({ page }) => {
    await page.goto("/fixture/popover/basic?nojs=1");
    const invoker = page.locator("[popovertarget]").first();
    const id = await invoker.getAttribute("popovertarget");
    await invoker.click();
    await expect(page.locator(`#${id}`)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(`#${id}`)).toBeHidden();
  });
});
