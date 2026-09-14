// Adversarial review of the v0.7 documentation: the eight new pages (four in each language) have to
// answer, show their fixtures, fit a phone and a desktop, and the showcase recipe has to be the page
// it claims to be — navbar, gallery, wizard, timeline and reading bar, with a viewer that opens.
// Against the built site on 127.0.0.1:4321, which the Playwright config starts.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const DOCS = "http://127.0.0.1:4321";
const SHOWCASE = `${DOCS}/examples/showcase/index.html`;
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const fixtureId = (name) => `#fx-${name.replace(/\W+/g, "-")}`;

// route → the selector its previews must render, and the fixtures the page documents.
const pages = {
  "/components/lightbox": { root: ".iv-gallery", fixtures: ["lightbox/photos", "lightbox/basic", "lightbox/masonry", "lightbox/strip"] },
  "/components/countup": { root: ".iv-count", fixtures: ["countup/basic", "countup/formats"] },
  "/foundations/motion": { root: ".iv-parallax, .iv-scroll-progress, .iv-marquee, .iv-stack-cards", fixtures: ["motion/parallax", "motion/progress", "motion/marquee", "motion/stack"] },
  "/foundations/text": { root: ".iv-text-reveal, .iv-text-glow, .iv-text-outline, .iv-text-shimmer", fixtures: ["text/reveal", "text/glow", "text/outline", "text/shimmer"] },
};
const bare = Object.keys(pages);
const routes = [...bare, ...bare.map((r) => `/es${r}`)];

const seriousOf = (results) => results.violations
  .filter((v) => ["critical", "serious"].includes(v.impact))
  .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);

