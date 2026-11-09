// 1.1 "Spark" documentation: a page for every new component family in English and Spanish, each
// with its live stage, a unique title and description, the copy button of iv-code running on its
// stage, the one-colour section, the home band and the counts the site states. Against the built
// site on 4321.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const DOCS = "http://127.0.0.1:4321";
const { fresh, families } = await import("../../apps/docs/src/i18n/en.js");
const { componentCount, Words } = await import("../../apps/docs/src/lib/count.js");
const pkgVersion = JSON.parse(readFileSync(new URL("../../packages/ivolt/package.json", import.meta.url), "utf8")).version;

const pick = (html, re) => (re.exec(html) || [])[1];
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

test.describe("1.1 component pages", () => {
  test.setTimeout(180_000);

  test("every new family has a page in English and Spanish, with its stages, a unique title and a description in range", async ({ request }) => {
    expect(fresh.length).toBe(13);
    const titles = new Map();
    const descriptions = new Map();
    for (const slug of fresh) {
      expect(families[slug], `${slug} is in the families map`).toMatch(/^(css|js)$/);
      for (const path of [`/components/${slug}`, `/es/components/${slug}`]) {
        const res = await request.get(DOCS + path);
        expect(res.status(), path).toBe(200);
        const html = await res.text();
        const title = decode(pick(html, /<title>([^<]+)<\/title>/));
        const description = decode(pick(html, /<meta name="description" content="([^"]+)"/));
        expect(title.length, `${path} title "${title}"`).toBeLessThanOrEqual(60);
        expect(description.length, `${path} description`).toBeGreaterThanOrEqual(120);
        expect(description.length, `${path} description`).toBeLessThanOrEqual(160);
        expect(titles.has(title), `${path} repeats the title of ${titles.get(title)}`).toBe(false);
        expect(descriptions.has(description), `${path} repeats a description`).toBe(false);
        titles.set(title, path);
        descriptions.set(description, path);
        // The eyebrow says it is new, and the stage frames it embeds exist.
        expect(html, path).toContain("docs-eyebrow__new");
        const frames = [...html.matchAll(/<iframe[^>]+src="(\/stage\/[^"?]+)\.html/g)].map((m) => m[1]);
        expect(frames.length, `${path} has a stage`).toBeGreaterThanOrEqual(1);
        for (const f of frames) expect((await request.get(`${DOCS}${f}.html`)).status(), f).toBe(200);
        // Enough real content: the article text without the code panels.
        const article = pick(html, /<article[^>]*>([\s\S]*?)<\/article>/) || "";
        const words = article.replace(/<pre[\s\S]*?<\/pre>/g, " ").replace(/<[^>]+>/g, " ").split(/\s+/).filter((w) => /\p{L}/u.test(w));
        expect(words.length, `${path} words`).toBeGreaterThanOrEqual(350);
      }
    }
  });

  test("the code block's copy button appears on its stage and copies", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: DOCS });
    await page.goto(DOCS + "/stage/code/basic.html");
    const button = page.locator(".iv-code__copy").first();
    await expect(button).toBeVisible();
    await expect(page.locator("[data-iv-copy-ready]")).toHaveCount(1);
    await button.click();
    await expect(button).toHaveAttribute("data-iv-state", "copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('rel="stylesheet"');
    // And inside the documentation page, in its frame.
    await page.goto(DOCS + "/components/code");
    const frame = page.frameLocator("iframe[src^='/stage/code/basic.html']").first();
    await expect(frame.locator(".iv-code__copy").first()).toBeVisible();
  });

  test("the sidebar and the megamenu mark the new families", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(DOCS + "/components/segmented");
    await expect(page.locator(".docs-sidebar .docs-sidebar__new")).toHaveCount(fresh.length);
    await expect(page.locator(".docs-mm__fresh")).toHaveCount(fresh.length);
    await expect(page.locator(".docs-eyebrow__new")).toHaveText("New in 1.1");
    await page.goto(DOCS + "/es/components/segmented");
    await expect(page.locator(".docs-eyebrow__new")).toHaveText("Nuevo en 1.1");
  });
});

