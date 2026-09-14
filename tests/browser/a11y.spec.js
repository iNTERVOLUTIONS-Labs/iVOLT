import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const fixtures = ["button/variants", "button/sizes", "button/states", "button/group", "card/basic", "card/media", "form/basic", "form/error", "layout/grid", "theme/nested", "badge/variants", "alert/variants", "table/basic", "table/stack", "breadcrumb/basic", "pagination/basic", "progress/basic", "skeleton/card", "disclosure/basic", "disclosure/accordion", "tabs/basic", "dropdown/basic", "drawer/basic", "toast/basic", "combobox/basic", "combobox/strict"];

for (const theme of ["light", "dark"]) {
  for (const f of fixtures) {
    test(`axe ${f} (${theme})`, async ({ page }) => {
      await page.goto(`/fixture/${f}?theme=${theme}`);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const serious = results.violations.filter((v) => ["critical", "serious"].includes(v.impact));
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
}

test("axe dialog open (light and dark)", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await page.goto(`/fixture/dialog/basic?theme=${theme}`);
    await page.locator("[data-iv-open=signup]").click();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const serious = results.violations.filter((v) => ["critical", "serious"].includes(v.impact));
    expect(serious.map((v) => v.id)).toEqual([]);
  }
});
