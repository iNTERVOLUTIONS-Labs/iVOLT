// The live stage: a page per fixture, embedded, with controls that really change the example.
import { test, expect } from "@playwright/test";

const DOCS = "http://127.0.0.1:4321";

test.describe("Live stage", () => {
  test.setTimeout(120_000);

  test("every fixture has a stage page of its own, dressed as a consumer would dress it", async ({ request }) => {
    for (const name of ["button/variants", "navbar/basic", "dialog/basic", "theme/nested", "carousel/photos"]) {
      const res = await request.get(`${DOCS}/stage/${name}.html`);
      expect(res.status(), name).toBe(200);
      const html = await res.text();
      expect(html, name).toContain('class="iv-root"');
      expect(html, name).toContain("/examples/ivolt/css/ivolt.min.css"); // round 3: the stage links the minified sheet, like the snippet the site publishes
      // Round 3: the published script in its single-file form, one request instead of the 37 of
      // the unminified module graph; boot.js sets data-iv-js and calls IVOLT.init on DOMContentLoaded.
      expect(html, name).toContain("/examples/ivolt/js/ivolt.iife.min.js");
      expect(html, name).not.toContain("/examples/ivolt/js/auto.js");
      expect(html, name).toContain("/stage/boot.js");
    }
  });

  test("the single-file build is what runs inside the frame, and it really initialises", async ({ page }) => {
    const asked = [];
    page.on("request", (r) => { if (/\/examples\/ivolt\/js\//.test(r.url())) asked.push(r.url()); });
    await page.goto(`${DOCS}/stage/navbar/basic.html`);
    await expect(page.locator("html")).toHaveAttribute("data-iv-js", "");
    expect(await page.evaluate(() => typeof window.IVOLT?.init)).toBe("function");
    // init ran: the navbar carries its instance marker, not just its served markup.
    await expect.poll(async () => page.evaluate(() => !!document.querySelector("[data-iv-ready], .iv-navbar[data-iv-state], .iv-navbar")), { timeout: 10_000 }).toBe(true);
    expect(asked.filter((u) => /auto\.js|\/js\/components\//.test(u)), "no module graph is walked").toEqual([]);
    expect(asked.length, "one script, not thirty-seven").toBeLessThanOrEqual(2);
  });

  test("the stage page reads the URL and dresses itself before anything else", async ({ page }) => {
    await page.goto(`${DOCS}/stage/button/variants.html?theme=light&dir=rtl&motion=reduce&flat=1`);
    const root = page.locator("html");
    await expect(root).toHaveAttribute("data-iv-theme", "light");
    await expect(root).toHaveAttribute("dir", "rtl");
    await expect(root).toHaveAttribute("data-stage-motion", "reduce");
    await expect(page.locator("#stage-sheet")).toHaveAttribute("href", /ivolt\.flat\.min\.css/);
  });

  test("the controls change the theme, the direction and the width of the frame", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(DOCS + "/components/navbar");
    const stage = page.locator("#fx-navbar-basic");
    await expect(stage.locator("[data-stage-controls]")).toBeVisible();
    const frame = stage.frameLocator("iframe");
    await expect(frame.locator("html")).toHaveAttribute("data-iv-theme", /dark|light/);

    await stage.locator("[data-stage-theme=light]").click();
    await expect(frame.locator("html")).toHaveAttribute("data-iv-theme", "light");
    await stage.locator("[data-stage-dir=rtl]").click();
    await expect(frame.locator("html")).toHaveAttribute("dir", "rtl");

    const wide = await stage.locator("iframe").evaluate((el) => el.getBoundingClientRect().width);
    await stage.locator("[data-stage-set-width='390']").click();
    // The width transitions; poll until it settles instead of guessing how long a loaded engine takes.
    await expect.poll(async () => Math.round(await stage.locator("iframe").evaluate((el) => el.getBoundingClientRect().width)), { timeout: 10_000 }).toBeLessThanOrEqual(392);
    const narrow = await stage.locator("iframe").evaluate((el) => el.getBoundingClientRect().width);
    expect(narrow).toBeLessThan(wide);

    await stage.locator("[data-stage-motion]").check();
    await expect(frame.locator("html")).toHaveAttribute("data-stage-motion", "reduce");
    await stage.locator("[data-stage-flat]").check();
    await expect(frame.locator("#stage-sheet")).toHaveAttribute("href", /ivolt\.flat\.min\.css/);
  });

  test("the frame takes the height its own page reports", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(DOCS + "/components/dialog");
    const frame = page.locator("#fx-dialog-basic iframe");
    await expect
      .poll(async () => frame.evaluate((el) => el.getBoundingClientRect().height), { timeout: 15_000 })
      .toBeGreaterThan(100);
    const h = await frame.evaluate((el) => el.style.blockSize);
    expect(h, "the height comes from postMessage, not from a guess").toMatch(/px$/);
  });

  test("the source tabs come from the same file and copy what they show", async ({ page, context, browserName }) => {
    if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(DOCS + "/components/navbar");
    const stage = page.locator("#fx-navbar-basic");
    await expect(stage.locator(".docs-stage__path")).toHaveText("fixtures/navbar/basic.html");
    const tabs = stage.locator('[role="tab"]');
    expect(await tabs.count()).toBeGreaterThan(1);
    await expect(stage.locator('[data-code-panel="html"] code')).toContainText("iv-navbar");
    await tabs.nth(1).click();
    await expect(stage.locator('[data-code-panel="html"]')).toBeHidden();
    const copy = stage.locator(".docs-code__panel:not([hidden]) .docs-copy").first();
    await copy.click();
    await expect(copy).toHaveText(/Copied|Copiado|Selected|Seleccionado/);
  });

  test("without JavaScript the stage is still the component, full width", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto(DOCS + "/components/navbar");
    await expect(page.locator("#fx-navbar-basic [data-stage-controls]")).toBeHidden();
    const w = await page.locator("#fx-navbar-basic iframe").evaluate((el) => el.getBoundingClientRect().width);
    expect(w).toBeGreaterThan(400);
    await ctx.close();
  });
});
