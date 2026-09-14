// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Popover } from "../../packages/ivolt/src/js/components/popover.js";

const MARKUP = `
  <button id="share-btn" type="button" popovertarget="share">Share this report</button>
  <button id="plain-btn" type="button" popovertarget="plain">Plan details</button>
  <div class="iv-popover" id="share" popover data-iv-component="popover">
    <h3 class="iv-popover__title">Share this report</h3>
    <p>Made-up copy: nothing is shared from here.</p>
    <a id="share-link" href="#note">Read the note</a>
  </div>
  <div class="iv-popover" id="plain" popover data-iv-component="popover" data-iv-align="end">
    <p>Made-up copy with nothing focusable inside.</p>
  </div>
`;

/** Whether the stubbed `CSS.supports` claims anchor positioning. */
let anchors = false;

/** Instances created by a test, destroyed after it. */
let instances = [];

/** Stub of the native `showPopover`. */
let showPopover = vi.fn();

/** Stub of the native `hidePopover`. */
let hidePopover = vi.fn();

/**
 * Creates an instance and keeps it for the teardown of the test.
 *
 * @param {string} id Id of the panel.
 * @returns {Popover} The instance.
 */
function mount(id) {
  const el = /** @type {HTMLElement} */ (document.getElementById(id));
  const instance = new Popover(el);
  instances.push(instance);
  return instance;
}

/**
 * Dispatches the native events jsdom does not implement. `beforetoggle` is
 * cancelable and carries `source` when the browser knows the invoker.
 *
 * @param {Element} el The panel.
 * @param {"open"|"closed"} newState State the panel moves to.
 * @param {Element|null} [source] Invoker the browser reports.
 * @returns {Event} The `beforetoggle` event, to read `defaultPrevented`.
 */
function before(el, newState, source) {
  const event = new Event("beforetoggle", { cancelable: true });
  Object.assign(event, {
    newState,
    oldState: newState === "open" ? "closed" : "open",
    source: source ?? undefined,
  });
  el.dispatchEvent(event);
  return event;
}

/**
 * Dispatches the native `toggle`, which is not cancelable.
 *
 * @param {Element} el The panel.
 * @param {"open"|"closed"} newState State the panel has reached.
 * @returns {void}
 */
function toggled(el, newState) {
  const event = new Event("toggle");
  Object.assign(event, {
    newState,
    oldState: newState === "open" ? "closed" : "open",
  });
  el.dispatchEvent(event);
}

/**
 * Runs both halves of an opening or closing, as the browser would.
 *
 * @param {Element} el The panel.
 * @param {"open"|"closed"} newState State the panel moves to.
 * @param {Element|null} [source] Invoker the browser reports.
 * @returns {void}
 */
