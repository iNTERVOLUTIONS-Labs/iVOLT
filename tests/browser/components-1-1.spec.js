// Components and modern-CSS additions of 1.1 "Spark". The axe audit, the RTL overflow
// sweep and the hidden-attribute sweep cover their fixtures through the shared specs;
// this file checks behaviour, the flat sheet, forced colours, RTL details and motion.
import { test, expect } from "@playwright/test";

const css = (page, selector, prop, pseudo = null) =>
  page.locator(selector).first().evaluate((el, [p, ps]) => (p.startsWith("--") ? getComputedStyle(el, ps).getPropertyValue(p).trim() : getComputedStyle(el, ps)[p]), [prop, pseudo]);

test.describe("flat sheet", () => {
  const cases = [
    ["kbd/basic", ".iv-kbd", ["fontSize", "paddingInlineStart", "color", "borderBlockEndWidth"]],
    ["divider/basic", ".iv-divider", ["marginBlockStart", "display", "blockSize"]],
    ["code/basic", ".iv-code__pre", ["paddingInlineStart", "fontSize", "backgroundColor", "color"]],
    ["code/basic", ".iv-code .iv-code__bar", ["fontSize", "color", "marginBlockStart"]],
    ["list/basic", ".iv-list", ["paddingInlineStart", "marginBlockStart"]],
    ["list/basic", ".iv-list__item", ["marginBlockStart", "paddingInlineStart"]],
    ["list/basic", ".iv-list__action", ["color", "textDecorationLine"]],
    ["list/basic", ".iv-dl dd", ["marginInlineStart"]],
    ["banner/basic", ".iv-banner__action", ["color", "fontWeight"]],
    ["empty/basic", ".iv-empty__title", ["fontSize", "marginBlockStart"]],
  ];
  for (const [fixture, selector, props] of cases) {
    test(`${selector} in ${fixture} reads the same with and without layers`, async ({ page }) => {
      const read = () => page.locator(selector).first().evaluate((el, ps) => ps.map((p) => getComputedStyle(el)[p]), props);
      await page.goto(`/fixture/${fixture}?nojs`);
      const layered = await read();
      await page.goto(`/fixture/${fixture}?nojs&flat=1`);
      expect(await read()).toEqual(layered);
    });
  }
});

test.describe("segmented", () => {
  test("is a native radio group: the arrow keys move the choice and the face follows", async ({ page }) => {
    await page.goto("/fixture/segmented/basic?nojs");
    const week = page.locator('input[name="seg-period"][value="week"]');
    await week.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator('input[name="seg-period"][value="month"]')).toBeChecked();
    await page.waitForTimeout(400); // the faces cross-fade
    const faces = await page.locator('input[name="seg-period"] + *').evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
    expect(new Set(faces).size).toBe(2);
    expect(faces[2]).not.toBe(faces[0]);
  });

  test("the group keeps its own width inside a stack; the block variant fills the row", async ({ page }) => {
    await page.goto("/fixture/segmented/basic?nojs");
    const widths = await page.evaluate(() => {
      const stack = document.createElement("div");
      stack.className = "iv-stack";
      stack.style.inlineSize = "600px";
      stack.innerHTML = '<fieldset class="iv-segmented"><label class="iv-segmented__item"><input type="radio" name="w" checked><span>A</span></label><label class="iv-segmented__item"><input type="radio" name="w"><span>B</span></label></fieldset>'
        + '<fieldset class="iv-segmented iv-segmented--block"><label class="iv-segmented__item"><input type="radio" name="v" checked><span>A</span></label></fieldset>';
      document.body.append(stack);
      const [plain, block] = stack.querySelectorAll(".iv-segmented");
      return [plain.getBoundingClientRect().width, block.getBoundingClientRect().width];
    });
    expect(widths[0]).toBeLessThan(300);
    expect(widths[1]).toBe(600);
  });

  test("a badge in the filled brand segment takes the segment's ink in both themes", async ({ page }) => {
    await page.goto("/fixture/segmented/basic?nojs");
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => document.documentElement.setAttribute("data-iv-theme", t), theme);
      const [badge, face] = await page.locator('.iv-segmented--brand input:checked + *').evaluate((el) => [
        getComputedStyle(el.querySelector(".iv-badge")).color,
        getComputedStyle(el).color,
      ]);
      expect(badge, theme).toBe(face);
    }
  });
});

test.describe("chip", () => {
  test("a filter chip toggles its checkbox and shows a check when selected", async ({ page }) => {
    await page.goto("/fixture/chip/basic?nojs");
    const astro = page.locator("label.iv-chip", { hasText: "Astro" });
    expect(await astro.evaluate((el) => getComputedStyle(el, "::before").content)).toBe("none");
    await astro.click();
    await expect(astro.locator("input")).toBeChecked();
    expect(await astro.evaluate((el) => getComputedStyle(el, "::before").content)).toBe('""');
  });

  test("the remove button is a 24 px target", async ({ page }) => {
    await page.goto("/fixture/chip/basic?nojs");
    const box = await page.locator(".iv-chip__remove").first().boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(24);
    expect(box.height).toBeGreaterThanOrEqual(24);
  });
});

