/**
 * Proximity: the border of every `.iv-edge-near` inside the root lights up
 * where the pointer comes close.
 *
 * The served HTML needs nothing: without JavaScript, without a fine pointer or
 * before the first move `--iv-near` is unset, the `::after` ring is fully
 * transparent and the element keeps its normal border. `init` adds a single
 * `pointermove` listener on the root, throttled by `requestAnimationFrame`,
 * and writes three custom properties on the elements the pointer is near:
 * `--iv-mx` and `--iv-my` (pointer position in pixels, relative to the
 * element) and `--iv-near` (1 inside the rectangle, decaying linearly to 0 at
 * `radius` pixels from its edge). `destroy` removes those properties, the
 * style attribute it created and the listener.
 *
 * Coarse pointers are left alone on purpose: a finger has no hover, so the
 * effect would only fire on tap and read as a glitch. The check runs in
 * `_setup` through the view of the element, never at module level, so the
 * module stays importable on the server.
 *
 * @module components/proximity
 */

import { IvComponent, isElement } from "../core/component.js";

/**
 * @typedef {object} ProximityOptions
 * @property {number} radius Distance in pixels at which the glow reaches zero.
 */

const ROOT_SELECTOR = '[data-iv-component="proximity"]';
const TARGET_SELECTOR = ".iv-edge-near";
const POINTER_QUERY = "(hover: hover) and (pointer: fine)";
const AUTO_ATTRIBUTE = "data-iv-auto";
const COMPONENT_ATTRIBUTE = "data-iv-component";
const VARIABLES = ["--iv-mx", "--iv-my", "--iv-near"];

/**
 * Nearness of a point to a rectangle: 1 inside, decaying linearly to 0 at
 * `radius` pixels from the closest edge.
 *
 * @param {DOMRect} rect Rectangle of the element, in client coordinates.
 * @param {number} x Pointer `clientX`.
 * @param {number} y Pointer `clientY`.
 * @param {number} radius Reach of the effect, in pixels.
 * @returns {number} A value between 0 and 1.
 */
function nearness(rect, x, y, radius) {
  const dx = Math.max(rect.left - x, 0, x - rect.right);
  const dy = Math.max(rect.top - y, 0, y - rect.bottom);
  if (dx === 0 && dy === 0) return 1;
  if (radius <= 0) return 0;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance >= radius ? 0 : 1 - distance / radius;
}

/**
 * Removes the properties this component wrote, and the style attribute itself
 * when nothing else was using it.
 *
 * @param {HTMLElement} el Element to clean.
 * @returns {void}
 */
function clearVariables(el) {
  for (const name of VARIABLES) el.style.removeProperty(name);
  if (el.getAttribute("style") === "") el.removeAttribute("style");
}

/**
 * Body of the document a scan root belongs to.
 *
 * @param {ParentNode} root Subtree being scanned.
 * @returns {HTMLElement|null} The body, or `null` outside a document.
 */
function bodyOf(root) {
  const doc = isElement(root)
    ? /** @type {Element} */ (root).ownerDocument
    : /** @type {Document} */ (/** @type {unknown} */ (root));
  return doc && doc.body ? doc.body : null;
}

/**
 * Rounds a number to three decimals, so the inline value stays short.
 *
 * @param {number} value Raw value.
 * @returns {string} Serialized value.
 */
function round(value) {
  return String(Math.round(value * 1000) / 1000);
}

/**
 * Proximity component: one pointer listener per root, a lit border per target.
 *
 * @augments IvComponent
 */
export class Proximity extends IvComponent {
  /** @type {string} */
  static componentName = "proximity";

  /** @type {Readonly<ProximityOptions>} */
  static defaults = Object.freeze({
    radius: 160,
  });

  /**
   * Returns the instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Proximity|undefined} The instance or `undefined`.
   */
  static get(el) {
    return /** @type {Proximity|undefined} */ (super.get(el));
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<ProximityOptions>} [options] Options passed in JavaScript.
   * @returns {Proximity} The instance.
   */
  static getOrCreate(el, options) {
    return /** @type {Proximity} */ (
      super.getOrCreate(el, /** @type {Record<string, unknown>} */ (options))
    );
  }

  /**
   * Instantiates every `[data-iv-component="proximity"]` inside `root`. When
   * the page declares no root at all and there are `.iv-edge-near` elements,
   * the body becomes a generated root marked with `data-iv-auto`, which
   * `destroy` removes again: the effect is opt-out, like the picker (ADR-032).
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Proximity[]} Newly created instances.
   */
  static initAll(root = document) {
    /** @type {Proximity[]} */
    const generated = [];
    const declared =
      (isElement(root) && /** @type {Element} */ (root).matches(ROOT_SELECTOR)) ||
      root.querySelector(ROOT_SELECTOR) !== null;
    if (!declared && root.querySelector(TARGET_SELECTOR)) {
      const body = bodyOf(root);
      if (body && !body.matches(ROOT_SELECTOR)) {
        body.setAttribute(COMPONENT_ATTRIBUTE, "proximity");
        body.setAttribute(AUTO_ATTRIBUTE, "");
        // A fragment being mounted does not contain the body: instantiate it here.
        if (!root.contains(body) && !Proximity.get(body)) {
          generated.push(new Proximity(body));
        }
      }
    }
    return [...generated, .../** @type {Proximity[]} */ (super.initAll(root))];
  }

