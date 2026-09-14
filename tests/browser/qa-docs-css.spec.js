// Adversarial review of the CSS that needs no JavaScript: hostile content, crowded input groups and
// forced colours. These run against the fixture server on 4180 (the Playwright baseURL).
import { test, expect } from "@playwright/test";

const LONG = "Pneumonoultramicroscopicsilicovolcanoconiosisantidisestablishmentarianism";
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("a word with no break opportunity does not widen the page", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const cases = [
    ["button/variants", ".iv-button"],
    ["breadcrumb/basic", ".iv-breadcrumb__item a"],
    ["alert/variants", ".iv-alert__body"],
  ];
  for (const [fixture, selector] of cases) {
    await page.goto(`/fixture/${fixture}?nojs=1`);
    await page.evaluate(([sel, word]) => { document.querySelectorAll(sel).forEach((el) => { el.textContent = word; }); }, [selector, LONG]);
    await page.waitForTimeout(150);
    expect(await overflow(page), fixture).toBeLessThanOrEqual(1);
  }
});

test("a crowded input group stays inside the page and keeps its addons legible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/fixture/form/float?nojs=1");
  await page.evaluate(() => {
    const group = document.querySelector(".iv-input-group");
    const addon = (text) => { const span = document.createElement("span"); span.className = "iv-input-group__addon"; span.textContent = text; return span; };
    group.prepend(addon("https://"), addon("www."));
    group.append(addon(".example.com"), addon("/path"));
  });
  await page.waitForTimeout(150);
  expect(await overflow(page)).toBeLessThanOrEqual(1);
});

test("one addon keeps its natural width when there is room", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/fixture/form/float?nojs=1");
  const addons = await page.evaluate(() => [...document.querySelectorAll(".iv-input-group__addon")].map((a) => [a.scrollWidth, a.clientWidth]));
  expect(addons.length).toBeGreaterThan(0);
  for (const [content, box] of addons) expect(box).toBeGreaterThanOrEqual(content - 1);
});

test("the switch survives forced colours", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/fixture/form/controls?nojs=1");
  await page.emulateMedia({ forcedColors: "active", colorScheme: "light" });
  await page.waitForTimeout(200);
  const tracks = await page.evaluate(() => [...document.querySelectorAll(".iv-switch")].map((s) => {
    const track = s.querySelector(".iv-switch__track");
    const thumb = s.querySelector(".iv-switch__thumb");
    const ts = getComputedStyle(track);
    return { checked: s.querySelector("input").checked, border: ts.borderTopWidth, bg: ts.backgroundColor, thumb: getComputedStyle(thumb).backgroundColor };
  }));
  expect(tracks.length).toBeGreaterThan(1);
  for (const track of tracks) {
    expect(track.border).not.toBe("0px");
    expect(track.thumb).not.toBe(track.bg);
  }
  const on = tracks.find((t) => t.checked);
  const off = tracks.find((t) => !t.checked);
  expect(on, "the fixture needs a checked and an unchecked switch").toBeTruthy();
  expect(off).toBeTruthy();
  expect(on.bg).not.toBe(off.bg);
});

// The range track lives in engine pseudo-elements, which `getComputedStyle` does not expose, so the
// shipped stylesheet is what gets asserted: without these rules the track vanishes in forced colours
// and only the thumb is left floating.
test("the range track survives forced colours", async ({ page }) => {
  await page.goto("/fixture/form/controls?nojs=1");
  const css = await page.evaluate(() => fetch("/packages/ivolt/dist/css/ivolt.css").then((r) => r.text()));
  const blocks = [...css.matchAll(/@media\s*\(forced-colors:\s*active\)\s*\{/g)].map((m) => {
    let depth = 0;
    for (let i = m.index + m[0].length - 1; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}" && --depth === 0) return css.slice(m.index, i + 1);
    }
    return "";
  });
  const range = blocks.find((b) => b.includes("slider-runnable-track"));
  expect(range, "no forced-colors rules for the range track").toBeTruthy();
  expect(range).toMatch(/slider-runnable-track[^}]*Highlight/);
  expect(range).toMatch(/moz-range-track[^}]*CanvasText/);
});

test("keyboard focus stays visible on switch, range and file zone", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/fixture/form/controls?nojs=1");
  const rings = [];
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(80);
    const ring = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body) return null;
      const label = active.closest("label");
      const painted = active.classList.contains("iv-range") ? active : (label && label.querySelector(".iv-switch__track, .iv-file__zone")) || active;
      const style = getComputedStyle(painted);
      return { name: String(painted.className).split(" ")[0], outline: style.outlineWidth, shadow: style.boxShadow };
    });
    if (ring) rings.push(ring);
  }
  expect(rings.length).toBeGreaterThan(2);
  for (const ring of rings) expect(ring.outline !== "0px" || ring.shadow !== "none", `${ring.name} has no focus ring`).toBeTruthy();
});
