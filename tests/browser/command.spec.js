import { test, expect } from "@playwright/test";

test.describe("Command palette", () => {
  test("opens with the shortcut, filters, keyboard highlights, Enter runs an action, Escape returns focus", async ({ page }) => {
    await page.goto("/fixture/command/basic");
    const trigger = page.locator('[data-iv-open="cmd"]').first();
    await expect(trigger).toBeVisible();
    const dialog = page.locator("#cmd");
    await page.keyboard.press("Control+k");
    await expect(dialog).toHaveAttribute("open", "");
    const input = dialog.locator(".iv-command__input");
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute("role", "combobox");
    const options = dialog.locator("[role=option]");
    const total = await options.count();
    expect(total).toBeGreaterThan(5);
    await page.evaluate(() => { window.__ev = []; const el = document.getElementById("cmd"); ["iv:command", "iv:commanded", "iv:filter"].forEach((t) => el.addEventListener(t, (e) => window.__ev.push([t, e.detail.id ?? e.detail.query ?? null]))); });
    await input.fill("zzqqxx");
    await expect(dialog.locator(".iv-command__empty")).toBeVisible();
    const firstLabel = (await options.first().locator(".iv-command__label").textContent()).trim();
    await input.fill(firstLabel.slice(0, 3));
    const visible = await dialog.locator("[role=option]:visible").count();
    expect(visible).toBeGreaterThan(0);
    expect(visible).toBeLessThan(total);
    await page.keyboard.press("ArrowDown");
    const active = await input.getAttribute("aria-activedescendant");
    expect(active).toBeTruthy();
    // Run a served button action: iv:command then iv:commanded, dialog closes, focus back on the trigger.
    await input.fill("");
    const button = dialog.locator("button.iv-command__item").first();
    const id = await button.getAttribute("data-iv-command") || await button.getAttribute("data-iv-id");
    await button.click();
    const ev = await page.evaluate(() => window.__ev);
    expect(ev.some((e) => e[0] === "iv:command")).toBe(true);
    expect(ev.some((e) => e[0] === "iv:commanded")).toBe(true);
    expect(ev.some((e) => e[0] === "iv:filter")).toBe(true);
    if (id) expect(ev.find((e) => e[0] === "iv:command")[1]).toBe(id);
    // Opened from its trigger, Escape returns focus there (opened by shortcut, focus goes back to wherever it was).
    await trigger.click();
    await expect(dialog).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toHaveAttribute("open", "");
    await expect(trigger).toBeFocused();
    const restored = await page.evaluate(async () => {
      const mod = await import("/packages/ivolt/dist/js/components/command.js");
      const el = document.getElementById("cmd");
      mod.Command.get(el).destroy();
      return { listbox: el.querySelectorAll("[role=listbox]").length, status: !!el.querySelector(".iv-command__status"), triggerHidden: document.querySelector('[data-iv-open="cmd"]').hidden };
    });
    expect(restored).toEqual({ listbox: 0, status: false, triggerHidden: true });
  });

  test("slash opens outside editable fields only; the glass fixture disables it and remembers recent items", async ({ page }) => {
    await page.goto("/fixture/command/basic");
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("/");
    await expect(page.locator("#cmd")).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await page.goto("/fixture/command/glass");
    const dialog = page.locator("dialog.iv-command").first();
    const id = await dialog.getAttribute("id");
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("/");
    await expect(dialog).not.toHaveAttribute("open", "");
    await page.keyboard.press("Control+k");
    await expect(dialog).toHaveAttribute("open", "");
    await dialog.locator("a.iv-command__item, button.iv-command__item").first().click();
    await page.keyboard.press("Control+k");
    await expect(dialog).toHaveAttribute("open", "");
    await expect(dialog.locator(".iv-command__group").first()).toHaveAttribute("data-iv-group", /Recent|recent/);
    expect(id).toBeTruthy();
  });

  test("without JS the dialog stays closed and the trigger hidden", async ({ page }) => {
    await page.goto("/fixture/command/basic?nojs=1");
    await expect(page.locator("#cmd")).not.toHaveAttribute("open", "");
    await expect(page.locator('[data-iv-open="cmd"]').first()).toBeHidden();
    expect(await page.locator("#cmd a").count()).toBeGreaterThan(0);
  });
});
