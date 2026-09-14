/**
 * ScrollMotion: the fallback for engines without CSS scroll-driven animations.
 *
 * `motion.css` (API_CONTRACT §8.21) drives parallax and the reading progress
 * bar from `animation-timeline` wherever the engine has it. Where it does not,
 * the same sheets read two custom properties instead, and this component is
 * what writes them: `--iv-view` on every `.iv-parallax` inside the container
 * (0 as the element enters from the bottom, 0.5 centred, 1 as it leaves at the
 * top) and `--iv-scroll` on the root of the component (0 at the top of the
 * document, 1 at the end), which the progress bar inherits.
 *
 * The served HTML needs nothing: with no JavaScript both properties keep their
 * fallback values, `--iv-view: 0.5` leaves the composition exactly as authored
 * and the bar sits at zero. Support is read in `_setup` through the view of the
 * element, never at module level, so the module stays importable on the server;
 * with support, and unless `force` says otherwise, `init` registers no listener
 * at all. Under `prefers-reduced-motion: reduce` only `--iv-scroll` is written:
 * the reading position is state, the parallax layers stay where they were authored.
 *
 * One `scroll` and one `resize` listener per instance, both passive and both
 * throttled by `requestAnimationFrame`; rectangles are read once per frame.
 *
 * @module components/scroll-motion
 */

import { IvComponent } from "../core/component.js";

/**
 * @typedef {object} ScrollMotionOptions
 * @property {boolean} force Write the properties even where the engine has
 *   scroll-driven animations. For checking the fallback, and for a page that
 *   drives something else from `--iv-view`.
 */

const PARALLAX_SELECTOR = ".iv-parallax";
const VIEW_PROPERTY = "--iv-view";
const SCROLL_PROPERTY = "--iv-scroll";
const NATIVE_QUERY = "animation-timeline: view()";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Clamps a number to the 0–1 range.
 *
 * @param {number} value Raw value.
 * @returns {number} A value between 0 and 1.
 */
