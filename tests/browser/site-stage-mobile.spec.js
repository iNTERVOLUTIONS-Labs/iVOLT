// The stage on a phone (persona round, 2026-11-09): an overlay opened inside a stage must get the
// room it needs, the bar must survive 150 % text, a frame that cannot load must say so in the
// page's colours, and a form must not be cut at a cap nobody can see. Against the built site on 4321.
import { test, expect } from "@playwright/test";

const DOCS = "http://127.0.0.1:4321";
const PHONE = { width: 393, height: 851 };

// The stage frame that runs `name`, and the box of what is open inside it.
const frameOf = (page, name) => page.locator(`[data-stage-name="${name}"] iframe[data-stage-frame]`);

async function bigText(page) {
  // 150 % root size, in the page and in every frame it embeds (Android's text scaling does both).
  await page.addInitScript(() => {
    const add = () => { const s = document.createElement("style"); s.textContent = "html{font-size:150% !important}"; document.head.append(s); };
    if (document.head) add(); else document.addEventListener("DOMContentLoaded", add);
  });
}

for (const scale of ["100", "150"]) {
  test.describe(`Stage overlays on a phone at ${scale} % text`, () => {
    test.use({ viewport: PHONE });
    test.setTimeout(90_000);
    test.beforeEach(async ({ page }) => { if (scale === "150") await bigText(page); });

    const cases = [
      { page: "/components/dialog", name: "dialog/basic", trigger: "[data-iv-open]", open: "dialog[open] .iv-dialog__panel" },
      { page: "/components/drawer", name: "drawer/basic", trigger: "[data-iv-open]", open: "dialog[open] .iv-drawer__panel" },
      // The palette scrolls its own result list by design: what matters is that the box is whole.
      { page: "/components/command", name: "command/basic", trigger: ".iv-button", open: "dialog[open]", ownScroll: true },
      { page: "/components/datepicker", name: "datepicker/basic", trigger: ".iv-datepicker__toggle", open: ".iv-datepicker__popover:not([hidden])" },
    ];
    for (const c of cases) {
      test(`${c.name}: the frame grows to show the open overlay whole, and shrinks back`, async ({ page }) => {
        await page.goto(DOCS + c.page);
        const frame = frameOf(page, c.name);
        await frame.scrollIntoViewIfNeeded();
        // Settled: the frame has taken the height its page reported (the placeholder minimum is gone).
        await expect.poll(() => frame.evaluate((f) => f.style.minBlockSize), { timeout: 15_000 }).toBe("0px");
        await page.waitForTimeout(700);
        const closed = await frame.evaluate((f) => f.getBoundingClientRect().height);
        const inner = frame.contentFrame();
        await inner.locator(c.trigger).first().click();
        const box = inner.locator(c.open).first();
        await expect(box).toBeVisible();
        // Everything the overlay holds fits in the frame: nothing scrolls inside it, nothing
        // reaches past the bottom edge.
        await expect.poll(async () => box.evaluate((el, own) => {
          const r = el.getBoundingClientRect();
          const clipped = !own && [el, ...el.querySelectorAll("*")].some((n) => n.clientHeight > 2 && n.scrollHeight - n.clientHeight > 2 && getComputedStyle(n).overflowY !== "visible");
          return r.top >= -1 && r.bottom <= innerHeight + 1 && !clipped;
        }, Boolean(c.ownScroll)), { timeout: 20_000 }).toBe(true);
        // And it holds still: a dialog that fitted once used to send the frame back to the
        // trigger's height, squeezed again, and the frame breathed between the two.
        // (A palette sized by the viewport may take a few steps to settle; then it stops.)
        await expect.poll(async () => {
          const samples = [];
          for (let i = 0; i < 5; i++) { samples.push(await frame.evaluate((f) => Math.round(f.getBoundingClientRect().height))); await page.waitForTimeout(150); }
          return Math.max(...samples) - Math.min(...samples);
        }, { timeout: 15_000 }).toBeLessThanOrEqual(2);
        // It never shrinks while the overlay is open (it grows only when the overlay needs it).
        expect(await frame.evaluate((f) => f.getBoundingClientRect().height)).toBeGreaterThanOrEqual(closed - 2);
        await page.keyboard.press("Escape");
        await expect.poll(() => frame.evaluate((f) => f.getBoundingClientRect().height), { timeout: 10_000 }).toBeLessThan(closed + 40);
      });
    }

    test("the stage bar keeps its title readable and the theme buttons whole", async ({ page }) => {
      await page.goto(DOCS + "/components/dialog");
      const title = page.locator('[data-stage-name="dialog/basic"] .docs-stage__title');
      const box = await title.boundingBox();
      expect(box.width, "the title is not squeezed to a column of letters").toBeGreaterThan(100);
      expect(box.height).toBeLessThan(120);
      // The header menu's theme group: no button breaks inside a word ("Ligh/t").
      await page.locator(".docs-menu-toggle").click();
      const buttons = page.locator("#docs-nav .docs-theme button");
      await expect(buttons.first()).toBeVisible();
      for (const b of await buttons.all()) {
        const wrapped = await b.evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getClientRects().length; });
        expect(wrapped, await b.textContent()).toBe(1);
      }
    });

    test("a tall form stage is shown whole on a phone, not cut at a hidden cap", async ({ page }) => {
      await page.goto(DOCS + "/components/form");
      const stage = page.locator("[data-stage]").first();
      await stage.scrollIntoViewIfNeeded();
      const frame = stage.locator("iframe[data-stage-frame]");
      await expect.poll(async () => {
        const [outer, inner] = await Promise.all([frame.evaluate((f) => f.getBoundingClientRect().height), frame.contentFrame().locator("body").evaluate((b) => b.scrollHeight)]);
        return outer >= inner - 2;
      }, { timeout: 15_000 }).toBe(true);
      await expect(stage).not.toHaveAttribute("data-stage-capped", "");
    });
  });
}

