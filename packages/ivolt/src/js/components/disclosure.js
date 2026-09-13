/**
 * Disclosure: a thin layer over the native `<details>` / `<summary>` pair.
 *
 * The element works without JavaScript; the component only adds cancelable
 * events and the optional exclusive behaviour of an accordion. No ARIA is
 * added: `<details>` already exposes the disclosure pattern.
 *
 * Cancelation caveat: the native `toggle` event is fired **after** the state
 * has already changed, and asynchronously. A user interaction can therefore
 * only be "cancelled" by restoring the previous value of `open` once the event
 * has been seen, which means the element may be rendered in the new state for
 * one frame. The `iv:opened` / `iv:closed` counterpart is not emitted in that
 * case. The `open()`, `close()` and `toggle()` methods do not have this
 * limitation: they emit the cancelable event *before* touching `open`.
 *
 * @module components/disclosure
 */

import { IvComponent, isElement } from "../core/component.js";
import { IvError, getInstance } from "../core/registry.js";
import { emit } from "../core/events.js";

/**
 * @typedef {object} DisclosureOptions
 * @property {boolean} exclusive Close the sibling `<details>` of the closest `.iv-accordion` when opening.
 * @property {boolean} closeOnOutside Close when a click lands outside the element.
 */

/**
 * @typedef {"api"|"trigger"|"external"} DisclosureReason
 */

const ACCORDION_SELECTOR = ".iv-accordion";

/**
 * Tells whether an element is a `<details>`.
 *
 * @param {Element} el Candidate element.
 * @returns {boolean} `true` for details elements.
 */
function isDetailsElement(el) {
  if (
    typeof HTMLDetailsElement !== "undefined" &&
    el instanceof HTMLDetailsElement
  ) {
    return true;
  }
  return el.tagName === "DETAILS";
}

/**
 * Disclosure component.
 *
 * @augments IvComponent
 */
export class Disclosure extends IvComponent {
  /** @type {string} */
  static componentName = "disclosure";

  /** @type {Readonly<DisclosureOptions>} */
  static defaults = Object.freeze({
    exclusive: false,
    closeOnOutside: false,
  });

  /**
   * Returns the disclosure instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Disclosure|undefined} The instance or `undefined`.
   */
  static get(el) {
    const inst = getInstance(el, "disclosure");
    return inst instanceof Disclosure ? inst : undefined;
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<DisclosureOptions>} [options] Options passed in JavaScript.
   * @returns {Disclosure} The instance.
   */
  static getOrCreate(el, options) {
    return this.get(el) ?? new Disclosure(el, options);
  }

  /**
   * Instantiates every `[data-iv-component="disclosure"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Disclosure[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Disclosure[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el A `<details>` element.
   * @param {Partial<DisclosureOptions>} [options] Options passed in JavaScript.
   * @throws {IvError} `invalid-element` when `el` is not a `<details>`.
   */
  constructor(el, options) {
    if (!isElement(el) || !isDetailsElement(el)) {
      throw new IvError(
        "invalid-element",
        "Disclosure requires a <details> element."
      );
    }
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {boolean} Last committed state; guards the async `toggle`. */
    this._open = this._open ?? this.details.open;
  }

  /**
   * The host element, typed as a details element.
   *
   * @returns {HTMLDetailsElement} The `<details>` element.
   */
  get details() {
    return /** @type {HTMLDetailsElement} */ (this._element);
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<DisclosureOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<DisclosureOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * Whether the disclosure is currently open.
   *
   * @returns {boolean} `true` when open.
   */
  get isOpen() {
    return this.details.open;
  }

  /** @returns {void} */
  _setup() {
    this._open = this.details.open;

    this._listen(this._element, "toggle", () => this._onToggle());

    if (this.options.closeOnOutside) {
      this._listen(document, "click", (event) => this._onDocumentClick(event));
    }
  }

  /**
   * The `<summary>` of this disclosure, when present.
   *
   * @returns {HTMLElement|null} The summary element.
   */
  get _summary() {
    const summary = this._element.querySelector("summary");
    if (summary && summary.parentElement === this._element) {
      return /** @type {HTMLElement} */ (summary);
    }
    return null;
  }

  /**
   * Handles the native `toggle` event, i.e. a state change made by the user.
   *
   * @returns {void}
   */
  _onToggle() {
    const open = this.details.open;
    if (open === this._open) return; // Programmatic change, already announced.
    const trigger = this._summary;
    const allowed = emit(
      this._element,
      open ? "open" : "close",
      { instance: this, trigger, reason: "trigger" },
      { cancelable: true }
    );
    if (!allowed) {
      // Restore the previous state; the resulting `toggle` is ignored because
      // it matches `_open` again.
      this.details.open = this._open;
      return;
    }
    this._open = open;
    if (open) this._closeSiblings();
    emit(this._element, open ? "opened" : "closed", {
      instance: this,
      trigger,
      reason: "trigger",
    });
  }

  /**
   * Closes the disclosure when a click lands outside of it.
   *
   * @param {Event} event Click event.
   * @returns {void}
   */
  _onDocumentClick(event) {
    if (!this._open) return;
    const target = event.target;
    if (isElement(target) && this._element.contains(target)) return;
    this.close("external");
  }

  /**
   * Closes the sibling `<details>` of the closest accordion.
   *
   * @returns {void}
   */
  _closeSiblings() {
    if (!this.options.exclusive) return;
    const accordion = this._element.closest(ACCORDION_SELECTOR);
    if (!accordion) return;
    for (const sibling of accordion.querySelectorAll("details")) {
      if (sibling === this._element) continue;
      if (sibling.closest(ACCORDION_SELECTOR) !== accordion) continue;
      if (!sibling.open) continue;
      const instance = Disclosure.get(sibling);
      if (instance) instance.close("external");
      else sibling.open = false;
    }
  }

  /**
   * Opens the disclosure. Emits the cancelable `iv:open` first.
   *
   * @returns {void}
   */
  open() {
    if (this._open) return;
    const allowed = emit(
      this._element,
      "open",
      { instance: this, trigger: null, reason: "api" },
      { cancelable: true }
    );
    if (!allowed) return;
    this._open = true;
    this.details.open = true;
    this._closeSiblings();
    emit(this._element, "opened", {
      instance: this,
      trigger: null,
      reason: "api",
    });
  }

  /**
   * Closes the disclosure. Emits the cancelable `iv:close` first.
   *
   * @param {DisclosureReason} [reason] Why the disclosure is closing.
   * @returns {void}
   */
  close(reason = "api") {
    if (!this._open) return;
    const allowed = emit(
      this._element,
      "close",
      { instance: this, trigger: null, reason },
      { cancelable: true }
    );
    if (!allowed) return;
    this._open = false;
    this.details.open = false;
    emit(this._element, "closed", { instance: this, trigger: null, reason });
  }

  /**
   * Opens the disclosure when closed, closes it when open.
   *
   * @returns {void}
   */
  toggle() {
    if (this._open) this.close("api");
    else this.open();
  }
}
