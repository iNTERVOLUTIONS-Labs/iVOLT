// Paper has no viewport. The print block in base.css unpins the header and the
// reading bar, drops overlays, shadows and animation, and prints black on white.
import { test, expect } from "@playwright/test";

const SHEET = "test-results/print-sheets"; // contact sheets for the eye, next to the other artifacts

test.use({ viewport: { width: 1024, height: 900 } });

test("the header is not pinned on paper", async ({ page }) => {
  await page.goto("/fixture/navbar/basic");
  expect(await page.evaluate(() => getComputedStyle(document.querySelector(".iv-navbar")).position)).not.toBe("static");
  await page.emulateMedia({ media: "print" });
  const printed = await page.evaluate(() => {
    const bar = document.querySelector(".iv-navbar");
    const cs = getComputedStyle(bar);
    return { position: cs.position, shadow: cs.boxShadow };
  });
  expect(printed.position).toBe("static");
  expect(printed.shadow).toBe("none");
  await page.screenshot({ path: `${SHEET}/print-navbar.png`, fullPage: true });
});

test("a card prints without a shadow and without animation", async ({ page }) => {
  await page.goto("/fixture/card/basic");
  await page.emulateMedia({ media: "print" });
  // The card transitions its shadow; the printed value is the settled one.
  await page.waitForTimeout(500);
  const card = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector(".iv-card"));
    return { shadow: cs.boxShadow, animation: cs.animationName };
  });
  expect(card.shadow).toBe("none");
  expect(card.animation).toBe("none");
  await page.screenshot({ path: `${SHEET}/print-card.png`, fullPage: true });
});

test("a table prints as black text on white", async ({ page }) => {
  await page.goto("/fixture/table/basic");
  await page.emulateMedia({ media: "print" });
  const sheet = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return { color: root.color, background: getComputedStyle(document.body).backgroundColor };
  });
  expect(sheet.color).toBe("rgb(0, 0, 0)");
  expect(sheet.background).toBe("rgb(255, 255, 255)");
  await page.screenshot({ path: `${SHEET}/print-table.png`, fullPage: true });
});

test("the reading bar and the toast region do not print", async ({ page }) => {
  await page.goto("/fixture/motion/progress");
  await page.emulateMedia({ media: "print" });
  expect(await page.evaluate(() => getComputedStyle(document.querySelector(".iv-scroll-progress")).display)).toBe("none");
});
