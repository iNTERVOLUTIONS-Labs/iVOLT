// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Dropdown } from "../../packages/ivolt/src/js/components/dropdown.js";
import { IvError } from "../../packages/ivolt/src/js/core/registry.js";

const MARKUP = `
  <details id="dd" class="iv-dropdown" data-iv-component="dropdown">
    <summary id="sum" class="iv-button iv-button--secondary">Actions</summary>
    <div class="iv-dropdown__menu">
      <button id="i1" class="iv-dropdown__item" type="button">Duplicate project</button>
      <button id="i2" class="iv-dropdown__item" type="button">Export as CSV</button>
      <hr class="iv-dropdown__separator">
      <div id="sep2" class="iv-dropdown__separator"></div>
      <a id="i3" class="iv-dropdown__item" href="#dropdown-note">Retention policy</a>
    </div>
  </details>
  <p id="dropdown-note">Exports are kept for thirty days.</p>
`;

/**
 * @param {string} id Element id.
 * @returns {HTMLElement} The element.
 */
function byId(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}

/**
 * @param {Element} target Event target.
 * @param {string} key `KeyboardEvent.key` value.
 * @returns {KeyboardEvent} The dispatched event.
 */
function press(target, key) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

/**
 * jsdom fires `toggle` asynchronously; the tests drive it explicitly.
 *
 * @param {HTMLDetailsElement} el Details element.
 * @param {boolean} open New state.
 * @returns {void}
 */
function userToggle(el, open) {
  el.open = open;
  el.dispatchEvent(new Event("toggle"));
}

/** @returns {{ dropdown: Dropdown, el: HTMLDetailsElement }} */
function setup(options) {
  const el = /** @type {HTMLDetailsElement} */ (byId("dd"));
  return { dropdown: new Dropdown(el, options), el };
}

