import { test, expect } from "@playwright/test";

test.describe("Combobox", () => {
  test("promotion, typing filters, keyboard confirms, events fire, destroy restores", async ({ page }) => {
    await page.goto("/fixture/combobox/basic");
    const input = page.locator(".iv-combobox__input").first();
    await expect(input).toHaveAttribute("role", "combobox");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    expect(await input.getAttribute("list")).toBeNull();
    await page.evaluate(() => { window.__ev = []; document.querySelector(".iv-combobox").addEventListener("iv:changed", (e) => window.__ev.push(e.detail.value)); });
    await input.focus();
    await input.pressSequentially("sp");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    const visible = page.locator(".iv-combobox__option:not([hidden])");
    expect(await visible.count()).toBeGreaterThan(0);
    for (const t of await visible.allTextContents()) expect(t.toLowerCase()).toContain("sp");
    await page.keyboard.press("ArrowDown");
    const active = await input.getAttribute("aria-activedescendant");
    expect(active).toBeTruthy();
    await expect(page.locator(`#${active}`)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Enter");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    const value = await input.inputValue();
    expect(value.toLowerCase()).toContain("sp");
    expect(await page.evaluate(() => window.__ev)).toEqual([value]);
    await expect(input).toBeFocused();
    const restored = await page.evaluate(async () => {
      const { destroy } = await import("/packages/ivolt/dist/js/index.js");
      destroy(document);
      const i = document.querySelector(".iv-combobox__input");
      return { role: i.getAttribute("role"), list: i.getAttribute("list"), listbox: document.querySelectorAll("[role=listbox]").length };
    });
    expect(restored.role).toBeNull();
    expect(restored.list).toBeTruthy();
    expect(restored.listbox).toBe(0);
  });

  test("empty state, escape, click outside, strict revert on blur", async ({ page }) => {
    await page.goto("/fixture/combobox/strict");
    const input = page.locator(".iv-combobox__input").first();
    await input.focus();
    await input.pressSequentially("zzz");
    await expect(page.locator(".iv-combobox__empty")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await page.evaluate(() => { const b = document.createElement("button"); b.id = "after"; b.textContent = "After"; document.getElementById("fixture").append(b); });
    await page.keyboard.press("Tab");
    await expect(page.locator("#after")).toBeFocused();
    expect(await input.inputValue()).toBe("");
    await input.focus();
    await input.fill("");
    await input.pressSequentially("e");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".iv-combobox__option[aria-selected=true]")).toHaveCount(1); // autoselect
    await page.keyboard.press("Tab");
    expect((await input.inputValue()).length).toBeGreaterThan(1);
    await input.focus();
    await page.keyboard.press("ArrowDown");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await page.mouse.click(5, 5);
    await expect(input).toHaveAttribute("aria-expanded", "false");
  });

  test("without JS the native datalist is present", async ({ page }) => {
    await page.goto("/fixture/combobox/basic?nojs=1");
    const input = page.locator(".iv-combobox__input").first();
    expect(await input.getAttribute("list")).toBeTruthy();
    expect(await page.locator("datalist option").count()).toBeGreaterThan(5);
    expect(await page.locator("[role=combobox]").count()).toBe(0);
  });
});
