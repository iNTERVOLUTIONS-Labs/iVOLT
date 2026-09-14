// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Datepicker } from "../../packages/ivolt/src/js/components/datepicker.js";
import { IvError } from "../../packages/ivolt/src/js/core/registry.js";

const BOUNDED = `
  <form id="form">
    <div id="dp" class="iv-field iv-datepicker" data-iv-component="datepicker" data-iv-native="off">
      <label class="iv-label" for="d-start">Start date</label>
      <input class="iv-input" type="date" id="d-start" name="start" min="2026-01-01" max="2026-12-31" value="2026-03-04">
      <p class="iv-field__help" id="d-start-help">Sample field.</p>
    </div>
  </form>
`;

const FREE = `
  <div id="dp" class="iv-field iv-datepicker" data-iv-component="datepicker" data-iv-native="off">
    <label class="iv-label" for="d-any">Any date</label>
    <input class="iv-input" type="date" id="d-any" name="any" value="2026-03-04">
  </div>
`;

const EMPTY = `
  <div id="dp" class="iv-field iv-datepicker" data-iv-component="datepicker" data-iv-native="off">
    <label class="iv-label" for="d-empty">Any date</label>
    <input class="iv-input" type="date" id="d-empty" name="empty">
  </div>
`;

/**
 * @param {string} id Element id.
 * @returns {HTMLElement} The element.
 */
function byId(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}

/**
 * @param {string} markup Fixture markup.
 * @returns {void}
 */
function mount(markup) {
  document.body.innerHTML = markup;
}

/**
 * @param {Partial<Record<string, unknown>>} [options] Options passed in JavaScript.
 * @returns {{ dp: Datepicker, el: HTMLElement, input: HTMLInputElement }} The fixture.
 */
function setup(options) {
  const el = byId("dp");
  const dp = new Datepicker(el, options);
  const input = /** @type {HTMLInputElement} */ (el.querySelector("input"));
  return { dp, el, input };
}

/**
 * @param {Element} root Any ancestor of the grid.
 * @param {string} iso ISO date.
 * @returns {HTMLButtonElement} The day button.
 */
function day(root, iso) {
  return /** @type {HTMLButtonElement} */ (
    root.querySelector(`.iv-datepicker__day[data-iv-date="${iso}"]`)
  );
}

/**
 * @param {Element} root Any ancestor of the grid.
 * @returns {string} ISO date of the single tab stop.
 */
function cursor(root) {
  const el = root.querySelector('.iv-datepicker__day[tabindex="0"]');
  return el ? String(el.getAttribute("data-iv-date")) : "";
}

/**
 * @param {Element} target Element receiving the key.
 * @param {string} key `KeyboardEvent.key`.
 * @param {KeyboardEventInit} [init] Extra event properties.
 * @returns {void}
 */
function press(target, key, init) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init })
  );
}

/**
 * Stubs `matchMedia` so `native: "auto"` can be tested in both worlds.
 *
 * @param {boolean} coarse Whether the pointer is coarse.
 * @returns {void}
 */
function stubPointer(coarse) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query) => ({
      matches: query.includes("coarse") ? coarse : false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }),
  });
}

/**
 * @returns {string} Today as ISO, in local time.
 */
function todayIso() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  delete (/** @type {Record<string, unknown>} */ (window)).matchMedia;
});

