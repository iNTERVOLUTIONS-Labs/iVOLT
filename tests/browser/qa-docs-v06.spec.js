// Adversarial review of the v0.6 documentation: the ten new pages have to answer, show every
// fixture they claim, read the same in both languages, fit a phone, and be reachable from the
// sidebar, the header menu and the footer. Against the built site on 127.0.0.1:4321, which the
// Playwright config starts.
import { test, expect } from "@playwright/test";

const DOCS = "http://127.0.0.1:4321";
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// slug → the component selector its previews must render, and the fixtures the page documents.
const added = {
  navbar: { root: ".iv-navbar", fixtures: ["navbar/basic", "navbar/megamenu", "navbar/transparent"] },
  stepper: { root: ".iv-stepper", fixtures: ["stepper/basic", "stepper/vertical", "stepper/compact"] },
  timeline: { root: ".iv-timeline", fixtures: ["timeline/basic", "timeline/alternate", "timeline/horizontal"] },
  stat: { root: ".iv-stat", fixtures: ["stat/basic", "stat/cards"] },
  avatar: { root: ".iv-avatar", fixtures: ["avatar/basic", "avatar/group"] },
};
const slugs = Object.keys(added);
const routes = [...slugs.map((s) => `/components/${s}`), ...slugs.map((s) => `/es/components/${s}`)];
const fixtureId = (name) => `#fx-${name.replace(/\W+/g, "-")}`;

