import { test, expect } from "@playwright/test";

const DOCS = "http://127.0.0.1:4321";
const enRoutes = ["/", "/getting-started", "/foundations/tokens-and-themes", "/foundations/layout", "/foundations/typography", "/foundations/accessibility", "/foundations/coexistence", "/foundations/surfaces", "/foundations/effects", "/examples", "/playground", "/changelog", "/roadmap", "/contributing", "/404", ...["button", "card", "form", "validation", "combobox", "datepicker", "datatable", "picker", "carousel", "megamenu", "hero", "dialog", "badge", "alert", "table", "breadcrumb", "pagination", "progress", "skeleton", "disclosure", "tabs", "dropdown", "drawer", "toast"].map((c) => `/components/${c}`)];
// Every English page has a Spanish twin under /es (the home is translated with the redesign).
const routes = [...enRoutes, ...enRoutes.filter((r) => r !== "/").map((r) => `/es${r}`)];

test.describe("Docs site", () => {
  test("key routes render without console errors and with one h1", async ({ page }) => {
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(`${page.url()}: ${m.text()}`); });
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    for (const r of routes) {
      await page.goto(DOCS + r);
      expect(await page.locator("h1").count(), r).toBe(1);
      expect(await page.title(), r).toMatch(/· iVOLT$/);
    }
    expect(errors).toEqual([]);
  });

  test("internal links resolve", async ({ page, request }) => {
    const seen = new Set();
    for (const r of routes) {
      await page.goto(DOCS + r);
      const hrefs = await page.locator("a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
      for (const h of hrefs) {
        const path = h.split("#")[0];
        if (!path || seen.has(path)) continue;
        seen.add(path);
        const res = await request.get(DOCS + path);
        expect(res.status(), `${r} -> ${h}`).toBeLessThan(400);
      }
    }
  });

  test("theme switch persists and copy button gives feedback", async ({ page, context, browserName }) => {
    if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(DOCS + "/components/button");
    await page.locator(".docs-header [data-set-theme=dark]").click();
    await expect(page.locator("html")).toHaveAttribute("data-iv-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-iv-theme", "dark");
    const copy = page.locator(".docs-copy").first();
    await copy.click();
    await expect(copy).toHaveText(/Copied|Selected/);
    if (browserName === "chromium") expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("iv-button");
  });

  test("mobile menu opens the navigation dialog and the hero dialog works", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(DOCS + "/");
    await page.locator(".docs-menu-toggle").click();
    await expect(page.locator("#docs-nav")).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(page.locator("#docs-nav")).not.toHaveAttribute("open", "");
    await page.locator("[data-iv-open=signup]").first().click();
    await expect(page.locator("#signup")).toHaveAttribute("open", "");
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over).toBeLessThanOrEqual(0);
  });
});

test("toast demo on the docs page shows a toast", async ({ page }) => {
  await page.goto(DOCS + "/components/toast");
  await page.locator("[data-toast-variant=success]").click();
  await expect(page.locator(".iv-toast--success")).toBeVisible();
  await expect(page.locator(".iv-toast-region")).toHaveAttribute("role", "region");
});

test("search opens with /, finds a component page and supports arrow keys", async ({ page }) => {
  await page.goto(DOCS + "/");
  await page.keyboard.press("/");
  await expect(page.locator("#docs-search")).toHaveAttribute("open", "");
  await expect(page.locator("#docs-search-input")).toBeFocused();
  await page.locator("#docs-search-input").fill("dialog");
  const first = page.locator("#docs-search-results a").first();
  await expect(first).toBeVisible();
  await expect(page.locator("#docs-search-status")).toContainText(/result/);
  await page.keyboard.press("ArrowDown");
  await expect(first).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/components\/dialog|dialog/);
});

test("headings get anchor links and the sitemap is absent without SITE_URL", async ({ page, request }) => {
  await page.goto(DOCS + "/components/button");
  const anchors = page.locator(".docs-prose h2 .docs-anchor");
  expect(await anchors.count()).toBeGreaterThan(2);
  const href = await anchors.first().getAttribute("href");
  expect(href).toMatch(/^#[a-z0-9-]+$/);
  expect(await page.locator(href).count()).toBe(1);
  expect((await request.get(DOCS + "/sitemap-index.xml")).status()).toBe(404);
  expect((await request.get(DOCS + "/og.png")).status()).toBe(200);
  expect((await request.get(DOCS + "/downloads/manifest.json")).status()).toBe(200);
});

test("playground generates snippets from a closed set of options", async ({ page, context, browserName }) => {
  if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(DOCS + "/playground");
  const code = page.locator("#pg-code");
  await expect(code).toContainText("iv-button--primary");
  const variant = page.locator("select").nth(1);
  await variant.selectOption({ index: 3 });
  await expect(code).not.toContainText("iv-button--primary");
  const classes = await page.locator("#pg-preview [class]").evaluateAll((els) => els.flatMap((e) => [...e.classList]));
  expect(classes.every((c) => c.startsWith("iv-"))).toBe(true);
  const manifest = await (await page.request.get(DOCS + "/downloads/manifest.json")).json();
  expect(manifest.zips.map((z) => z.name).sort()).toEqual(["ivolt-dist.zip", "ivolt-recipe-admin.zip", "ivolt-recipe-catalog.zip", "ivolt-recipe-landing.zip", "ivolt-starter-plain-html.zip"]);
});

test("published CSP hash matches the inline theme snippet the site ships", async ({ page, request }) => {
  const { createHash } = await import("node:crypto");
  const home = await (await request.get(DOCS + "/")).text();
  const m = home.match(/<script[^>]*>(try\{document\.documentElement\.classList[\s\S]*?)<\/script>/);
  expect(m).not.toBeNull();
  const hash = "sha256-" + createHash("sha256").update(m[1]).digest("base64");
  await page.goto(DOCS + "/foundations/coexistence");
  await expect(page.locator("#csp-hash")).toHaveText(hash);
});
