// Content blocks (API_CONTRACT §8.19): timeline, stat and avatar are CSS only, so the checks are
// accessibility under axe in both themes plus the layout promises the contract makes.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const fixtures = [
  "timeline/basic",
  "timeline/alternate",
  "timeline/horizontal",
  "stat/basic",
  "stat/cards",
  "avatar/basic",
  "avatar/group",
];

for (const theme of ["light", "dark"]) {
  for (const f of fixtures) {
    test(`axe ${f} (${theme})`, async ({ page }) => {
      // The current marker pulses; axe folds animation into the computed colour, so the audited
      // state is the settled one reduced motion renders at once.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/fixture/${f}?theme=${theme}`);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const serious = results.violations.filter((v) => ["critical", "serious"].includes(v.impact));
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
}

for (const f of fixtures) {
  test(`${f} does not scroll sideways at 390px`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(`/fixture/${f}`);
    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("the avatar group overlaps its faces and keeps the first one on top", async ({ page }) => {
  await page.goto("/fixture/avatar/group");
  const faces = page.locator(".iv-avatar-group").first().locator(".iv-avatar");
  await expect(faces).toHaveCount(5);
  const first = await faces.nth(0).boundingBox();
  const second = await faces.nth(1).boundingBox();
  expect(second.x).toBeGreaterThan(first.x);
  expect(second.x).toBeLessThan(first.x + first.width);
  const zIndexes = await faces.evaluateAll((nodes) => nodes.map((n) => Number(getComputedStyle(n).zIndex)));
  expect(zIndexes[0]).toBeGreaterThan(zIndexes[1]);
  expect(zIndexes[1]).toBeGreaterThan(zIndexes[2]);
});

test("the status dot sits in the corner of its avatar", async ({ page }) => {
  await page.goto("/fixture/avatar/basic");
  const avatar = page.locator(".iv-avatar").filter({ has: page.locator(".iv-avatar__status") }).first();
  const box = await avatar.boundingBox();
  const dot = await avatar.locator(".iv-avatar__status").boundingBox();
  expect(dot.x + dot.width).toBeLessThanOrEqual(box.x + box.width + 1);
  expect(dot.y + dot.height).toBeLessThanOrEqual(box.y + box.height + 1);
  expect(dot.y).toBeGreaterThan(box.y + box.height / 2);
});

test("the timeline alternates sides at 1200px and stacks on one rail at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/fixture/timeline/alternate");
  const items = page.locator(".iv-timeline__item");
  const wide = [];
  for (let i = 0; i < 4; i += 1) wide.push(await items.nth(i).boundingBox());
  // Odd items hang on the end side, even items on the start side; they never share a column.
  expect(wide[0].x).toBeGreaterThan(wide[1].x + wide[1].width - 1);
  expect(wide[2].x).toBeGreaterThan(wide[3].x + wide[3].width - 1);
  expect(wide[0].y).toBeLessThan(wide[1].y);

  await page.setViewportSize({ width: 390, height: 800 });
  const narrow = [];
  for (let i = 0; i < 4; i += 1) narrow.push(await items.nth(i).boundingBox());
  expect(Math.abs(narrow[0].x - narrow[1].x)).toBeLessThan(1);
});

test("the horizontal timeline lays its moments in a row that scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/fixture/timeline/horizontal");
  const items = page.locator(".iv-timeline__item");
  const a = await items.nth(0).boundingBox();
  const b = await items.nth(1).boundingBox();
  expect(b.x).toBeGreaterThan(a.x + a.width - 1);
  expect(Math.abs(a.y - b.y)).toBeLessThan(1);
  const scrollable = await page.locator(".iv-timeline--horizontal").evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(scrollable).toBe(true);
});

test("the timeline marks its current moment with a halo and stops pulsing under reduced motion", async ({ page }) => {
  await page.goto("/fixture/timeline/basic");
  const current = page.locator('.iv-timeline__item[data-iv-state="current"]');
  const moving = await current.evaluate((el) => getComputedStyle(el, "::after").animationName);
  expect(moving).toBe("iv-timeline-pulse");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const still = await current.evaluate((el) => getComputedStyle(el, "::after").animationName);
  expect(still).toBe("none");
});

test("stat figures line up in one row of the group at 1200px and stack at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/fixture/stat/basic");
  const stats = page.locator(".iv-stat-group .iv-stat");
  await expect(stats).toHaveCount(4);
  const first = await stats.nth(0).boundingBox();
  const last = await stats.nth(3).boundingBox();
  expect(Math.abs(first.y - last.y)).toBeLessThan(1);
  expect(last.x).toBeGreaterThan(first.x);

  await page.setViewportSize({ width: 390, height: 800 });
  const top = await stats.nth(0).boundingBox();
  const below = await stats.nth(1).boundingBox();
  expect(below.y).toBeGreaterThan(top.y + top.height - 1);
});

test("the delta arrow is drawn for every tone and turns with the direction", async ({ page }) => {
  await page.goto("/fixture/stat/basic");
  const rotations = await page.locator(".iv-stat__delta").evaluateAll((nodes) =>
    nodes.map((n) => ({
      tone: n.getAttribute("data-iv-tone"),
      mask: getComputedStyle(n, "::before").maskImage || getComputedStyle(n, "::before").webkitMaskImage,
      rotate: getComputedStyle(n, "::before").rotate,
    }))
  );
  expect(rotations.length).toBeGreaterThan(0);
  for (const r of rotations) expect(r.mask).toContain("data:image/svg+xml");
  expect(rotations.find((r) => r.tone === "up").rotate).toBe("none");
  expect(rotations.find((r) => r.tone === "flat").rotate).toBe("90deg");
});
