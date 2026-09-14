/**
 * Reveal: elements enter as they are scrolled into view.
 *
 * The served HTML is complete: `:root:not([data-iv-js]) .iv-reveal` keeps
 * everything visible without JavaScript, and `prefers-reduced-motion` keeps it
 * visible with JavaScript too. `init` observes every `.iv-reveal` (or
 * `[data-iv-reveal]`) inside the root with a single `IntersectionObserver` and
 * adds `data-iv-inview` when it enters, which fades the element in and fires
 * the border glint of `iv-edge-glint`. An element that declares an inline
 * `--iv-i` also gets `--iv-reveal-delay`, so a group of siblings arrives
 * staggered. `destroy` removes the attribute, the delay, the style attribute
 * it created and the observer.
 *
 * Nothing is read from the layout: the observer reports the intersection, so
 * there is no scroll listener and no forced reflow.
 *
 * @module components/reveal
 */

import { IvComponent, isElement } from "../core/component.js";

/**
 * @typedef {object} RevealOptions
 * @property {number} threshold Fraction of the element that must be visible.
 * @property {boolean} repeat Whether the entrance runs again after leaving.
 * @property {number} stagger Milliseconds added per `--iv-i` step.
 */

const ROOT_SELECTOR = '[data-iv-component="reveal"]';
const TARGET_SELECTOR = ".iv-reveal, [data-iv-reveal]";
const INVIEW_ATTRIBUTE = "data-iv-inview";
const DELAY_PROPERTY = "--iv-reveal-delay";
const AUTO_ATTRIBUTE = "data-iv-auto";
const COMPONENT_ATTRIBUTE = "data-iv-component";

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
 * Reveal component: one observer per root, one entrance per element.
 *
 * @augments IvComponent
 */
export class Reveal extends IvComponent {
  /** @type {string} */
  static componentName = "reveal";

  /** @type {Readonly<RevealOptions>} */
  static defaults = Object.freeze({
    threshold: 0.15,
    repeat: false,
    stagger: 80,
  });

  /**
   * Returns the instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Reveal|undefined} The instance or `undefined`.
   */
  static get(el) {
    return /** @type {Reveal|undefined} */ (super.get(el));
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<RevealOptions>} [options] Options passed in JavaScript.
   * @returns {Reveal} The instance.
   */
  static getOrCreate(el, options) {
    return /** @type {Reveal} */ (
      super.getOrCreate(el, /** @type {Record<string, unknown>} */ (options))
    );
  }

  /**
   * Instantiates every `[data-iv-component="reveal"]` inside `root`. When the
   * page declares no root and there are elements to reveal, the body becomes a
   * generated root marked with `data-iv-auto`, which `destroy` removes again.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Reveal[]} Newly created instances.
   */
  static initAll(root = document) {
    /** @type {Reveal[]} */
    const generated = [];
    const declared =
      (isElement(root) && /** @type {Element} */ (root).matches(ROOT_SELECTOR)) ||
      root.querySelector(ROOT_SELECTOR) !== null;
    if (!declared && root.querySelector(TARGET_SELECTOR)) {
      const body = bodyOf(root);
      if (body && !body.matches(ROOT_SELECTOR)) {
        body.setAttribute(COMPONENT_ATTRIBUTE, "reveal");
        body.setAttribute(AUTO_ATTRIBUTE, "");
        // A fragment being mounted does not contain the body: instantiate it here.
        if (!root.contains(body) && !Reveal.get(body)) {
          generated.push(new Reveal(body));
        }
      }
    }
    return [...generated, .../** @type {Reveal[]} */ (super.initAll(root))];
  }

  /**
   * @param {Element} el Container holding the elements to reveal.
   * @param {Partial<RevealOptions>} [options] Options passed in JavaScript.
   */
  constructor(el, options) {
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {IntersectionObserver|null} The observer, when the browser has one. */
    this._observer = this._observer ?? null;
    /** @type {Set<HTMLElement>} Elements this instance marked. */
    this._seen = this._seen ?? new Set();
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<RevealOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<RevealOptions>} */ (
      /** @type {unknown} */ (super.options)
    );
  }

  /**
   * Elements revealed so far, in the order they entered.
   *
   * @returns {HTMLElement[]} The elements carrying `data-iv-inview`.
   */
  get revealed() {
    return [...this._seen];
  }

  /** @returns {void} */
  _setup() {
    this._seen = new Set();
    this._observer = null;
    const targets = this._targets();
    const view = this._element.ownerDocument.defaultView;
    const Observer = view ? view.IntersectionObserver : undefined;
    if (typeof Observer !== "function") {
      // No observer: everything counts as seen, nothing is ever hidden.
      for (const el of targets) this._show(el, false);
      return;
    }
    const observer = new Observer(
      (entries) => this._onIntersect(entries),
      { threshold: this.options.threshold }
    );
    this._observer = observer;
    for (const el of targets) observer.observe(el);
  }

  /** @returns {void} */
  _teardown() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    for (const el of this._seen) {
      el.removeAttribute(INVIEW_ATTRIBUTE);
      el.style.removeProperty(DELAY_PROPERTY);
      if (el.getAttribute("style") === "") el.removeAttribute("style");
    }
    this._seen.clear();
    if (this._element.hasAttribute(AUTO_ATTRIBUTE)) {
      this._element.removeAttribute(AUTO_ATTRIBUTE);
      this._element.removeAttribute(COMPONENT_ATTRIBUTE);
    }
  }

  /**
   * Targets of this instance: every element to reveal in the subtree that is
   * not owned by a nested root.
   *
   * @returns {HTMLElement[]} The elements to observe.
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
   * Reacts to the observer: entering elements are revealed; with `repeat` a
   * leaving element goes back to its hidden state.
   *
   * @param {IntersectionObserverEntry[]} entries Reported entries.
   * @returns {void}
   */
  _onIntersect(entries) {
    for (const entry of entries) {
      const el = /** @type {HTMLElement} */ (entry.target);
      if (entry.isIntersecting) {
        this._show(el, true);
        if (!this.options.repeat && this._observer) this._observer.unobserve(el);
      } else if (this.options.repeat) {
        this._hide(el);
      }
    }
  }

  /**
   * Marks an element as seen, staggering it when it declares an inline `--iv-i`.
   *
   * @param {HTMLElement} el Element entering the viewport.
   * @param {boolean} stagger Whether the delay applies; a page without an
   *   observer has nothing to stagger.
   * @returns {void}
   */
  _show(el, stagger) {
    if (stagger) {
      const raw = el.style.getPropertyValue("--iv-i").trim();
      const index = raw === "" ? Number.NaN : Number(raw);
      if (Number.isFinite(index)) {
        el.style.setProperty(DELAY_PROPERTY, `${index * this.options.stagger}ms`);
      }
    }
    el.setAttribute(INVIEW_ATTRIBUTE, "");
    this._seen.add(el);
  }

  /**
   * Puts an element back to its hidden state (`repeat` only).
   *
   * @param {HTMLElement} el Element leaving the viewport.
   * @returns {void}
   */
  _hide(el) {
    if (!this._seen.has(el)) return;
    el.removeAttribute(INVIEW_ATTRIBUTE);
    el.style.removeProperty(DELAY_PROPERTY);
    if (el.getAttribute("style") === "") el.removeAttribute("style");
    this._seen.delete(el);
  }
}
