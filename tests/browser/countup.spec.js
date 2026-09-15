import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Hooks the page before `init` runs: it records `iv:count` and `iv:counted`,
 * and samples the text of every figure on each frame, which is how the frames
 * of the count itself can be read back without racing them.
 *
 * @param {import("@playwright/test").Page} page Page under test.
 * @returns {Promise<void>} Resolves once the hook is installed.
 */
async function recordEvents(page) {
  await page.addInitScript(() => {
    /** @type {Array<Array<unknown>>} */
    window.__ev = [];
    /** @type {string[]} */
    window.__frames = [];
    for (const type of ["iv:count", "iv:counted"]) {
      document.addEventListener(
        type,
        (event) => {
          const detail = /** @type {CustomEvent} */ (event).detail ?? {};
          window.__ev.push([type, detail.from, detail.to]);
        },
        true
      );
    }
    let left = 240;
    const sample = () => {
      for (const el of document.querySelectorAll(".iv-count")) {
        const text = el.textContent ?? "";
        if (window.__frames[window.__frames.length - 1] !== text) window.__frames.push(text);
      }
      left -= 1;
      if (left > 0) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

test.describe("Countup", () => {
  test("counts the served figures and lands back on the served text", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await recordEvents(page);
    await page.goto("/fixture/countup/basic");
    await expect(page.locator("html")).toHaveAttribute("data-iv-js", "");

    const figures = page.locator(".iv-count");
    await expect(figures).toHaveCount(4);
    await expect.poll(async () => (await page.evaluate(() => window.__ev)).filter((e) => e[0] === "iv:counted").length).toBe(4);

    await expect(figures.nth(0)).toHaveText("2.60");
    await expect(figures.nth(1)).toHaveText("25.64");
    await expect(figures.nth(2)).toHaveText("39.04");
    await expect(figures.nth(3)).toHaveText("641");

    const log = await page.evaluate(() => window.__ev);
    const started = log.filter((e) => e[0] === "iv:count");
    expect(started).toHaveLength(4);
    expect(started.every((e) => e[1] === 0)).toBe(true);
    expect([...started.map((e) => e[2])].sort((a, b) => a - b)).toEqual([2.6, 25.64, 39.04, 641]);

    // The frames really counted: intermediate figures were painted, each of them
    // formatted with the decimals of the figure it was heading for.
    // How many frames land in 900 ms depends on the engine and on the machine's load (a loaded
    // three-engine run gave WebKit three), so the assertion is that some were painted, not how many.
    const frames = await page.evaluate(() => window.__frames);
    expect(frames.filter((t) => /^\d+\.\d{2}$/.test(t) && !["2.60", "25.64", "39.04"].includes(t)).length).toBeGreaterThan(0);
    expect(frames.filter((t) => /^\d{1,3}$/.test(t) && t !== "641").length).toBeGreaterThan(0);
  });

  test("keeps prefix, suffix and the separators of the language", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await recordEvents(page);
    await page.goto("/fixture/countup/formats");

    const figures = page.locator(".iv-stat__value.iv-count");
    await expect.poll(async () => (await page.evaluate(() => window.__ev)).filter((e) => e[0] === "iv:counted").length).toBeGreaterThanOrEqual(4);
    await expect(figures.nth(0)).toHaveText("€ 1,240.50");
    await expect(figures.nth(1)).toHaveText(/^12\.480,50\s€$/);
    await expect(figures.nth(2)).toHaveText("98 %");
    await expect(figures.nth(3)).toHaveText("1068");

    // The Spanish figure counts through Spanish separators, the English one keeps its
    // prefix, the percentage keeps its suffix and the ungrouped figure never groups.
    const frames = await page.evaluate(() => window.__frames);
    expect(frames.some((t) => /^€ \d{1,3}(,\d{3})?\.\d{2}$/.test(t) && t !== "€ 1,240.50")).toBe(true);
    expect(frames.some((t) => /^\d{1,2}\.\d{3},\d{2}\s€$/.test(t) && !t.startsWith("12.480,50"))).toBe(true);
    expect(frames.some((t) => /^\d{1,3} %$/.test(t) && t !== "98 %")).toBe(true);
    expect(frames.some((t) => /^\d{3,4}$/.test(t) && t !== "1068")).toBe(true);
    // `data-iv-grouping="false"` really holds: 1068 never becomes "1,068" on the way.
    expect(frames.every((t) => !/^\d,\d{3}$/.test(t))).toBe(true);
  });

  test("autostart counts without waiting for the viewport", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await recordEvents(page);
    await page.goto("/fixture/countup/formats");
    const log = await page.evaluate(() => window.__ev);
    const percent = log.find((e) => e[0] === "iv:count" && e[2] === 98);
    expect(percent).toBeTruthy();
    await expect(page.locator("[data-iv-autostart]")).toHaveText("98 %");
  });

  test("reduced motion never touches the served figure", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await recordEvents(page);
    await page.goto("/fixture/countup/basic");
    await expect(page.locator("html")).toHaveAttribute("data-iv-js", "");
    const served = ["2.60", "25.64", "39.04", "641"];
    const figures = page.locator(".iv-count");
    for (const [i, text] of served.entries()) await expect(figures.nth(i)).toHaveText(text);
    // Nothing is queued either: no event ever fires and the text is the served one.
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => window.__ev)).toEqual([]);
    for (const [i, text] of served.entries()) await expect(figures.nth(i)).toHaveText(text);
    expect(
      await page.evaluate(async () => {
        const mod = await import("/packages/ivolt/dist/js/components/countup.js");
        const el = document.querySelector(".iv-count");
        const instance = mod.Countup.get(el);
        return { done: instance.done, value: instance.value };
      })
    ).toEqual({ done: true, value: 2.6 });
  });

  test("without JavaScript the figures are already the answer", async ({ page }) => {
    await page.goto("/fixture/countup/basic?nojs=1");
    await expect(page.locator("html")).not.toHaveAttribute("data-iv-js", "");
    await expect(page.locator(".iv-count").first()).toHaveText("2.60");
    await expect(page.locator(".iv-count").nth(3)).toHaveText("641");
  });

  test("destroy restores the served figure and can run again", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/fixture/countup/basic");
    const result = await page.evaluate(async () => {
      const mod = await import("/packages/ivolt/dist/js/components/countup.js");
      const el = document.querySelector(".iv-count");
      mod.Countup.get(el).destroy();
      const after = el.outerHTML;
      const again = mod.Countup.getOrCreate(el);
      return { after, gone: mod.Countup.get(el) === again, text: el.textContent };
    });
    expect(result.after).toBe('<strong class="iv-stat__value iv-count" data-iv-component="countup">2.60</strong>');
    expect(result.text).toBe("2.60");
    expect(result.gone).toBe(true);
  });

  test("the figures keep their column: tabular numerals while counting", async ({ page }) => {
    await page.goto("/fixture/countup/basic");
    expect(
      await page.locator(".iv-count").first().evaluate((el) => getComputedStyle(el).fontVariantNumeric)
    ).toContain("tabular-nums");
  });

  for (const theme of ["light", "dark"]) {
    for (const fixture of ["basic", "formats"]) {
      test(`axe countup/${fixture} (${theme})`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(`/fixture/countup/${fixture}?theme=${theme}`);
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        const serious = results.violations.filter((v) => ["critical", "serious"].includes(v.impact));
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      });
    }
  }
});
