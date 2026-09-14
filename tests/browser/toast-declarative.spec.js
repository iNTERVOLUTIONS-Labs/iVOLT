// Declarative toast triggers (API_CONTRACT §8.18): a served button shows a toast with no author JS.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("a served button shows a toast with the text of its attributes", async ({ page }) => {
  await page.goto("/fixture/toast/declarative");
  await page.getByRole("button", { name: "Save (demo)" }).click();
  const toast = page.locator(".iv-toast").first();
  await expect(toast).toBeVisible();
  await expect(toast.locator(".iv-toast__title")).toHaveText("Demo");
  await expect(toast.locator(".iv-toast__message")).toHaveText("Profile saved.");
  await expect(toast).toHaveClass(/iv-toast--success/);
});

test("a danger trigger stays until it is dismissed", async ({ page }) => {
  await page.goto("/fixture/toast/declarative");
  await page.getByRole("button", { name: "Fail (demo)" }).click();
  const toast = page.locator(".iv-toast--danger");
  await expect(toast).toHaveAttribute("role", "alert");
  await page.waitForTimeout(1200);
  await expect(toast).toBeVisible();
  await toast.getByRole("button", { name: "Dismiss" }).click();
  await expect(toast).toHaveCount(0);
});

test("several triggers queue into the same region", async ({ page }) => {
  await page.goto("/fixture/toast/declarative");
  await page.getByRole("button", { name: "Save (demo)" }).click();
  await page.getByRole("button", { name: "Export (demo)" }).click();
  await expect(page.locator(".iv-toast")).toHaveCount(2);
});

test("the trigger does nothing without JavaScript", async ({ page }) => {
  await page.goto("/fixture/toast/declarative?nojs=1");
  await page.getByRole("button", { name: "Save (demo)" }).click();
  await expect(page.locator(".iv-toast")).toHaveCount(0);
});

for (const theme of ["light", "dark"]) {
  test(`axe toast/declarative with an open toast (${theme})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/fixture/toast/declarative?theme=${theme}`);
    await page.getByRole("button", { name: "Save (demo)" }).click();
    await expect(page.locator(".iv-toast")).toHaveCount(1);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const serious = results.violations.filter((v) => ["critical", "serious"].includes(v.impact));
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}