test.describe("rating", () => {
  const lit = async (page) => {
    await page.waitForTimeout(300); // the stars cross-fade
    return litNow(page);
  };
  const litNow = (page) =>
    page.locator(".iv-rating__star").evaluateAll((els) => {
      const on = getComputedStyle(els[0].closest(".iv-rating")).getPropertyValue("--iv-rating-color");
      const probe = document.createElement("span");
      probe.style.color = on;
      document.body.append(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return els.filter((el) => getComputedStyle(el).backgroundColor === colour).length;
    });

  test("lights the chosen star and every star before it", async ({ page }) => {
    await page.goto("/fixture/rating/basic?nojs");
    await page.mouse.move(0, 0);
    expect(await lit(page)).toBe(4);
    await page.locator('label[for="rt-2"]').click();
    await page.mouse.move(0, 0);
    await expect(page.locator("#rt-2")).toBeChecked();
    expect(await lit(page)).toBe(2);
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#rt-3")).toBeChecked();
    expect(await lit(page)).toBe(3);
  });

  test("the group carries the focus ring of its radios", async ({ page }) => {
    await page.goto("/fixture/rating/basic?nojs");
    await page.locator("#rt-4").focus();
    await page.keyboard.press("ArrowLeft");
    expect(await css(page, ".iv-rating", "outlineStyle")).toBe("solid");
  });
});

test.describe("copy", () => {
  test("is hidden until Copy runs, then copies the code and says so", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "clipboard permissions are a Chromium feature of Playwright");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/fixture/code/basic");
    await expect(page.locator(".iv-code__copy").first()).toBeHidden();
    await page.evaluate(async () => {
      const { Copy } = await import("/packages/ivolt/dist/js/components/copy.js");
      Copy.initAll(document);
    });
    const button = page.locator(".iv-code__copy").nth(1);
    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute("data-iv-state", "copied");
    await expect(button).toHaveText("Copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("npm install @intervolutions/ivolt");
    await expect(page.locator('[data-iv-component="copy"] [role="status"]')).toHaveText("Copied");
    await expect(button).toHaveText("Copy", { timeout: 4000 });
    // The first button copies the code of its own frame.
    await page.locator(".iv-code__copy").first().click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('class="iv-root"');
  });

  test("auto.min.js starts everything, Copy included, in one request", async ({ page }) => {
    await page.goto("/fixture/code/basic?nojs");
    await page.addScriptTag({ type: "module", url: "/packages/ivolt/dist/js/auto.min.js" });
    await expect(page.locator(".iv-code__copy").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.hasAttribute("data-iv-js"))).toBe(true);
  });
});

test.describe("drawer and dialog", () => {
  test("a static drawer stays in place (the exit state never applies to it)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/fixture/drawer/basic");
    await expect(page.locator(".iv-drawer")).toHaveAttribute("data-iv-static", "");
    expect(await css(page, ".iv-drawer", "translate")).toBe("none");
    await expect(page.locator(".iv-drawer a").first()).toBeInViewport();
  });

  test("closing a dialog fades it out instead of cutting it", async ({ page }) => {
    await page.goto("/fixture/dialog/basic");
    await page.locator('[data-iv-open="signup"]').click();
    await expect(page.locator("#signup")).toBeVisible();
    await page.waitForTimeout(400);
    const during = await page.evaluate(() => {
      const d = document.getElementById("signup");
      d.close();
      return { display: getComputedStyle(d).display, opacity: Number(getComputedStyle(d).opacity) };
    });
    expect(during.display).toBe("block");
    await expect(page.locator("#signup")).toBeHidden();
  });

  test("under reduced motion it closes at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/fixture/dialog/basic");
    await page.locator('[data-iv-open="signup"]').click();
    const display = await page.evaluate(() => {
      const d = document.getElementById("signup");
      d.close();
      return getComputedStyle(d).display;
    });
    expect(display).toBe("none");
  });
});

test.describe("shell", () => {
  test("from lg the drawer is the side column; below it the menu opens it as a modal", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/fixture/shell/basic");
    const side = await page.locator(".iv-shell__side").boundingBox();
    expect(side.width).toBeGreaterThan(200);
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/fixture/shell/basic");
    expect((await page.locator(".iv-shell__side").boundingBox())?.width ?? 0).toBeLessThan(1);
    await page.locator('[data-iv-open="shell-nav"]').click();
    await expect(page.locator("#shell-nav")).toBeVisible();
    expect(await page.evaluate(() => document.getElementById("shell-nav").matches(":modal"))).toBe(true);
  });

  test("the sidebar layout wraps by its own width, not the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/fixture/shell/basic?nojs");
    const sideBySide = await page.locator(".iv-sidebar").evaluate((el) => {
      const [a, b] = el.children;
      return Math.abs(a.getBoundingClientRect().top - b.getBoundingClientRect().top) < 2;
    });
    expect(sideBySide).toBe(true);
    const stacked = await page.locator(".iv-sidebar").evaluate((el) => {
      el.style.inlineSize = "420px";
      const [a, b] = el.children;
      return b.getBoundingClientRect().top > a.getBoundingClientRect().bottom - 1;
    });
    expect(stacked).toBe(true);
  });
});