describe("Datepicker: markup and lifecycle", () => {
  it("builds the contract markup around the input and gives the toggle a dialog", () => {
    mount(BOUNDED);
    const { el, input } = setup();
    const control = el.querySelector(".iv-datepicker__control");
    expect(control).not.toBeNull();
    expect(control?.firstElementChild).toBe(input);
    expect(el.getAttribute("data-iv-enhanced")).toBe("");

    const toggle = /** @type {HTMLButtonElement} */ (
      el.querySelector(".iv-datepicker__toggle")
    );
    expect(toggle.previousElementSibling).toBe(input);
    expect(toggle.type).toBe("button");
    expect(toggle.getAttribute("aria-haspopup")).toBe("dialog");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-label")).toBe("Open calendar");
    expect(toggle.querySelector("svg")).not.toBeNull();

    const popover = /** @type {HTMLElement} */ (
      el.querySelector(".iv-datepicker__popover")
    );
    expect(toggle.getAttribute("aria-controls")).toBe(popover.id);
    expect(popover.getAttribute("role")).toBe("dialog");
    expect(popover.getAttribute("aria-modal")).toBe("false");
    expect(popover.getAttribute("aria-label")).toBe("Choose a date");
    expect(popover.hidden).toBe(true);

    const title = /** @type {HTMLElement} */ (
      popover.querySelector(".iv-datepicker__title")
    );
    expect(title.tagName).toBe("H2");
    expect(title.getAttribute("aria-live")).toBe("polite");
    const grid = /** @type {HTMLElement} */ (
      popover.querySelector(".iv-datepicker__grid")
    );
    expect(grid.tagName).toBe("TABLE");
    expect(grid.getAttribute("role")).toBe("grid");
    expect(grid.getAttribute("aria-labelledby")).toBe(title.id);
    expect(grid.querySelectorAll("th.iv-datepicker__weekday").length).toBe(7);
    expect(grid.querySelectorAll("tbody tr").length).toBe(6);
    expect(grid.querySelectorAll("td .iv-datepicker__day").length).toBe(42);

    const navs = popover.querySelectorAll(".iv-datepicker__nav");
    expect(navs.length).toBe(2);
    expect(navs[0].getAttribute("data-iv-dir")).toBe("-1");
    expect(navs[0].getAttribute("aria-label")).toBe("Previous month");
    expect(navs[1].getAttribute("data-iv-dir")).toBe("1");
    expect(navs[1].getAttribute("aria-label")).toBe("Next month");

    const today = popover.querySelector(".iv-datepicker__today");
    const clear = popover.querySelector(".iv-datepicker__clear");
    expect(today?.className).toBe(
      "iv-button iv-button--ghost iv-button--sm iv-datepicker__today"
    );
    expect(today?.textContent).toBe("Today");
    expect(clear?.textContent).toBe("Clear");
  });

  it("restores the served markup on destroy, with and without a selection", () => {
    for (const markup of [BOUNDED, EMPTY]) {
      mount(markup);
      const before = byId("dp").outerHTML;
      const { dp } = setup();
      expect(byId("dp").outerHTML).not.toBe(before);
      dp.destroy();
      expect(byId("dp").outerHTML).toBe(before);
      expect(byId("dp").querySelector(".iv-datepicker__popover")).toBeNull();
    }
  });

  it("refuses an element without a date input", () => {
    document.body.innerHTML =
      '<div id="dp" class="iv-datepicker" data-iv-component="datepicker"><input class="iv-input" type="text"></div>';
    let error = null;
    try {
      new Datepicker(byId("dp"));
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(IvError);
    expect(/** @type {IvError} */ (error).code).toBe("invalid-element");
  });

  it("is idempotent through initAll and reports the instance", () => {
    mount(BOUNDED);
    const made = Datepicker.initAll(document);
    expect(made.length).toBe(1);
    expect(Datepicker.initAll(document).length).toBe(0);
    expect(Datepicker.get(byId("dp"))).toBe(made[0]);
    expect(Datepicker.getOrCreate(byId("dp"))).toBe(made[0]);
    made[0].destroy();
  });
});

describe("Datepicker: native", () => {
  it("keeps the native picker with native=on", () => {
    mount(BOUNDED);
    const el = byId("dp");
    el.setAttribute("data-iv-native", "on");
    const dp = new Datepicker(el);
    expect(el.querySelector(".iv-datepicker__toggle")).toBeNull();
    expect(el.querySelector(".iv-datepicker__popover")).toBeNull();
    expect(el.hasAttribute("data-iv-enhanced")).toBe(false);
    dp.open();
    expect(dp.isOpen).toBe(false);
    expect(dp.value).toBe("2026-03-04");
    dp.destroy();
  });

  it("builds the calendar with native=off even on a coarse pointer", () => {
    stubPointer(true);
    mount(BOUNDED);
    const { dp, el } = setup();
    expect(el.querySelector(".iv-datepicker__toggle")).not.toBeNull();
    dp.destroy();
  });

  it("native=auto steps aside on coarse pointers and builds on fine ones", () => {
    stubPointer(true);
    mount(BOUNDED);
    byId("dp").setAttribute("data-iv-native", "auto");
    const coarse = new Datepicker(byId("dp"));
    expect(byId("dp").querySelector(".iv-datepicker__toggle")).toBeNull();
    coarse.destroy();

    stubPointer(false);
    mount(BOUNDED);
    byId("dp").setAttribute("data-iv-native", "auto");
    const fine = new Datepicker(byId("dp"));
    expect(byId("dp").querySelector(".iv-datepicker__toggle")).not.toBeNull();
    fine.destroy();
  });
});

describe("Datepicker: opening and focus", () => {
  it("opens from the toggle and from the down arrow, and closes from the toggle", () => {
    mount(BOUNDED);
    const { dp, el } = setup();
    const toggle = /** @type {HTMLButtonElement} */ (
      el.querySelector(".iv-datepicker__toggle")
    );
    const popover = /** @type {HTMLElement} */ (
      el.querySelector(".iv-datepicker__popover")
    );
    /** @type {string[]} */
    const seen = [];
    for (const name of ["iv:open", "iv:opened", "iv:close", "iv:closed"]) {
      el.addEventListener(name, (event) =>
        seen.push(`${name}:${/** @type {CustomEvent} */ (event).detail.reason}`)
      );
    }
    toggle.click();
    expect(dp.isOpen).toBe(true);
    expect(popover.hidden).toBe(false);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    toggle.click();
    expect(dp.isOpen).toBe(false);
    expect(popover.hidden).toBe(true);
    expect(seen).toEqual([
      "iv:open:trigger",
      "iv:opened:trigger",
      "iv:close:trigger",
      "iv:closed:trigger",
    ]);

    press(toggle, "ArrowDown");
    expect(dp.isOpen).toBe(true);
    dp.close();
    press(/** @type {HTMLElement} */ (el.querySelector("input")), "ArrowDown", {
      altKey: true,
    });
    expect(dp.isOpen).toBe(true);
    dp.destroy();
  });

  it("focuses the selected day, or today when the field is empty", () => {
    mount(BOUNDED);
    const { dp, el } = setup();
    dp.open();
    expect(document.activeElement).toBe(day(el, "2026-03-04"));
    expect(cursor(el)).toBe("2026-03-04");
    expect(day(el, "2026-03-04").parentElement.getAttribute("aria-selected")).toBe("true");
    dp.destroy();

    mount(EMPTY);
    const empty = setup();
    empty.dp.open();
    expect(cursor(empty.el)).toBe(todayIso());
    expect(document.activeElement).toBe(day(empty.el, todayIso()));
    expect(
      day(empty.el, todayIso()).classList.contains("iv-datepicker__day--today")
    ).toBe(true);
    expect(day(empty.el, todayIso()).getAttribute("aria-current")).toBe("date");
    expect(empty.el.querySelector('[aria-selected="true"]')).toBeNull();
    empty.dp.destroy();
  });

  it("cancels the open and the close from the previous event", () => {
    mount(BOUNDED);
    const { dp, el } = setup();
    const stop = (event) => event.preventDefault();
    el.addEventListener("iv:open", stop);
    dp.open();
    expect(dp.isOpen).toBe(false);
    el.removeEventListener("iv:open", stop);
    dp.open();
    el.addEventListener("iv:close", stop);
    dp.close();
    expect(dp.isOpen).toBe(true);
    el.removeEventListener("iv:close", stop);
    dp.close();
    expect(dp.isOpen).toBe(false);
    dp.destroy();
  });

  it("closes on an outside pointer and on Escape, returning the focus", () => {
    mount(BOUNDED);
    const { dp, el } = setup();
    const toggle = /** @type {HTMLButtonElement} */ (
      el.querySelector(".iv-datepicker__toggle")
    );
    /** @type {string[]} */
    const reasons = [];
    el.addEventListener("iv:closed", (event) =>
      reasons.push(String(/** @type {CustomEvent} */ (event).detail.reason))
    );
    dp.open();
    document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(dp.isOpen).toBe(false);

    dp.open();
    // A pointer inside the component leaves it open.
    toggle.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(dp.isOpen).toBe(true);

    press(day(el, "2026-03-04"), "Escape");
    expect(dp.isOpen).toBe(false);
    expect(document.activeElement).toBe(toggle);
    expect(reasons).toEqual(["external", "escape"]);
    dp.destroy();
  });
});

describe("Datepicker: keyboard", () => {
  it("walks the grid with every documented key", () => {
    mount(FREE);
    const { dp, el } = setup();
    dp.open();
    const steps = [
      ["ArrowRight", {}, "2026-03-05"],
      ["ArrowLeft", {}, "2026-03-04"],
      ["ArrowDown", {}, "2026-03-11"],
      ["ArrowUp", {}, "2026-03-04"],
      // No locale here: the week runs Sunday to Saturday.
      ["Home", {}, "2026-03-01"],
      ["End", {}, "2026-03-07"],
      ["PageDown", {}, "2026-04-07"],
      ["PageUp", {}, "2026-03-07"],
      ["PageUp", { shiftKey: true }, "2025-03-07"],
      ["PageDown", { shiftKey: true }, "2026-03-07"],
    ];
    for (const [key, init, expected] of steps) {
      const active = /** @type {HTMLElement} */ (document.activeElement);
      press(active, String(key), /** @type {KeyboardEventInit} */ (init));
      expect(cursor(el), String(key)).toBe(expected);
      expect(document.activeElement).toBe(day(el, String(expected)));
    }
    // Paging repaints the month: the heading follows the cursor.
    press(/** @type {HTMLElement} */ (document.activeElement), "PageDown");
    expect(
      el.querySelector(".iv-datepicker__title")?.textContent
    ).toBe("April 2026");
    dp.destroy();
  });

  it("selects with Enter and with Space, and closes", () => {
    for (const key of ["Enter", " "]) {
      mount(FREE);
      const { dp, el, input } = setup();
      dp.open();
      press(/** @type {HTMLElement} */ (document.activeElement), "ArrowRight");
      press(/** @type {HTMLElement} */ (document.activeElement), key);
      expect(input.value).toBe("2026-03-05");
      expect(dp.isOpen).toBe(false);
      dp.destroy();
    }
  });

  it("keeps one tab stop in the grid", () => {
    mount(FREE);
    const { dp, el } = setup();
    dp.open();
    expect(el.querySelectorAll('.iv-datepicker__day[tabindex="0"]').length).toBe(1);
    press(/** @type {HTMLElement} */ (document.activeElement), "ArrowRight");
    expect(el.querySelectorAll('.iv-datepicker__day[tabindex="0"]').length).toBe(1);
    expect(el.querySelectorAll('.iv-datepicker__day[tabindex="-1"]').length).toBe(41);
    dp.destroy();
  });
});

describe("Datepicker: min and max", () => {
  it("disables the days outside the range and never walks past them", () => {
    mount(BOUNDED);
    const { dp, el, input } = setup();
    dp.open();
    // January 2026 starts on a Thursday: the cells before it belong to 2025.
    press(/** @type {HTMLElement} */ (document.activeElement), "PageUp");
    press(/** @type {HTMLElement} */ (document.activeElement), "PageUp");
    expect(cursor(el)).toBe("2026-01-04");
    expect(day(el, "2025-12-29").disabled).toBe(true);
    expect(day(el, "2026-01-01").disabled).toBe(false);

    // A week earlier is out of range: the cursor stops on the first allowed day.
    press(/** @type {HTMLElement} */ (document.activeElement), "ArrowUp");
    expect(cursor(el)).toBe("2026-01-01");
    press(/** @type {HTMLElement} */ (document.activeElement), "ArrowLeft");
    expect(cursor(el)).toBe("2026-01-01");
    press(/** @type {HTMLElement} */ (document.activeElement), "PageUp", {
      shiftKey: true,
    });
    expect(cursor(el)).toBe("2026-01-01");
    expect(el.querySelector(".iv-datepicker__title")?.textContent).toBe(
      "January 2026"
    );
    expect(
      /** @type {HTMLButtonElement} */ (
        el.querySelector('.iv-datepicker__nav[data-iv-dir="-1"]')
      ).disabled
    ).toBe(true);

    // A disabled day answers neither the pointer nor Enter.
    day(el, "2025-12-29").click();
    expect(input.value).toBe("2026-03-04");
    dp.setValue("2027-01-01");
    expect(input.value).toBe("2026-03-04");
    dp.destroy();
  });
});

describe("Datepicker: localization", () => {
  it("names months and weekdays in the requested locale", () => {
    mount(FREE);
    const spanish = setup({ locale: "es-ES", firstDay: 1 });
    spanish.dp.open();
    const title = String(
      spanish.el.querySelector(".iv-datepicker__title")?.textContent
    ).toLowerCase();
    expect(title).toContain("marzo");
    expect(title).toContain("2026");
    const heads = [...spanish.el.querySelectorAll("th.iv-datepicker__weekday")];
    expect(String(heads[0].getAttribute("abbr")).toLowerCase()).toBe("lunes");
    expect(String(heads[6].getAttribute("abbr")).toLowerCase()).toBe("domingo");
    expect(String(heads[0].textContent).toLowerCase()).toContain("lun");
    expect(day(spanish.el, "2026-03-04").getAttribute("aria-label")).toContain(
      "marzo"
    );
    spanish.dp.destroy();

    mount(FREE);
    const american = setup({ locale: "en-US", firstDay: 0 });
    american.dp.open();
    expect(
      american.el.querySelector(".iv-datepicker__title")?.textContent
    ).toBe("March 2026");
    const usHeads = [...american.el.querySelectorAll("th.iv-datepicker__weekday")];
    expect(usHeads[0].getAttribute("abbr")).toBe("Sunday");
    expect(usHeads[0].textContent).toBe("Sun");
    expect(day(american.el, "2026-03-04").getAttribute("aria-label")).toBe(
      "March 4, 2026"
    );
    american.dp.destroy();
  });

  it("honours firstDay 0, 1 and the locale default", () => {
    mount(FREE);
    const sunday = setup({ firstDay: 0 });
    expect(
      sunday.el.querySelector("th.iv-datepicker__weekday")?.getAttribute("abbr")
    ).toBe("Sunday");
    sunday.dp.destroy();

    mount(FREE);
    const monday = setup({ firstDay: 1 });
    expect(
      monday.el.querySelector("th.iv-datepicker__weekday")?.getAttribute("abbr")
    ).toBe("Monday");
    monday.dp.destroy();

    // `-1` asks `Intl.Locale`: Monday in Spain, Sunday in the United States.
    mount(FREE);
    const auto = setup({ firstDay: -1, locale: "es-ES" });
    expect(
      String(
        auto.el.querySelector("th.iv-datepicker__weekday")?.getAttribute("abbr")
      ).toLowerCase()
    ).toBe("lunes");
    auto.dp.destroy();

    mount(FREE);
    const autoUs = setup({ firstDay: -1, locale: "en-US" });
    expect(
      autoUs.el.querySelector("th.iv-datepicker__weekday")?.getAttribute("abbr")
    ).toBe("Sunday");
    autoUs.dp.destroy();
  });

  it("falls back to the document language and survives a broken locale", () => {
    document.documentElement.setAttribute("lang", "es-ES");
    mount(FREE);
    const { dp, el } = setup();
    expect(
      String(el.querySelector(".iv-datepicker__title")?.textContent).toLowerCase()
    ).toContain("marzo");
    dp.destroy();
    document.documentElement.removeAttribute("lang");

    mount(FREE);
    const broken = setup({ locale: "not a locale" });
    expect(broken.el.querySelector(".iv-datepicker__title")?.textContent).toBeTruthy();
    broken.dp.destroy();
  });

  it("takes the button labels from the options", () => {
    mount(FREE);
    const { dp, el } = setup({
      openText: "Abrir calendario",
      prevText: "Mes anterior",
      nextText: "Mes siguiente",
      todayText: "Hoy",
      clearText: "Borrar",
      dialogText: "Elige una fecha",
    });
    expect(
      el.querySelector(".iv-datepicker__toggle")?.getAttribute("aria-label")
    ).toBe("Abrir calendario");
    expect(
      el.querySelector('[data-iv-dir="-1"]')?.getAttribute("aria-label")
    ).toBe("Mes anterior");
    expect(el.querySelector('[data-iv-dir="1"]')?.getAttribute("aria-label")).toBe(
      "Mes siguiente"
    );
    expect(el.querySelector(".iv-datepicker__today")?.textContent).toBe("Hoy");
    expect(el.querySelector(".iv-datepicker__clear")?.textContent).toBe("Borrar");
    expect(
      el.querySelector(".iv-datepicker__popover")?.getAttribute("aria-label")
    ).toBe("Elige una fecha");
    dp.destroy();
  });
});

describe("Datepicker: selection", () => {
  it("writes ISO, dispatches native input and change, and emits iv:change then iv:changed", () => {
    mount(FREE);
    const { dp, el, input } = setup();
    /** @type {string[]} */
    const order = [];
    const detail = [];
    input.addEventListener("input", () => order.push("input"));
    input.addEventListener("change", () => order.push("change"));
    el.addEventListener("iv:change", (event) => {
      order.push("iv:change");
      detail.push(/** @type {CustomEvent} */ (event).detail);
    });
    el.addEventListener("iv:changed", () => order.push("iv:changed"));
    dp.open();
    day(el, "2026-03-18").click();
    expect(input.value).toBe("2026-03-18");
    expect(dp.value).toBe("2026-03-18");
    expect(dp.date?.getFullYear()).toBe(2026);
    expect(dp.date?.getMonth()).toBe(2);
    expect(dp.date?.getDate()).toBe(18);
    expect(order).toEqual(["iv:change", "input", "change", "iv:changed"]);
    expect(detail[0].value).toBe("2026-03-18");
    expect(detail[0].previousValue).toBe("2026-03-04");
    expect(detail[0].date).toBeInstanceOf(Date);
    expect(dp.isOpen).toBe(false);
    dp.open();
    expect(day(el, "2026-03-18").parentElement.getAttribute("aria-selected")).toBe("true");
    expect(day(el, "2026-03-04").parentElement.getAttribute("aria-selected")).toBe("false");
    dp.destroy();
  });

  it("does not write when iv:change is cancelled", () => {
    mount(FREE);
    const { dp, el, input } = setup();
    let changed = 0;
    el.addEventListener("iv:change", (event) => event.preventDefault());
    el.addEventListener("iv:changed", () => (changed += 1));
    dp.open();
    day(el, "2026-03-18").click();
    expect(input.value).toBe("2026-03-04");
    expect(changed).toBe(0);
    expect(dp.isOpen).toBe(true);
    dp.destroy();
  });

  it("setValue and clear go through the same path", () => {
    mount(FREE);
    const { dp, el, input } = setup();
    /** @type {string[]} */
    const values = [];
    el.addEventListener("iv:changed", (event) =>
      values.push(String(/** @type {CustomEvent} */ (event).detail.value))
    );
    dp.setValue("2026-07-09");
    expect(input.value).toBe("2026-07-09");
    dp.open();
    expect(el.querySelector(".iv-datepicker__title")?.textContent).toBe("July 2026");
    expect(cursor(el)).toBe("2026-07-09");
    dp.close();
    dp.setValue("nonsense");
    expect(input.value).toBe("2026-07-09");
    dp.clear();
    expect(input.value).toBe("");
    expect(dp.value).toBe("");
    expect(dp.date).toBeNull();
    expect(values).toEqual(["2026-07-09", ""]);
    dp.destroy();
  });

  it("the today button selects today and the clear button empties the field", () => {
    mount(FREE);
    const { dp, el, input } = setup();
    dp.open();
    /** @type {HTMLButtonElement} */ (
      el.querySelector(".iv-datepicker__today")
    ).click();
    expect(input.value).toBe(todayIso());
    expect(dp.isOpen).toBe(false);
    dp.open();
    /** @type {HTMLButtonElement} */ (
      el.querySelector(".iv-datepicker__clear")
    ).click();
    expect(input.value).toBe("");
    expect(dp.isOpen).toBe(false);
    dp.destroy();

    // Out of range, the button is disabled instead of writing an invalid date.
    mount(BOUNDED);
    const bounded = setup();
    bounded.dp.open();
    const today = /** @type {HTMLButtonElement} */ (
      bounded.el.querySelector(".iv-datepicker__today")
    );
    expect(today.disabled).toBe(!(todayIso() >= "2026-01-01" && todayIso() <= "2026-12-31"));
    bounded.dp.destroy();
  });

  it("shows the month typed by hand in the input", () => {
    mount(FREE);
    const { dp, el, input } = setup();
    input.value = "2027-11-23";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(el.querySelector(".iv-datepicker__title")?.textContent).toBe(
      "November 2027"
    );
    dp.open();
    expect(cursor(el)).toBe("2027-11-23");
    expect(day(el, "2027-11-23").parentElement.getAttribute("aria-selected")).toBe("true");
    dp.destroy();
  });

  it("treats an invalid served value as an empty field", () => {
    document.body.innerHTML =
      '<div id="dp" class="iv-datepicker" data-iv-component="datepicker" data-iv-native="off"><input class="iv-input" type="date" value="2026-02-31"></div>';
    const { dp, el } = setup();
    expect(dp.value).toBe("");
    expect(dp.date).toBeNull();
    dp.open();
    expect(cursor(el)).toBe(todayIso());
    dp.destroy();
  });

  it("honours a step in days, counted from min", () => {
    document.body.innerHTML =
      '<div id="dp" class="iv-datepicker" data-iv-component="datepicker" data-iv-native="off"><input class="iv-input" type="date" min="2026-03-02" step="7" value="2026-03-09"></div>';
    const { dp, el, input } = setup();
    dp.open();
    expect(day(el, "2026-03-16").disabled).toBe(false);
    expect(day(el, "2026-03-17").disabled).toBe(true);
    day(el, "2026-03-17").click();
    expect(input.value).toBe("2026-03-09");
    day(el, "2026-03-16").click();
    expect(input.value).toBe("2026-03-16");
    dp.destroy();
  });

  it("ignores an invalid min or max", () => {
    document.body.innerHTML =
      '<div id="dp" class="iv-datepicker" data-iv-component="datepicker" data-iv-native="off"><input class="iv-input" type="date" min="yesterday" max="2026-13-40" value="2026-03-04"></div>';
    const { dp, el } = setup();
    dp.open();
    expect(day(el, "2026-03-01").disabled).toBe(false);
    expect(day(el, "2026-03-31").disabled).toBe(false);
    dp.destroy();
  });
});

describe("Datepicker: navigation and placement", () => {
  it("steps the month from the header without moving the focus", () => {
    mount(FREE);
    const { dp, el } = setup();
    dp.open();
    const next = /** @type {HTMLButtonElement} */ (
      el.querySelector('.iv-datepicker__nav[data-iv-dir="1"]')
    );
    next.focus();
    next.click();
    expect(el.querySelector(".iv-datepicker__title")?.textContent).toBe("April 2026");
    expect(document.activeElement).toBe(next);
    expect(cursor(el)).toBe("2026-04-04");
    /** @type {HTMLButtonElement} */ (
      el.querySelector('.iv-datepicker__nav[data-iv-dir="-1"]')
    ).click();
    expect(el.querySelector(".iv-datepicker__title")?.textContent).toBe("March 2026");
    dp.destroy();
  });

  it("opens below, above only when the popover fits there, and caps the height otherwise", () => {
    mount(FREE);
    const { dp, el } = setup();
    const control = /** @type {HTMLElement} */ (
      el.querySelector(".iv-datepicker__control")
    );
    const popover = /** @type {HTMLElement} */ (
      el.querySelector(".iv-datepicker__popover")
    );
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(popover, "offsetHeight", {
      value: 352,
      configurable: true,
      writable: true,
    });
    control.getBoundingClientRect = () =>
      /** @type {DOMRect} */ ({ top: 100, bottom: 140, left: 0, right: 200, width: 200, height: 40 });
    dp.open();
    expect(popover.getAttribute("data-iv-placement")).toBe("bottom");
    expect(popover.style.getPropertyValue("--iv-datepicker-max-height")).toBe("");
    dp.close();

    control.getBoundingClientRect = () =>
      /** @type {DOMRect} */ ({ top: 700, bottom: 740, left: 0, right: 200, width: 200, height: 40 });
    dp.open();
    expect(popover.getAttribute("data-iv-placement")).toBe("top"); // 52 below, 692 above
    expect(popover.style.getPropertyValue("--iv-datepicker-max-height")).toBe("");
    dp.close();

    // It fits nowhere: below, capped to the room left there.
    Object.defineProperty(popover, "offsetHeight", {
      value: 900,
      configurable: true,
      writable: true,
    });
    control.getBoundingClientRect = () =>
      /** @type {DOMRect} */ ({ top: 300, bottom: 340, left: 0, right: 200, width: 200, height: 40 });
    dp.open();
    expect(popover.getAttribute("data-iv-placement")).toBe("bottom");
    expect(popover.style.getPropertyValue("--iv-datepicker-max-height")).toBe("452px");
    dp.close();
    expect(popover.style.getPropertyValue("--iv-datepicker-max-height")).toBe("");
    dp.destroy();
  });

  it("releases every listener on destroy", () => {
    mount(FREE);
    const { dp, el } = setup();
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    dp.open();
    expect(add).toHaveBeenCalledWith("pointerdown", expect.any(Function), undefined);
    dp.close();
    expect(remove).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    dp.open();
    dp.destroy();
    document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(el.querySelector(".iv-datepicker__popover")).toBeNull();
    add.mockRestore();
    remove.mockRestore();
  });
});

describe("Datepicker: focus after a keyboard selection", () => {
  it("returns focus to the toggle even though the selected day was repainted", () => {
    document.body.innerHTML = '<div class="iv-field iv-datepicker" data-iv-component="datepicker" data-iv-native="off"><label class="iv-label" for="f">Date</label><input class="iv-input" type="date" id="f" value="2026-03-04"></div>';
    const picker = new Datepicker(document.querySelector(".iv-datepicker"));
    picker.open();
    const day = document.querySelector('.iv-datepicker__day[data-iv-date="2026-03-05"]');
    day.focus();
    day.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(picker.isOpen).toBe(false);
    expect(document.activeElement).toBe(document.querySelector(".iv-datepicker__toggle"));
    picker.destroy();
  });
});
