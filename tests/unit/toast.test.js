// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Toast } from "../../packages/ivolt/src/js/components/toast.js";

const MARKUP =
  '<div id="region" class="iv-toast-region" data-iv-component="toast" aria-label="Notifications"></div>';

/**
 * @param {Record<string, unknown>} [options] Options passed in JavaScript.
 * @returns {{ region: Toast, el: HTMLElement }} Fixture handles.
 */
function setup(options) {
  const el = /** @type {HTMLElement} */ (document.getElementById("region"));
  return { region: new Toast(el, options), el };
}

/** @returns {string[]} Text of every visible toast. */
function visibleTexts() {
  return [...document.querySelectorAll(".iv-toast__message")].map((n) => n.textContent);
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("adds the placement class and removes it on destroy", () => {
    const { region, el } = setup({ placement: "top-start" });
    expect(el.classList.contains("iv-toast-region--top-start")).toBe(true);
    region.destroy();
    expect(el.classList.contains("iv-toast-region--top-start")).toBe(false);
  });

  it("warns once about an invalid placement and falls back to bottom-end", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { region, el } = setup({ placement: "middle" });
    expect(el.classList.contains("iv-toast-region--bottom-end")).toBe(true);
    region.destroy();
    new Toast(el, { placement: "middle" }).destroy();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("builds the item with textContent, never as HTML", () => {
    const { region, el } = setup();
    const item = region.show({ message: "<b>Saved</b>", title: "Done" });
    const node = item.element;
    expect(node.parentElement).toBe(el);
    expect(node.querySelector("b")).toBeNull();
    expect(node.querySelector(".iv-toast__message").textContent).toBe("<b>Saved</b>");
    expect(node.querySelector(".iv-toast__title").textContent).toBe("Done");
    expect(node.className).toBe("iv-toast iv-toast--info");
    expect(node.getAttribute("role")).toBe("status");
    expect(node.getAttribute("tabindex")).toBe("0");
    expect(node.querySelector(".iv-toast__dismiss").getAttribute("aria-label")).toBe("Dismiss");
    expect(item.isOpen).toBe(true);
  });

  it("omits the title and the dismiss button when not requested", () => {
    const { region } = setup();
    const item = region.show({ message: "Plain", dismissible: false });
    expect(item.element.querySelector(".iv-toast__title")).toBeNull();
    expect(item.element.querySelector(".iv-toast__dismiss")).toBeNull();
  });

  it("emits iv:open then iv:opened on the item, bubbling to document", () => {
    const { region } = setup();
    const seen = [];
    document.addEventListener("iv:open", (e) => seen.push(["open", e.detail.reason]));
    document.addEventListener("iv:opened", (e) => seen.push(["opened", e.detail.reason]));
    const item = region.show({ message: "Hi" });
    expect(seen).toEqual([
      ["open", "api"],
      ["opened", "api"],
    ]);
    expect(item.isOpen).toBe(true);
  });

  it("does not insert the item when iv:open is cancelled", () => {
    const { region, el } = setup();
    document.addEventListener("iv:open", (e) => e.preventDefault(), { once: true });
    const item = region.show({ message: "Nope" });
    expect(item.isOpen).toBe(false);
    expect(el.children).toHaveLength(0);
  });

  it("auto-dismisses after the timeout with reason timeout", () => {
    const { region } = setup();
    const reasons = [];
    document.addEventListener("iv:closed", (e) => reasons.push(e.detail.reason));
    const item = region.show({ message: "Saved", timeout: 1000 });
    vi.advanceTimersByTime(999);
    expect(item.isOpen).toBe(true);
    vi.advanceTimersByTime(1);
    expect(reasons).toEqual(["timeout"]);
    expect(item.isOpen).toBe(false);
    expect(item.element.isConnected).toBe(false);
  });

  it("timeout 0 never auto-dismisses", () => {
    const { region } = setup();
    const item = region.show({ message: "Sticky", timeout: 0 });
    vi.advanceTimersByTime(60000);
    expect(item.isOpen).toBe(true);
  });

  it("danger uses role alert and forces timeout 0", () => {
    const { region } = setup();
    const item = region.show({ message: "Failed", variant: "danger", timeout: 500 });
    expect(item.element.getAttribute("role")).toBe("alert");
    expect(item.element.className).toBe("iv-toast iv-toast--danger");
    vi.advanceTimersByTime(60000);
    expect(item.isOpen).toBe(true);
  });

  it("warns once about an invalid variant and uses info", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { region } = setup();
    const a = region.show({ message: "One", variant: "critical" });
    const b = region.show({ message: "Two", variant: "critical" });
    expect(a.element.className).toBe("iv-toast iv-toast--info");
    expect(b.element.className).toBe("iv-toast iv-toast--info");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("queues beyond max and shows the next one when a slot frees up", () => {
    const { region } = setup({ max: 2 });
    const items = [1, 2, 3].map((n) => region.show({ message: `Toast ${n}`, timeout: n * 1000 }));
    expect(visibleTexts()).toEqual(["Toast 1", "Toast 2"]);
    expect(items[2].isOpen).toBe(false);
    // Toast 1 expires first and the queued Toast 3 takes its slot.
    vi.advanceTimersByTime(1000);
    expect(visibleTexts()).toEqual(["Toast 2", "Toast 3"]);
    expect(items[2].isOpen).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(visibleTexts()).toEqual([]);
  });

  it("pauses the timer on focusin and resumes it with the time left on focusout", () => {
    const { region } = setup();
    const item = region.show({ message: "Saved", timeout: 1000 });
    vi.advanceTimersByTime(400);
    item.element.dispatchEvent(new Event("focusin", { bubbles: true }));
    vi.advanceTimersByTime(5000);
    expect(item.isOpen).toBe(true);
    item.element.dispatchEvent(new Event("focusout", { bubbles: true }));
    vi.advanceTimersByTime(599);
    expect(item.isOpen).toBe(true);
    vi.advanceTimersByTime(1);
    expect(item.isOpen).toBe(false);
  });

  it("pauses the timer on mouseenter and resumes it on mouseleave", () => {
    const { region } = setup();
    const item = region.show({ message: "Saved", timeout: 1000 });
    item.element.dispatchEvent(new MouseEvent("mouseenter"));
    vi.advanceTimersByTime(5000);
    expect(item.isOpen).toBe(true);
    item.element.dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(1000);
    expect(item.isOpen).toBe(false);
  });

  it("Esc inside a toast dismisses it with reason escape", () => {
    const { region } = setup();
    const reasons = [];
    document.addEventListener("iv:closed", (e) => reasons.push(e.detail.reason));
    const item = region.show({ message: "Saved", timeout: 0 });
    const button = item.element.querySelector(".iv-toast__dismiss");
    button.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(reasons).toEqual(["escape"]);
    expect(item.isOpen).toBe(false);
  });

  it("the dismiss button closes with reason trigger", () => {
    const { region } = setup();
    const reasons = [];
    document.addEventListener("iv:closed", (e) => reasons.push(e.detail.reason));
    const item = region.show({ message: "Saved", timeout: 0 });
    item.element.querySelector(".iv-toast__dismiss").dispatchEvent(
      new MouseEvent("click", { bubbles: true })
    );
    expect(reasons).toEqual(["trigger"]);
    expect(document.querySelectorAll(".iv-toast")).toHaveLength(0);
  });

  it("ToastItem.dismiss defaults to reason api and is idempotent", () => {
    const { region } = setup();
    const reasons = [];
    document.addEventListener("iv:closed", (e) => reasons.push(e.detail.reason));
    const item = region.show({ message: "Saved", timeout: 0 });
    item.dismiss();
    item.dismiss();
    expect(reasons).toEqual(["api"]);
  });

  it("does not close when iv:close is cancelled", () => {
    const { region } = setup();
    const item = region.show({ message: "Saved", timeout: 1000 });
    document.addEventListener("iv:close", (e) => e.preventDefault(), { once: true });
    item.dismiss();
    expect(item.isOpen).toBe(true);
    expect(item.element.isConnected).toBe(true);
  });

  it("clear dismisses everything visible with reason api and empties the queue", () => {
    const { region, el } = setup({ max: 1 });
    const reasons = [];
    document.addEventListener("iv:closed", (e) => reasons.push(e.detail.reason));
    region.show({ message: "One", timeout: 0 });
    const queued = region.show({ message: "Two", timeout: 0 });
    region.clear();
    expect(reasons).toEqual(["api"]);
    expect(el.children).toHaveLength(0);
    expect(queued.isOpen).toBe(false);
    vi.advanceTimersByTime(60000);
    expect(el.children).toHaveLength(0);
  });

  it("destroy clears timers, nodes and queue without emitting close events", () => {
    const { region, el } = setup({ max: 1 });
    const spy = vi.fn();
    document.addEventListener("iv:close", spy);
    document.addEventListener("iv:closed", spy);
    const visible = region.show({ message: "One", timeout: 1000 });
    region.show({ message: "Two", timeout: 1000 });
    region.destroy();
    expect(spy).not.toHaveBeenCalled();
    expect(el.children).toHaveLength(0);
    expect(visible.isOpen).toBe(false);
    expect(Toast.get(el)).toBeUndefined();
    vi.advanceTimersByTime(60000);
    expect(el.children).toHaveLength(0);
  });

  it("getOrCreate reuses the instance and initAll only picks toast regions", () => {
    const el = document.getElementById("region");
    const a = Toast.getOrCreate(el);
    expect(Toast.getOrCreate(el)).toBe(a);
    a.destroy();
    expect(Toast.initAll(document)).toHaveLength(1);
    expect(Toast.initAll(document)).toHaveLength(0);
  });
});

describe("Toast regressions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("keeps the timer paused while the pointer is still on the toast", () => {
    const { region } = setup();
    const item = region.show({ message: "hover", timeout: 1000 });
    item.element.dispatchEvent(new MouseEvent("mouseenter"));
    item.element.dispatchEvent(new Event("focusin", { bubbles: true }));
    item.element.dispatchEvent(new Event("focusout", { bubbles: true }));
    // The countdown used to restart here, under a pointer that never left.
    vi.advanceTimersByTime(2000);
    expect(visibleTexts()).toEqual(["hover"]);

    item.element.dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(2000);
    expect(visibleTexts()).toEqual([]);
    region.destroy();
  });

  it("does not resume when focus only moves between the parts of the toast", () => {
    const { region } = setup();
    const item = region.show({ message: "focus", timeout: 1000 });
    const dismiss = /** @type {HTMLElement} */ (item.element.querySelector(".iv-toast__dismiss"));
    item.element.dispatchEvent(new Event("focusin", { bubbles: true }));
    item.element.dispatchEvent(
      new FocusEvent("focusout", { bubbles: true, relatedTarget: dismiss })
    );
    vi.advanceTimersByTime(2000);
    expect(visibleTexts()).toEqual(["focus"]);
    region.destroy();
  });
});