test.describe("Docs v0.7", () => {
  test.setTimeout(180_000);

  test("the eight new pages answer and show every fixture they document", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of routes) {
      const { root, fixtures } = pages[route.replace(/^\/es/, "")];
      expect((await request.get(DOCS + route)).status(), `${route} status`).toBe(200);
      await page.goto(DOCS + route);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(".docs-prose h1"), `${route} title`).toBeVisible();
      await expect(page.locator(".docs-meta"), `${route} meta`).toContainText("v0.7");
      for (const name of fixtures) {
        const fx = page.locator(fixtureId(name));
        await expect(fx, `${route} is missing ${name}`).toHaveCount(1);
        await expect(fx.locator(`.docs-fixture__preview :is(${root})`).first(), `${route} preview of ${name}`).toBeAttached();
        await expect(fx.locator(".docs-fixture__code code"), `${route} snippet of ${name}`).not.toBeEmpty();
        await expect(fx.locator(".docs-fixture__path"), `${route} path of ${name}`).toHaveText(`fixtures/${name}.html`);
      }
      const sections = await page.locator(".docs-prose > h2").count();
      expect(sections, `${route} sections`).toBeGreaterThan(4);
      expect(await page.locator(".docs-prose .docs-scroller > table").count(), `${route} tables`).toBeGreaterThan(0);
    }
  });

  test("the Spanish twins carry the same sections and the same fixtures", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const shape = async (route) => {
      await page.goto(DOCS + route);
      await page.evaluate(() => document.fonts.ready);
      return page.evaluate(() => ({
        sections: document.querySelectorAll(".docs-prose > h2").length,
        fixtures: [...document.querySelectorAll(".docs-fixture")].map((f) => f.id).join(","),
        cut: [...document.querySelectorAll(".docs-prose > :is(h1, h2, h3, p, li)")].filter((el) => el.scrollWidth > el.clientWidth + 2).length,
      }));
    };
    for (const route of bare) {
      const en = await shape(route);
      const es = await shape(`/es${route}`);
      expect(es.sections, `${route} sections in Spanish`).toBe(en.sections);
      expect(es.fixtures, `${route} fixtures in Spanish`).toBe(en.fixtures);
      expect(en.cut, `${route} clipped text`).toBe(0);
      expect(es.cut, `${route} clipped text in Spanish`).toBe(0);
    }
  });

  test("the gallery of photographs opens the viewer and closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${DOCS}/components/lightbox`);
    const gallery = page.locator("#fx-lightbox-photos .iv-gallery");
    const tiles = gallery.locator(".iv-gallery__item");
    expect(await tiles.count(), "six photographs").toBe(6);
    // Without a script the tiles are links to the files themselves: that is the no-JS path.
    await expect(tiles.nth(2)).toHaveAttribute("href", /\/photos\/.+\.jpg$/);
    await tiles.nth(2).click();
    // Every gallery on the page builds its own viewer, so the dialog is scoped to this fixture.
    const dialog = page.locator("#fx-lightbox-photos .iv-lightbox");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".iv-lightbox__img")).toHaveAttribute("src", /p1043\.jpg$/);
    await expect(dialog).toContainText("Christian Joudrey");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(tiles.nth(2)).toBeFocused();
  });

  test("no new route scrolls sideways on a phone or on a desktop", async ({ page }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [...routes.map((r) => DOCS + r), SHOWCASE]) {
        await page.goto(route);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(80);
        expect(await overflow(page), `${route} at ${width}`).toBeLessThanOrEqual(1);
      }
    }
  });

  test("the showcase recipe is the page it claims to be", async ({ page }) => {
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(SHOWCASE);
    await page.evaluate(() => document.fonts.ready);
    for (const [what, selector] of [
      ["navbar", ".iv-navbar[data-iv-component=navbar]"],
      ["cinematic hero", ".iv-hero--cinematic"],
      ["parallax frame", ".iv-parallax-frame .iv-parallax--media"],
      ["revealed headline", "h1.iv-text-reveal .iv-text-reveal__line"],
      ["marquee", ".iv-marquee .iv-marquee__track"],
      ["counted figures", ".iv-stat-group .iv-count[data-iv-component=countup]"],
      ["gallery", ".iv-gallery[data-iv-component=lightbox] .iv-gallery__item"],
      ["stacked cards", ".iv-stack-cards .iv-stack-cards__card"],
      ["stepper", ".iv-stepper[data-iv-component=stepper] .iv-stepper__panel"],
      ["timeline", ".iv-timeline .iv-timeline__item"],
      ["reading bar", "[data-iv-component=scroll-motion] .iv-scroll-progress"],
    ]) {
      expect(await page.locator(selector).count(), `showcase has no ${what}`).toBeGreaterThan(0);
    }
    // One h1, and it is the cover title.
    expect(await page.locator("h1").count(), "showcase h1").toBe(1);
    // The honesty the contract demands: the wizard says it sends nothing.
    await expect(page.locator("#contact-note")).toContainText("nothing is submitted");
    // Six credited photographs, all local.
    const items = page.locator(".iv-gallery__item");
    expect(await items.count(), "showcase photographs").toBe(6);
    for (const href of await items.evaluateAll((els) => els.map((e) => e.getAttribute("href")))) {
      expect(href, "photographs are local to the recipe").toMatch(/^photos\/p\d+\.jpg$/);
    }
    // The viewer opens on the tile that was clicked and closes again.
    await items.first().click();
    const dialog = page.locator(".iv-lightbox");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".iv-lightbox__img")).toHaveAttribute("src", /p1018\.jpg$/);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    expect(errors, "console errors on the showcase").toEqual([]);
  });

  test.describe("axe, with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("the recipe and the new pages pass axe in light and in dark", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      for (const theme of ["light", "dark"]) {
        for (const url of [SHOWCASE, ...routes.map((r) => DOCS + r)]) {
          await page.goto(url);
          await page.evaluate((t) => document.documentElement.setAttribute("data-iv-theme", t), theme);
          await page.evaluate(() => document.fonts.ready);
          const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
          expect(seriousOf(results), `axe on ${url} in ${theme}`).toEqual([]);
        }
      }
    });
  });
});
