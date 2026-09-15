// Right-to-left audit: every fixture is rendered inside `<html dir="rtl">` by the
// fixture server (`?dir=rtl`) and must lay out inside the viewport, keep hidden
// elements hidden, and mirror the transforms, gradients and clipped shapes that
// have no logical equivalent.
import { test, expect } from "@playwright/test";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const FIXTURES = join(process.cwd(), "packages/ivolt/fixtures");
const fixtures = readdirSync(FIXTURES).flatMap((dir) =>
  readdirSync(join(FIXTURES, dir)).map((file) => `${dir}/${file.replace(/\.html$/, "")}`),
);

const overflow = () =>
  ({ ...document.scrollingElement, sw: document.scrollingElement.scrollWidth, cw: document.scrollingElement.clientWidth }) &&
  { sw: document.scrollingElement.scrollWidth, cw: document.scrollingElement.clientWidth };

test.describe("no sideways scroll on narrow screens", () => {
  for (const width of [320, 390]) {
    for (const dir of ["ltr", "rtl"]) {
      test(`${dir} at ${width}px`, async ({ page }) => {
        test.setTimeout(240_000);
        await page.setViewportSize({ width, height: 900 });
        const offenders = [];
        for (const fixture of fixtures) {
          await page.goto(`/fixture/${fixture}?dir=${dir}`);
          const { sw, cw } = await page.evaluate(overflow);
          if (sw > cw + 1) offenders.push(`${fixture} ${sw}>${cw}`);
        }
        expect(offenders).toEqual([]);
      });
    }
  }
});

// A block that sets `display` in a later layer would beat the base rule for
// `[hidden]`; every module that does so has to restate it.
test("the hidden attribute always wins", async ({ page }) => {
  test.setTimeout(240_000);
  const offenders = [];
  for (const fixture of fixtures) {
    await page.goto(`/fixture/${fixture}`);
    const shown = await page.evaluate(() =>
      [...document.querySelectorAll("#fixture [hidden]")]
        .filter((el) => getComputedStyle(el).display !== "none")
        .map((el) => el.className || el.tagName),
    );
    if (shown.length) offenders.push(`${fixture}: ${shown.join(", ")}`);
  }
  expect(offenders).toEqual([]);
});