test.describe("cards", () => {
  test("a link card is one target: a click anywhere follows the title link", async ({ page }) => {
    await page.goto("/fixture/card/modern?nojs");
    const card = page.locator(".iv-card--link").first();
    const box = await card.boundingBox();
    await page.mouse.click(box.x + box.width - 12, box.y + box.height / 2);
    await expect(page).toHaveURL(/#card-modern-note$/);
  });

  test("subgrid lines up the rows of neighbouring cards", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/fixture/card/modern?nojs");
    const tops = await page.locator(".iv-grid--subgrid > .iv-card p").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  });

  test("the responsive card stacks when it is narrow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/fixture/card/modern?nojs");
    const stacked = await page.locator(".iv-card--responsive").evaluate((el) => {
      const media = el.querySelector(".iv-card__media").getBoundingClientRect();
      const body = el.querySelector(".iv-card__body").getBoundingClientRect();
      return body.top >= media.bottom - 1;
    });
    expect(stacked).toBe(true);
  });
});

test.describe("motion", () => {
  test("spinner and scroll reveal respect reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/fixture/spinner/basic?nojs");
    expect(await css(page, ".iv-spinner", "animationName", "::before")).toBe("iv-spinner-breathe");
    await page.goto("/fixture/motion/scroll-reveal?nojs");
    expect(await css(page, ".iv-scroll-reveal", "animationName")).toBe("none");
  });

  test("scroll reveal is driven by a view timeline where the engine has one", async ({ page }) => {
    await page.goto("/fixture/motion/scroll-reveal?nojs");
    const supported = await page.evaluate(() => CSS.supports("animation-timeline: view()"));
    test.skip(!supported, "no animation-timeline in this engine: the element is simply there");
    expect(await css(page, ".iv-scroll-reveal", "animationName")).toBe("iv-scroll-reveal");
    expect(await css(page, ".iv-scroll-reveal", "animationTimeline")).toBe("view()");
  });

  test("details glide open where ::details-content exists", async ({ page }) => {
    await page.goto("/fixture/disclosure/accordion?nojs");
    const supported = await page.evaluate(() => CSS.supports("selector(::details-content)"));
    test.skip(!supported, "no ::details-content in this engine: the panel opens at once, as in 1.0");
    expect(await css(page, ".iv-disclosure", "interpolateSize")).toBe("allow-keywords");
    expect(await css(page, ".iv-disclosure", "transitionProperty", "::details-content")).toContain("block-size");
  });
});

test.describe("forced colours", () => {
  test.use({ forcedColors: "active" });
  test("the chosen segment, the selected chip and the lit stars use the system highlight", async ({ page }) => {
    await page.goto("/fixture/segmented/basic?nojs");
    const highlight = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "Highlight";
      document.body.append(probe);
      return getComputedStyle(probe).color;
    });
    expect(await css(page, 'input[name="seg-period"]:checked + *', "backgroundColor")).toBe(highlight);
    await page.goto("/fixture/chip/basic?nojs");
    expect(await css(page, "label.iv-chip", "backgroundColor")).toBe(highlight);
    await page.goto("/fixture/rating/basic?nojs");
    expect(await css(page, 'label[for="rt-1"]', "backgroundColor")).toBe(highlight);
  });
});

test.describe("right to left", () => {
  test("meter bar gradient, phone island and list marker follow the direction", async ({ page }) => {
    await page.goto("/fixture/meter/basic?nojs&dir=rtl");
    expect(await css(page, ".iv-meter", "--iv-meter-angle")).toBe("-90deg");
    await page.goto("/fixture/mockup/basic?nojs&dir=rtl");
    const centred = await page.locator(".iv-mockup--phone").evaluate((el) => {
      const frame = el.getBoundingClientRect();
      // The island is a pseudo-element: its centre is read from the computed inset and translate.
      const cs = getComputedStyle(el, "::before");
      return { right: cs.right, translate: cs.translate, width: frame.width };
    });
    expect(centred.translate).toBe("50%");
    await page.goto("/fixture/list/basic?nojs&dir=rtl");
    expect(await css(page, ".iv-list__action[aria-current]", "boxShadow")).toContain("-3px");
  });
});

test.describe("theme transition", () => {
  test("setThemeWithTransition changes the theme and resolves with it", async ({ page }) => {
    await page.goto("/fixture/theme/nested?nojs");
    const out = await page.evaluate(async () => {
      const { setThemeWithTransition } = await import("/packages/ivolt/dist/js/theme-transition.js");
      const resolved = await setThemeWithTransition("dark");
      return { resolved, attr: document.documentElement.getAttribute("data-iv-theme") };
    });
    expect(out).toEqual({ resolved: "dark", attr: "dark" });
  });
});
