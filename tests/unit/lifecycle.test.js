// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { init, destroy, Dialog } from "../../packages/ivolt/src/js/index.js";

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

installDialogStub();

const MARKUP = `
  <a id="link" href="#d1" data-iv-open="d1">Open</a>
  <button id="btn" data-iv-toggle="d1">Toggle</button>
  <dialog id="d1" class="iv-dialog" data-iv-component="dialog">
    <form method="dialog" class="iv-dialog__panel">
      <button id="x" data-iv-close aria-label="Close">x</button>
      <input id="field">
    </form>
  </dialog>
`;

describe("initComponents / destroyComponents", () => {
  beforeEach(() => {
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    destroy(document);
    document.body.innerHTML = "";
  });

  it("creates one instance per component element", () => {
    const created = init(document);
    expect(created).toHaveLength(1);
    expect(created[0]).toBeInstanceOf(Dialog);
    expect(Dialog.get(document.getElementById("d1"))).toBe(created[0]);
  });

  it("is idempotent: no extra instances and no duplicated listeners", () => {
    init(document);
    const second = init(document);
    expect(second).toHaveLength(0);

    const opened = vi.fn();
    document.addEventListener("iv:open", opened);
    document.getElementById("btn").click();
    expect(opened).toHaveBeenCalledTimes(1);
    document.removeEventListener("iv:open", opened);
  });

  it("prevents the default of an <a data-iv-open>", () => {
    init(document);
    const link = document.getElementById("link");
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(Dialog.get(document.getElementById("d1")).isOpen).toBe(true);
  });

  it("opens through data-iv-open and passes the trigger", () => {
    init(document);
    const link = document.getElementById("link");
    /** @type {CustomEvent|null} */
    let detail = null;
    document.addEventListener("iv:opened", (e) => {
      detail = e.detail;
    });
    link.click();
    expect(detail.trigger).toBe(link);
  });

  it("closes the closest ancestor component with data-iv-close", () => {
    init(document);
    const dialog = Dialog.get(document.getElementById("d1"));
    dialog.open();
    expect(dialog.isOpen).toBe(true);
    document.getElementById("x").click();
    expect(dialog.isOpen).toBe(false);
  });

  it("warns instead of throwing when the target is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.insertAdjacentHTML(
      "beforeend",
      '<button id="ghost" data-iv-open="nope">Ghost</button>'
    );
    init(document);
    expect(() => document.getElementById("ghost").click()).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("destroy cleans up and allows a fresh init", () => {
    const first = init(document);
    destroy(document);
    expect(Dialog.get(document.getElementById("d1"))).toBeUndefined();

    const opened = vi.fn();
    document.addEventListener("iv:open", opened);
    document.getElementById("btn").click();
    expect(opened).toHaveBeenCalledTimes(0);

    const second = init(document);
    expect(second).toHaveLength(1);
    expect(second[0]).not.toBe(first[0]);
    document.getElementById("btn").click();
    expect(opened).toHaveBeenCalledTimes(1);
    document.removeEventListener("iv:open", opened);
  });

  it("scopes init to a subtree and to root itself", () => {
    document.body.innerHTML = "";
    const host = document.createElement("div");
    host.innerHTML = '<dialog id="d2" data-iv-component="dialog"></dialog>';
    document.body.append(host);
    const created = init(host);
    expect(created).toHaveLength(1);
    destroy(host);
    expect(Dialog.get(document.getElementById("d2"))).toBeUndefined();
  });
});

describe("declarative triggers with empty values", () => {
  it("ignores empty trigger values instead of warning about a missing target", async () => {
        const { initComponents, destroyComponents } = await import("../../packages/ivolt/src/js/core/lifecycle.js");
    document.body.innerHTML = '<ul><li data-iv-open=""><a href="#x">Item</a></li></ul>';
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    initComponents(document, []);
    document.querySelector("a").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    destroyComponents(document);
  });
});