test.describe("mirrored in a right-to-left document", () => {
  test("the carousel travels towards the inline start", async ({ page }) => {
    // The slide that fills more than half the viewport is the one on screen;
    // a looser test counts a neighbour that is one sub-pixel inside the edge.
    const visible = async () =>
      page.evaluate(() => {
        const view = document.querySelector(".iv-carousel__viewport").getBoundingClientRect();
        return [...document.querySelectorAll(".iv-carousel__slide")]
          .map((slide, index) => {
            const box = slide.getBoundingClientRect();
            const overlap = Math.min(box.right, view.right) - Math.max(box.left, view.left);
            return overlap > view.width / 2 ? index : null;
          })
          .filter((index) => index !== null);
      });
    for (const dir of ["ltr", "rtl"]) {
      await page.goto(`/fixture/carousel/basic?dir=${dir}`);
      await page.locator(".iv-carousel__next").first().click();
      // The engines get there differently — a transform here, a smooth scroll
      // there — so the wait is on the result: the same slide filling the
      // viewport in two consecutive readings.
      await page.waitForFunction(() => {
        const view = document.querySelector(".iv-carousel__viewport");
        const box = view.getBoundingClientRect();
        const on = [...document.querySelectorAll(".iv-carousel__slide")].findIndex((slide) => {
          const r = slide.getBoundingClientRect();
          return Math.min(r.right, box.right) - Math.max(r.left, box.left) > box.width / 2;
        });
        const previous = view.dataset.ivSettled;
        view.dataset.ivSettled = String(on);
        return on > 0 && previous === String(on);
      }, null, { polling: 100, timeout: 10_000 });
      expect(await visible(), `slide on screen in ${dir}`).toEqual([1]);
    }
  });

  test("the drawer arrives from outside the inline start edge", async ({ page }) => {
    for (const [dir, from] of [["ltr", "-100%"], ["rtl", "100%"]]) {
      await page.goto(`/fixture/drawer/basic?dir=${dir}`);
      const value = await page.evaluate(() =>
        getComputedStyle(document.querySelector(".iv-drawer")).getPropertyValue("--iv-drawer-from").trim(),
      );
      expect(value, `drawer start in ${dir}`).toBe(from);
    }
  });

  test("the marquee loops the other way", async ({ page }) => {
    for (const [dir, name] of [["ltr", "iv-marquee"], ["rtl", "iv-marquee-rtl"]]) {
      await page.goto(`/fixture/motion/marquee?dir=${dir}`);
      const applied = await page.evaluate(() =>
        getComputedStyle(document.querySelector(".iv-marquee__track")).animationName,
      );
      expect(applied, `marquee keyframes in ${dir}`).toBe(name);
    }
  });

  test("the megamenu chevron points at the inline end", async ({ page }) => {
    // rotate(45deg) and rotate(-45deg) differ in the sign of the two off-diagonal terms.
    for (const [dir, sign] of [["ltr", 1], ["rtl", -1]]) {
      await page.goto(`/fixture/megamenu/basic?dir=${dir}`);
      const matrix = await page.evaluate(() =>
        getComputedStyle(document.querySelector(".iv-megamenu__meta"), "::after").transform,
      );
      const [, b] = matrix.match(/matrix\(([-\d.]+), ([-\d.]+)/).slice(1).map(Number);
      expect(Math.sign(b), `chevron rotation in ${dir}`).toBe(sign);
    }
  });

  test("the popover arrow keeps both of its edges", async ({ page }) => {
    for (const [dir, clip] of [["ltr", "polygon(0px 0px, 100% 0px, 0px 100%)"], ["rtl", "polygon(0px 0px, 100% 0px, 100% 100%)"]]) {
      await page.goto(`/fixture/popover/basic?dir=${dir}`);
      const applied = await page.evaluate(() => {
        const el = document.querySelector(".iv-popover--arrow") || document.querySelector(".iv-popover");
        return getComputedStyle(el, "::before").clipPath;
      });
      expect(applied, `arrow shape in ${dir}`).toBe(clip);
    }
  });

  // No engine exposes the computed style of a slider track pseudo-element, so the
  // rule itself is the assertion; the rendering was checked with a screenshot.
  test("the range fills from the side the thumb starts on", async ({ page }) => {
    await page.goto("/fixture/form/controls?dir=rtl");
    const rules = await page.evaluate(() => {
      const found = [];
      const walk = (list) => {
        for (const rule of list) {
          if (rule.cssRules) walk(rule.cssRules);
          if (rule.selectorText?.includes("slider-runnable-track")) found.push(rule.cssText.replace(/\s+/g, " "));
        }
      };
      for (const sheet of document.styleSheets) walk(sheet.cssRules);
      return found;
    });
    const plain = rules.filter((r) => !r.includes('[dir="rtl"]'));
    const mirrored = rules.filter((r) => r.includes('[dir="rtl"]'));
    expect(plain.some((r) => r.includes("to right") || r.includes("90deg"))).toBe(true);
    expect(mirrored.length, `mirrored track rules: ${rules.join(" | ")}`).toBeGreaterThan(0);
    expect(mirrored.every((r) => r.includes("to left") || r.includes("270deg"))).toBe(true);
    // The element itself has to be in the right-to-left flow for the rule to apply.
    expect(await page.evaluate(() => getComputedStyle(document.querySelector(".iv-range")).direction)).toBe("rtl");
  });

  test("the sheen starts outside the inline start edge", async ({ page }) => {
    for (const [dir, sign] of [["ltr", -1], ["rtl", 1]]) {
      await page.goto(`/fixture/surfaces/glow?dir=${dir}`);
      const matrix = await page.evaluate(() => {
        const el = document.querySelector(".iv-shine");
        return el ? getComputedStyle(el, "::after").transform : null;
      });
      test.skip(matrix === null, "no .iv-shine in this fixture");
      const x = Number(matrix.split(", ")[4]);
      expect(Math.sign(x), `sheen start in ${dir}`).toBe(sign);
    }
  });
});