  /**
   * @param {Element} el Container holding the `.iv-edge-near` elements.
   * @param {Partial<ProximityOptions>} [options] Options passed in JavaScript.
   */
  constructor(el, options) {
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {Set<HTMLElement>} Elements carrying properties written here. */
    this._touched = this._touched ?? new Set();
    /** @type {Window|null} View of the element, or `null` outside a document. */
    this._view = this._view ?? null;
    /** @type {number} Pending animation frame, `0` when there is none. */
    this._frame = this._frame ?? 0;
    /** @type {boolean} Whether a frame is scheduled. */
    this._pending = this._pending ?? false;
    /** @type {number} Last pointer `clientX`. */
    this._x = this._x ?? 0;
    /** @type {number} Last pointer `clientY`. */
    this._y = this._y ?? 0;
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<ProximityOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<ProximityOptions>} */ (
      /** @type {unknown} */ (super.options)
    );
  }

  /** @returns {void} */
  _setup() {
    this._touched = new Set();
    this._frame = 0;
    this._pending = false;
    this._x = 0;
    this._y = 0;
    const view = this._element.ownerDocument.defaultView;
    this._view = view;
    if (!view || typeof view.matchMedia !== "function") return;
    if (!view.matchMedia(POINTER_QUERY).matches) return;
    this._listen(
      this._element,
      "pointermove",
      (event) => this._onMove(/** @type {PointerEvent} */ (event)),
      { passive: true }
    );
    this._listen(this._element, "pointerleave", () => this._onLeave());
  }

  /** @returns {void} */
  _teardown() {
    this._cancel();
    for (const el of this._touched) clearVariables(el);
    this._touched.clear();
    if (this._element.hasAttribute(AUTO_ATTRIBUTE)) {
      this._element.removeAttribute(AUTO_ATTRIBUTE);
      this._element.removeAttribute(COMPONENT_ATTRIBUTE);
    }
  }

  /**
   * Targets of this instance: every `.iv-edge-near` in the subtree that is not
   * owned by a nested root.
   *
   * @returns {HTMLElement[]} The elements to light up.
   */
  _targets() {
    const root = this._element;
    /** @type {HTMLElement[]} */
    const out = [];
    for (const node of root.querySelectorAll(TARGET_SELECTOR)) {
      const owner = node.closest(ROOT_SELECTOR);
      if (owner !== null && owner !== root) continue;
      out.push(/** @type {HTMLElement} */ (node));
    }
    return out;
  }

  /**
   * Stores the pointer position and schedules one update per frame.
   *
   * @param {PointerEvent} event The move.
   * @returns {void}
   */
  _onMove(event) {
    this._x = event.clientX;
    this._y = event.clientY;
    if (this._pending) return;
    this._pending = true;
    const view = this._view;
    if (!view || typeof view.requestAnimationFrame !== "function") {
      this._pending = false;
      this._update();
      return;
    }
    const id = view.requestAnimationFrame(() => {
      this._pending = false;
      this._frame = 0;
      this._update();
    });
    // A synchronous frame has already run: do not keep its id around.
    if (this._pending) this._frame = id;
  }

  /**
   * Pointer gone: the glow of every touched element fades out.
   *
   * @returns {void}
   */
  _onLeave() {
    this._cancel();
    for (const el of this._touched) el.style.setProperty("--iv-near", "0");
  }

  /**
   * Measures every target and writes the three properties. Rectangles are
   * read once per frame, never per pointer event.
   *
   * @returns {void}
   */
  _update() {
    const radius = this.options.radius;
    const x = this._x;
    const y = this._y;
    for (const el of this._targets()) {
      const rect = el.getBoundingClientRect();
      const near = nearness(rect, x, y, radius);
      if (near > 0) {
        el.style.setProperty("--iv-mx", `${round(x - rect.left)}px`);
        el.style.setProperty("--iv-my", `${round(y - rect.top)}px`);
        el.style.setProperty("--iv-near", round(near));
        this._touched.add(el);
      } else if (this._touched.has(el)) {
        el.style.setProperty("--iv-near", "0");
      }
    }
  }

  /**
   * Drops any scheduled frame.
   *
   * @returns {void}
   */
  _cancel() {
    const view = this._view;
    if (this._frame && view && typeof view.cancelAnimationFrame === "function") {
      view.cancelAnimationFrame(this._frame);
    }
    this._frame = 0;
    this._pending = false;
  }
}
