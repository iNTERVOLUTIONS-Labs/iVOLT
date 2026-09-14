/**
 * Character and word counter for a text control.
 *
 * The served HTML is a `.iv-field` with its label and its control: without
 * JavaScript a `maxlength` still limits what can be typed, there is simply no
 * running count. `init` appends a `<p class="iv-counter">` to the field, links
 * it with `aria-describedby` and keeps it updated on every `input`; `destroy`
 * removes it and puts the served attributes back.
 *
 * A soft limit (`data-iv-max` on a control without `maxlength`) lets the user
 * go over and marks the control invalid with `setCustomValidity`, so the
 * browser and the `form` component treat it as any other error. Nothing is
 * parsed from a string: the template is split into nodes built with
 * `createElement` and `createTextNode`.
 *
 * @module components/counter
 */

import { IvComponent, isElement } from "../core/component.js";
import { IvError } from "../core/registry.js";
import { emit } from "../core/events.js";

/**
 * @typedef {object} CounterOptions
 * @property {string} mode What is counted: `chars` or `words`.
 * @property {number} max Limit; `0` falls back to the `maxlength` of the control.
 * @property {number} warnAt Fraction of the limit that turns the counter into a warning.
 * @property {string} template Text of the counter; `{count}`, `{max}` and `{remaining}` are replaced. Empty picks the default for the limit.
 * @property {string} overText Custom validity message used past a soft limit.
 */

/** A text control a counter can be attached to. */
/** @typedef {HTMLInputElement|HTMLTextAreaElement} CounterControl */

/**
 * One replaceable piece of the template.
 *
 * @typedef {object} CounterSlot
 * @property {Node} node Node whose text is rewritten on every update.
 * @property {string} key Which number it shows: `count`, `max` or `remaining`.
 */

const CONTROL_SELECTOR = "textarea, input";
const COUNTER_CLASS = "iv-counter";
const WARN_CLASS = "iv-counter--warn";
const OVER_CLASS = "iv-counter--over";
const FIELD_SELECTOR = ".iv-field";
const TOKENS = /(\{count\}|\{max\}|\{remaining\})/;
const WORDS = /\S+/g;

/** Serial used for the id of the generated counter. */
let uid = 0;

/**
 * Finds the control a counter is attached to: the first text control inside
 * the host element.
 *
 * @param {Element} el Host element.
 * @returns {CounterControl|null} The control, or `null` when there is none.
 */
function findControl(el) {
  const node = el.querySelector(CONTROL_SELECTOR);
  if (!node) return null;
  return /** @type {CounterControl} */ (/** @type {unknown} */ (node));
}

/**
 * Counter component: a live count under a text control.
 *
 * @augments IvComponent
 */
export class Counter extends IvComponent {
  /** @type {string} */
  static componentName = "counter";

  /** @type {Readonly<CounterOptions>} */
  static defaults = Object.freeze({
    mode: "chars",
    max: 0,
    warnAt: 0.9,
    template: "",
    overText: "Too long",
  });

  /**
   * Returns the instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Counter|undefined} The instance or `undefined`.
   */
  static get(el) {
    return /** @type {Counter|undefined} */ (super.get(el));
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<CounterOptions>} [options] Options passed in JavaScript.
   * @returns {Counter} The instance.
   */
  static getOrCreate(el, options) {
    return /** @type {Counter} */ (
      super.getOrCreate(el, /** @type {Record<string, unknown>} */ (options))
    );
  }

