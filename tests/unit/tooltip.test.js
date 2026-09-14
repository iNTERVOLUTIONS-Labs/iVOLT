// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Tooltip } from "../../packages/ivolt/src/js/components/tooltip.js";

const MARKUP = `
  <div id="root" data-iv-component="tooltip">
    <button id="save" type="button" data-iv-tooltip="Saves your changes">Save</button>
    <button id="export" type="button" data-iv-tooltip="Exports the current view" aria-describedby="hint">Export</button>
    <button id="plain" type="button">Nothing to describe</button>
    <p id="hint">Made-up help text.</p>
  </div>
`;

const BARE = `
  <section id="plain-root">
    <button id="lonely" type="button" data-iv-tooltip="Made-up label">Lonely</button>
  </section>
`;

/** Whether the stubbed `matchMedia` reports a coarse pointer. */
let coarse = false;

/** Instances created by a test, destroyed after it. */
let instances = [];

/**
 * Creates an instance and keeps it for the teardown of the test.
 *
 * @param {string} id Id of the root element.
 * @returns {Tooltip} The instance.
 */
function mount(id) {
  const el = /** @type {HTMLElement} */ (document.getElementById(id));
  const instance = new Tooltip(el);
  instances.push(instance);
  return instance;
}

/**
 * The shared bubble, if it exists.
 *
 * @returns {HTMLElement|null} The tooltip element.
 */
function bubble() {
  return /** @type {HTMLElement|null} */ (document.querySelector(".iv-tooltip"));
}

/**
 * Dispatches a pointer event that does not bubble, as the real ones do not.
 *
 * @param {string} id Id of the element under the pointer.
 * @param {string} type Event type.
 * @returns {void}
 */
function pointer(id, type) {
  const el = /** @type {HTMLElement} */ (document.getElementById(id));
  el.dispatchEvent(new MouseEvent(type, { bubbles: false }));
}

/**
 * Moves the focus; jsdom fires the `focusin` the component listens to.
 *
 * @param {string} id Id of the element gaining focus.
 * @returns {void}
 */
function focus(id) {
  /** @type {HTMLElement} */ (document.getElementById(id)).focus();
}

/**
 * Pins the rectangle an element reports.
 *
 * @param {Element} el Element to pin.
 * @param {{ left: number, top: number, width: number, height: number }} box Client rectangle.
 * @returns {void}
 */
function place(el, box) {
  const rect = {
    left: box.left,
    top: box.top,
    right: box.left + box.width,
    bottom: box.top + box.height,
    width: box.width,
    height: box.height,
    x: box.left,
    y: box.top,
    toJSON: () => ({}),
  };
  Object.defineProperty(el, "getBoundingClientRect", {
    configurable: true,
    value: () => rect,
  });
}