test.describe("1.1 site: one colour, home, counts", () => {
  test.setTimeout(120_000);

  test("the one-colour section repaints the real components from one primary", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("iv-theme", "light"); } catch {} });
    await page.goto(DOCS + "/foundations/tokens-and-themes");
    const stage = page.locator(".docs-oc__stage");
    const button = stage.locator(".iv-button--primary");
    // Rose is chosen when the page loads: the light rose, with white on it.
    await expect(stage).toHaveCSS("--iv-color-primary", "#BE123C");
    await expect(button).toHaveCSS("color", "rgb(255, 255, 255)");
    // Cobalt: no override, the package's own value.
    await page.locator(".docs-oc__pick label", { hasText: "Cobalt" }).click();
    await expect(page.locator('.docs-oc__pick input[value="cobalt"]')).toBeChecked();
    const swatch = (cls) => stage.locator(`.docs-oc__swatch--${cls}`).evaluate((el) => getComputedStyle(el).backgroundColor);
    const cobaltHover = await swatch("color-primary-hover");
    await page.locator(".docs-oc__pick label", { hasText: "Emerald" }).click();
    await expect.poll(() => swatch("color-primary-hover")).not.toBe(cobaltHover);
    await expect(page.locator("[data-oc-value]")).toHaveText("#047857");
    // The measured line follows the choice.
    await expect(page.locator('.docs-oc__ratio[data-for="emerald"]')).toBeVisible();
    await expect(page.locator('.docs-oc__ratio[data-for="rose"]')).toBeHidden();
  });

  test("every sample colour of the one-colour section passes AA in both themes", async () => {
    const { swatches, swatchRatio } = await import("../../apps/docs/src/data/themes.js");
    for (const s of swatches) for (const mode of ["light", "dark"]) expect(swatchRatio(s, mode), `${s.slug} ${mode}`).toBeGreaterThanOrEqual(4.5);
  });

  test("the recipes the gallery measures with are the package's", async () => {
    const { RECIPES } = await import("../../apps/docs/src/data/themes.js");
    const tokens = JSON.parse(readFileSync(new URL("../../packages/ivolt/dist/tokens/tokens.json", import.meta.url), "utf8"));
    for (const mode of ["light", "dark"]) for (const [name, [lab, w]] of Object.entries(RECIPES[mode])) {
      const v = tokens[`--iv-mix-${name}`].value[mode];
      const m = /oklab\(([-\d.]+) ([-\d.]+) ([-\d.]+)\) (\d+)%/.exec(v);
      expect(m, `${mode} ${name}: ${v}`).not.toBeNull();
      expect([+m[1], +m[2], +m[3]]).toEqual(lab);
      expect(+m[4] / 100).toBeCloseTo(w, 5);
    }
  });

  test("the home carries the 1.1 band with five working doors, and the counts are the families'", async ({ page, request }) => {
    for (const [route, lang] of [["/", "en"], ["/es", "es"]]) {
      await page.goto(DOCS + route);
      const band = page.locator(".docs-spark");
      await expect(band).toBeVisible();
      await expect(band.locator(".docs-spark__num")).toHaveText(pkgVersion.split(".").slice(0, 2).join("."));
      const hrefs = await band.locator("a.docs-spark__door").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
      expect(hrefs).toHaveLength(5);
      for (const h of hrefs) expect((await request.get(DOCS + h.replace(/#.*$/, ""))).status(), h).toBe(200);
      await expect(page.locator(".docs-hero__lead"), route).toContainText(Words(componentCount, lang));
      await expect(page.locator("#components-title"), route).toContainText(Words(componentCount, lang));
    }
  });

  test("an old theme-builder link still loads its colours", async ({ page }) => {
    // A link as the 1.0 builder and the 1.0 gallery wrote them.
    await page.goto(DOCS + "/foundations/theme-builder#theme=dark&primary=b794ff&on-primary=1a0b3d&accent=ff7ad9&bg=0b0716&surface=120c22&surface-raised=1a1230&text=f1edfb&radius=1.125&font=outfit");
    const preview = page.locator("[data-tb-preview]");
    await expect(preview).toHaveAttribute("data-iv-theme", "dark");
    await expect(preview.locator(".iv-button--primary").first()).toHaveCSS("background-color", "rgb(183, 148, 255)");
    await expect(page.locator("[data-tb-output]")).toContainText("--iv-color-primary: #b794ff");
  });

  test("the new blocks run, and the search block's copy button works on its stage", async ({ page }) => {
    for (const slug of ["hero-mockup", "pricing-toggle", "dashboard-empty", "docs-search"]) {
      await page.goto(`${DOCS}/stage/blocks/${slug}.html`);
      await expect(page.locator("main#stage > *").first(), slug).toBeVisible();
    }
    await expect(page.locator(".iv-code__copy")).toBeVisible();
  });
});
