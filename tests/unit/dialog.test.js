// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Dialog } from "../../packages/ivolt/src/js/components/dialog.js";
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

const MARKUP = `
  <button id="trigger">Open</button>
  <dialog id="d" class="iv-dialog" data-iv-component="dialog">
    <form method="dialog" class="iv-dialog__panel">
      <input id="first">
      <input id="second">
      <button id="cancel" value="cancel">Cancel</button>
      <button id="close-btn" data-iv-close>x</button>
    </form>
  </dialog>
`;

/** @returns {{ dialog: Dialog, el: HTMLDialogElement, trigger: HTMLElement }} */
function setup(options) {
  const el = /** @type {HTMLDialogElement} */ (document.getElementById("d"));
  const trigger = /** @type {HTMLElement} */ (document.getElementById("trigger"));
  return { dialog: new Dialog(el, options), el, trigger };
}

describe("Dialog", () => {
  beforeEach(() => {
    installDialogStub();
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("refuses a non-dialog element with IvError invalid-element", () => {
    const div = document.createElement("div");
    let error = null;
    try {
      new Dialog(div);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(IvError);
    expect(error.code).toBe("invalid-element");
  });

  it("throws instance-exists on a second instance", () => {
    const { el } = setup();
    let error = null;
    try {
      new Dialog(el);
    } catch (e) {
      error = e;
    }
    expect(error.code).toBe("instance-exists");
  });

  it("resolves options from attributes", () => {
    const el = document.getElementById("d");
    el.setAttribute("data-iv-close-on-backdrop", "false");
    el.setAttribute("data-iv-initial-focus", "#second");
    const dialog = new Dialog(el, { returnFocus: false });
    expect(dialog.options).toEqual({
      closeOnBackdrop: false,
      closeOnEscape: true,
      initialFocus: "#second",
      returnFocus: false,
    });
  });

  it("opens, emits iv:open then iv:opened and focuses the first control", () => {
    const { dialog, el, trigger } = setup();
    const seen = [];
    el.addEventListener("iv:open", (e) => seen.push(["open", e.detail.reason]));
    el.addEventListener("iv:opened", (e) => seen.push(["opened", e.detail.trigger]));
    dialog.open({ trigger });
    expect(dialog.isOpen).toBe(true);
    expect(seen).toEqual([
      ["open", "api"],
      ["opened", trigger],
    ]);
    expect(document.activeElement).toBe(document.getElementById("first"));
  });

  it("honours initialFocus", () => {
    const el = document.getElementById("d");
    el.setAttribute("data-iv-initial-focus", "#second");
    const dialog = new Dialog(el);
    dialog.open();
    expect(document.activeElement).toBe(document.getElementById("second"));
  });

  it("does not open when iv:open is cancelled", () => {
    const { dialog, el } = setup();
    el.addEventListener("iv:open", (e) => e.preventDefault());
    dialog.open();
    expect(dialog.isOpen).toBe(false);
  });

  it("open is a no-op when already open", () => {
    const { dialog, el } = setup();
    dialog.open();
    const spy = vi.fn();
    el.addEventListener("iv:open", spy);
    dialog.open();
    expect(spy).not.toHaveBeenCalled();
  });

  it("closes with a reason and returns focus to the trigger", () => {
    const { dialog, trigger } = setup();
    dialog.open({ trigger });
    const reasons = [];
    dialog.element.addEventListener("iv:close", (e) => reasons.push(e.detail.reason));
    dialog.element.addEventListener("iv:closed", (e) => reasons.push(e.detail.reason));
    dialog.close("api");
    expect(dialog.isOpen).toBe(false);
    expect(reasons).toEqual(["api", "api"]);
    expect(document.activeElement).toBe(trigger);
  });

  it("does not return focus when returnFocus is false", () => {
    const { dialog, trigger } = setup({ returnFocus: false });
    dialog.open({ trigger });
    dialog.close();
    expect(document.activeElement).not.toBe(trigger);
  });

  it("does not close when iv:close is cancelled", () => {
    const { dialog, el } = setup();
    dialog.open();
    el.addEventListener("iv:close", (e) => e.preventDefault());
    dialog.close("backdrop");
    expect(dialog.isOpen).toBe(true);
  });

  it("Esc: intercepts cancel and closes with reason escape", () => {
    const { dialog, el } = setup();
    dialog.open();
    const event = new Event("cancel", { cancelable: true });
    el.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(dialog.isOpen).toBe(false);
  });

  it("Esc does nothing when closeOnEscape is false", () => {
    const { dialog, el } = setup({ closeOnEscape: false });
    dialog.open();
    const event = new Event("cancel", { cancelable: true });
    el.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(dialog.isOpen).toBe(true);
  });

  it("closes on a backdrop click outside the panel", () => {
    const { dialog, el } = setup();
    dialog.open();
    const reasons = [];
    el.addEventListener("iv:close", (e) => reasons.push(e.detail.reason));
    el.dispatchEvent(
      new MouseEvent("click", { bubbles: true, clientX: 5, clientY: 5 })
    );
    expect(reasons).toEqual(["backdrop"]);
    expect(dialog.isOpen).toBe(false);
  });

  it("ignores clicks inside the panel", () => {
    const { dialog, el } = setup();
    dialog.open();
    const panel = el.querySelector(".iv-dialog__panel");
    panel.dispatchEvent(
      new MouseEvent("click", { bubbles: true, clientX: 5, clientY: 5 })
    );
    expect(dialog.isOpen).toBe(true);
  });

  it("ignores the backdrop when closeOnBackdrop is false", () => {
    const { dialog, el } = setup({ closeOnBackdrop: false });
    dialog.open();
    el.dispatchEvent(
      new MouseEvent("click", { bubbles: true, clientX: 5, clientY: 5 })
    );
    expect(dialog.isOpen).toBe(true);
  });

  it("intercepts form[method=dialog] submit with reason form and returnValue", () => {
    const { dialog, el } = setup();
    dialog.open();
    /** @type {Record<string, unknown>|null} */
    let detail = null;
    el.addEventListener("iv:closed", (e) => {
      detail = e.detail;
    });
    const form = el.querySelector("form");
    const event = new Event("submit", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "submitter", {
      value: document.getElementById("cancel"),
    });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(dialog.isOpen).toBe(false);
    expect(detail.reason).toBe("form");
    expect(detail.returnValue).toBe("cancel");
    expect(dialog.returnValue).toBe("cancel");
  });

  it("reports an external native close as reason external", () => {
    const { dialog, el } = setup();
    dialog.open();
    const reasons = [];
    el.addEventListener("iv:close", (e) => reasons.push(["close", e.detail.reason]));
    el.addEventListener("iv:closed", (e) => reasons.push(["closed", e.detail.reason]));
    el.close();
    expect(reasons).toEqual([["closed", "external"]]);
  });

  it("toggle flips the state", () => {
    const { dialog } = setup();
    dialog.toggle();
    expect(dialog.isOpen).toBe(true);
    dialog.toggle();
    expect(dialog.isOpen).toBe(false);
  });

  it("falls back to focusing the dialog and restores the tabindex", () => {
    document.body.innerHTML =
      '<dialog id="empty" data-iv-component="dialog"><p>Text</p></dialog>';
    const el = document.getElementById("empty");
    const dialog = new Dialog(el);
    dialog.open();
    expect(el.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(el);
    dialog.close();
    expect(el.hasAttribute("tabindex")).toBe(false);
  });

  it("destroy closes without emitting iVOLT close events and frees the element", () => {
    const { dialog, el } = setup();
    dialog.open();
    const spy = vi.fn();
    el.addEventListener("iv:close", spy);
    el.addEventListener("iv:closed", spy);
    dialog.destroy();
    expect(spy).not.toHaveBeenCalled();
    expect(el.hasAttribute("open")).toBe(false);
    expect(Dialog.get(el)).toBeUndefined();
    expect(() => new Dialog(el)).not.toThrow();
  });

  it("getOrCreate reuses the instance", () => {
    const el = document.getElementById("d");
    const a = Dialog.getOrCreate(el);
    const b = Dialog.getOrCreate(el);
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(Dialog);
  });

  it("initAll only picks data-iv-component=dialog", () => {
    const created = Dialog.initAll(document);
    expect(created).toHaveLength(1);
    expect(Dialog.initAll(document)).toHaveLength(0);
  });
});

describe("Dialog regressions", () => {
  beforeEach(() => {
    installDialogStub();
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("ignores a backdrop click whose press started inside the panel", () => {
    const { dialog, el } = setup();
    dialog.open();
    const panel = /** @type {HTMLElement} */ (el.querySelector(".iv-dialog__panel"));
    // Selecting text and releasing outside produces a click whose target is the
    // <dialog>; only the press tells the two apart.
    panel.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 5, clientY: 5 }));
    expect(dialog.isOpen).toBe(true);

    el.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 5, clientY: 5 }));
    expect(dialog.isOpen).toBe(false);
  });
});