describe("Dropdown", () => {
  beforeEach(() => {
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("refuses a non-details element with IvError invalid-element", () => {
    const div = document.createElement("div");
    let error = null;
    try {
      new Dropdown(div);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(IvError);
    expect(error.code).toBe("invalid-element");
  });

  it("promotes the served HTML to the menu button pattern", () => {
    setup();
    expect(byId("sum").getAttribute("aria-haspopup")).toBe("menu");
    expect(byId("sum").getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector(".iv-dropdown__menu").getAttribute("role")).toBe("menu");
    for (const id of ["i1", "i2", "i3"]) {
      expect(byId(id).getAttribute("role")).toBe("menuitem");
      expect(byId(id).getAttribute("tabindex")).toBe("-1");
    }
    expect(document.querySelector("hr.iv-dropdown__separator").hasAttribute("role")).toBe(false);
    expect(byId("sep2").getAttribute("role")).toBe("separator");
  });

  it("keeps aria-expanded in sync with the native toggle", () => {
    const { el } = setup();
    userToggle(el, true);
    expect(byId("sum").getAttribute("aria-expanded")).toBe("true");
    userToggle(el, false);
    expect(byId("sum").getAttribute("aria-expanded")).toBe("false");
  });

  it("emits cancelable iv:open and reverts when cancelled", () => {
    const { el } = setup();
    const opened = vi.fn();
    el.addEventListener("iv:open", (e) => e.preventDefault());
    el.addEventListener("iv:opened", opened);
    userToggle(el, true);
    expect(el.open).toBe(false);
    expect(opened).not.toHaveBeenCalled();
    expect(byId("sum").getAttribute("aria-expanded")).toBe("false");
  });

  it("opens with Enter on the summary and focuses the first item", () => {
    const { el } = setup();
    const event = press(byId("sum"), "Enter");
    expect(event.defaultPrevented).toBe(true);
    expect(el.open).toBe(true);
    expect(byId("sum").getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(byId("i1"));
  });

  it("opens with ArrowDown and closes with Enter on the summary", () => {
    const { el } = setup();
    press(byId("sum"), "ArrowDown");
    expect(el.open).toBe(true);
    expect(document.activeElement).toBe(byId("i1"));
    press(byId("sum"), "Enter");
    expect(el.open).toBe(false);
  });

  it("moves through the items with the arrows, Home and End", () => {
    setup();
    press(byId("sum"), "Enter");
    press(byId("i1"), "ArrowDown");
    expect(document.activeElement).toBe(byId("i2"));
    press(byId("i2"), "ArrowDown");
    expect(document.activeElement).toBe(byId("i3"));
    press(byId("i3"), "ArrowDown");
    expect(document.activeElement).toBe(byId("i1")); // wraps
    press(byId("i1"), "ArrowUp");
    expect(document.activeElement).toBe(byId("i3")); // wraps
    press(byId("i3"), "Home");
    expect(document.activeElement).toBe(byId("i1"));
    press(byId("i1"), "End");
    expect(document.activeElement).toBe(byId("i3"));
  });

  it("Escape closes and returns focus to the summary", () => {
    const { el } = setup();
    const focus = vi.spyOn(byId("sum"), "focus");
    press(byId("sum"), "Enter");
    const event = press(byId("i1"), "Escape");
    expect(event.defaultPrevented).toBe(true);
    expect(el.open).toBe(false);
    expect(focus).toHaveBeenCalled();
  });

  it("Tab closes without trapping the focus", () => {
    const { el } = setup();
    press(byId("sum"), "Enter");
    const event = press(byId("i1"), "Tab");
    expect(el.open).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it("a click outside closes the menu", () => {
    const { el } = setup();
    el.open = true;
    userToggle(el, true);
    byId("i1").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.open).toBe(false);
  });

  it("closeOnSelect closes on click and on Enter over an item", () => {
    const { el, dropdown } = setup();
    dropdown.open();
    byId("i1").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.open).toBe(false);
    dropdown.open();
    press(byId("i2"), "Enter");
    expect(el.open).toBe(false);
  });

  it("closeOnSelect false keeps the menu open", () => {
    const { el, dropdown } = setup({ closeOnSelect: false });
    dropdown.open();
    byId("i1").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.open).toBe(true);
    press(byId("i2"), "Enter");
    expect(el.open).toBe(true);
  });

  it("placement bottom-end adds the modifier class and destroy removes it", () => {
    const { el, dropdown } = setup({ placement: "bottom-end" });
    expect(el.classList.contains("iv-dropdown--end")).toBe(true);
    dropdown.destroy();
    expect(el.classList.contains("iv-dropdown--end")).toBe(false);
  });

  it("keeps a modifier class written by the author", () => {
    const el = byId("dd");
    el.classList.add("iv-dropdown--end");
    const dropdown = new Dropdown(el, { placement: "bottom-end" });
    dropdown.destroy();
    expect(el.classList.contains("iv-dropdown--end")).toBe(true);
  });

  it("destroy restores the served HTML and releases listeners", () => {
    const before = byId("dd").innerHTML;
    const { el, dropdown } = setup();
    dropdown.destroy();
    expect(el.innerHTML).toBe(before);
    const spy = vi.fn();
    el.addEventListener("iv:open", spy);
    userToggle(el, true);
    expect(spy).not.toHaveBeenCalled();
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.open).toBe(true);
    expect(Dropdown.get(el)).toBeUndefined();
  });

  it("initAll only picks data-iv-component=dropdown", () => {
    expect(Dropdown.initAll(document)).toHaveLength(1);
    expect(Dropdown.initAll(document)).toHaveLength(0);
  });
});

describe("Dropdown regressions", () => {
  beforeEach(() => {
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("puts focus back on the trigger when an item is activated with the pointer", () => {
    const el = byId("dd");
    el.setAttribute("open", "");
    const dropdown = new Dropdown(el);
    const item = byId("i1");
    item.focus();
    item.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(dropdown.isOpen).toBe(false);
    expect(document.activeElement).toBe(byId("sum"));
    dropdown.destroy();
  });

  it("leaves focus alone when the item was activated without holding focus", () => {
    const el = byId("dd");
    el.setAttribute("open", "");
    const dropdown = new Dropdown(el);
    byId("dropdown-note").setAttribute("tabindex", "-1");
    byId("dropdown-note").focus();
    byId("i1").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(dropdown.isOpen).toBe(false);
    expect(document.activeElement).toBe(byId("dropdown-note"));
    dropdown.destroy();
  });
});
