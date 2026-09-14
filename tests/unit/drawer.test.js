// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Drawer } from "../../packages/ivolt/src/js/components/drawer.js";
import { IvError } from "../../packages/ivolt/src/js/core/registry.js";

/**
 * jsdom does not implement `showModal()` / `close()` of `<dialog>`; this stub
 * reproduces the observable part of the spec the component relies on.
 *
 * @returns {void}
 */
function installDialogStub() {
  const proto = globalThis.HTMLDialogElement && globalThis.HTMLDialogElement.prototype;
  if (!proto) return;
  proto.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  proto.show = function show() {
    this.setAttribute("open", "");
  };
  proto.close = function close(value) {
    if (!this.hasAttribute("open")) return;
    this.returnValue = value ?? this.returnValue ?? "";
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

const realMatchMedia = globalThis.matchMedia;

/**
 * Installs a controllable `matchMedia` stub.
 *
 * @param {boolean} matches Initial state of the query.
 * @returns {{ matches: boolean, media: string, addEventListener: Function, removeEventListener: Function, listenerCount: () => number, emit: (next: boolean) => void }} The fake media query list.
 */
function installMatchMedia(matches) {
  const listeners = new Set();
  const mql = {
    matches,
    media: "",
    addEventListener(type, handler) {
      if (type === "change") listeners.add(handler);
    },
    removeEventListener(type, handler) {
      if (type === "change") listeners.delete(handler);
    },
    listenerCount: () => listeners.size,
    emit(next) {
      mql.matches = next;
      for (const handler of [...listeners]) handler({ matches: next, media: "" });
    },
  };
  globalThis.matchMedia = vi.fn(() => mql);
  return mql;
}

const MARKUP = `
  <a id="trigger" href="#d" data-iv-open="d">Open navigation</a>
  <dialog id="d" class="iv-drawer" data-iv-component="drawer" aria-label="Site navigation">
    <div class="iv-drawer__panel">
      <header class="iv-drawer__header">
        <h2 class="iv-drawer__title">Sections</h2>
        <button id="close-btn" type="button" data-iv-close aria-label="Close">x</button>
      </header>
      <div class="iv-drawer__body">
        <nav aria-label="Sections"><a id="first" href="#note">Overview</a></nav>
      </div>
    </div>
  </dialog>
  <p id="note">Note</p>
`;

/**
 * @param {Record<string, unknown>} [options] Options passed in JavaScript.
 * @returns {{ drawer: Drawer, el: HTMLDialogElement, trigger: HTMLElement }} Fixture handles.
 */
function setup(options) {
  const el = /** @type {HTMLDialogElement} */ (document.getElementById("d"));
  const trigger = /** @type {HTMLElement} */ (document.getElementById("trigger"));
  return { drawer: new Drawer(el, options), el, trigger };
}

describe("Drawer", () => {
  beforeEach(() => {
    installDialogStub();
    installMatchMedia(false);
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    globalThis.matchMedia = realMatchMedia;
    vi.restoreAllMocks();
  });

  it("refuses a non-dialog element with IvError invalid-element", () => {
    const div = document.createElement("div");
    let error = null;
    try {
      new Drawer(div);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(IvError);
    expect(error.code).toBe("invalid-element");
  });

  it("resolves options from attributes and JavaScript", () => {
    const el = document.getElementById("d");
    el.setAttribute("data-iv-close-on-backdrop", "false");
    el.setAttribute("data-iv-static-from", "none");
    const drawer = new Drawer(el, { returnFocus: false });
    expect(drawer.options).toEqual({
      placement: "start",
      staticFrom: "none",
      closeOnBackdrop: false,
      closeOnEscape: true,
      returnFocus: false,
    });
    expect(drawer.placement).toBe("start");
  });

  it("opens, emits iv:open then iv:opened and focuses the first control", () => {
    const { drawer, el, trigger } = setup();
    const seen = [];
    el.addEventListener("iv:open", (e) => seen.push(["open", e.detail.reason]));
    el.addEventListener("iv:opened", (e) => seen.push(["opened", e.detail.trigger]));
    drawer.open({ trigger });
    expect(drawer.isOpen).toBe(true);
    expect(seen).toEqual([
      ["open", "api"],
      ["opened", trigger],
    ]);
    expect(document.activeElement).toBe(document.getElementById("close-btn"));
  });

  it("does not open when iv:open is cancelled and toggles both ways", () => {
    const { drawer, el } = setup();
    el.addEventListener("iv:open", (e) => e.preventDefault(), { once: true });
    drawer.open();
    expect(drawer.isOpen).toBe(false);
    drawer.toggle();
    expect(drawer.isOpen).toBe(true);
    drawer.toggle();
    expect(drawer.isOpen).toBe(false);
  });

  it("closes with a reason and returns focus to the trigger", () => {
    const { drawer, trigger } = setup();
    drawer.open({ trigger });
    const reasons = [];
    drawer.element.addEventListener("iv:close", (e) => reasons.push(e.detail.reason));
    drawer.element.addEventListener("iv:closed", (e) => reasons.push(e.detail.reason));
    drawer.close("api");
    expect(reasons).toEqual(["api", "api"]);
    expect(document.activeElement).toBe(trigger);
  });

  it("Esc: intercepts cancel and closes with reason escape", () => {
    const { drawer, el } = setup();
    drawer.open();
    const event = new Event("cancel", { cancelable: true });
    el.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(drawer.isOpen).toBe(false);
  });

  it("Esc does nothing when closeOnEscape is false", () => {
    const { drawer, el } = setup({ closeOnEscape: false });
    drawer.open();
    el.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(drawer.isOpen).toBe(true);
  });

  it("closes on a backdrop click outside the panel and ignores clicks inside", () => {
    const { drawer, el } = setup();
    drawer.open();
    el.querySelector(".iv-drawer__panel").dispatchEvent(
      new MouseEvent("click", { bubbles: true, clientX: 5, clientY: 5 })
    );
    expect(drawer.isOpen).toBe(true);
    const reasons = [];
    el.addEventListener("iv:close", (e) => reasons.push(e.detail.reason));
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 5, clientY: 5 }));
    expect(reasons).toEqual(["backdrop"]);
    expect(drawer.isOpen).toBe(false);
  });

  it("intercepts form[method=dialog] submit with reason form and returnValue", () => {
    document.body.innerHTML =
      '<dialog id="f" class="iv-drawer"><form method="dialog" class="iv-drawer__panel"><button id="ok" value="save">Save</button></form></dialog>';
    const el = document.getElementById("f");
    const drawer = new Drawer(el);
    drawer.open();
    let detail = null;
    el.addEventListener("iv:closed", (e) => {
      detail = e.detail;
    });
    const event = new Event("submit", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "submitter", { value: document.getElementById("ok") });
    el.querySelector("form").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(detail.reason).toBe("form");
    expect(detail.returnValue).toBe("save");
  });

  it("reports an external native close as reason external", () => {
    const { drawer, el } = setup();
    drawer.open();
    const reasons = [];
    el.addEventListener("iv:close", (e) => reasons.push(["close", e.detail.reason]));
    el.addEventListener("iv:closed", (e) => reasons.push(["closed", e.detail.reason]));
    el.close();
    expect(reasons).toEqual([["closed", "external"]]);
  });

  it("adds iv-drawer--end for placement end and removes it on destroy", () => {
    const { drawer, el } = setup({ placement: "end" });
    expect(drawer.placement).toBe("end");
    expect(el.classList.contains("iv-drawer--end")).toBe(true);
    drawer.destroy();
    expect(el.classList.contains("iv-drawer--end")).toBe(false);
  });

  it("keeps a placement class written by the author on destroy", () => {
    const el = document.getElementById("d");
    el.classList.add("iv-drawer--end");
    const drawer = new Drawer(el, { placement: "end" });
    drawer.destroy();
    expect(el.classList.contains("iv-drawer--end")).toBe(true);
  });

  it("marks data-iv-static when the breakpoint already matches and open is a no-op", () => {
    installMatchMedia(true);
    const { drawer, el } = setup();
    expect(drawer.isStatic).toBe(true);
    expect(el.hasAttribute("data-iv-static")).toBe(true);
    const spy = vi.fn();
    el.addEventListener("iv:open", spy);
    drawer.open();
    expect(spy).not.toHaveBeenCalled();
    expect(drawer.isOpen).toBe(false);
  });

  it("closes with reason viewport when crossing up, and reopens when crossing down", () => {
    const mql = installMatchMedia(false);
    const { drawer, el } = setup();
    expect(el.hasAttribute("data-iv-static")).toBe(false);
    drawer.open();
    const reasons = [];
    el.addEventListener("iv:closed", (e) => reasons.push(e.detail.reason));
    mql.emit(true);
    expect(reasons).toEqual(["viewport"]);
    expect(drawer.isOpen).toBe(false);
    expect(el.hasAttribute("data-iv-static")).toBe(true);
    mql.emit(false);
    expect(el.hasAttribute("data-iv-static")).toBe(false);
    drawer.open();
    expect(drawer.isOpen).toBe(true);
  });

  it("uses the media query of the named breakpoint", () => {
    installMatchMedia(false);
    setup();
    expect(globalThis.matchMedia).toHaveBeenCalledWith("(min-width: 64em)");
  });

  it("staticFrom none never watches the viewport", () => {
    installMatchMedia(true);
    const { drawer, el } = setup({ staticFrom: "none" });
    expect(globalThis.matchMedia).not.toHaveBeenCalled();
    expect(el.hasAttribute("data-iv-static")).toBe(false);
    drawer.open();
    expect(drawer.isOpen).toBe(true);
  });

  it("warns once about an unknown breakpoint name and stays modal", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    installMatchMedia(true);
    const first = setup({ staticFrom: "huge" });
    expect(first.drawer.isStatic).toBe(false);
    first.drawer.destroy();
    const second = setup({ staticFrom: "huge" });
    expect(second.drawer.isStatic).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("destroy removes the media listener and the static attribute", () => {
    const mql = installMatchMedia(true);
    const { drawer, el } = setup();
    expect(mql.listenerCount()).toBe(1);
    drawer.destroy();
    expect(mql.listenerCount()).toBe(0);
    expect(el.hasAttribute("data-iv-static")).toBe(false);
    expect(Drawer.get(el)).toBeUndefined();
  });

  it("destroy closes without emitting iVOLT close events", () => {
    const { drawer, el } = setup();
    drawer.open();
    const spy = vi.fn();
    el.addEventListener("iv:close", spy);
    el.addEventListener("iv:closed", spy);
    drawer.destroy();
    expect(spy).not.toHaveBeenCalled();
    expect(el.hasAttribute("open")).toBe(false);
    expect(() => new Drawer(el)).not.toThrow();
  });

  it("getOrCreate reuses the instance and initAll only picks drawers", () => {
    const el = document.getElementById("d");
    const a = Drawer.getOrCreate(el);
    expect(Drawer.getOrCreate(el)).toBe(a);
    a.destroy();
    expect(Drawer.initAll(document)).toHaveLength(1);
    expect(Drawer.initAll(document)).toHaveLength(0);
  });
});

describe("Drawer regressions", () => {
  beforeEach(() => {
    installDialogStub();
    installMatchMedia(false);
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    globalThis.matchMedia = realMatchMedia;
    vi.restoreAllMocks();
  });

  it("ignores a backdrop click whose press started inside the panel", () => {
    const { drawer, el } = setup();
    drawer.open();
    const panel = /** @type {HTMLElement} */ (el.querySelector(".iv-drawer__panel"));
    panel.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 5, clientY: 5 }));
    expect(drawer.isOpen).toBe(true);

    el.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 5, clientY: 5 }));
    expect(drawer.isOpen).toBe(false);
  });
});