test.describe("Stage that cannot load", () => {
  test("says so in the page's colours, with the link to the demo on its own", async ({ page }) => {
    await page.route(/\/stage\/button\//, (r) => r.abort("blockedbyclient"));
    await page.goto(DOCS + "/components/button");
    const stage = page.locator("[data-stage]").first();
    await stage.scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute("data-stage-failed", "", { timeout: 15_000 });
    const fail = stage.locator("[data-stage-fail]");
    await expect(fail).toBeVisible();
    await expect(fail).toContainText("Couldn't load the demo");
    await expect(fail.locator("a")).toHaveAttribute("href", /\/stage\/button\//);
    await expect(stage.locator("iframe[data-stage-frame]")).toBeHidden();
  });

  test("in Spanish too", async ({ page }) => {
    await page.route(/\/stage\/button\//, (r) => r.abort("blockedbyclient"));
    await page.goto(DOCS + "/es/components/button");
    const stage = page.locator("[data-stage]").first();
    await stage.scrollIntoViewIfNeeded();
    const fail = stage.locator("[data-stage-fail]");
    await expect(fail).toBeVisible({ timeout: 15_000 });
    await expect(fail).toContainText("No se ha podido cargar la demo");
    await expect(fail.locator("a")).toContainText("Abrir sola");
  });
});

test.describe("Stage controls on a touch screen", () => {
  test.use({ viewport: PHONE, hasTouch: true });
  test("every control of the bar is at least 44 px", async ({ page, browserName }) => {
    test.skip(browserName === "firefox", "Firefox does not emulate a coarse pointer");
    await page.goto(DOCS + "/components/dialog");
    const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
    test.skip(!coarse, "this engine does not report a coarse pointer under emulation");
    const controls = page.locator('[data-stage-name="dialog/basic"] .docs-stage__controls button:visible, [data-stage-name="dialog/basic"] .docs-stage__open');
    for (const c of await controls.all()) {
      const b = await c.boundingBox();
      expect(Math.round(b.height), await c.textContent()).toBeGreaterThanOrEqual(44);
      expect(Math.round(b.width), await c.textContent()).toBeGreaterThanOrEqual(44);
    }
  });
});
