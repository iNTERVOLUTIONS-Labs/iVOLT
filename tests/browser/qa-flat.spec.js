import { test, expect } from "@playwright/test";

/**
 * The layer-free stylesheet (`ivolt.flat.css`) is the same rules without `@layer`, for a
 * consumer that cannot use cascade layers. Without layers a base element rule such as
 * `.iv-root h2` (0,1,1) beats a component rule written as a single class (0,1,0), and the
 * component loses its own typography. Every rule below is the one that used to lose;
 * ADR-046 raised them to (0,2,0) in their module, with no `!important`.
 *
 * `?flat=1` is served by `scripts/serve.mjs`.
 */
const cases = [
  ["dialog/basic", ".iv-dialog__title", "the dialog title"],
  ["drawer/basic", ".iv-drawer__title", "the drawer title"],
  ["card/basic", ".iv-card__title", "a card title"],
  ["popover/basic", ".iv-popover__title", "the popover title"],
  ["tabs/basic", ".iv-tabs__heading", "a tabs heading"],
  ["command/basic", ".iv-command__heading", "a command group heading"],
  ["command/basic", ".iv-command__kbd", "a command shortcut key"],
  ["megamenu/basic", ".iv-megamenu__heading", "a megamenu heading"],
  ["timeline/alternate", ".iv-timeline__title", "a timeline title"],
  ["hero/basic", ".iv-hero__title", "the hero title"],
  ["stat/basic", ".iv-stat__value", "a stat value"],
  ["dropdown/basic", ".iv-dropdown__separator", "a dropdown separator"],
];

/** Reads the text metrics and the box the cascade settled on. */
const styleOf = (page, selector) =>
  page.locator(selector).first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      marginBlockStart: cs.marginBlockStart,
      marginBlockEnd: cs.marginBlockEnd,
    };
  });

for (const [fixture, selector, what] of cases) {
  test(`${what} reads the same with layers and without`, async ({ page }) => {
    await page.goto(`/fixture/${fixture}?nojs`);
    const layered = await styleOf(page, selector);
    await page.goto(`/fixture/${fixture}?nojs&flat=1`);
    const flat = await styleOf(page, selector);
    expect(flat).toEqual(layered);
  });
}

test("the flat stylesheet is the one the page linked", async ({ page }) => {
  await page.goto("/fixture/dialog/basic?nojs&flat=1");
  const href = await page.locator('link[rel="stylesheet"]').first().getAttribute("href");
  expect(href).toContain("ivolt.flat.css");
  // And the guard rail the bug was about: a title that is an `<h2>` keeps the size of the component.
  const title = await page.locator(".iv-dialog__title").first().evaluate((el) => ({ tag: el.tagName, size: getComputedStyle(el).fontSize }));
  expect(title.tag).toBe("H2");
  expect(title.size).toBe("20px");
});

/**
 * Component links (ADR-046, v0.9): `.iv-root a` and `.iv-root a:hover` are base rules with a
 * type selector in them, so without layers they used to repaint every anchor a component owns.
 * Both states are compared here, at rest and under the pointer.
 */
const links = [
  ["button/variants", ".iv-button--primary", "a primary button"],
  ["button/variants", ".iv-button--ghost", "a ghost button"],
  ["command/basic", ".iv-command__item", "a command row"],
  ["dropdown/basic", ".iv-dropdown__item", "a dropdown item"],
  ["lightbox/basic", ".iv-gallery__item", "a gallery tile"],
  ["megamenu/basic", ".iv-megamenu__link", "a megamenu link"],
  ["megamenu/basic", ".iv-megamenu__card", "a megamenu card"],
  ["navbar/basic", ".iv-navbar__brand", "the navbar brand"],
  ["navbar/basic", ".iv-navbar__link", "a navbar link"],
  ["navbar/basic", ".iv-navbar__link[aria-current]", "the current navbar link"],
  ["navbar/transparent", ".iv-navbar__link[aria-current]", "the current link of a transparent navbar"],
  ["pagination/basic", ".iv-pagination__link", "a pagination link"],
  ["pagination/basic", '.iv-pagination__link[aria-current="page"]', "the current page link"],
  ["stepper/basic", ".iv-stepper__trigger", "a stepper trigger"],
  ["tabs/basic", ".iv-tabs__tab", "a tab"],
];

/** Colour of the first match, at rest and with the pointer over it. */
const colourOf = async (page, selector) => {
  const el = page.locator(selector).first();
  const rest = await el.evaluate((node) => getComputedStyle(node).color);
  // A row that lives inside a closed dialog cannot be hovered; its resting colour is
  // the one the cascade settled, and that is what the comparison is about.
  if (!(await el.isVisible())) return { rest, hover: rest };
  await el.hover({ force: true });
  const hover = await el.evaluate((node) => getComputedStyle(node).color);
  await page.mouse.move(0, 0);
  return { rest, hover };
};

for (const [fixture, selector, what] of links) {
  test(`${what} keeps its colour without layers`, async ({ page }) => {
    await page.goto(`/fixture/${fixture}?nojs`);
    const layered = await colourOf(page, selector);
    await page.goto(`/fixture/${fixture}?nojs&flat=1`);
    const flat = await colourOf(page, selector);
    expect(flat).toEqual(layered);
  });
}