describe("Tooltip", () => {
  beforeEach(() => {
    coarse = false;
    instances = [];
    document.body.innerHTML = MARKUP;
    document.body.removeAttribute("data-iv-component");
    document.body.removeAttribute("data-iv-auto");
    vi.stubGlobal("matchMedia", (/** @type {string} */ query) => ({
      matches: query.includes("coarse") ? coarse : false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));
  });

  afterEach(() => {
    for (const instance of instances) instance.destroy();
    instances = [];
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("instantiates the declared root and leaves the body alone", () => {
    const created = Tooltip.initAll(document);
    instances.push(...created);
    expect(created).toHaveLength(1);
    expect(created[0].element.id).toBe("root");
    expect(document.body.hasAttribute("data-iv-component")).toBe(false);
  });

  it("generates a root on the body when the page declares none", () => {
    document.body.innerHTML = BARE;
    const created = Tooltip.initAll(document);
    instances.push(...created);
    expect(created).toHaveLength(1);
    expect(created[0].element).toBe(document.body);
    expect(document.body.getAttribute("data-iv-auto")).toBe("");
    focus("lonely");
    expect(bubble()).not.toBeNull();
    created[0].destroy();
    instances = [];
    expect(document.body.hasAttribute("data-iv-component")).toBe(false);
    expect(document.body.hasAttribute("data-iv-auto")).toBe(false);
    expect(bubble()).toBeNull();
  });

  it("shows the label at once on focus", () => {
    const tooltip = mount("root");
    focus("save");
    const tip = bubble();
    expect(tip).not.toBeNull();
    expect(tip?.getAttribute("role")).toBe("tooltip");
    expect(tip?.textContent).toBe("Saves your changes");
    expect(tip?.hidden).toBe(false);
    expect(tip?.parentElement).toBe(document.body);
    expect(tooltip.target?.id).toBe("save");
  });

  it("waits for the delay with the pointer", () => {
    vi.useFakeTimers();
    mount("root");
    pointer("save", "pointerenter");
    expect(bubble()).toBeNull();
    vi.advanceTimersByTime(299);
    expect(bubble()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(bubble()?.textContent).toBe("Saves your changes");
  });

  it("drops a pending label when the pointer leaves first", () => {
    vi.useFakeTimers();
    mount("root");
    pointer("save", "pointerenter");
    pointer("save", "pointerleave");
    vi.advanceTimersByTime(1000);
    expect(bubble()).toBeNull();
  });

  it("appends the bubble id to aria-describedby and restores it", () => {
    const tooltip = mount("root");
    const exporter = /** @type {HTMLElement} */ (document.getElementById("export"));
    focus("export");
    const id = /** @type {HTMLElement} */ (bubble()).id;
    expect(id).not.toBe("");
    expect(exporter.getAttribute("aria-describedby")).toBe(`hint ${id}`);
    tooltip.hide();
    expect(exporter.getAttribute("aria-describedby")).toBe("hint");

    const save = /** @type {HTMLElement} */ (document.getElementById("save"));
    focus("save");
    expect(save.getAttribute("aria-describedby")).toBe(id);
    tooltip.hide();
    expect(save.hasAttribute("aria-describedby")).toBe(false);
  });

  it("ignores elements without a label", () => {
    const tooltip = mount("root");
    focus("plain");
    expect(bubble()).toBeNull();
    expect(tooltip.target).toBeNull();
  });

  it("hides on Escape", () => {
    const tooltip = mount("root");
    focus("save");
    expect(tooltip.target).not.toBeNull();
    document
      .getElementById("save")
      ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(tooltip.target).toBeNull();
    expect(bubble()?.hidden).toBe(true);
  });

  it("hides when the focus leaves", () => {
    const tooltip = mount("root");
    focus("save");
    document
      .getElementById("save")
      ?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    expect(tooltip.target).toBeNull();
    expect(document.getElementById("save")?.hasAttribute("aria-describedby")).toBe(false);
  });

  it("hides on scroll", () => {
    const tooltip = mount("root");
    focus("save");
    window.dispatchEvent(new Event("scroll"));
    expect(tooltip.target).toBeNull();
  });

  it("answers only to the focus with a coarse pointer", () => {
    coarse = true;
    vi.useFakeTimers();
    const tooltip = mount("root");
    pointer("save", "pointerenter");
    vi.advanceTimersByTime(1000);
    expect(bubble()).toBeNull();
    focus("save");
    expect(tooltip.target?.id).toBe("save");
  });

  it("emits iv:show, which can be cancelled, then iv:shown", () => {
    const tooltip = mount("root");
    /** @type {string[]} */
    const seen = [];
    const root = /** @type {HTMLElement} */ (document.getElementById("root"));
    for (const name of ["iv:show", "iv:shown", "iv:hide", "iv:hidden"]) {
      root.addEventListener(name, (event) => {
        seen.push(name);
        expect(/** @type {CustomEvent} */ (event).detail.target).toBe(
          document.getElementById("save")
        );
      });
    }
    const block = (/** @type {Event} */ event) => event.preventDefault();
    root.addEventListener("iv:show", block);
    focus("save");
    expect(seen).toEqual(["iv:show"]);
    expect(bubble()).toBeNull();
    expect(document.getElementById("save")?.hasAttribute("aria-describedby")).toBe(false);

    root.removeEventListener("iv:show", block);
    tooltip.show(/** @type {Element} */ (document.getElementById("save")));
    expect(seen).toEqual(["iv:show", "iv:show", "iv:shown"]);
    tooltip.hide();
    expect(seen).toEqual(["iv:show", "iv:show", "iv:shown", "iv:hide", "iv:hidden"]);
    expect(tooltip.target).toBeNull();
  });

  it("places the bubble above the target, and below when there is no room", () => {
    vi.stubGlobal("innerWidth", 800);
    vi.stubGlobal("innerHeight", 600);
    const tooltip = mount("root");
    const save = /** @type {HTMLElement} */ (document.getElementById("save"));
    tooltip.show(save);
    const tip = /** @type {HTMLElement} */ (bubble());
    place(tip, { left: 0, top: 0, width: 120, height: 30 });

    place(save, { left: 300, top: 300, width: 100, height: 20 });
    tooltip.hide();
    tooltip.show(save);
    expect(tip.getAttribute("data-iv-placement")).toBe("top");
    expect(tip.style.inset).toBe("262px auto auto 290px");

    place(save, { left: 300, top: 4, width: 100, height: 20 });
    tooltip.hide();
    tooltip.show(save);
    expect(tip.getAttribute("data-iv-placement")).toBe("bottom");
    expect(tip.style.inset).toBe("32px auto auto 290px");

    place(save, { left: 760, top: 300, width: 30, height: 20 });
    tooltip.hide();
    tooltip.show(save);
    expect(tip.style.inset).toBe("262px auto auto 672px");
  });

  it("destroy removes the bubble and restores every target", () => {
    const tooltip = mount("root");
    focus("export");
    expect(bubble()).not.toBeNull();
    tooltip.destroy();
    instances = [];
    expect(bubble()).toBeNull();
    expect(document.getElementById("export")?.getAttribute("aria-describedby")).toBe("hint");
    focus("save");
    expect(bubble()).toBeNull();
  });
});
