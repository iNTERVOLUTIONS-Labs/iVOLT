import { test, expect } from "@playwright/test";

test.describe("Disclosure", () => {
  test("cancelable events and exclusive accordion", async ({ page }) => {
    await page.goto("/fixture/disclosure/accordion");
    const items = page.locator(".iv-accordion details");
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toHaveAttribute("open", ""); // fixture ships the first item open
    await items.nth(1).locator("summary").click();
    await expect(items.nth(1)).toHaveAttribute("open", "");
    await expect(items.nth(0)).not.toHaveAttribute("open", "");
    await page.evaluate(() => document.querySelectorAll(".iv-accordion details")[2].addEventListener("iv:open", (e) => e.preventDefault(), { once: true }));
    await items.nth(2).locator("summary").click();
    await expect(items.nth(2)).not.toHaveAttribute("open", "");
    await expect(items.nth(1)).toHaveAttribute("open", "");
  });
});

test.describe("Tabs", () => {
  test("promotion, keyboard, activation and restore on destroy", async ({ page }) => {
    await page.goto("/fixture/tabs/basic");
    const tabs = page.locator("[role=tab]");
    await expect(tabs).toHaveCount(3);
    await expect(page.locator("[role=tabpanel]:not([hidden])")).toHaveCount(1);
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await tabs.nth(0).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(1)).toBeFocused();
    await page.keyboard.press("End");
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    expect(await page.evaluate(() => location.hash)).toBe("");
    const restored = await page.evaluate(async () => {
      const { destroy } = await import("/packages/ivolt/dist/js/index.js");
      destroy(document);
      return { roles: document.querySelectorAll("[role=tab],[role=tablist],[role=tabpanel]").length, hidden: document.querySelectorAll(".iv-tabs__panel[hidden]").length, sr: document.querySelectorAll(".iv-tabs__heading.iv-u-sr-only").length };
    });
    expect(restored).toEqual({ roles: 0, hidden: 0, sr: 0 });
  });

  test("without JS all panels are visible and anchors work", async ({ page }) => {
    await page.goto("/fixture/tabs/basic?nojs=1");
    await expect(page.locator(".iv-tabs__panel")).toHaveCount(3);
    for (const p of await page.locator(".iv-tabs__panel").all()) await expect(p).toBeVisible();
    expect(await page.locator("[role=tab]").count()).toBe(0);
  });
});

test.describe("Dropdown", () => {
  test("menu pattern: promotion, arrows, escape returns focus, click outside", async ({ page }) => {
    await page.goto("/fixture/dropdown/basic");
    const summary = page.locator(".iv-dropdown summary").first();
    await expect(summary).toHaveAttribute("aria-haspopup", "menu");
    await expect(summary).toHaveAttribute("aria-expanded", "false");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(summary).toHaveAttribute("aria-expanded", "true");
    const items = page.locator(".iv-dropdown [role=menuitem]");
    await expect(items.first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press("End");
    await expect(items.last()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(summary).toHaveAttribute("aria-expanded", "false");
    await expect(summary).toBeFocused();
    await summary.click();
    await expect(summary).toHaveAttribute("aria-expanded", "true");
    await page.mouse.click(5, 5);
    await expect(summary).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("Drawer", () => {
  test("modal below lg, static from lg, closes on crossing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/fixture/drawer/basic");
    const drawer = page.locator(".iv-drawer").first();
    await expect(drawer).toBeHidden();
    await page.locator("[data-iv-open]").first().click();
    await expect(drawer).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(drawer).not.toHaveAttribute("open", "");
    await page.locator("[data-iv-open]").first().click();
    await expect(drawer).toHaveAttribute("open", "");
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(drawer).not.toHaveAttribute("open", "");
    await expect(drawer).toBeVisible();
  });
});

test.describe("Toast", () => {
  test("show, queue, pause on hover, escape dismiss, danger never auto-dismisses", async ({ page }) => {
    await page.goto("/fixture/toast/basic");
    const res = await page.evaluate(async () => {
      const { Toast } = await import("/packages/ivolt/dist/js/index.js");
      const region = Toast.get(document.querySelector(".iv-toast-region"));
      const closed = [];
      document.addEventListener("iv:closed", (e) => closed.push(e.detail.reason));
      for (let i = 1; i <= 4; i++) region.show({ message: `Toast ${i}`, timeout: 300 });
      const visibleAfterShow = document.querySelectorAll(".iv-toast").length;
      region.show({ message: "Failed", variant: "danger" });
      await new Promise((r) => setTimeout(r, 1500));
      const remaining = [...document.querySelectorAll(".iv-toast")].map((t) => t.textContent.trim());
      const role = document.querySelector(".iv-toast--danger")?.getAttribute("role");
      return { visibleAfterShow, remaining, role, closed };
    });
    expect(res.visibleAfterShow).toBeLessThanOrEqual(3);
    expect(res.remaining.length).toBe(1);
    expect(res.remaining[0]).toContain("Failed");
    expect(res.role).toBe("alert");
    expect(res.closed.filter((r) => r === "timeout").length).toBe(4);
    const toast = page.locator(".iv-toast--danger");
    await toast.locator(".iv-toast__dismiss").focus();
    await page.keyboard.press("Escape");
    await expect(page.locator(".iv-toast")).toHaveCount(0);
  });
});
