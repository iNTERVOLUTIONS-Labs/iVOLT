// Selective visual regression: a handful of fixtures in both themes, Chromium only (deterministic fonts on one machine).
// Baselines live in tests/browser/__snapshots__/visual.spec.js/. Update deliberately with `--update-snapshots`.
import { test, expect } from "@playwright/test";

test.skip(({ browserName }) => browserName !== "chromium", "visual baselines are Chromium-only");

const fixtures = ["button/variants", "button/states", "form/basic", "card/media", "alert/variants", "table/basic", "tabs/basic", "badge/variants", "combobox/basic", "datatable/basic", "picker/basic", "carousel/basic", "surfaces/glass", "form/controls", "megamenu/basic", "hero/cinematic", "effects/edges", "datepicker/basic", "popover/basic", "command/basic", "timeline/basic", "stat/cards", "avatar/group", "progress/sizes", "navbar/basic", "navbar/transparent", "stepper/basic", "stepper/vertical"];
for (const theme of ["light", "dark"]) {
  for (const f of fixtures) {
    test(`visual ${f} (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 700 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/fixture/${f}?theme=${theme}`);
      await expect(page.locator("#fixture")).toHaveScreenshot(`${f.replace("/", "-")}-${theme}.png`, { maxDiffPixelRatio: 0.002 });
    });
  }
}
test("visual dialog open (light)", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/fixture/dialog/basic");
  await page.locator("[data-iv-open=signup]").click();
  await page.waitForTimeout(300);
  await expect(page).toHaveScreenshot("dialog-open-light.png", { maxDiffPixelRatio: 0.002 });
});
