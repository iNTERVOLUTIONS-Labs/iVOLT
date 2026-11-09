// 1.1 "Spark" site features: theme gallery, shareable builder, blocks, effects, showcase,
// "Open in CodePen" and the hero install box.
import { test, expect } from "@playwright/test";

const DOCS = "http://127.0.0.1:4321";

test.describe("Spark: share and copy", () => {
  test.setTimeout(120_000);

  test("every new page exists in English and Spanish", async ({ request }) => {
    for (const p of ["/themes", "/blocks", "/effects", "/showcase", "/compare"]) {
      for (const path of [p, `/es${p}`]) expect((await request.get(DOCS + path)).status(), path).toBe(200);
    }
  });

  test("the theme gallery: twelve presets above AA, each one a stylesheet of seeds to download", async ({ page, request }) => {
    const { presets, checks } = await import("../../apps/docs/src/data/themes.js");
    expect(presets).toHaveLength(12);
    for (const p of presets) {
      for (const c of checks(p)) expect(c.ratio, `${p.slug} ${c.key}`).toBeGreaterThanOrEqual(4.5);
      const css = await (await request.get(`${DOCS}/themes/${p.slug}.css`)).text();
      expect(css, p.slug).toContain(`--iv-color-primary: ${p.primary};`);
      // 1.1 one-colour theming: the primary's family is mixed by the package, not written out.
      expect(css, p.slug).toContain("--iv-mix-brand-end: var(--iv-color-accent) 35%;");
      for (const derived of ["--iv-color-primary-hover", "--iv-color-primary-subtle", "--iv-color-focus", "--iv-gradient-brand", "--iv-gradient-primary", "--iv-glow-primary"]) {
        expect(css, `${p.slug} leaves ${derived} to the package`).not.toContain(`${derived}:`);
      }
    }
    await page.goto(DOCS + "/themes");
    await expect(page.locator(".docs-tcard")).toHaveCount(12);
    // The card is the framework itself: its primary button paints with the preset's colour.
    const ocean = presets.find((p) => p.slug === "ocean");
    await expect(page.locator("#ocean .iv-button--primary")).toHaveCSS("background-color", "rgb(45, 212, 191)");
    expect(await page.locator("#ocean a[href*='theme-builder#']").getAttribute("href")).toContain(`primary=${ocean.primary.slice(1)}`);
  });

  test("the theme builder reads and writes its state in the URL hash", async ({ page }) => {
    await page.goto(DOCS + "/foundations/theme-builder#theme=dark&primary=2dd4bf&radius=1.5&font=mono");
    const out = page.locator("[data-tb-output]");
    await expect(out).toContainText("--iv-color-primary: #2dd4bf");
    // 1.1: seeds and recipes only; the preview mixes the hover itself from the one primary.
    await expect(out).toContainText("--iv-mix-brand-end: var(--iv-color-accent) 35%");
    await expect(out).not.toContainText("--iv-color-primary-hover");
    const { derived } = await import("../../apps/docs/src/data/themes.js");
    const hover = await page.locator("[data-tb-preview]").evaluate((el) => {
      const probe = document.createElement("span");
      probe.style.color = "var(--iv-color-primary-hover)";
      el.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      // Chromium reports a mixed colour as oklab(); a canvas pixel turns it into sRGB bytes.
      const ctx = document.createElement("canvas").getContext("2d");
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      return `rgb(${[...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).join(", ")})`;
    });
    const want = derived("#2dd4bf", "dark", "primary-hover");
    const rgb = [1, 3, 5].map((i) => parseInt(want.slice(i, i + 2), 16));
    const got = hover.match(/[\d.]+/g).slice(0, 3).map(Number);
    got.forEach((v, i) => expect(Math.abs(v - rgb[i]), `hover channel ${i}: ${hover} vs ${want}`).toBeLessThanOrEqual(2));
    await expect(out).toContainText("--iv-radius-md: 1.5rem");
    await page.locator('input[name="accent"]').evaluate((el) => { el.value = "#ff00aa"; el.dispatchEvent(new Event("input", { bubbles: true })); });
    await expect.poll(() => page.evaluate(() => location.hash)).toContain("accent=ff00aa");
    await expect(page.locator("[data-tb-share]")).toBeVisible();
    await page.locator("[data-tb-reset]").click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
  });

  test("stage pages offer a prefilled CodePen with the published files at this version", async ({ page }) => {
    await page.goto(DOCS + "/components/dialog");
    const form = page.locator("form[data-stage-pen]").first();
    await expect(form).toBeVisible();
    expect(await form.getAttribute("action")).toBe("https://codepen.io/pen/define");
    const data = await form.evaluate((f) => { f.dispatchEvent(new Event("submit")); return JSON.parse(f.elements.data.value); });
    expect(data.css_external).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/npm\/@intervolutions\/ivolt@\d+\.\d+\.\d+.*\/dist\/css\/ivolt\.min\.css$/);
    expect(data.js_external).toContain("/dist/js/ivolt.iife.min.js");
    expect(data.js).toBe("IVOLT.init(document);");
    expect(data.html).toContain('data-iv-component="dialog"');
  });

  test("blocks run on their own stage pages and use only iVOLT classes", async ({ page, request }) => {
    const { readFileSync, readdirSync } = await import("node:fs");
    const dir = new URL("../../apps/docs/fixtures/blocks/", import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith(".html"));
    expect(files.length).toBeGreaterThanOrEqual(12);
    const css = readFileSync(new URL("../../packages/ivolt/dist/css/ivolt.css", import.meta.url), "utf8");
    for (const f of files) {
      const html = readFileSync(new URL(f, dir), "utf8");
      for (const [, list] of html.matchAll(/class="([^"]+)"/g)) for (const c of list.split(/\s+/)) {
        expect(c, `${f}: only iv- classes`).toMatch(/^iv-/);
        expect(css.includes(`.${c}`), `${f}: .${c} exists in ivolt.css`).toBe(true);
      }
      expect((await request.get(`${DOCS}/stage/blocks/${f.replace(/\.html$/, "")}.html`)).status(), f).toBe(200);
    }
    await page.goto(DOCS + "/blocks");
    await expect(page.locator("[data-stage]")).toHaveCount(files.length);
  });

  test("the hero carries the install box and the GitHub link, and nothing remote loads", async ({ page }) => {
    const remote = [];
    page.on("request", (r) => { if (!r.url().startsWith(DOCS) && !r.url().startsWith("data:")) remote.push(r.url()); });
    await page.goto(DOCS + "/", { waitUntil: "networkidle" });
    await expect(page.locator(".docs-hero__install")).toContainText("cdn.jsdelivr.net/npm/@intervolutions/ivolt@1");
    await expect(page.locator(".docs-star")).toHaveAttribute("href", "https://github.com/iNTERVOLUTIONS-Labs/iVOLT");
    expect(remote).toEqual([]);
  });
});