function run(el, newState, source) {
  const event = before(el, newState, source);
  if (!event.defaultPrevented) toggled(el, newState);
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

/**
 * Records the public events of a panel.
 *
 * @param {Element} el The panel.
 * @returns {{ name: string, reason: unknown, trigger: unknown }[]} The log, filled as events arrive.
 */
function record(el) {
  /** @type {{ name: string, reason: unknown, trigger: unknown }[]} */
  const seen = [];
  for (const name of ["iv:open", "iv:opened", "iv:close", "iv:closed"]) {
    el.addEventListener(name, (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      seen.push({ name, reason: detail.reason, trigger: detail.trigger });
    });
  }
  return seen;
}

describe("Popover", () => {
  beforeEach(() => {
    anchors = false;
    instances = [];
    document.body.innerHTML = MARKUP;
    showPopover = vi.fn();
    hidePopover = vi.fn();
    Object.assign(HTMLElement.prototype, { showPopover, hidePopover });
    vi.stubGlobal("CSS", {
      supports: (/** @type {string} */ value) =>
        anchors && value.includes("position-anchor"),
      escape: (/** @type {string} */ value) => value,
    });
    vi.stubGlobal("innerWidth", 1000);
    vi.stubGlobal("innerHeight", 700);
  });

  afterEach(() => {
    for (const instance of instances) instance.destroy();
    instances = [];
    // @ts-expect-error the stubs are not part of the jsdom prototype.
    delete HTMLElement.prototype.showPopover;
    // @ts-expect-error the stubs are not part of the jsdom prototype.
    delete HTMLElement.prototype.hidePopover;
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("instantiates every declared panel", () => {
    const created = Popover.initAll(document);
    instances.push(...created);
    expect(created.map((p) => p.element.id)).toEqual(["share", "plain"]);
  });

  it("reports the native toggle as iv:open and iv:opened", () => {
    const popover = mount("share");
    const panel = /** @type {HTMLElement} */ (document.getElementById("share"));
    const button = /** @type {HTMLElement} */ (document.getElementById("share-btn"));
    const seen = record(panel);
    run(panel, "open", button);
    expect(seen).toEqual([
      { name: "iv:open", reason: "trigger", trigger: button },
      { name: "iv:opened", reason: "trigger", trigger: button },
    ]);
    expect(popover.isOpen).toBe(true);
    expect(popover.invoker).toBe(button);
  });

  it("finds the invoker by popovertarget when the browser reports none", () => {
    const popover = mount("share");
    const panel = /** @type {HTMLElement} */ (document.getElementById("share"));
    run(panel, "open");
    expect(popover.invoker).toBe(document.getElementById("share-btn"));
  });

  it("cancelling iv:open prevents the native toggle", () => {
    const popover = mount("share");
    const panel = /** @type {HTMLElement} */ (document.getElementById("share"));
    panel.addEventListener("iv:open", (event) => event.preventDefault());
    const event = before(panel, "open");
    expect(event.defaultPrevented).toBe(true);
    expect(popover.isOpen).toBe(false);
    expect(panel.hasAttribute("data-iv-placement")).toBe(false);
  });

  it("cancelling iv:close keeps the panel open", () => {
    const popover = mount("share");
    const panel = /** @type {HTMLElement} */ (document.getElementById("share"));
    run(panel, "open");
    panel.addEventListener("iv:close", (event) => event.preventDefault());
    const event = before(panel, "closed");
    expect(event.defaultPrevented).toBe(true);
    expect(popover.isOpen).toBe(true);
    expect(panel.getAttribute("data-iv-placement")).toBe("bottom");
  });

  it("tells a dismissal from a closing invoker and from the API", () => {
    const popover = mount("share");
    const panel = /** @type {HTMLElement} */ (document.getElementById("share"));
    const button = /** @type {HTMLElement} */ (document.getElementById("share-btn"));
    const seen = record(panel);
    run(panel, "open", button);
    run(panel, "closed");
    expect(seen.slice(2)).toEqual([
      { name: "iv:close", reason: "light-dismiss", trigger: button },
      { name: "iv:closed", reason: "light-dismiss", trigger: button },
    ]);

    seen.length = 0;
    run(panel, "open", button);
    run(panel, "closed", button);
    expect(seen.slice(2).map((e) => e.reason)).toEqual(["trigger", "trigger"]);

    seen.length = 0;
    run(panel, "open", button);
    // `close()` calls the native method, which the browser answers with both events.
    hidePopover.mockImplementation(() => run(panel, "closed"));
    popover.close();
    expect(hidePopover).toHaveBeenCalledTimes(1);
    expect(seen.slice(2).map((e) => e.reason)).toEqual(["api", "api"]);
  });

  it("places the panel by measurement, flipping and clamping to the viewport", () => {
    const popover = mount("share");
    const panel = /** @type {HTMLElement} */ (document.getElementById("share"));
    const button = /** @type {HTMLElement} */ (document.getElementById("share-btn"));
    place(panel, { left: 0, top: 0, width: 300, height: 200 });

    place(button, { left: 120, top: 100, width: 160, height: 40 });
    run(panel, "open", button);
    expect(panel.getAttribute("data-iv-placement")).toBe("bottom");
    expect(panel.style.inset).toBe("148px auto auto 120px");
    run(panel, "closed");
    expect(panel.hasAttribute("data-iv-placement")).toBe(false);
    expect(panel.hasAttribute("style")).toBe(false);

    // No room below and more room above: the panel flips over the invoker.
    place(button, { left: 120, top: 600, width: 160, height: 40 });
    run(panel, "open", button);
    expect(panel.getAttribute("data-iv-placement")).toBe("top");
    expect(panel.style.inset).toBe("392px auto auto 120px");
    run(panel, "closed");

    // Past the inline end of the viewport: pushed back inside.
    place(button, { left: 900, top: 100, width: 80, height: 40 });
    run(panel, "open", button);
    expect(panel.style.inset).toBe("148px auto auto 692px");
    expect(popover.isOpen).toBe(true);
  });

  it("aligns to the end of the invoker when asked to", () => {
    mount("plain");
    const panel = /** @type {HTMLElement} */ (document.getElementById("plain"));
    const button = /** @type {HTMLElement} */ (document.getElementById("plain-btn"));
    place(panel, { left: 0, top: 0, width: 300, height: 100 });
    place(button, { left: 400, top: 100, width: 160, height: 40 });
    run(panel, "open", button);
    expect(panel.style.inset).toBe("148px auto auto 260px");
  });

  it("uses anchor positioning when the browser has it, and removes it on close", () => {
    anchors = true;
    mount("share");
    const panel = /** @type {HTMLElement} */ (document.getElementById("share"));
    const button = /** @type {HTMLElement} */ (document.getElementById("share-btn"));
    run(panel, "open", button);
    const name = button.style.getPropertyValue("anchor-name");
    expect(name).toMatch(/^--iv-popover-\d+$/);
    expect(panel.style.getPropertyValue("position-anchor")).toBe(name);
    expect(panel.style.getPropertyValue("position-area")).toBe("block-end span-inline-end");
    expect(panel.style.getPropertyValue("margin-block-start")).toBe("8px");
    expect(panel.style.getPropertyValue("inset")).toBe("");
    expect(panel.getAttribute("data-iv-placement")).toBe("bottom");
    run(panel, "closed");
    expect(button.hasAttribute("style")).toBe(false);
    expect(panel.hasAttribute("style")).toBe(false);
    expect(panel.hasAttribute("data-iv-placement")).toBe(false);
  });

  it("moves the focus into the panel and brings it back to the invoker", () => {
    mount("share");
    const panel = /** @type {HTMLElement} */ (document.getElementById("share"));
    const button = /** @type {HTMLElement} */ (document.getElementById("share-btn"));
    button.focus();
    run(panel, "open", button);
    expect(document.activeElement?.id).toBe("share-link");
    run(panel, "closed");
    expect(document.activeElement).toBe(button);
  });

  it("focuses a panel with nothing focusable through a temporary tabindex", () => {
    mount("plain");
    const panel = /** @type {HTMLElement} */ (document.getElementById("plain"));
    const button = /** @type {HTMLElement} */ (document.getElementById("plain-btn"));
    run(panel, "open", button);
    expect(panel.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(panel);
    run(panel, "closed");
    expect(panel.hasAttribute("tabindex")).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  it("open, close and toggle go through the native methods", () => {
    const popover = mount("share");
    const panel = /** @type {HTMLElement} */ (document.getElementById("share"));
    showPopover.mockImplementation(() => run(panel, "open"));
    hidePopover.mockImplementation(() => run(panel, "closed"));
    popover.toggle();
    expect(showPopover).toHaveBeenCalledTimes(1);
    expect(popover.isOpen).toBe(true);
    popover.open();
    expect(showPopover).toHaveBeenCalledTimes(1);
    popover.toggle();
    expect(hidePopover).toHaveBeenCalledTimes(1);
    expect(popover.isOpen).toBe(false);
    popover.close();
    expect(hidePopover).toHaveBeenCalledTimes(1);
  });

  it("destroy removes every style and attribute it wrote", () => {
    anchors = true;
    const popover = mount("share");
    const panel = /** @type {HTMLElement} */ (document.getElementById("share"));
    const button = /** @type {HTMLElement} */ (document.getElementById("share-btn"));
    run(panel, "open", button);
    expect(button.hasAttribute("style")).toBe(true);
    popover.destroy();
    instances = [];
    expect(panel.hasAttribute("style")).toBe(false);
    expect(panel.hasAttribute("data-iv-placement")).toBe(false);
    expect(button.hasAttribute("style")).toBe(false);
    const seen = record(panel);
    run(panel, "closed", button);
    expect(seen).toEqual([]);
  });
});
