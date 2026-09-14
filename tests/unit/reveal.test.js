// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Reveal } from "../../packages/ivolt/src/js/components/reveal.js";

const MARKUP = `
  <section id="rv" data-iv-component="reveal">
    <article id="r0" class="iv-card iv-reveal iv-edge-glint" style="--iv-i: 0;">Made-up block 0</article>
    <article id="r1" class="iv-card iv-reveal" style="--iv-i: 1;">Made-up block 1</article>
    <article id="r2" class="iv-card iv-reveal" style="--iv-i: 2;">Made-up block 2</article>
    <article id="r3" class="iv-card iv-reveal">Made-up block 3, without an index</article>
    <p id="r4" data-iv-reveal>Made-up block 4, marked by attribute</p>
  </section>
`;

const BARE = `
  <section id="plain">
    <article id="b0" class="iv-reveal" style="--iv-i: 0;">Made-up block</article>
  </section>
`;

/**
 * Stand-in for the browser observer: it records what is observed and lets a
 * test decide when something enters or leaves the viewport.
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
   * @param {boolean} isIntersecting Whether the elements are in view.
   * @param {Element[]} els Elements to report.
   * @returns {void}
   */
  report(isIntersecting, els) {
    this.callback(
      els.map((target) => ({
        target,
        isIntersecting,
        intersectionRatio: isIntersecting ? 1 : 0,
      })),
      this
    );
  }
}

/**
 * @param {string} id Element id.
 * @returns {HTMLElement} The element.
 */
function byId(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}

/**
 * @returns {FakeObserver} The observer created by the instance under test.
 */
function observer() {
  return FakeObserver.instances[FakeObserver.instances.length - 1];
}

