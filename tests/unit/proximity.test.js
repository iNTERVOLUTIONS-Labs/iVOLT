// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Proximity } from "../../packages/ivolt/src/js/components/proximity.js";

const MARKUP = `
  <div id="px" data-iv-component="proximity">
    <article id="near-a" class="iv-card iv-edge-near">Made-up card A</article>
    <article id="near-b" class="iv-card iv-edge-near">Made-up card B</article>
  </div>
`;

const BARE = `
  <section id="plain">
    <article id="near-c" class="iv-card iv-edge-near">Made-up card C</article>
  </section>
`;

/** Whether the stubbed `matchMedia` reports a fine pointer. */
let fine = true;

/**
 * Pins the rectangle a test element reports, so the distance maths is exact.
 *
 * @param {string} id Element id.
 * @param {{ left: number, top: number, width: number, height: number }} box Client rectangle.
 * @returns {HTMLElement} The element.
 */
function place(id, box) {
  const el = /** @type {HTMLElement} */ (document.getElementById(id));
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
  return el;
}

/**
 * Moves the pointer over a root.
 *
 * @param {Element} root Element receiving the event.
 * @param {number} x Client x.
 * @param {number} y Client y.
 * @returns {void}
 */
function move(root, x, y) {
  root.dispatchEvent(
    new MouseEvent("pointermove", { clientX: x, clientY: y, bubbles: true })
  );
}

/**
 * Value of a custom property written on an element.
 *
 * @param {string} id Element id.
 * @param {string} name Property name.
 * @returns {string} The value, or an empty string when it was never written.
 */
function prop(id, name) {
  const el = /** @type {HTMLElement} */ (document.getElementById(id));
  return el.style.getPropertyValue(name);
}

