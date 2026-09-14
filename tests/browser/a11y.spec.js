import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const fixtures = ["button/variants", "button/sizes", "button/states", "button/group", "card/basic", "card/media", "form/basic", "form/error", "layout/grid", "theme/nested", "badge/variants", "alert/variants", "table/basic", "table/stack", "breadcrumb/basic", "pagination/basic", "progress/basic", "skeleton/card", "disclosure/basic", "disclosure/accordion", "tabs/basic", "dropdown/basic", "drawer/basic", "toast/basic", "combobox/basic", "combobox/strict", "datatable/basic", "datatable/sorted", "picker/basic", "picker/multiple", "carousel/basic", "carousel/cinema", "carousel/thumbs", "surfaces/glass", "surfaces/textures", "surfaces/glow", "form/validation", "form/counter", "form/float", "form/controls", "megamenu/basic", "megamenu/full", "effects/edges", "effects/scan", "effects/reveal", "hero/basic", "hero/split", "hero/cinematic", "hero/terminal", "datepicker/basic", "datepicker/locale", "tooltip/basic", "popover/basic", "command/basic", "command/glass", "carousel/photos", "hero/photo", "card/photo", "surfaces/glass-photo", "progress/sizes", "toast/declarative", "navbar/basic", "navbar/transparent", "navbar/megamenu", "navbar/hide", "stepper/basic", "stepper/vertical", "stepper/compact", "motion/parallax", "motion/progress", "motion/marquee", "motion/stack", "text/reveal", "text/glow", "text/outline", "text/shimmer", "lightbox/basic", "lightbox/masonry", "lightbox/strip", "countup/basic", "countup/formats"];

for (const theme of ["light", "dark"]) {
  for (const f of fixtures) {
    test(`axe ${f} (${theme})`, async ({ page }) => {
      // Entrance animations (rise, reveal) fade text in over time and axe folds element opacity into the
      // foreground colour; the audited state is the settled one, which is what reduced motion renders at once.
      await page.emulateMedia({ reducedMotion: "reduce" });
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