describe("Reveal", () => {
  beforeEach(() => {
    FakeObserver.instances = [];
    document.body.innerHTML = MARKUP;
    document.body.removeAttribute("data-iv-component");
    document.body.removeAttribute("data-iv-auto");
    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("entering the viewport", () => {
    it("observes every target with the configured threshold", () => {
      const rv = new Reveal(byId("rv"));
      expect(observer().options.threshold).toBe(0.15);
      expect(observer().targets.size).toBe(5);
      expect(byId("r0").hasAttribute("data-iv-inview")).toBe(false);
      rv.destroy();
    });

    it("marks an element as seen and staggers it by its inline --iv-i", () => {
      const rv = new Reveal(byId("rv"));
      observer().report(true, [byId("r0"), byId("r1"), byId("r2")]);

      expect(byId("r0").hasAttribute("data-iv-inview")).toBe(true);
      expect(byId("r0").style.getPropertyValue("--iv-reveal-delay")).toBe("0ms");
      expect(byId("r1").style.getPropertyValue("--iv-reveal-delay")).toBe("80ms");
      expect(byId("r2").style.getPropertyValue("--iv-reveal-delay")).toBe("160ms");
      expect(rv.revealed).toHaveLength(3);
      rv.destroy();
    });

    it("leaves elements without an index undelayed", () => {
      const rv = new Reveal(byId("rv"));
      observer().report(true, [byId("r3"), byId("r4")]);

      expect(byId("r3").hasAttribute("data-iv-inview")).toBe(true);
      expect(byId("r4").hasAttribute("data-iv-inview")).toBe(true);
      expect(byId("r3").hasAttribute("style")).toBe(false);
      expect(byId("r4").hasAttribute("style")).toBe(false);
      rv.destroy();
    });

    it("honours the stagger option", () => {
      const rv = new Reveal(byId("rv"), { stagger: 250 });
      observer().report(true, [byId("r2")]);
      expect(byId("r2").style.getPropertyValue("--iv-reveal-delay")).toBe("500ms");
      rv.destroy();
    });

    it("stops observing an element once it has entered", () => {
      const rv = new Reveal(byId("rv"));
      observer().report(true, [byId("r1")]);
      expect(observer().targets.has(byId("r1"))).toBe(false);
      expect(observer().targets.size).toBe(4);

      // A late report for a leaving element changes nothing without `repeat`.
      observer().report(false, [byId("r1")]);
      expect(byId("r1").hasAttribute("data-iv-inview")).toBe(true);
      rv.destroy();
    });

    it("plays again with repeat", () => {
      const rv = new Reveal(byId("rv"), { repeat: true });
      observer().report(true, [byId("r1")]);
      expect(observer().targets.has(byId("r1"))).toBe(true);

      observer().report(false, [byId("r1")]);
      expect(byId("r1").hasAttribute("data-iv-inview")).toBe(false);
      expect(byId("r1").style.getPropertyValue("--iv-reveal-delay")).toBe("");

      observer().report(true, [byId("r1")]);
      expect(byId("r1").hasAttribute("data-iv-inview")).toBe(true);
      rv.destroy();
    });

    it("reads the threshold from the attribute", () => {
      const el = byId("rv");
      el.setAttribute("data-iv-threshold", "0.6");
      const rv = new Reveal(el);
      expect(rv.options.threshold).toBe(0.6);
      expect(observer().options.threshold).toBe(0.6);
      rv.destroy();
      el.removeAttribute("data-iv-threshold");
    });
  });

  describe("without an observer", () => {
    it("marks everything as seen, undelayed", () => {
      vi.stubGlobal("IntersectionObserver", undefined);
      const rv = new Reveal(byId("rv"));

      for (const id of ["r0", "r1", "r2", "r3", "r4"]) {
        expect(byId(id).hasAttribute("data-iv-inview")).toBe(true);
      }
      expect(byId("r1").style.getPropertyValue("--iv-reveal-delay")).toBe("");
      expect(FakeObserver.instances).toHaveLength(0);
      rv.destroy();
      expect(byId("r1").hasAttribute("data-iv-inview")).toBe(false);
    });
  });

  describe("lifecycle", () => {
    it("leaves the markup exactly as served on destroy", () => {
      const before = document.body.innerHTML;
      const rv = new Reveal(byId("rv"));
      observer().report(true, [byId("r0"), byId("r1"), byId("r3"), byId("r4")]);
      rv.destroy();

      expect(observer().disconnected).toBe(true);
      expect(document.body.innerHTML).toBe(before);
    });

    it("emits iv:init and iv:destroy", () => {
      /** @type {string[]} */
      const seen = [];
      const el = byId("rv");
      el.addEventListener("iv:init", () => seen.push("init"));
      el.addEventListener("iv:destroy", () => seen.push("destroy"));
      const rv = new Reveal(el);
      rv.destroy();
      expect(seen).toEqual(["init", "destroy"]);
    });

    it("generates a body root when the page declares none, and removes it on destroy", () => {
      document.body.innerHTML = BARE;
      const before = document.body.innerHTML;

      const created = Reveal.initAll(document);
      expect(created).toHaveLength(1);
      expect(document.body.getAttribute("data-iv-component")).toBe("reveal");
      expect(document.body.hasAttribute("data-iv-auto")).toBe(true);
      expect(observer().targets.size).toBe(1);

      observer().report(true, [byId("b0")]);
      expect(byId("b0").hasAttribute("data-iv-inview")).toBe(true);

      created[0].destroy();
      expect(document.body.hasAttribute("data-iv-auto")).toBe(false);
      expect(document.body.hasAttribute("data-iv-component")).toBe(false);
      expect(document.body.innerHTML).toBe(before);
    });

    it("never generates a root when one is declared, and is idempotent", () => {
      const first = Reveal.initAll(document);
      expect(first).toHaveLength(1);
      expect(document.body.hasAttribute("data-iv-auto")).toBe(false);
      expect(Reveal.initAll(document)).toHaveLength(0);
      first[0].destroy();
    });

    it("never generates a root when there is nothing to reveal", () => {
      document.body.innerHTML = `<p>Nothing to reveal here.</p>`;
      expect(Reveal.initAll(document)).toHaveLength(0);
      expect(document.body.hasAttribute("data-iv-auto")).toBe(false);
    });
  });
});