  /**
   * Instantiates every `[data-iv-component="counter"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Counter[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Counter[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el A `.iv-field` holding a text control.
   * @param {Partial<CounterOptions>} [options] Options passed in JavaScript.
   * @throws {IvError} `invalid-element` when there is no text control to count.
   */
  constructor(el, options) {
    if (!isElement(el)) {
      throw new IvError("invalid-element", "Counter requires an element.");
    }
    const control = findControl(el);
    if (!control) {
      throw new IvError(
        "invalid-element",
        "Counter requires a <textarea> or <input> inside the element."
      );
    }
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {CounterControl} The counted control. */
    this._control = this._control ?? control;
    /** @type {HTMLElement} The counter element. */
    this._counter = this._counter ?? el.ownerDocument.createElement("p");
    /** @type {CounterSlot[]} Numbers inside the template. */
    this._slots = this._slots ?? [];
    /** @type {Map<string, string|null>} Control attributes to restore. */
    this._saved = this._saved ?? new Map();
    /** @type {number} Resolved limit; `0` when there is none. */
    this._max = this._max ?? 0;
    /** @type {number} Last count. */
    this._count = this._count ?? 0;
    /** @type {boolean} Whether the limit can be exceeded at all. */
    this._soft = this._soft ?? false;
    /** @type {boolean} Whether a custom validity is currently set here. */
    this._invalid = this._invalid ?? false;
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<CounterOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<CounterOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * Last count, in characters or words.
   *
   * @returns {number} The count.
   */
  get count() {
    return this._count;
  }

  /**
   * Resolved limit.
   *
   * @returns {number} The limit, or `0` when the control has none.
   */
  get max() {
    return this._max;
  }

  /**
   * The counted control.
   *
   * @returns {CounterControl} The control.
   */
  get control() {
    return this._control;
  }

  /** @returns {void} */
  _setup() {
    const el = this._element;
    const control = findControl(el);
    // The constructor already rejected this case; this keeps the types simple.
    if (!control) return;
    const doc = el.ownerDocument;
    this._control = control;
    this._slots = [];
    this._saved = new Map();
    this._count = 0;
    this._invalid = false;

    const limit = Number(control.getAttribute("maxlength") ?? 0);
    this._soft = !control.hasAttribute("maxlength");
    this._max = this.options.max > 0 ? this.options.max : Math.max(0, limit);

    const counter = doc.createElement("p");
    counter.className = COUNTER_CLASS;
    counter.setAttribute("aria-live", "polite");
    counter.id = `iv-counter-${++uid}`;
    this._counter = counter;
    this._fill(counter);

    const field = el.closest(FIELD_SELECTOR) ?? el;
    field.append(counter);
    this._describe(counter.id);

    this._listen(control, "input", () => this.update());
    this.update();
  }

  /** @returns {void} */
  _teardown() {
    this._counter.remove();
    this._slots = [];
    if (this._invalid) {
      this._control.setCustomValidity("");
      this._invalid = false;
    }
    for (const [name, value] of this._saved) {
      if (value === null) this._control.removeAttribute(name);
      else this._control.setAttribute(name, value);
    }
    this._saved.clear();
  }

  /**
   * Recounts the control and repaints the counter.
   *
   * @returns {void}
   */
  update() {
    const value = this._control.value ?? "";
    const count =
      this.options.mode === "words" ? (value.match(WORDS) ?? []).length : value.length;
    const max = this._max;
    const remaining = max > 0 ? max - count : 0;
    const over = max > 0 && count > max;
    this._count = count;

    for (const slot of this._slots) {
      const number =
        slot.key === "count" ? count : slot.key === "max" ? max : remaining;
      slot.node.textContent = String(number);
    }
    const warn = !over && max > 0 && count >= Math.ceil(max * this.options.warnAt);
    this._counter.classList.toggle(WARN_CLASS, warn);
    this._counter.classList.toggle(OVER_CLASS, over);
    this._setValidity(over && this._soft);

    emit(this._element, "count", {
      instance: this,
      count,
      max,
      remaining,
      over,
    });
  }

  /**
   * Applies (or lifts) the custom validity of a soft limit.
   *
   * @param {boolean} invalid Whether the control is over its soft limit.
   * @returns {void}
   */
  _setValidity(invalid) {
    if (invalid === this._invalid) return;
    this._invalid = invalid;
    if (invalid) {
      this._control.setCustomValidity(this.options.overText);
      this._remember("aria-invalid");
      this._control.setAttribute("aria-invalid", "true");
      return;
    }
    this._control.setCustomValidity("");
    this._restore("aria-invalid");
  }

  /**
   * Builds the template nodes of the counter.
   *
   * @param {HTMLElement} counter The counter element.
   * @returns {void}
   */
  _fill(counter) {
    const doc = counter.ownerDocument;
    const template =
      this.options.template || (this._max > 0 ? "{count} / {max}" : "{count}");
    for (const part of template.split(TOKENS)) {
      if (part === "") continue;
      if (part === "{count}" || part === "{max}") {
        const span = doc.createElement("span");
        span.className = part === "{count}" ? "iv-counter__value" : "iv-counter__max";
        counter.append(span);
        this._slots.push({ node: span, key: part === "{count}" ? "count" : "max" });
        continue;
      }
      if (part === "{remaining}") {
        const text = doc.createTextNode("");
        counter.append(text);
        this._slots.push({ node: text, key: "remaining" });
        continue;
      }
      counter.append(doc.createTextNode(part));
    }
  }

  /**
   * Adds the id of the counter to `aria-describedby` without repeating ids.
   *
   * @param {string} id Id of the counter.
   * @returns {void}
   */
  _describe(id) {
    const control = this._control;
    const ids = (control.getAttribute("aria-describedby") ?? "")
      .split(/\s+/)
      .filter(Boolean);
    if (ids.includes(id)) return;
    ids.push(id);
    this._remember("aria-describedby");
    control.setAttribute("aria-describedby", ids.join(" "));
  }

  /**
   * Remembers the served value of an attribute of the control, once.
   *
   * @param {string} name Attribute name.
   * @returns {void}
   */
  _remember(name) {
    if (this._saved.has(name)) return;
    this._saved.set(name, this._control.getAttribute(name));
  }

  /**
   * Puts an attribute of the control back to the value the author served.
   *
   * @param {string} name Attribute name.
   * @returns {void}
   */
  _restore(name) {
    if (!this._saved.has(name)) return;
    const value = this._saved.get(name) ?? null;
    if (value === null) this._control.removeAttribute(name);
    else this._control.setAttribute(name, value);
  }
}