describe("Proximity", () => {
  beforeEach(() => {
    fine = true;
    document.body.innerHTML = MARKUP;
    document.body.removeAttribute("data-iv-component");
    document.body.removeAttribute("data-iv-auto");
    vi.stubGlobal("matchMedia", (/** @type {string} */ query) => ({
      matches: fine,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }));
    // One frame per move, run in place: the tests stay synchronous.
    vi.stubGlobal("requestAnimationFrame", (/** @type {FrameRequestCallback} */ cb) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("lighting the edge", () => {
    it("writes 1 and the relative position while the pointer is inside", () => {
      place("near-a", { left: 100, top: 100, width: 200, height: 100 });
      place("near-b", { left: 600, top: 100, width: 200, height: 100 });
      const root = /** @type {HTMLElement} */ (document.getElementById("px"));
      const px = new Proximity(root);

      move(root, 150, 150);

      expect(prop("near-a", "--iv-near")).toBe("1");
      expect(prop("near-a", "--iv-mx")).toBe("50px");
      expect(prop("near-a", "--iv-my")).toBe("50px");
      // Out of reach: nothing is written at all.
      expect(prop("near-b", "--iv-near")).toBe("");
      px.destroy();
    });

    it("decays linearly with the distance to the rectangle", () => {
      place("near-a", { left: 100, top: 100, width: 200, height: 100 });
      place("near-b", { left: 600, top: 100, width: 200, height: 100 });
      const root = /** @type {HTMLElement} */ (document.getElementById("px"));
      const px = new Proximity(root);

      move(root, 380, 150); // 80px to the right edge of A, half the radius
      expect(prop("near-a", "--iv-near")).toBe("0.5");
      expect(prop("near-a", "--iv-mx")).toBe("280px");

      move(root, 340, 240); // 40px right, 40px below: diagonal distance
      const near = Number(prop("near-a", "--iv-near"));
      expect(near).toBeCloseTo(1 - Math.SQRT2 * 40 / 160, 3);

      move(root, 460, 150); // exactly the radius away: back to zero
      expect(prop("near-a", "--iv-near")).toBe("0");
      px.destroy();
    });

    it("honours the radius option and the attribute", () => {
      place("near-a", { left: 100, top: 100, width: 200, height: 100 });
      place("near-b", { left: 600, top: 100, width: 200, height: 100 });
      const root = /** @type {HTMLElement} */ (document.getElementById("px"));
      const px = new Proximity(root, { radius: 400 });
      expect(px.options.radius).toBe(400);

      move(root, 500, 150); // 200px from A, inside the wider radius
      expect(prop("near-a", "--iv-near")).toBe("0.5");
      px.destroy();

      root.setAttribute("data-iv-radius", "80");
      const attr = new Proximity(root);
      expect(attr.options.radius).toBe(80);
      move(root, 340, 150); // 40px from A, half of 80
      expect(prop("near-a", "--iv-near")).toBe("0.5");
      attr.destroy();
      root.removeAttribute("data-iv-radius");
    });

    it("drops the glow to zero when the pointer leaves the root", () => {
      place("near-a", { left: 100, top: 100, width: 200, height: 100 });
      place("near-b", { left: 600, top: 100, width: 200, height: 100 });
      const root = /** @type {HTMLElement} */ (document.getElementById("px"));
      const px = new Proximity(root);

      move(root, 150, 150);
      expect(prop("near-a", "--iv-near")).toBe("1");
      root.dispatchEvent(new MouseEvent("pointerleave", { bubbles: false }));
      expect(prop("near-a", "--iv-near")).toBe("0");
      // The position stays, so the halo fades out where it was.
      expect(prop("near-a", "--iv-mx")).toBe("50px");
      px.destroy();
    });

    it("does nothing without a fine pointer", () => {
      fine = false;
      place("near-a", { left: 100, top: 100, width: 200, height: 100 });
      place("near-b", { left: 600, top: 100, width: 200, height: 100 });
      const root = /** @type {HTMLElement} */ (document.getElementById("px"));
      const px = new Proximity(root);

      move(root, 150, 150);
      expect(prop("near-a", "--iv-near")).toBe("");
      expect(document.getElementById("near-a")?.hasAttribute("style")).toBe(false);
      px.destroy();
    });
  });

  describe("lifecycle", () => {
    it("leaves the markup exactly as served on destroy", () => {
      const before = document.body.innerHTML;
      place("near-a", { left: 100, top: 100, width: 200, height: 100 });
      place("near-b", { left: 600, top: 100, width: 200, height: 100 });
      const root = /** @type {HTMLElement} */ (document.getElementById("px"));
      const px = new Proximity(root);

      move(root, 150, 150);
      move(root, 380, 150);
      root.dispatchEvent(new MouseEvent("pointerleave", { bubbles: false }));
      px.destroy();

      expect(document.body.innerHTML).toBe(before);
      // The listener is gone with the instance.
      move(root, 150, 150);
      expect(prop("near-a", "--iv-near")).toBe("");
    });

    it("emits iv:init and iv:destroy", () => {
      const root = /** @type {HTMLElement} */ (document.getElementById("px"));
      /** @type {string[]} */
      const seen = [];
      root.addEventListener("iv:init", () => seen.push("init"));
      root.addEventListener("iv:destroy", () => seen.push("destroy"));
      const px = new Proximity(root);
      px.destroy();
      expect(seen).toEqual(["init", "destroy"]);
    });

    it("generates a body root when the page declares none, and removes it on destroy", () => {
      document.body.innerHTML = BARE;
      const before = document.body.innerHTML;
      place("near-c", { left: 10, top: 10, width: 100, height: 100 });

      const created = Proximity.initAll(document);
      expect(created).toHaveLength(1);
      expect(document.body.getAttribute("data-iv-component")).toBe("proximity");
      expect(document.body.hasAttribute("data-iv-auto")).toBe(true);

      move(document.body, 40, 40);
      expect(prop("near-c", "--iv-near")).toBe("1");

      created[0].destroy();
      expect(document.body.hasAttribute("data-iv-auto")).toBe(false);
      expect(document.body.hasAttribute("data-iv-component")).toBe(false);
      expect(document.body.innerHTML).toBe(before);
    });

    it("never generates a root when one is declared, and is idempotent", () => {
      const first = Proximity.initAll(document);
      expect(first).toHaveLength(1);
      expect(document.body.hasAttribute("data-iv-auto")).toBe(false);
      expect(Proximity.initAll(document)).toHaveLength(0);
      first[0].destroy();
    });

    it("never generates a root when there is nothing to light", () => {
      document.body.innerHTML = `<p>Nothing to light here.</p>`;
      expect(Proximity.initAll(document)).toHaveLength(0);
      expect(document.body.hasAttribute("data-iv-auto")).toBe(false);
    });
  });
});
