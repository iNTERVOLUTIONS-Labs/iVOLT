// @vitest-environment jsdom
/**
 * Adversarial probes beyond the served state: option precedence and coercion on
 * every component, declarative triggers, and `destroy` after the component has
 * actually been used.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { init, destroy, components, Dialog } from "../../packages/ivolt/src/js/index.js";
import { resolveOptions, resetWarnings } from "../../packages/ivolt/src/js/core/options.js";
import { getFocusable } from "../../packages/ivolt/src/js/core/focus.js";

/**
 * Installs the browser APIs jsdom lacks.
 *
 * @returns {void}
 */
function installBrowserStubs() {
  const proto =
    globalThis.HTMLDialogElement && globalThis.HTMLDialogElement.prototype;
  if (proto) {
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
  if (typeof globalThis.matchMedia !== "function") {
    globalThis.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    });
    globalThis.window.matchMedia = globalThis.matchMedia;
  }
}

describe("option precedence and coercion", () => {
  beforeEach(() => {
    installBrowserStubs();
    resetWarnings();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("applies defaults < data-iv-* < JavaScript for every component", () => {
    for (const Component of components) {
      const defaults = Component.defaults;
      for (const [key, fallback] of Object.entries(defaults)) {
        const el = document.createElement("div");
        el.setAttribute("data-iv-component", Component.componentName);
        const kebab = key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
        /** @type {string|number|boolean} */
        let attrValue;
        /** @type {string|number|boolean} */
        let jsValue;
        if (typeof fallback === "boolean") {
          attrValue = !fallback;
          jsValue = fallback;
        } else if (typeof fallback === "number") {
          attrValue = fallback + 7;
          jsValue = fallback + 13;
        } else {
          attrValue = "iv-from-attribute";
          jsValue = "iv-from-js";
        }
        el.setAttribute(`data-iv-${kebab}`, String(attrValue));

        const fromAttribute = resolveOptions(el, defaults);
        expect(
          fromAttribute[key],
          `${Component.componentName}.${key} should come from data-iv-${kebab}`
        ).toBe(attrValue);

        const fromJs = resolveOptions(el, defaults, { [key]: jsValue });
        expect(
          fromJs[key],
          `${Component.componentName}.${key} should come from the JavaScript option`
        ).toBe(jsValue);

        const fromDefault = resolveOptions(el, defaults, { [key]: undefined });
        expect(
          fromDefault[key],
          `${Component.componentName}.${key}: an undefined JavaScript value must not override the attribute`
        ).toBe(attrValue);
      }
    }
  });

  it("reads a valueless boolean attribute as true, like every other HTML boolean", () => {
    const el = document.createElement("div");
    el.setAttribute("data-iv-component", "probe");
    el.setAttribute("data-iv-flag", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const options = resolveOptions(el, { flag: false });
    expect(options.flag).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns once and keeps the default on an invalid value, never throws", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const el = document.createElement("div");
    el.setAttribute("data-iv-component", "probe");
    el.setAttribute("data-iv-count", "many");
    let options;
    expect(() => {
      options = resolveOptions(el, { count: 3 });
    }).not.toThrow();
    expect(options.count).toBe(3);
    resolveOptions(el, { count: 3 });
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("declarative triggers", () => {
  beforeEach(() => {
    installBrowserStubs();
  });

  afterEach(() => {
    destroy(document);
    document.body.innerHTML = "";
  });

  it("leaves a link whose trigger attribute is empty state, not a trigger", () => {
    // The megamenu marks its open item with `data-iv-open=""`; that marker must
    // not cost the link its navigation.
    document.body.innerHTML = `<a id="link" href="#somewhere" data-iv-open="">Products</a>`;
    init(document.body);
    const link = /** @type {HTMLElement} */ (document.getElementById("link"));
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("cancels a real trigger link so the hash does not change", () => {
    document.body.innerHTML = `
      <a id="link" href="#d" data-iv-open="d">Open</a>
      <dialog id="d" class="iv-dialog" data-iv-component="dialog">
        <div class="iv-dialog__panel"><button>Close</button></div>
      </dialog>`;
    init(document.body);
    const link = /** @type {HTMLElement} */ (document.getElementById("link"));
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("destroy after use", () => {
  beforeEach(() => {
    installBrowserStubs();
  });

  afterEach(() => {
    destroy(document);
    document.body.innerHTML = "";
  });

  it("a dialog with nothing focusable leaves no generated tabindex behind", () => {
    document.body.innerHTML = `
      <dialog id="d" class="iv-dialog" data-iv-component="dialog">
        <div class="iv-dialog__panel">No focusable content here.</div>
      </dialog>`;
    const served = document.body.innerHTML;
    init(document.body);
    const el = /** @type {HTMLDialogElement} */ (
      document.getElementById("d")
    );
    const instance = /** @type {any} */ (Dialog.get(el));
    instance.open();
    expect(el.getAttribute("tabindex")).toBe("-1");
    destroy(document.body);
    expect(document.body.innerHTML).toBe(served);
  });

  it("a dialog destroyed while open leaves no generated tabindex behind", () => {
    document.body.innerHTML = `
      <dialog id="d" class="iv-dialog" data-iv-component="dialog">
        <div class="iv-dialog__panel">No focusable content here.</div>
      </dialog>`;
    const served = document.body.innerHTML;
    init(document.body);
    const el = /** @type {HTMLDialogElement} */ (
      document.getElementById("d")
    );
    /** @type {any} */ (Dialog.get(el)).open();
    destroy(document.body);
    expect(document.body.innerHTML).toBe(served);
  });
});

describe("initial focus inside a dialog", () => {
  beforeEach(() => {
    installBrowserStubs();
  });

  afterEach(() => {
    destroy(document);
    document.body.innerHTML = "";
  });

  it("skips a hidden input and focuses the first real control", () => {
    document.body.innerHTML = `
      <dialog id="d" class="iv-dialog" data-iv-component="dialog">
        <form method="dialog" class="iv-dialog__panel">
          <input type="hidden" name="csrf" value="x">
          <input id="name" name="name">
          <button value="ok">Send</button>
        </form>
      </dialog>`;
    init(document.body);
    const el = /** @type {HTMLDialogElement} */ (document.getElementById("d"));
    /** @type {any} */ (Dialog.get(el)).open();
    expect(document.activeElement && document.activeElement.id).toBe("name");
  });

  it("skips a control inside a hidden subtree", () => {
    document.body.innerHTML = `
      <dialog id="d" class="iv-dialog" data-iv-component="dialog">
        <div class="iv-dialog__panel">
          <div hidden><button id="ghost">Not rendered</button></div>
          <button id="real">Rendered</button>
        </div>
      </dialog>`;
    init(document.body);
    const el = /** @type {HTMLDialogElement} */ (document.getElementById("d"));
    /** @type {any} */ (Dialog.get(el)).open();
    expect(document.activeElement && document.activeElement.id).toBe("real");
  });

  it("skips a control inside a disabled fieldset", () => {
    document.body.innerHTML = `
      <dialog id="d" class="iv-dialog" data-iv-component="dialog">
        <form method="dialog" class="iv-dialog__panel">
          <fieldset disabled><input id="frozen"></fieldset>
          <button id="ok" value="ok">Send</button>
        </form>
      </dialog>`;
    init(document.body);
    const el = /** @type {HTMLDialogElement} */ (document.getElementById("d"));
    /** @type {any} */ (Dialog.get(el)).open();
    expect(document.activeElement && document.activeElement.id).toBe("ok");
  });
});

describe("destroy restores only what the component wrote", () => {
  beforeEach(() => {
    installBrowserStubs();
  });

  afterEach(() => {
    destroy(document);
    document.body.innerHTML = "";
  });

  it("a drawer keeps the data-iv-static the author served", () => {
    // `matchMedia` reports no match here, so the component would otherwise drop
    // the attribute on setup and never put it back.
    document.body.innerHTML = `
      <dialog id="dr" class="iv-drawer" data-iv-component="drawer" data-iv-static="">
        <div class="iv-drawer__panel"><button>Close</button></div>
      </dialog>`;
    const served = document.body.innerHTML;
    init(document.body);
    destroy(document.body);
    expect(document.body.innerHTML).toBe(served);
  });

  it("a drawer that was not served data-iv-static does not gain it", () => {
    document.body.innerHTML = `
      <dialog id="dr" class="iv-drawer" data-iv-component="drawer">
        <div class="iv-drawer__panel"><button>Close</button></div>
      </dialog>`;
    const served = document.body.innerHTML;
    init(document.body);
    destroy(document.body);
    expect(document.body.innerHTML).toBe(served);
  });

  it("a dialog opened from its own iv:init listener leaves no orphan tabindex", () => {
    document.body.innerHTML = `
      <dialog id="d" class="iv-dialog" data-iv-component="dialog">
        <div class="iv-dialog__panel">No focusable content here.</div>
      </dialog>`;
    const served = document.body.innerHTML;
    const el = /** @type {HTMLDialogElement} */ (document.getElementById("d"));
    el.addEventListener("iv:init", (event) => {
      /** @type {any} */ (event).detail.instance.open();
    });
    init(document.body);
    expect(el.getAttribute("tabindex")).toBe("-1");
    destroy(document.body);
    expect(document.body.innerHTML).toBe(served);
  });
});

describe("the focusable set", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("includes every natively focusable tag of the contract", () => {
    document.body.innerHTML = `
      <div id="box">
        <details><summary id="sum">More</summary><p>Body</p></details>
        <iframe id="frame" title="Preview"></iframe>
        <div id="editor" contenteditable="true">Type here</div>
        <div id="frozen" contenteditable="false">Read only</div>
        <video id="clip" controls></video>
        <audio id="track" controls></audio>
        <button id="btn">Go</button>
      </div>`;
    const box = /** @type {Element} */ (document.getElementById("box"));
    const ids = getFocusable(box).map((el) => el.id);
    expect(ids).toEqual(["sum", "frame", "editor", "clip", "track", "btn"]);
  });

  it("still honours an explicit tabindex of -1", () => {
    document.body.innerHTML = `
      <div id="box">
        <details><summary id="sum" tabindex="-1">More</summary><p>Body</p></details>
        <button id="btn">Go</button>
      </div>`;
    const box = /** @type {Element} */ (document.getElementById("box"));
    expect(getFocusable(box).map((el) => el.id)).toEqual(["btn"]);
  });
});
