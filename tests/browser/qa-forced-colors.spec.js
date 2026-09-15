// Windows high contrast (and any other forced palette) removes background
// images, box shadows and translucency. A state that lives only in one of those
// disappears, so every state below is asserted against the system palette.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sheet = readFileSync(join(process.cwd(), "packages/ivolt/dist/css/ivolt.min.css"), "utf8");

test.use({ forcedColors: "active" });

const SYSTEM = /^(rgb|rgba)\(/;

for (const theme of ["light", "dark"]) {
  test.describe(`forced colours, ${theme}`, () => {
    // Each engine paints the filled part with its own pseudo-element and only
    // Chromium reports a computed style for it, so the rules are checked
    // everywhere and the painted colour where the engine exposes it.
    test("a progress bar still shows how far it got", async ({ page, browserName }) => {
      await page.goto(`/fixture/progress/basic?theme=${theme}`);
      // Each engine drops the vendor pseudo-element it does not know, so the
      // built sheet on disk is where both rules can be read.
      expect(sheet).toMatch(/\.iv-progress::-webkit-progress-value\{[^}]*Highlight/i);
      expect(sheet).toMatch(/\.iv-progress::-moz-progress-bar\{[^}]*Highlight/i);

      test.skip(browserName !== "chromium", "only Chromium reports the computed style of the fill");
      const fill = await page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector(".iv-progress"), "::-webkit-progress-value");
        return { image: cs.backgroundImage, color: cs.backgroundColor };
      });
      expect(fill.image).toBe("none");
      // Highlight, never the page background: the two must differ.
      const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(fill.color).toMatch(SYSTEM);
      expect(fill.color).not.toBe(canvas);
    });

    test("the active option of a combobox is marked", async ({ page }) => {
      await page.goto(`/fixture/combobox/basic?theme=${theme}`);
      const state = await page.evaluate(() => {
        const options = document.querySelectorAll(".iv-combobox__option");
        options[1].setAttribute("aria-selected", "true");
        const active = getComputedStyle(options[1]);
        const idle = getComputedStyle(options[2]);
        return { active: active.backgroundColor, idle: idle.backgroundColor, text: active.color };
      });
      expect(state.active).not.toBe(state.idle);
      expect(state.text).toMatch(SYSTEM);
    });

    test("the highlighted row of the command palette is marked", async ({ page }) => {
      await page.goto(`/fixture/command/basic?theme=${theme}`);
      const state = await page.evaluate(() => {
        const items = document.querySelectorAll(".iv-command__item");
        items[1].setAttribute("aria-selected", "true");
        items[2].removeAttribute("aria-selected");
        return {
          active: getComputedStyle(items[1]).backgroundColor,
          idle: getComputedStyle(items[2]).backgroundColor,
        };
      });
      expect(state.active).not.toBe(state.idle);
    });

    test("glass becomes an opaque panel with an edge", async ({ page }) => {
      await page.goto(`/fixture/surfaces/glass?theme=${theme}`);
      const glass = await page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector(".iv-glass"));
        return { bg: cs.backgroundColor, blur: cs.backdropFilter, border: cs.borderTopColor, shadow: cs.boxShadow };
      });
      expect(glass.blur).toBe("none");
      expect(glass.bg).not.toMatch(/rgba\([^)]*,\s*0(\.\d+)?\)$/);
      expect(glass.border).toMatch(SYSTEM);
      expect(glass.shadow).toBe("none");
    });

    test("the reading bar is painted with the system highlight", async ({ page }) => {
      await page.goto(`/fixture/motion/progress?theme=${theme}`);
      const bar = await page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector(".iv-scroll-progress"));
        return { image: cs.backgroundImage, color: cs.backgroundColor };
      });
      expect(bar.image).toBe("none");
      expect(bar.color).toMatch(SYSTEM);
    });

    test("a selected day, the current step and the open tab keep a visible mark", async ({ page }) => {
      await page.goto(`/fixture/tabs/basic?theme=${theme}`);
      // The tab has no border: the state is the indicator pseudo-element, which
      // opts out of forcing, plus an underline on the label.
      const tab = await page.evaluate(() => {
        const open = document.querySelector('.iv-tabs__tab[aria-selected="true"]');
        const shut = document.querySelector('.iv-tabs__tab:not([aria-selected="true"])');
        return {
          open: getComputedStyle(open, "::after").backgroundColor,
          shut: getComputedStyle(shut, "::after").backgroundColor,
          underline: getComputedStyle(open).textDecorationLine,
        };
      });
      expect(tab.open).not.toBe(tab.shut);
      expect(tab.underline).toContain("underline");

      await page.goto(`/fixture/stepper/basic?theme=${theme}`);
      const step = await page.evaluate(() => {
        // The state is painted on the marker, not on the step.
        const current = document.querySelector('.iv-stepper__step[data-iv-state="current"] .iv-stepper__marker');
        const other = document.querySelector('.iv-stepper__step[data-iv-state="upcoming"] .iv-stepper__marker');
        if (!current || !other) return null;
        const read = (el) => {
          const cs = getComputedStyle(el);
          return `${cs.borderColor}|${cs.color}|${cs.outlineColor}`;
        };
        return { current: read(current), other: read(other) };
      });
      expect(step, "the stepper fixture marks a current step").not.toBeNull();
      expect(step.current).not.toBe(step.other);
    });
  });
}
