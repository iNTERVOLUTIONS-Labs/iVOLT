// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ScrollMotion } from "../../packages/ivolt/src/js/components/scroll-motion.js";

const MARKUP = `
  <section id="sm" data-iv-component="scroll-motion">
    <div class="iv-scroll-progress"></div>
    <img id="p0" class="iv-parallax" style="--iv-parallax: 0.2" alt="Made-up layer 0">
    <img id="p1" class="iv-parallax" style="--iv-parallax: 0.3" alt="Made-up layer 1">
  </section>
`;

/** Support answers the component asks `CSS.supports` for, keyed by the query it passes. */
let supported = true;
/** Whether the document claims `prefers-reduced-motion: reduce`. */
let reduced = false;
/** Rectangles handed back by `getBoundingClientRect`, keyed by element id. */
let rects = {};

/**
 * Installs the two media/support answers the component reads in `_setup`, a
 * synchronous animation frame and a fake layout. jsdom measures nothing, so
 * every rectangle the component reads comes from `rects`.
 *
 * @returns {void}
 */
function stubView() {
  window.CSS = /** @type {typeof CSS} */ ({
    supports: vi.fn((query) => {
      expect(query).toBe("animation-timeline: view()");
      return supported;
    }),
  });
  window.matchMedia = vi.fn((query) => ({
    matches: query === "(prefers-reduced-motion: reduce)" ? reduced : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 1;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  Element.prototype.getBoundingClientRect = function () {
    const r = rects[this.id] ?? { top: 0, height: 0 };
    return /** @type {DOMRect} */ ({
      top: r.top,
      height: r.height,
      bottom: r.top + r.height,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: r.top,
      toJSON() {},
    });
  };
}

/**
 * Pretends the document is 2400 px tall in an 800 px window, scrolled to `top`.
 *
 * @param {number} top Scroll position in pixels.
 * @returns {void}
 */
function scrollTo(top) {
  const el = document.documentElement;
  Object.defineProperty(el, "scrollHeight", { value: 2400, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: 800, configurable: true });
  el.scrollTop = top;
}

const root = () => /** @type {HTMLElement} */ (document.getElementById("sm"));
const layer = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

describe("ScrollMotion", () => {
  beforeEach(() => {
    document.body.innerHTML = MARKUP;
    supported = true;
    reduced = false;
    rects = { p0: { top: 400, height: 300 }, p1: { top: 900, height: 300 } };
    stubView();
    scrollTo(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("is a no-op where the engine has scroll-driven animations", () => {
    const add = vi.spyOn(window, "addEventListener");
    const inst = new ScrollMotion(root());
    expect(inst.native).toBe(true);
    expect(add).not.toHaveBeenCalled();
    expect(root().getAttribute("style")).toBe(null);
    expect(layer("p0").style.getPropertyValue("--iv-view")).toBe("");
    inst.destroy();
  });

  it("writes both properties where it does not", () => {
    supported = false;
    scrollTo(400);
    const inst = new ScrollMotion(root());
    expect(inst.native).toBe(false);
    // 400 of 1600 scrollable pixels.
    expect(root().style.getPropertyValue("--iv-scroll")).toBe("0.25");
    // (800 - 400) / (800 + 300): the layer is a little past the middle of the window.
    expect(Number(layer("p0").style.getPropertyValue("--iv-view"))).toBeCloseTo(0.3636, 3);
    expect(Number(layer("p1").style.getPropertyValue("--iv-view"))).toBeCloseTo(0, 3);
    inst.destroy();
  });

  it("force writes the properties even with native support", () => {
    const inst = new ScrollMotion(root(), { force: true });
    expect(inst.native).toBe(true);
    expect(layer("p0").style.getPropertyValue("--iv-view")).not.toBe("");
    expect(root().style.getPropertyValue("--iv-scroll")).toBe("0");
    // A scroll updates what the first measurement wrote.
    rects.p0 = { top: -200, height: 300 };
    scrollTo(1600);
    window.dispatchEvent(new Event("scroll"));
    expect(root().style.getPropertyValue("--iv-scroll")).toBe("1");
    expect(Number(layer("p0").style.getPropertyValue("--iv-view"))).toBeCloseTo(0.9091, 3);
    inst.destroy();
  });

  it("clamps both properties to 0 and 1", () => {
    supported = false;
    rects.p0 = { top: 4000, height: 300 };
    rects.p1 = { top: -4000, height: 300 };
    const inst = new ScrollMotion(root());
    expect(layer("p0").style.getPropertyValue("--iv-view")).toBe("0");
    expect(layer("p1").style.getPropertyValue("--iv-view")).toBe("1");
    inst.destroy();
  });

  it("update recomputes outside a frame", () => {
    supported = false;
    const inst = new ScrollMotion(root());
    const before = layer("p0").style.getPropertyValue("--iv-view");
    rects.p0 = { top: 0, height: 300 };
    inst.update();
    expect(layer("p0").style.getPropertyValue("--iv-view")).not.toBe(before);
    inst.destroy();
  });

  it("writes only the reading position under reduced motion: the parallax layers stay authored", () => {
    supported = false;
    reduced = true;
    const inst = new ScrollMotion(root());
    expect(inst.native).toBe(false);
    expect(layer("p0").getAttribute("style")).not.toContain("--iv-view");
    expect(root().style.getPropertyValue("--iv-scroll")).not.toBe("");
    inst.update();
    expect(layer("p0").getAttribute("style")).not.toContain("--iv-view");
    inst.destroy();
    expect(root().getAttribute("style")).toBe(null);
  });

  it("destroy removes the properties, the style attribute and the listeners", () => {
    supported = false;
    const remove = vi.spyOn(window, "removeEventListener");
    const inst = new ScrollMotion(root());
    expect(root().getAttribute("style")).not.toBe(null);
    inst.destroy();
    expect(root().getAttribute("style")).toBe(null);
    // The inline `--iv-parallax` the author served survives; only `--iv-view` goes.
    expect(layer("p0").getAttribute("style")).toContain("--iv-parallax");
    expect(layer("p0").getAttribute("style")).not.toContain("--iv-view");
    expect(layer("p0").style.getPropertyValue("--iv-view")).toBe("");
    expect(remove.mock.calls.map((c) => c[0]).sort()).toEqual(["resize", "scroll"]);
    // A destroyed instance writes nothing more.
    window.dispatchEvent(new Event("scroll"));
    expect(root().getAttribute("style")).toBe(null);
  });

  it("initAll is idempotent and finds the declared container", () => {
    const first = ScrollMotion.initAll(document);
    expect(first).toHaveLength(1);
    expect(ScrollMotion.initAll(document)).toHaveLength(0);
    expect(ScrollMotion.get(root())).toBe(first[0]);
    first[0].destroy();
    expect(ScrollMotion.get(root())).toBe(undefined);
  });
});
