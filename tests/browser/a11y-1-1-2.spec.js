// 1.1.2 accessibility patch: each test reproduces what a screen reader user met on 1.1.1.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

/** Serious and critical axe violations inside `selector`. */
async function serious(page, selector) {
  const results = await new AxeBuilder({ page }).include(selector).withTags(TAGS).analyze();
  return results.violations.filter((v) => ["critical", "serious"].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test.describe("1.1.2 accessibility patch", () => {
  test("carousel: the focusable viewport is a named group, not the text of every slide", async ({ page }) => {
    await page.goto("/fixture/carousel/basic");
    await expect(page.locator("html")).toHaveAttribute("data-iv-js", "");
    const viewport = page.locator(".iv-carousel__viewport").first();
    await expect(viewport).toHaveRole("group");
    await expect(viewport).toHaveAccessibleName("Slides");
    // Keyboard: the first Tab stop of the fixture is the viewport, and it is announced by that name.
    await page.locator("body").press("Tab");
    await expect(viewport).toBeFocused();
    expect(await serious(page, ".iv-carousel")).toEqual([]);
  });

  test("toast: a message lives in one live region; a danger toast is an assertive alert", async ({ page }) => {
    await page.goto("/fixture/toast/declarative");
    await expect(page.locator("html")).toHaveAttribute("data-iv-js", "");
    const liveRoots = (selector) => page.locator(selector).last().evaluate((node) => {
      const roots = [];
      for (let n = node; n; n = n.parentElement) {
        const role = n.getAttribute("role") ?? "";
        if (n.hasAttribute("aria-live") || ["status", "alert", "log"].includes(role)) roots.push(`${role || n.tagName.toLowerCase()}/${n.getAttribute("aria-live") ?? "implicit"}`);
      }
      return roots;
    });
    await page.getByRole("button", { name: "Save (demo)" }).click();
    await expect(page.locator(".iv-toast__message").last()).toHaveText("Profile saved.");
    expect(await liveRoots(".iv-toast__message")).toEqual(["region/polite"]);
    await page.getByRole("button", { name: "Fail (demo)" }).click();
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("The upload failed.");
    expect(await liveRoots(".iv-toast--danger .iv-toast__message")).toEqual(["alert/assertive", "region/polite"]);
    expect(await serious(page, "#notices")).toEqual([]);
  });

  test("datepicker: the focused day carries the selected state", async ({ page }) => {
    await page.goto("/fixture/datepicker/basic");
    const root = page.locator(".iv-datepicker").first();
    const value = await root.locator("input[type=date]").inputValue();
    await root.locator(".iv-datepicker__toggle").click();
    const focused = root.locator(".iv-datepicker__day:focus");
    await expect(focused).toHaveAttribute("data-iv-date", value);
    await expect(focused).toHaveRole("gridcell");
    await expect(focused).toHaveAttribute("aria-selected", "true");
    await expect(root.getByRole("gridcell", { selected: true })).toHaveCount(1);
    // Moving away: the new day is a plain cell, the chosen one keeps its state.
    await page.keyboard.press("ArrowRight");
    await expect(root.locator(".iv-datepicker__day:focus")).not.toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Enter");
    await root.locator(".iv-datepicker__toggle").click();
    await expect(root.locator(".iv-datepicker__day:focus")).toHaveAttribute("aria-selected", "true");
    await expect(root.getByRole("gridcell", { selected: true })).toHaveCount(1);
    // The selected day still paints as selected (the CSS moved with the attribute).
    const bg = await root.locator('.iv-datepicker__day[aria-selected="true"]').evaluate((el) => getComputedStyle(el).backgroundColor);
    const plain = await root.locator('.iv-datepicker__day:not([aria-selected]):not(.iv-datepicker__day--outside):not([disabled])').first().evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe(plain);
    expect(await serious(page, ".iv-datepicker")).toEqual([]);
  });
});
