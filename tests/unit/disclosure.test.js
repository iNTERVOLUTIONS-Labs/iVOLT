// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Disclosure } from "../../packages/ivolt/src/js/components/disclosure.js";
import { IvError } from "../../packages/ivolt/src/js/core/registry.js";

const MARKUP = `
  <details id="d" class="iv-disclosure" data-iv-component="disclosure">
    <summary class="iv-disclosure__summary">Billing</summary>
    <div class="iv-disclosure__content"><p>Invoices are issued monthly.</p></div>
  </details>
`;

const ACCORDION = `
  <div class="iv-accordion">
    <details id="a1" class="iv-disclosure" data-iv-component="disclosure" data-iv-exclusive="true" open>
      <summary class="iv-disclosure__summary">One</summary><div class="iv-disclosure__content">1</div>
    </details>
    <details id="a2" class="iv-disclosure" data-iv-component="disclosure" data-iv-exclusive="true">
      <summary class="iv-disclosure__summary">Two</summary><div class="iv-disclosure__content">2</div>
    </details>
    <details id="a3" class="iv-disclosure" data-iv-component="disclosure" data-iv-exclusive="true">
      <summary class="iv-disclosure__summary">Three</summary><div class="iv-disclosure__content">3</div>
    </details>
  </div>
`;

/**
 * jsdom fires `toggle` asynchronously (or not at all); the component only ever
 * reacts to the event, so the tests drive it explicitly.
 *
 * @param {HTMLDetailsElement} el Details element.
 * @param {boolean} open New state.
 * @returns {void}
 */
function userToggle(el, open) {
  el.open = open;
  el.dispatchEvent(new Event("toggle"));
}

/** @returns {HTMLDetailsElement} */
function detailsById(id) {
  return /** @type {HTMLDetailsElement} */ (document.getElementById(id));
}

describe("Disclosure", () => {
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
      new Disclosure(div);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(IvError);
    expect(error.code).toBe("invalid-element");
  });

  it("resolves options from attributes and JavaScript", () => {
    const el = detailsById("d");
    el.setAttribute("data-iv-exclusive", "true");
    const disclosure = new Disclosure(el, { closeOnOutside: true });
    expect(disclosure.options).toEqual({ exclusive: true, closeOnOutside: true });
  });

  it("emits iv:open then iv:opened when the user opens it", () => {
    const el = detailsById("d");
    const disclosure = new Disclosure(el);
    /** @type {string[]} */
    const seen = [];
    el.addEventListener("iv:open", (e) => {
      seen.push("open");
      expect(e.detail.instance).toBe(disclosure);
      expect(e.detail.reason).toBe("trigger");
    });
    el.addEventListener("iv:opened", () => seen.push("opened"));
    userToggle(el, true);
    expect(seen).toEqual(["open", "opened"]);
    expect(disclosure.isOpen).toBe(true);
  });

  it("reverts a cancelled user opening and does not emit iv:opened", () => {
    const el = detailsById("d");
    new Disclosure(el);
    const opened = vi.fn();
    el.addEventListener("iv:open", (e) => e.preventDefault());
    el.addEventListener("iv:opened", opened);
    userToggle(el, true);
    expect(el.open).toBe(false);
    expect(opened).not.toHaveBeenCalled();
  });

  it("reverts a cancelled user closing", () => {
    const el = detailsById("d");
    el.open = true;
    new Disclosure(el);
    const closed = vi.fn();
    el.addEventListener("iv:close", (e) => e.preventDefault());
    el.addEventListener("iv:closed", closed);
    userToggle(el, false);
    expect(el.open).toBe(true);
    expect(closed).not.toHaveBeenCalled();
  });

  it("open() emits the cancelable event before changing open", () => {
    const el = detailsById("d");
    const disclosure = new Disclosure(el);
    el.addEventListener("iv:open", () => {
      expect(el.open).toBe(false);
    });
    disclosure.open();
    expect(el.open).toBe(true);

    const reopened = vi.fn();
    el.addEventListener("iv:opened", reopened);
    disclosure.open();
    expect(reopened).not.toHaveBeenCalled(); // Already open.
  });

  it("close() can be cancelled and toggle() flips the state", () => {
    const el = detailsById("d");
    const disclosure = new Disclosure(el);
    disclosure.open();
    const cancel = (e) => e.preventDefault();
    el.addEventListener("iv:close", cancel);
    disclosure.close();
    expect(el.open).toBe(true);
    el.removeEventListener("iv:close", cancel);
    disclosure.toggle();
    expect(el.open).toBe(false);
    disclosure.toggle();
    expect(el.open).toBe(true);
  });

  it("exclusive closes the siblings of the closest accordion", () => {
    document.body.innerHTML = ACCORDION;
    const [first, second, third] = ["a1", "a2", "a3"].map(detailsById);
    const instances = [first, second, third].map((el) => new Disclosure(el));
    const closed = vi.fn();
    first.addEventListener("iv:closed", closed);
    userToggle(second, true);
    expect(second.open).toBe(true);
    expect(first.open).toBe(false);
    expect(third.open).toBe(false);
    expect(closed).toHaveBeenCalledTimes(1);
    expect(instances[0].isOpen).toBe(false);
  });

  it("exclusive closes plain sibling details without an instance", () => {
    document.body.innerHTML = ACCORDION;
    const first = detailsById("a1");
    const second = detailsById("a2");
    new Disclosure(second);
    userToggle(second, true);
    expect(first.open).toBe(false);
  });

  it("closeOnOutside closes on a click outside the element", () => {
    const el = detailsById("d");
    const disclosure = new Disclosure(el, { closeOnOutside: true });
    disclosure.open();
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.open).toBe(true);
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.open).toBe(false);
  });

  it("destroy releases listeners and frees the element", () => {
    const el = detailsById("d");
    const disclosure = new Disclosure(el, { closeOnOutside: true });
    disclosure.destroy();
    const spy = vi.fn();
    el.addEventListener("iv:open", spy);
    el.addEventListener("iv:opened", spy);
    userToggle(el, true);
    expect(spy).not.toHaveBeenCalled();
    expect(el.open).toBe(true);
    expect(Disclosure.get(el)).toBeUndefined();
    expect(() => new Disclosure(el)).not.toThrow();
  });

  it("initAll only picks data-iv-component=disclosure", () => {
    expect(Disclosure.initAll(document)).toHaveLength(1);
    expect(Disclosure.initAll(document)).toHaveLength(0);
  });
});