test.describe("Docs v0.6", () => {
  test.setTimeout(120_000);

  test("the ten new pages answer and show every fixture they document", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of routes) {
      const slug = route.split("/").pop();
      const { root, fixtures } = added[slug];
      expect((await request.get(DOCS + route)).status(), `${route} status`).toBe(200);
      await page.goto(DOCS + route);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(".docs-prose h1"), `${route} title`).toBeVisible();
      // The meta line names the module and the version the component landed in.
      await expect(page.locator(".docs-meta"), `${route} meta`).toContainText("v0.6");
      for (const name of fixtures) {
        const fx = page.locator(fixtureId(name));
        await expect(fx, `${route} is missing ${name}`).toHaveCount(1);
        // Preview and snippet come from the same file: both have to be there.
        await expect(fx.locator(`.docs-fixture__preview ${root}`).first(), `${route} preview of ${name}`).toBeAttached();
        await expect(fx.locator(".docs-fixture__code code"), `${route} snippet of ${name}`).not.toBeEmpty();
        await expect(fx.locator(".docs-fixture__path"), `${route} path of ${name}`).toHaveText(`fixtures/${name}.html`);
      }
      // Every page carries the sections the contract asks for, and a table of options or locals.
      const sections = await page.locator(".docs-prose > h2").count();
      expect(sections, `${route} sections`).toBeGreaterThan(4);
      expect(await page.locator(".docs-prose .docs-scroller > table").count(), `${route} tables`).toBeGreaterThan(0);
    }
  });

  test("the Spanish twins carry the same sections and the same fixtures", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const count = async (route) => {
      await page.goto(DOCS + route);
      await page.evaluate(() => document.fonts.ready);
      return page.evaluate(() => ({
        sections: document.querySelectorAll(".docs-prose > h2").length,
        fixtures: [...document.querySelectorAll(".docs-fixture")].map((f) => f.id).join(","),
        cut: [...document.querySelectorAll(".docs-prose > :is(h1, h2, h3, p, li)")].filter((el) => el.scrollWidth > el.clientWidth + 2).length,
      }));
    };
    for (const slug of slugs) {
      const en = await count(`/components/${slug}`);
      const es = await count(`/es/components/${slug}`);
      expect(es.sections, `${slug} sections in Spanish`).toBe(en.sections);
      expect(es.fixtures, `${slug} fixtures in Spanish`).toBe(en.fixtures);
      expect(en.cut, `${slug} clipped text`).toBe(0);
      expect(es.cut, `${slug} clipped text in Spanish`).toBe(0);
    }
  });

  test("no new page scrolls sideways on a phone or on a desktop", async ({ page }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await page.goto(DOCS + route);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(80);
        expect(await overflow(page), `${route} at ${width}`).toBeLessThanOrEqual(1);
      }
    }
  });

  test("the sidebar groups the components by family and still marks every one", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of ["/components/navbar", "/es/components/navbar"]) {
      await page.goto(DOCS + route);
      const shape = await page.evaluate(() => {
        const group = [...document.querySelectorAll(".docs-sidebar .docs-sidebar__group")].find((g) => g.querySelector("a[href*='/components/']"));
        const subs = [...group.querySelectorAll(".docs-sidebar__sub")].map((s) => s.textContent.trim());
        // Each family block must hold links of one kind only.
        const blocks = [...group.querySelectorAll(".docs-sidebar__list")].map((ul) => [...new Set([...ul.querySelectorAll(".docs-sidebar__kind")].map((k) => k.textContent))]);
        const kinds = [...document.querySelectorAll(".docs-sidebar a[href*='/components/'] .docs-sidebar__kind")].map((k) => k.textContent);
        const links = document.querySelectorAll(".docs-sidebar a[href*='/components/']").length;
        return { subs, blocks, kinds, links };
      });
      expect(shape.subs.length, `${route} family headings`).toBe(2);
      expect(shape.subs.every((s) => s.length > 0), `${route} family headings have text`).toBe(true);
      // The kind stays beside every single component, as the overhaul review demanded.
      expect(shape.kinds.length, `${route} marked components`).toBe(shape.links);
      expect(new Set(shape.kinds)).toEqual(new Set(["css", "js"]));
      for (const block of shape.blocks) expect(block.length, `${route} mixed family block`).toBe(1);
    }
  });

  test("the header menu and the footer reach every new component", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const base of ["", "/es"]) {
      await page.goto(`${DOCS}${base}/components/navbar`);
      for (const slug of slugs) {
        const href = `${base}/components/${slug}`;
        await expect(page.locator(`#docs-mm-components a[href="${href}"]`), `header menu misses ${href}`).toHaveCount(1);
        await expect(page.locator(`.docs-sitemap a[href="${href}"]`), `site map misses ${href}`).toHaveCount(1);
      }
      // The beta notice and the footer follow the current cycle (0.7 since the same day), not the previous one.
      await expect(page.locator(".docs-footer__inner")).toContainText("v0.7");
      await expect(page.locator(".docs-footer__inner")).toContainText("0.7.0");
    }
  });

  test("the pages updated for v0.6 show what v0.6 added", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const checks = [
      ["/components/toast", "#fx-toast-declarative", "data-iv-toast"],
      ["/es/components/toast", "#fx-toast-declarative", "data-iv-toast"],
      ["/components/progress", "#fx-progress-sizes", "--iv-progress-size"],
      ["/es/components/progress", "#fx-progress-sizes", "--iv-progress-size"],
      ["/components/card", null, "--iv-card-shadow-hover"],
      ["/es/components/card", null, "--iv-card-shadow-hover"],
      ["/foundations/tokens-and-themes", null, "--iv-focus-halo"],
      ["/es/foundations/tokens-and-themes", null, "--iv-focus-halo"],
    ];
    for (const [route, fixture, text] of checks) {
      await page.goto(DOCS + route);
      if (fixture) await expect(page.locator(fixture), `${route} fixture`).toHaveCount(1);
      await expect(page.locator(".docs-prose"), `${route} mentions ${text}`).toContainText(text);
    }
    // The six expressive-layer tokens are documented with their values, not only named.
    for (const route of ["/foundations/tokens-and-themes", "/es/foundations/tokens-and-themes"]) {
      await page.goto(DOCS + route);
      const prose = page.locator(".docs-prose");
      for (const token of ["--iv-shadow-ambient", "--iv-color-hover-surface", "--iv-color-primary-border", "--iv-focus-halo", "--iv-tracking-tight", "--iv-tracking-caps"]) {
        await expect(prose, `${route} misses ${token}`).toContainText(token);
      }
      await expect(prose, `${route} misses a token value`).toContainText("-0.011em");
    }
  });
});