function unit(value) {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * Rounds to four decimals, so the inline value stays short and a frame that
 * did not really move writes the same string as the one before it.
 *
 * @param {number} value Raw value.
 * @returns {string} Serialized value.
 */
function round(value) {
  return String(Math.round(value * 10000) / 10000);
}

/**
 * Removes a property and the style attribute itself when nothing else was
 * using it.
 *
 * @param {HTMLElement} el Element to clean.
 * @param {string} name Custom property to remove.
 * @returns {void}
 */
function clearProperty(el, name) {
  el.style.removeProperty(name);
  if (el.getAttribute("style") === "") el.removeAttribute("style");
}

/**
 * ScrollMotion component: one frame-throttled scroll listener per container.
 *
 * @augments IvComponent
 */
export class ScrollMotion extends IvComponent {
  /** @type {string} */
  static componentName = "scroll-motion";

  /** @type {Readonly<ScrollMotionOptions>} */
  static defaults = Object.freeze({ force: false });

  /**
   * Returns the instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {ScrollMotion|undefined} The instance or `undefined`.
   */
  static get(el) {
    return /** @type {ScrollMotion|undefined} */ (super.get(el));
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<ScrollMotionOptions>} [options] Options passed in JavaScript.
   * @returns {ScrollMotion} The instance.
   */
  static getOrCreate(el, options) {
    return /** @type {ScrollMotion} */ (
      super.getOrCreate(el, /** @type {Record<string, unknown>} */ (options))
    );
  }

  /**
   * @param {Element} el Container holding the elements driven by scroll.
   * @param {Partial<ScrollMotionOptions>} [options] Options passed in JavaScript.
   */
  constructor(el, options) {
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {boolean} Whether the engine drives the sheets by itself. */
    this._native = this._native ?? false;
    /** @type {boolean} Whether this instance writes anything at all. */
    this._active = this._active ?? false;
    /** @type {Window|null} View of the element, or `null` outside a document. */
    this._view = this._view ?? null;
    /** @type {Set<HTMLElement>} Elements carrying properties written here. */
    this._touched = this._touched ?? new Set();
    /** @type {number} Pending animation frame, `0` when there is none. */
    this._frame = this._frame ?? 0;
    /** @type {boolean} Whether a frame is scheduled. */
    this._pending = this._pending ?? false;
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<ScrollMotionOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<ScrollMotionOptions>} */ (
      /** @type {unknown} */ (super.options)
    );
  }

  /**
   * Whether the engine has CSS scroll-driven animations, as reported by
   * `CSS.supports` when the component was set up.
   *
   * @returns {boolean} `true` when the sheets drive themselves.
   */
  get native() {
    return this._native;
  }

  /** @returns {void} */
  _setup() {
    this._touched = new Set();
    this._frame = 0;
    this._pending = false;
    this._native = false;
    this._active = false;
    this._reduced = false;
    const view = this._element.ownerDocument.defaultView;
    this._view = view;
    if (!view) return;
    const supports = view.CSS && typeof view.CSS.supports === "function";
    this._native = supports ? view.CSS.supports(NATIVE_QUERY) : false;
    // Under reduced motion the parallax sheets are static, so `--iv-view` is not
    // written; the reading position (`--iv-scroll`) is state and keeps flowing.
    this._reduced =
      typeof view.matchMedia === "function" &&
      view.matchMedia(REDUCED_QUERY).matches;
    if (this._native && !this.options.force) return;
    this._active = true;
    this._listen(view, "scroll", () => this._schedule(), { passive: true });
    this._listen(view, "resize", () => this._schedule(), { passive: true });
    this._measure();
  }

  /** @returns {void} */
  _teardown() {
    this._cancel();
    for (const el of this._touched) clearProperty(el, VIEW_PROPERTY);
    this._touched.clear();
    clearProperty(/** @type {HTMLElement} */ (this._element), SCROLL_PROPERTY);
    this._active = false;
  }

  /**
   * Recomputes both properties now, outside any frame. Call it after the
   * container changed size or gained elements.
   *
   * @returns {void}
   */
  update() {
    if (!this._active) return;
    this._cancel();
    this._measure();
  }

  /**
   * Parallax elements of this instance.
   *
   * @returns {HTMLElement[]} The elements to drive.
   */
  _targets() {
    return /** @type {HTMLElement[]} */ ([
      ...this._element.querySelectorAll(PARALLAX_SELECTOR),
    ]);
  }

  /**
   * Schedules one measurement per frame.
   *
   * @returns {void}
   */
  _schedule() {
    if (this._pending) return;
    this._pending = true;
    const view = this._view;
    if (!view || typeof view.requestAnimationFrame !== "function") {
      this._pending = false;
      this._measure();
      return;
    }
    const id = view.requestAnimationFrame(() => {
      this._pending = false;
      this._frame = 0;
      this._measure();
    });
    // A synchronous frame has already run: do not keep its id around.
    if (this._pending) this._frame = id;
  }

  /**
   * Reads the layout once and writes both properties.
   *
   * @returns {void}
   */
  _measure() {
    const view = this._view;
    if (!view) return;
    const doc = this._element.ownerDocument;
    const scroller = doc.scrollingElement || doc.documentElement;
    const height = view.innerHeight || (scroller ? scroller.clientHeight : 0);
    if (scroller) {
      const travel = scroller.scrollHeight - scroller.clientHeight;
      const progress = travel > 0 ? unit(scroller.scrollTop / travel) : 0;
      /** @type {HTMLElement} */ (this._element).style.setProperty(
        SCROLL_PROPERTY,
        round(progress)
      );
    }
    if (this._reduced) return;
    for (const el of this._targets()) {
      const rect = el.getBoundingClientRect();
      const span = height + rect.height;
      const progress = span > 0 ? unit((height - rect.top) / span) : 0.5;
      el.style.setProperty(VIEW_PROPERTY, round(progress));
      this._touched.add(el);
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
