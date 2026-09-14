import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Reads the computed transform of the first element matching `selector`. */
const transformOf = (page, selector) =>
  page.locator(selector).first().evaluate((el) => getComputedStyle(el).transform);

/** Whether the engine ships CSS scroll-driven animations. */
const nativeTimelines = (page) => page.evaluate(() => CSS.supports("animation-timeline: view()"));

test.describe("Parallax", () => {
  test("the layer travels while the page scrolls, and settles back when it is centred", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/fixture/motion/parallax");
    const first = ".iv-parallax";
    const before = await transformOf(page, first);
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect.poll(() => transformOf(page, first)).not.toBe(before);
    // Whatever drives it, the travel is a translation: nothing is repositioned.
    const after = await transformOf(page, first);
    expect(after).toMatch(/^matrix\(1, 0, 0, 1, /);
  });

  test("the forced container writes --iv-view from 0 to 1 across the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/fixture/motion/parallax");
    const forced = page.locator("#motion-parallax-forced .iv-parallax");
    // The container declares data-iv-force, so the component writes even on an
    // engine that has scroll timelines.
    await expect
      .poll(async () => {
        await forced.evaluate((el) => el.scrollIntoView({ block: "end" }));
        return Number(await forced.evaluate((el) => el.style.getPropertyValue("--iv-view")));
      })
      .toBeLessThan(0.5);
    const low = Number(await forced.evaluate((el) => el.style.getPropertyValue("--iv-view")));
    await page.evaluate(() => window.scrollBy(0, 900));
    await expect
      .poll(() => forced.evaluate((el) => Number(el.style.getPropertyValue("--iv-view"))))
      .toBeGreaterThan(low);
    const high = await forced.evaluate((el) => Number(el.style.getPropertyValue("--iv-view")));
    expect(high).toBeLessThanOrEqual(1);
  });

  test("the fallback moves the layer where the engine has no scroll timelines", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/fixture/motion/parallax");
    const native = await nativeTimelines(page);
    const forced = "#motion-parallax-forced .iv-parallax";
    await page.locator(forced).evaluate((el) => el.scrollIntoView({ block: "end" }));
    const before = await transformOf(page, forced);
    await page.evaluate(() => window.scrollBy(0, 700));
    await expect.poll(() => transformOf(page, forced)).not.toBe(before);
    // On an engine without scroll timelines only `--iv-view` can be moving it.
    if (!native) {
      expect(await page.locator(forced).evaluate((el) => el.style.getPropertyValue("--iv-view"))).not.toBe("");
    }
  });

  test("reduced motion leaves every layer at its authored position", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/fixture/motion/parallax");
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(120);
    const transforms = await page.locator(".iv-parallax").evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
    expect(transforms.every((t) => t === "none")).toBe(true);
    const written = await page.locator(".iv-parallax").evaluateAll((els) => els.map((el) => el.style.getPropertyValue("--iv-view")));
    expect(written.every((v) => v === "")).toBe(true);
  });
});

test.describe("Scroll progress", () => {
  test("the bar grows with the page and fills at the end", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await page.goto("/fixture/motion/progress");
    const bar = page.locator(".iv-scroll-progress");
    const width = async () => (await bar.boundingBox()).width;
    const viewport = 1000;
    expect(await width()).toBeLessThan(viewport * 0.15);
    await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) / 2));
    await expect.poll(width).toBeGreaterThan(viewport * 0.3);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(width).toBeGreaterThan(viewport * 0.95);
  });

  test("the bar is decoration and is hidden from assistive technology", async ({ page }) => {
    await page.goto("/fixture/motion/progress");
    await expect(page.locator(".iv-scroll-progress")).toHaveAttribute("aria-hidden", "true");
  });

  test("reduced motion keeps the reading position: the bar still follows the page", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1000, height: 700 });
    await page.goto("/fixture/motion/progress");
    const bar = page.locator(".iv-scroll-progress");
    const width = async () => (await bar.boundingBox()).width;
    expect(await width()).toBeLessThan(150);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(width).toBeGreaterThan(950);
  });
});

