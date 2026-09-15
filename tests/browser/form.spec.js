import { test, expect } from "@playwright/test";

test.describe("Form validation", () => {
  test("submit with errors: messages, aria, summary, focus; fixing clears; valid submit is cancelable", async ({ page }) => {
    await page.goto("/fixture/form/validation");
    const form = page.locator("form[data-iv-component=form]").first();
    await expect(form).toHaveAttribute("novalidate", "");
    await page.evaluate(() => { window.__ev = []; const f = document.querySelector("form[data-iv-component=form]"); ["iv:invalid", "iv:valid"].forEach((t) => f.addEventListener(t, (e) => { window.__ev.push([t, (e.detail.errors || []).length]); if (t === "iv:valid") e.preventDefault(); })); f.addEventListener("submit", (e) => { window.__ev.push(["submit", e.defaultPrevented]); e.preventDefault(); }); });
    await form.locator("button[type=submit], [type=submit]").first().click();
    const invalid = form.locator("[aria-invalid='true']");
    expect(await invalid.count()).toBeGreaterThan(0);
    const first = invalid.first();
    // With a summary the focus lands on the summary; without it, on the first invalid control.
    if (await form.getAttribute("data-iv-summary")) await expect(form.locator(".iv-form__summary")).toBeFocused();
    else await expect(first).toBeFocused();
    const describedby = await first.getAttribute("aria-describedby");
    expect(describedby).toBeTruthy();
    const ids = describedby.split(/\s+/);
    const errorText = await page.evaluate((ids) => ids.map((i) => document.getElementById(i)?.textContent.trim() || "").join(" "), ids);
    expect(errorText.length).toBeGreaterThan(0);
    await expect(form.locator(".iv-field--invalid").first()).toBeVisible();
    if (await form.getAttribute("data-iv-summary")) {
      const summary = form.locator(".iv-form__summary");
      await expect(summary).toBeVisible();
      expect(await summary.locator("a[href^='#']").count()).toBeGreaterThan(0);
    }
    let ev = await page.evaluate(() => window.__ev);
    expect(ev.some((e) => e[0] === "iv:invalid" && e[1] > 0)).toBe(true);
    // The component prevents the native submission when the form is invalid.
    expect(ev.filter((e) => e[0] === "submit").every((e) => e[1] === true)).toBe(true);

    // Fill every invalid control with an acceptable value, then submit again.
    await page.evaluate(() => {
      const f = document.querySelector("form[data-iv-component=form]");
      for (const c of f.querySelectorAll("[aria-invalid='true']")) {
        if (c.type === "checkbox") c.checked = true;
        else if (c.type === "email") c.value = "reader@example.com";
        else if (c.type === "number" || c.type === "range") c.value = c.min || "1";
        else if (c.type === "date") c.value = c.min || "2030-01-01";
        else if (c.tagName === "SELECT") c.selectedIndex = [...c.options].findIndex((o) => o.value !== "" && !o.disabled);
        else c.value = c.dataset.ivValidSample || (c.pattern ? "" : "Sample text long enough");
        c.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await form.locator("button[type=submit], [type=submit]").first().click();
    await expect(form.locator("[aria-invalid='true']")).toHaveCount(0);
    await expect(form.locator(".iv-field--valid").first()).toBeVisible();
    ev = await page.evaluate(() => window.__ev);
    expect(ev.some((e) => e[0] === "iv:valid")).toBe(true);
    expect(ev.filter((e) => e[0] === "submit").every((e) => e[1] === true)).toBe(true); // iv:valid was cancelled, so the submit stays prevented

    const restored = await page.evaluate(async () => {
      const mod = await import("/packages/ivolt/dist/js/components/form.js");
      const f = document.querySelector("form[data-iv-component=form]");
      mod.Form.get(f).destroy();
      return { novalidate: f.hasAttribute("novalidate"), invalid: f.querySelectorAll("[aria-invalid]").length, states: f.querySelectorAll(".iv-field--invalid, .iv-field--valid").length };
    });
    expect(restored).toEqual({ novalidate: false, invalid: 0, states: 0 });
  });

  test("custom message via iv:validate and blur validation", async ({ page }) => {
    await page.goto("/fixture/form/validation");
    const form = page.locator("form[data-iv-component=form]").first();
    const required = form.locator("[required]").first();
    await page.evaluate(() => document.querySelector("form[data-iv-component=form]").addEventListener("iv:validate", (e) => { if (e.detail.control.hasAttribute("required") && e.detail.control.value === "") e.detail.setError("Custom: fill this in"); }));
    await required.focus();
    await page.keyboard.press("Tab");
    await expect(required).toHaveAttribute("aria-invalid", "true");
    const ids = (await required.getAttribute("aria-describedby")).split(/\s+/);
    const text = await page.evaluate((ids) => ids.map((i) => document.getElementById(i)?.textContent || "").join(" "), ids);
    expect(text).toContain("Custom: fill this in");
  });
});

test.describe("Counter", () => {
  test("counts characters and words, warns, marks soft limits invalid", async ({ page }) => {
    await page.goto("/fixture/form/counter");
    const fields = page.locator("[data-iv-component=counter]");
    expect(await fields.count()).toBeGreaterThanOrEqual(2);
    const chars = fields.first();
    const control = chars.locator("textarea, input").first();
    const counter = chars.locator(".iv-counter");
    await expect(counter).toHaveAttribute("aria-live", "polite");
    await control.fill("Hello");
    await expect(counter.locator(".iv-counter__value")).toHaveText("5");
    const max = await chars.evaluate((el) => Number(el.dataset.ivMax || el.querySelector("textarea, input").maxLength));
    if (max > 0) {
      await control.fill("x".repeat(Math.ceil(max * 0.95)));
      await expect(counter).toHaveClass(/iv-counter--warn/);
    }
    const soft = page.locator("[data-iv-component=counter][data-iv-max]").first();
    if (await soft.count()) {
      const c = soft.locator("textarea, input").first();
      const m = Number(await soft.getAttribute("data-iv-max"));
      const mode = (await soft.getAttribute("data-iv-mode")) || "chars";
      await c.fill(mode === "words" ? Array.from({ length: m + 2 }, (_, i) => `w${i}`).join(" ") : "y".repeat(m + 5));
      await expect(soft.locator(".iv-counter")).toHaveClass(/iv-counter--over/);
      await expect(c).toHaveAttribute("aria-invalid", "true");
      expect(await c.evaluate((el) => el.validity.customError)).toBe(true);
    }
  });
});

// Floating label with an enriched select (API_CONTRACT §8.6, v0.9): the picker keeps the
// label as a sibling of the visible field, so `form.css` needs no `:has()` compensation.
test.describe("Floating label over an enriched select", () => {
  /** The `.iv-field--float` that holds the plan select. */
  const plan = (page) => page.locator(".iv-field--float").filter({ has: page.locator("#fl-plan") });

  test("the label lives next to the visible field and floats on the value, not on the wrapper", async ({ page }) => {
    await page.goto("/fixture/form/float");
    const field = plan(page);
    await expect(field.locator(".iv-picker__field")).toBeVisible();
    const placed = await field.evaluate((el) => {
      const label = el.querySelector(".iv-label");
      return {
        parent: label.parentElement.className,
        previous: label.previousElementSibling.className,
        for: label.getAttribute("for"),
        control: el.querySelector(".iv-picker__control").id,
      };
    });
    expect(placed.parent).toBe("iv-picker");
    expect(placed.previous).toBe("iv-picker__field");
    expect(placed.for).toBe(placed.control);

    // Nothing chosen: the label is the placeholder, in the middle and at reading size,
    // and the picker's own placeholder steps out of the way instead of printing under it.
    const empty = await field.evaluate((el) => {
      const label = el.querySelector(".iv-label");
      return {
        size: getComputedStyle(label).fontSize,
        top: Math.round(label.getBoundingClientRect().top - el.getBoundingClientRect().top),
        placeholder: getComputedStyle(el.querySelector(".iv-picker__placeholder")).color,
      };
    });
    expect(empty.size).toBe("16px");
    expect(empty.top).toBeGreaterThan(12);
    expect(empty.placeholder).toBe("rgba(0, 0, 0, 0)");

    // Choosing a plan raises the label and gives the placeholder back its colour.
    await field.locator(".iv-picker__control").click();
    await page.locator(".iv-picker__option", { hasText: "Team" }).first().click();
    await expect(field.locator(".iv-picker__value")).toHaveText("Team");
    // The label travels with a transition: poll until it has settled at the small size.
    await expect
      .poll(() => field.evaluate((el) => getComputedStyle(el.querySelector(".iv-label")).fontSize))
      .toBe("12px");
    const chosen = await field.evaluate((el) => {
      const label = el.querySelector(".iv-label");
      return { top: Math.round(label.getBoundingClientRect().top - el.getBoundingClientRect().top) };
    });
    expect(chosen.top).toBeLessThan(empty.top);
  });

  test("destroy gives the served markup back, label included", async ({ page }) => {
    await page.goto("/fixture/form/float");
    await expect(plan(page).locator(".iv-picker__field")).toBeVisible();
    const same = await page.evaluate(async () => {
      const { Picker } = await import("/packages/ivolt/dist/js/components/picker.js");
      const field = [...document.querySelectorAll(".iv-field--float")].find((f) => f.querySelector("#fl-plan"));
      const served = '<select class="iv-select" id="fl-plan" name="plan">';
      Picker.get(field.querySelector(".iv-picker")).destroy();
      const label = field.querySelector(".iv-label");
      return {
        html: field.innerHTML.includes(served),
        labelParent: label.parentElement.className,
        labelFor: label.getAttribute("for"),
        pickers: field.querySelectorAll(".iv-picker").length,
      };
    });
    expect(same.pickers).toBe(0);
    expect(same.html).toBe(true);
    expect(same.labelParent).toContain("iv-field--float");
    expect(same.labelFor).toBe("fl-plan");
  });
});
