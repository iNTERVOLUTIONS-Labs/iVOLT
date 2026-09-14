// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Countup } from "../../packages/ivolt/src/js/components/countup.js";

/**
 * Stand-in for the browser observer: it records what is observed and lets a
 * test decide when the figure enters the viewport. Same shape as the one in
 * `reveal.test.js`.
 */
class FakeObserver {
  /** @type {FakeObserver[]} */
  static instances = [];

  /**
   * @param {(entries: object[], observer: FakeObserver) => void} callback Reported entries.
   * @param {{ threshold?: number }} [options] Observer options.
   */
  constructor(callback, options) {
    this.callback = callback;
    this.options = options ?? {};
    /** @type {Set<Element>} */
    this.targets = new Set();
    this.disconnected = false;
    FakeObserver.instances.push(this);
  }

  /**
   * @param {Element} el Element to watch.
   * @returns {void}
   */
  observe(el) {
    this.targets.add(el);
  }

  /**
   * @param {Element} el Element to stop watching.
   * @returns {void}
   */
  unobserve(el) {
    this.targets.delete(el);
  }

  /** @returns {void} */
  disconnect() {
    this.targets.clear();
    this.disconnected = true;
  }

  /**
   * Reports an element as entering or leaving the viewport.
   *
   * @param {Element} el Target.
   * @param {boolean} [isIntersecting] Whether it is in view.
   * @returns {void}
   */
  enter(el, isIntersecting = true) {
    this.callback([{ target: el, isIntersecting }], this);
  }
}

/** Frames queued by the fake `requestAnimationFrame`. */
const frames = new Map();
let frameId = 0;
let now = 0;

/**
 * Runs the queued frame at `time`, as the browser would.
 *
 * @param {number} time Timestamp handed to the callback.
 * @returns {void}
 */
function tick(time) {
  now = time;
  const pending = [...frames.entries()];
  frames.clear();
  for (const [, callback] of pending) callback(time);
}

/**
 * Makes `matchMedia` answer a reduced-motion query one way or the other.
 *
 * @param {boolean} reduce Whether motion must be reduced.
 * @returns {void}
 */
function setReducedMotion(reduce) {
  // @ts-expect-error test double
  window.matchMedia = (query) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
}

const MARKUP = `
  <p id="host">
    <strong id="plain" class="iv-count" data-iv-component="countup">1,240.50</strong>
    <strong id="money" class="iv-count" data-iv-component="countup">€ 1,240.50</strong>
    <strong id="pct" class="iv-count" data-iv-component="countup">98 %</strong>
    <strong id="es" class="iv-count" lang="es" data-iv-component="countup">12.480,50 €</strong>
    <strong id="words" class="iv-count" data-iv-component="countup">no figure here</strong>
  </p>
`;

/**
 * @param {string} id Element id.
 * @returns {HTMLElement} The element.
 */
function el(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}

