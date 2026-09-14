import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const FIXTURES = ["stepper/basic", "stepper/vertical", "stepper/compact"];

/**
 * Runs axe on the page and returns the serious findings, already formatted.
 *
 * @param {import("@playwright/test").Page} page The page.
 * @returns {Promise<string[]>} One line per serious or critical violation.
 */
async function serious(page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  return results.violations
    .filter((v) => ["critical", "serious"].includes(v.impact))
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test.describe("Stepper", () => {
  test("folds the panels, validates before advancing and fills the line", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/fixture/stepper/basic");
    await expect(page.locator("html")).toHaveAttribute("data-iv-js", "");
    const steps = page.locator(".iv-stepper__step");
    await expect(page.locator("#step-account")).toBeVisible();
    await expect(page.locator("#step-payment")).toBeHidden();
    await expect(steps.nth(0)).toHaveAttribute("data-iv-state", "current");
    await expect(steps.nth(1)).toHaveAttribute("data-iv-state", "upcoming");
    await expect(page.locator(".iv-stepper__controls").first()).toBeVisible();
    await expect(page.locator(".iv-stepper__status")).toHaveText("Step 1 of 3: Account");

    // The required fields hold the flow back and the step reports the error.
    await page.locator("#step-account [data-iv-step=next]").click();
    await expect(page.locator("#step-payment")).toBeHidden();
    await expect(steps.nth(0)).toHaveAttribute("data-iv-state", "error");
    await expect(page.locator("#step-email")).toHaveAttribute("aria-invalid", "true");

    await page.locator("#step-email").fill("ada@example.org");
    await page.locator("#step-team").fill("Orbit");
    await page.locator("#step-account [data-iv-step=next]").click();
    await expect(page.locator("#step-payment")).toBeVisible();
    await expect(steps.nth(0)).toHaveAttribute("data-iv-state", "done");
    await expect(steps.nth(1)).toHaveAttribute("data-iv-state", "current");
    await expect(page.locator("#step-payment")).toBeFocused();
    await expect(page.locator(".iv-stepper__status")).toHaveText("Step 2 of 3: Payment");
    const progress = await page
      .locator(".iv-stepper")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--iv-stepper-progress").trim());
    expect(progress).toBe("0.5");

    // The connector of a done step is filled, the one of an upcoming step is not.
    const filled = await steps.nth(0).evaluate((el) => getComputedStyle(el, "::after").width);
    const empty = await steps.nth(1).evaluate((el) => getComputedStyle(el, "::after").width);
    expect(parseFloat(filled)).toBeGreaterThan(parseFloat(empty));
  });

  test("goes back without validating, completes on the last step", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/fixture/stepper/basic");
    await page.locator("#step-email").fill("ada@example.org");
    await page.locator("#step-team").fill("Orbit");
    await page.locator("#step-account [data-iv-step=next]").click();
    await page.locator("#step-payment [data-iv-step=prev]").click();
    await expect(page.locator("#step-account")).toBeVisible();

    // A step already reached stays reachable from the index.
    await page.locator('.iv-stepper__trigger[href="#step-payment"]').click();
    await expect(page.locator("#step-payment")).toBeVisible();
    await page.locator("#step-holder").fill("Ada Márquez");
    await page.locator("#step-country").selectOption("es");
    await page.locator("#step-payment [data-iv-step=next]").click();
    await expect(page.locator("#step-review")).toBeVisible();

    const completed = page.evaluate(
      () =>
        new Promise((resolve) => {
          document.querySelector(".iv-stepper").addEventListener(
            "iv:complete",
            (event) => resolve(event.detail.index),
            { once: true }
          );
        })
    );
    await page.locator("#step-confirm").check();
    await page.locator("#step-review [data-iv-step=next]").click();
    expect(await completed).toBe(2);
    await expect(page.locator("#step-review")).toBeVisible();
  });

  test("the index takes the keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/fixture/stepper/compact");
    const triggers = page.locator(".iv-stepper__trigger");
    await triggers.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(triggers.nth(1)).toBeFocused();
    await page.keyboard.press("End");
    await expect(triggers.nth(3)).toBeFocused();
    await page.keyboard.press("Home");
    await expect(triggers.nth(0)).toBeFocused();
    // This fixture is not linear: Enter on any step opens it.
    await triggers.nth(2).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#onb-invite")).toBeVisible();
    await expect(page.locator(".iv-stepper__step").nth(2)).toHaveAttribute("data-iv-state", "current");
  });

  test("vertical: the index sits beside the panels from md upwards", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/fixture/stepper/vertical");
    const list = await page.locator(".iv-stepper__list").boundingBox();
    const panels = await page.locator(".iv-stepper__panels").boundingBox();
    expect(panels.x).toBeGreaterThan(list.x + list.width - 1);

    await page.setViewportSize({ width: 390, height: 800 });
    const narrowList = await page.locator(".iv-stepper__list").boundingBox();
    const narrowPanels = await page.locator(".iv-stepper__panels").boundingBox();
    expect(narrowPanels.y).toBeGreaterThan(narrowList.y + narrowList.height - 1);
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(over).toBeLessThanOrEqual(0);
  });

  test("compact: only the current label is drawn, every step keeps its name", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/fixture/stepper/compact");
    const labels = page.locator(".iv-stepper__label");
    const current = await labels.nth(0).boundingBox();
    const other = await labels.nth(1).boundingBox();
    expect(current.width).toBeGreaterThan(10);
    expect(other.width).toBeLessThanOrEqual(2);
    // The name survives for assistive technology.
    await expect(page.locator(".iv-stepper__trigger").nth(1)).toHaveAccessibleName(/Workspace/);
  });

  test("destroy shows every panel again and leaves the served markup", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/fixture/stepper/vertical");
    const restored = await page.evaluate(async () => {
      const mod = await import("/packages/ivolt/dist/js/components/stepper.js");
      const el = document.querySelector(".iv-stepper");
      const before = el.outerHTML;
      mod.Stepper.get(el).destroy();
      return {
        changed: before !== el.outerHTML,
        hiddenPanels: el.querySelectorAll(".iv-stepper__panel[hidden]").length,
        hiddenControls: el.querySelectorAll(".iv-stepper__controls[hidden]").length,
        status: el.querySelectorAll(".iv-stepper__status").length,
        states: el.querySelectorAll("[data-iv-state]").length,
        progress: el.style.getPropertyValue("--iv-stepper-progress"),
      };
    });
    expect(restored.changed).toBe(true);
    expect(restored.hiddenPanels).toBe(0);
    expect(restored.hiddenControls).toBe(4);
    expect(restored.status).toBe(0);
    expect(restored.states).toBe(0);
    expect(restored.progress).toBe("");
  });

  test("without JavaScript every panel is readable", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/fixture/stepper/basic?nojs=1");
    await expect(page.locator("#step-account")).toBeVisible();
    await expect(page.locator("#step-payment")).toBeVisible();
    await expect(page.locator("#step-review")).toBeVisible();
    // The controls do nothing without the script, so they are not offered.
    await expect(page.locator(".iv-stepper__controls").first()).toBeHidden();
  });

  for (const theme of ["light", "dark"]) {
    for (const fixture of FIXTURES) {
      test(`axe ${fixture} (${theme})`, async ({ page }) => {
        // Entrance animations fade panels in over time and axe folds opacity into
        // the foreground colour; the audited state is the settled one.
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.goto(`/fixture/${fixture}?theme=${theme}`);
        expect(await serious(page)).toEqual([]);
      });
    }

    test(`axe stepper/basic on a later step, with errors shown (${theme})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.goto(`/fixture/stepper/basic?theme=${theme}`);
      await page.locator("#step-account [data-iv-step=next]").click();
      await expect(page.locator(".iv-stepper__step").first()).toHaveAttribute("data-iv-state", "error");
      expect(await serious(page)).toEqual([]);

      await page.locator("#step-email").fill("ada@example.org");
      await page.locator("#step-team").fill("Orbit");
      await page.locator("#step-account [data-iv-step=next]").click();
      await expect(page.locator("#step-payment")).toBeVisible();
      expect(await serious(page)).toEqual([]);
    });
  }
});
