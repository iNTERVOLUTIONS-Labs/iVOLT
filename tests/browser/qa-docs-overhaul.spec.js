// Adversarial review of the documentation redesign: the reading column has to be wide and
// consistent, every section has to carry its furniture, nothing may be clipped or pushed
// sideways, and the Spanish pages have to behave exactly like the English ones.
// These run against the built site on 127.0.0.1:4321, which the Playwright config starts.
import { test, expect } from "@playwright/test";

const DOCS = "http://127.0.0.1:4321";
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const pages = ["/getting-started", "/components/button", "/components/table", "/foundations/surfaces", "/examples", "/roadmap", "/404", "/es/getting-started", "/es/components/button", "/es/foundations/surfaces", "/es/examples"];

test.describe("Docs overhaul", () => {
  test.setTimeout(120_000);

  // The owner's first complaint: the column was too narrow for the fixtures and tables in it.
  test("the reading column takes the width the shell gives it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of ["/components/button", "/getting-started", "/es/components/button"]) {
      await page.goto(DOCS + route);
      await page.evaluate(() => document.fonts.ready);
      const m = await page.evaluate(() => {
        const main = document.querySelector("#main").getBoundingClientRect();
        const fixture = document.querySelector(".docs-fixture, .docs-scroller, pre");
        return { main: main.width, block: fixture ? fixture.getBoundingClientRect().width : 0 };
      });
      expect(m.main, `${route} column`).toBeGreaterThan(820);
      // A fixture, a table or a code block fills the column instead of sitting in half of it.
      expect(m.block, `${route} block width`).toBeGreaterThan(m.main - 4);
    }
  });

  // One vertical scale: every section opens with a rule, a numeral and the same gap above it.
  test("every section carries its numeral, its rule and one rhythm", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of ["/components/button", "/foundations/surfaces", "/es/components/button"]) {
      await page.goto(DOCS + route);
      await page.evaluate(() => document.fonts.ready);
      const info = await page.evaluate(() => {
        const h2s = [...document.querySelectorAll(".docs-prose > h2")];
        return h2s.map((h) => {
          const cs = getComputedStyle(h);
          return {
            id: h.id,
            numeral: getComputedStyle(h, "::before").content,
            rule: cs.borderTopWidth,
            gap: Math.round(parseFloat(cs.marginTop)),
          };
        });
      });
      expect(info.length, `${route} sections`).toBeGreaterThan(2);
      const gaps = new Set();
      for (const s of info) {
        expect(s.id, `${route} heading without id`).toBeTruthy();
        expect(s.numeral, `${route}#${s.id} numeral`).not.toBe("none");
        expect(s.rule, `${route}#${s.id} rule`).not.toBe("0px");
        gaps.add(s.gap);
      }
      expect([...gaps].length, `${route} uses one gap above sections, got ${[...gaps]}`).toBe(1);
    }
  });

  // A card title is content. It used to take the section counter and a twelve-space gap with it.
  test("headings inside cards are not sections", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(DOCS + "/examples");
    const nested = await page.evaluate(() => {
      const el = document.querySelector(".docs-card .iv-card__title");
      return { numeral: getComputedStyle(el, "::before").content, marginTop: getComputedStyle(el).marginTop, inToc: [...document.querySelectorAll("#docs-toc-list a")].map((a) => a.textContent) };
    });
    expect(nested.numeral).toBe("none");
    expect(parseFloat(nested.marginTop)).toBeLessThan(8);
    expect(nested.inToc.join("|")).not.toMatch(/Business landing/);
    expect(nested.inToc.length).toBeGreaterThan(1);
  });

  // Documentation that hides half of itself is not documentation.
  test("no code sample, table cell or caption is clipped", async ({ page }) => {
    for (const width of [390, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["/components/button", "/getting-started", "/es/getting-started"]) {
        await page.goto(DOCS + route);
        await page.evaluate(() => document.fonts.ready);
        const clipped = await page.evaluate(() => {
          const bad = [];
          for (const el of document.querySelectorAll(".docs-prose pre, .docs-fixture__code pre, .docs-fixture__caption > *")) {
            const cs = getComputedStyle(el);
            const scrolls = cs.overflowX === "auto" || cs.overflowX === "scroll";
            if (!scrolls && el.scrollWidth > el.clientWidth + 2) bad.push(el.className + ":" + el.textContent.slice(0, 30));
          }
          // A table always sits in a scroller, so it is allowed to be wider than the page.
          for (const t of document.querySelectorAll(".docs-prose table")) {
            if (!t.closest(".docs-scroller")) bad.push("table without a scroller");
          }
          return bad;
        });
        expect(clipped, `${route} at ${width}`).toEqual([]);
      }
    }
  });

  test("no route scrolls sideways at any width", async ({ page }) => {
    for (const width of [320, 390, 768, 1024, 1366, 1440]) {
      await page.setViewportSize({ width, height: width === 1366 ? 610 : 900 });
      for (const route of pages) {
        await page.goto(DOCS + route);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(80);
        expect(await overflow(page), `${route} at ${width}`).toBeLessThanOrEqual(1);
      }
    }
  });

  // The megamenu fixture anchors its panel to the page, not to the preview, and used to push
  // the document 313px wide at 1024.
  test("an open megamenu inside a fixture stays inside the page", async ({ page }) => {
    for (const width of [1024, 1366]) {
      await page.setViewportSize({ width, height: 768 });
      await page.goto(DOCS + "/components/megamenu");
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      expect(await overflow(page), `megamenu at ${width}`).toBeLessThanOrEqual(1);
    }
  });

  // The footer is the last navigation on the page; it used to be a 500px wordmark and six links.
  test("the footer carries the whole site map in both languages", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [route, start] of [["/components/button", "Getting started"], ["/es/components/button", "Primeros pasos"]]) {
      await page.goto(DOCS + route);
      await page.evaluate(() => document.fonts.ready);
      const cols = await page.locator(".docs-sitemap__col").count();
      expect(cols, `${route} site map columns`).toBe(4);
      await expect(page.locator(`.docs-sitemap a:text-is("${start}")`)).toHaveCount(1);
      const lockup = await page.evaluate(() => document.querySelector(".docs-lockup").getBoundingClientRect().height);
      expect(lockup, `${route} lockup height`).toBeLessThan(200);
    }
  });

  // 26 components in one flat list: the kind has to be visible to make it scannable.
  test("the sidebar marks the kind of every component", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of ["/components/button", "/es/components/button"]) {
      await page.goto(DOCS + route);
      const kinds = await page.evaluate(() => [...document.querySelectorAll(".docs-sidebar a[href*='/components/'] .docs-sidebar__kind")].map((k) => k.textContent));
      expect(kinds.length, `${route} kinds`).toBe(26);
      expect(new Set(kinds)).toEqual(new Set(["css", "js"]));
    }
  });

  // The Spanish pages are authored, not translated at runtime: they must carry the same furniture.
  test("the Spanish pages keep the same rhythm and nothing is cut", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [en, es] of [["/components/button", "/es/components/button"], ["/foundations/surfaces", "/es/foundations/surfaces"]]) {
      const count = async (route) => {
        await page.goto(DOCS + route);
        await page.evaluate(() => document.fonts.ready);
        return page.evaluate(() => ({
          sections: document.querySelectorAll(".docs-prose > h2").length,
          fixtures: document.querySelectorAll(".docs-fixture").length,
          cut: [...document.querySelectorAll(".docs-prose > :is(h1, h2, h3, p, li)")].filter((el) => el.scrollWidth > el.clientWidth + 2).length,
        }));
      };
      const a = await count(en);
      const b = await count(es);
      expect(b.sections, `${es} sections`).toBe(a.sections);
      expect(b.fixtures, `${es} fixtures`).toBe(a.fixtures);
      expect(b.cut, `${es} clipped text`).toBe(0);
      expect(a.cut, `${en} clipped text`).toBe(0);
    }
  });

  // The theme builder left half a screen of nothing beside its preview.
  test("the theme builder controls follow the preview", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(DOCS + "/foundations/theme-builder");
    await page.evaluate(() => document.fonts.ready);
    const pos = await page.evaluate(() => getComputedStyle(document.querySelector(".docs-tb__controls")).position);
    expect(pos).toBe("sticky");
  });
});