describe("Countup", () => {
  beforeEach(() => {
    FakeObserver.instances = [];
    frames.clear();
    frameId = 0;
    now = 0;
    // @ts-expect-error test double
    window.IntersectionObserver = FakeObserver;
    // @ts-expect-error test double
    window.requestAnimationFrame = (callback) => {
      frameId += 1;
      frames.set(frameId, callback);
      return frameId;
    };
    // @ts-expect-error test double
    window.cancelAnimationFrame = (id) => frames.delete(id);
    setReducedMotion(false);
    document.documentElement.lang = "en";
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    for (const node of document.querySelectorAll("[data-iv-component=countup]")) {
      const instance = Countup.get(node);
      if (instance) instance.destroy();
    }
    document.body.innerHTML = "";
  });

  it("reads the served figure, its decimals and the separators of the locale", () => {
    const plain = new Countup(el("plain"));
    expect(plain.to).toBe(1240.5);
    expect(plain.value).toBe(1240.5);
    expect(plain.done).toBe(false);
    expect(el("plain").textContent).toBe("1,240.50");

    const money = new Countup(el("money"));
    expect(money.to).toBe(1240.5);
    const spanish = new Countup(el("es"));
    expect(spanish.to).toBe(12480.5);
    const percent = new Countup(el("pct"));
    expect(percent.to).toBe(98);
  });

  it("does nothing when the text carries no number", () => {
    const instance = new Countup(el("words"));
    expect(instance.done).toBe(true);
    expect(FakeObserver.instances).toHaveLength(0);
    instance.start();
    expect(el("words").textContent).toBe("no figure here");
  });

  it("observes with a 0.6 threshold and counts when the figure comes into view", () => {
    const instance = new Countup(el("money"), { duration: 1000 });
    const observer = FakeObserver.instances[0];
    expect(observer.options.threshold).toBe(0.6);
    expect(observer.targets.has(el("money"))).toBe(true);

    /** @type {Array<{ type: string, detail: Record<string, unknown> }>} */
    const log = [];
    for (const name of ["iv:count", "iv:counted"]) {
      el("money").addEventListener(name, (event) => {
        log.push({ type: name, detail: /** @type {CustomEvent} */ (event).detail });
      });
    }

    observer.enter(el("money"));
    expect(log[0]).toMatchObject({ type: "iv:count", detail: { from: 0, to: 1240.5 } });
    expect(el("money").textContent).toBe("€ 0.00");

    tick(0);
    tick(500);
    const mid = el("money").textContent ?? "";
    expect(mid.startsWith("€ ")).toBe(true);
    expect(instance.value).toBeGreaterThan(0);
    expect(instance.value).toBeLessThan(1240.5);
    // Grouping and decimals of the served figure are kept on every frame.
    expect(mid).toMatch(/^€ \d(,\d{3})?\.\d{2}$/);

    tick(1000);
    expect(el("money").textContent).toBe("€ 1,240.50");
    expect(instance.value).toBe(1240.5);
    expect(instance.done).toBe(true);
    expect(log.map((e) => e.type)).toEqual(["iv:count", "iv:counted"]);
    expect(observer.disconnected).toBe(true);
  });

  it("counts a Spanish figure through Spanish separators", () => {
    new Countup(el("es"), { duration: 1000, from: 1000 });
    FakeObserver.instances[0].enter(el("es"));
    expect(el("es").textContent).toBe("1.000,00 €");
    tick(0);
    tick(400);
    expect(el("es").textContent ?? "").toMatch(/^\d{1,2}\.\d{3},\d{2} €$/);
    tick(1000);
    expect(el("es").textContent).toBe("12.480,50 €");
  });

  it("counts at once with autostart and keeps counting with once: false", () => {
    const instance = new Countup(el("pct"), { autostart: true, duration: 200 });
    expect(FakeObserver.instances).toHaveLength(0);
    expect(el("pct").textContent).toBe("0 %");
    tick(0);
    tick(200);
    expect(el("pct").textContent).toBe("98 %");
    expect(instance.done).toBe(true);

    instance.reset();
    expect(instance.done).toBe(false);
    expect(el("pct").textContent).toBe("98 %");

    const repeat = new Countup(el("plain"), { once: false, duration: 100 });
    const observer = FakeObserver.instances[0];
    observer.enter(el("plain"));
    tick(0);
    tick(100);
    expect(repeat.done).toBe(true);
    expect(observer.disconnected).toBe(false);
    observer.enter(el("plain"));
    expect(repeat.done).toBe(false);
    tick(0);
    tick(100);
    expect(el("plain").textContent).toBe("1,240.50");
  });

  it("stays still under reduced motion, and says it is done", () => {
    setReducedMotion(true);
    const instance = new Countup(el("money"), { autostart: true });
    expect(FakeObserver.instances).toHaveLength(0);
    expect(instance.done).toBe(true);
    expect(el("money").textContent).toBe("€ 1,240.50");
    instance.start();
    expect(el("money").textContent).toBe("€ 1,240.50");
    expect(frames.size).toBe(0);
  });

  it("stays still without an IntersectionObserver", () => {
    // @ts-expect-error test double
    window.IntersectionObserver = undefined;
    const instance = new Countup(el("money"));
    expect(instance.done).toBe(true);
    expect(el("money").textContent).toBe("€ 1,240.50");
  });

  it("resolves options as defaults < data-iv-* < JavaScript", () => {
    const node = el("plain");
    node.setAttribute("data-iv-duration", "300");
    node.setAttribute("data-iv-from", "100");
    node.setAttribute("data-iv-grouping", "false");
    const instance = new Countup(node, { from: 200 });
    expect(instance.options.duration).toBe(300);
    expect(instance.options.from).toBe(200);
    expect(instance.options.grouping).toBe(false);
    expect(instance.options.once).toBe(true);

    FakeObserver.instances[0].enter(node);
    expect(node.textContent).toBe("200.00");
    tick(0);
    tick(150);
    expect(node.textContent ?? "").not.toContain(",");
    tick(300);
    expect(node.textContent).toBe("1,240.50");
  });

  it("is idempotent and destroy puts the served nodes back", () => {
    const node = el("plain");
    const served = [...node.childNodes];
    const first = Countup.initAll(document);
    const second = Countup.initAll(document);
    expect(first.length).toBeGreaterThan(0);
    expect(second).toHaveLength(0);

    const instance = /** @type {Countup} */ (Countup.get(node));
    FakeObserver.instances[0].enter(node);
    tick(0);
    tick(50);
    expect(node.textContent).not.toBe("1,240.50");

    for (const created of first) created.destroy();
    expect(Countup.get(node)).toBeUndefined();
    expect(node.textContent).toBe("1,240.50");
    expect([...node.childNodes]).toEqual(served);
    expect(instance.value).toBe(1240.5);
    for (const observer of FakeObserver.instances) expect(observer.disconnected).toBe(true);
    expect(document.getElementById("host")?.textContent?.includes("€ 1,240.50")).toBe(true);
  });
});