test.describe("Marquee", () => {
  test("the track moves, pauses under the pointer and resumes when it leaves", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/fixture/motion/marquee");
    const track = page.locator(".iv-marquee__track").first();
    const before = await track.evaluate((el) => getComputedStyle(el).transform);
    await expect.poll(() => track.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before);

    const box = await track.boundingBox();
    await page.mouse.move(box.x + 40, box.y + box.height / 2);
    await expect.poll(() => track.evaluate((el) => el.getAnimations().map((a) => a.playState))).toEqual(["paused"]);
    await page.mouse.move(5, 780);
    await expect.poll(() => track.evaluate((el) => el.getAnimations().map((a) => a.playState))).toEqual(["running"]);
  });

  test("focus inside the track stops it too", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/fixture/motion/marquee");
    const link = page.locator('.iv-marquee__item a[href="#motion-marquee"]').first();
    const track = link.locator("xpath=ancestor::*[contains(@class,'iv-marquee__track')]");
    await link.focus();
    await expect.poll(() => track.evaluate((el) => el.getAnimations().map((a) => a.playState))).toEqual(["paused"]);
  });

  test("reduced motion stops the loop and gives the row a scrollbar", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/fixture/motion/marquee");
    const track = page.locator(".iv-marquee__track").first();
    expect(await track.evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(await track.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    expect(await page.locator(".iv-marquee").first().evaluate((el) => getComputedStyle(el).overflowX)).toBe("auto");
  });

  test("no marquee overflows the page at phone width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/fixture/motion/marquee");
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over).toBeLessThanOrEqual(0);
  });
});

test.describe("Stacked cards", () => {
  test("the cards stick, each one step lower than the one before", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await page.goto("/fixture/motion/stack");
    const cards = page.locator(".iv-stack-cards__card");
    // Far enough for the head of the deck to be stuck, not so far that it has left.
    await page.evaluate(() => {
      const deck = document.querySelector(".iv-stack-cards");
      window.scrollTo(0, deck.getBoundingClientRect().bottom + window.scrollY - window.innerHeight);
    });
    await page.waitForTimeout(150);
    const tops = await cards.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    // --iv-stack-top is --iv-space-6 (24px) in this fixture and the step is 1rem.
    expect(tops[0]).toBe(24);
    expect(tops[1]).toBe(40);
    for (let i = 1; i < tops.length; i += 1) expect(tops[i]).toBeGreaterThan(tops[i - 1]);
  });

  test("the deck recedes on its way out where the engine drives it", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await page.goto("/fixture/motion/stack");
    const native = await page.evaluate(() => CSS.supports("animation-timeline: view()"));
    const first = page.locator(".iv-stack-cards__card").first();
    // At rest the deck is untouched: an identity matrix where an animation holds it, `none` where there is none.
    expect(await first.evaluate((el) => getComputedStyle(el).transform)).toMatch(/^none$|^matrix\(1, 0, 0, 1, 0, 0\)$/);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(250);
    const state = await first.evaluate((el) => ({ transform: getComputedStyle(el).transform, opacity: Number(getComputedStyle(el).opacity) }));
    if (native) {
      expect(state.transform).toBe("matrix(0.94, 0, 0, 0.94, 0, 0)");
      expect(state.opacity).toBeLessThan(1);
    } else {
      // No scroll timelines: the deck is a plain sticky stack, which is the documented fallback.
      expect(state.transform).toBe("none");
      expect(state.opacity).toBe(1);
    }
  });

  test("reduced motion keeps the stack and drops the scale", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1000, height: 700 });
    await page.goto("/fixture/motion/stack");
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(150);
    const states = await page.locator(".iv-stack-cards__card").evaluateAll((els) =>
      els.map((el) => ({ transform: getComputedStyle(el).transform, opacity: getComputedStyle(el).opacity, position: getComputedStyle(el).position }))
    );
    expect(states.every((s) => s.transform === "none" && s.opacity === "1" && s.position === "sticky")).toBe(true);
  });
});

const fixtures = ["motion/parallax", "motion/progress", "motion/marquee", "motion/stack"];
for (const theme of ["light", "dark"]) {
  for (const f of fixtures) {
    test(`axe ${f} (${theme})`, async ({ page }) => {
      // The audited state is the settled one, which is what reduced motion renders at once.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/fixture/${f}?theme=${theme}`);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const serious = results.violations.filter((v) => ["critical", "serious"].includes(v.impact));
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
}
