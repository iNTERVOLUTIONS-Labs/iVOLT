/**
 * Stepper: a long form split into steps (API_CONTRACT §8.17).
 *
 * The served HTML is an `<ol>` of anchor links plus one `<section>` per step,
 * each with its own heading: without JavaScript every panel is visible, one
 * under the other, and the index links jump to them. `init` folds the panels,
 * marks the state of each step, validates before advancing and announces the
 * position in a polite live region; `destroy` puts the served markup back.
 *
 * Validation is delegated, never reimplemented: inside a `<form>` that has a
 * `Form` instance the panel's controls go through `validateField`, so the
 * messages and the error styling are the ones of §8.7. Anywhere else the
 * browser's own `reportValidity()` stops the advance.
 *
 * @module components/stepper
 */

import { IvComponent, isElement } from "../core/component.js";
import { getInstance } from "../core/registry.js";
import { emit } from "../core/events.js";
import { rememberStyle, restoreStyles } from "../core/style.js";
import {
  KEY_ARROW_LEFT,
  KEY_ARROW_RIGHT,
  KEY_END,
  KEY_HOME,
  KEY_SPACE,
} from "../core/keys.js";

/**
 * @typedef {object} StepperOptions
 * @property {boolean} linear Only the steps already done and the current one can be reached from the index.
 * @property {boolean} validate Validate the current panel before advancing.
 * @property {boolean} hash Mirror the current panel in `location.hash`.
 * @property {"panel"|"none"} focus Where focus lands after a step change.
 * @property {string} statusText Template announced in the live region.
 */

/**
 * @typedef {"trigger"|"next"|"prev"|"api"|"hash"} StepperReason
 */

/**
 * @typedef {"done"|"current"|"upcoming"|"error"} StepperState
 */

/**
 * One step and the parts it owns.
 *
 * @typedef {object} StepperEntry
 * @property {HTMLElement} step The `__step` element.
 * @property {HTMLElement} trigger Its `__trigger`.
 * @property {HTMLElement} panel The panel it points at.
 * @property {HTMLElement|null} label Its `__label`, when it has one.
 * @property {string} name Text of the label, read before anything was added to it.
 */

/**
 * A native control that takes part in constraint validation.
 *
 * @typedef {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} StepperField
 */

const ROOT_SELECTOR = ".iv-stepper";
const LIST_SELECTOR = ".iv-stepper__list";
const STEP_SELECTOR = ".iv-stepper__step";
const TRIGGER_SELECTOR = ".iv-stepper__trigger";
const LABEL_SELECTOR = ".iv-stepper__label";
const PANEL_SELECTOR = ".iv-stepper__panel";
const CONTROL_SELECTOR = "[data-iv-step]";
const CONTROLS_SELECTOR = ".iv-stepper__controls";
const FIELD_SELECTOR = "input, select, textarea";
const STATUS_CLASS = "iv-stepper__status";
const SR_ONLY_CLASS = "iv-u-sr-only";
const STATE_ATTR = "data-iv-state";
const PROGRESS_PROPERTY = "--iv-stepper-progress";

/** Text appended to the label of a step in error, for screen readers only. */
const ERROR_TEXT = " has errors";

/** The states a step may take. */
const STATES = new Set(["done", "current", "upcoming", "error"]);

/**
 * Step-by-step assistant component.
 *
 * @augments IvComponent
 */
export class Stepper extends IvComponent {
  /** @type {string} */
  static componentName = "stepper";

  /** @type {Readonly<StepperOptions>} */
  static defaults = Object.freeze({
    linear: true,
    validate: true,
    hash: false,
    focus: "panel",
    statusText: "Step {index} of {total}: {label}",
  });

  /**
   * Returns the stepper instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Stepper|undefined} The instance or `undefined`.
   */
  static get(el) {
    const inst = super.get(el);
    return inst instanceof Stepper ? inst : undefined;
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<StepperOptions>} [options] Options passed in JavaScript.
   * @returns {Stepper} The instance.
   */
  static getOrCreate(el, options) {
    return this.get(el) ?? new Stepper(el, options);
  }

  /**
   * Instantiates every `[data-iv-component="stepper"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Stepper[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Stepper[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el The `.iv-stepper` container.
   * @param {Partial<StepperOptions>} [options] Options passed in JavaScript.
   */
  constructor(el, options) {
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {Map<Element, Map<string, string|null>>} Attributes to restore. */
    this._saved = this._saved ?? new Map();
    /** @type {StepperEntry[]} The steps, in document order. */
    this._entries = this._entries ?? [];
    /** @type {number} Index of the current step. */
    this._index = this._index ?? 0;
    /** @type {number} Furthest step reached, which stays reachable when going back. */
    this._furthest = this._furthest ?? 0;
    /** @type {Map<number, StepperState>} States forced through `setState`. */
    this._overrides = this._overrides ?? new Map();
    /** @type {Map<number, HTMLElement>} Screen-reader error notes this instance added. */
    this._notes = this._notes ?? new Map();
    /** @type {HTMLElement|null} The live region this instance added. */
    this._status = this._status ?? null;
    /** @type {Map<Element, string|null>} `style` attributes as served. */
    this._styles = this._styles ?? new Map();
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<StepperOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<StepperOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * Index of the current step, zero based.
   *
   * @returns {number} The index.
   */
  get index() {
    return this._index;
  }

  /**
   * The `__step` elements, in document order.
   *
   * @returns {HTMLElement[]} The steps.
   */
  get steps() {
    return this._entries.map((entry) => entry.step);
  }

  /**
   * Whether the current step is the first one.
   *
   * @returns {boolean} `true` on the first step.
   */
  get isFirst() {
    return this._index <= 0;
  }

  /**
   * Whether the current step is the last one.
   *
   * @returns {boolean} `true` on the last step.
   */
  get isLast() {
    return this._index >= this._entries.length - 1;
  }

  /** @returns {void} */
  _setup() {
    this._saved = new Map();
    this._entries = [];
    this._index = 0;
    this._furthest = 0;
    this._overrides = new Map();
    this._notes = new Map();
    this._status = null;

    const root = this._element;
    const doc = root.ownerDocument;
    const list = root.querySelector(LIST_SELECTOR);
    const steps = list
      ? Array.from(list.querySelectorAll(STEP_SELECTOR)).filter((step) => this._owns(step))
      : [];

    for (const node of steps) {
      const step = /** @type {HTMLElement} */ (node);
      const trigger = /** @type {HTMLElement|null} */ (step.querySelector(TRIGGER_SELECTOR));
      const panel = trigger ? this._panelFor(trigger) : null;
      // Missing target: the link keeps its plain behaviour and the step is not managed.
      if (!trigger || !panel) continue;
      const label = /** @type {HTMLElement|null} */ (step.querySelector(LABEL_SELECTOR));
      this._entries.push({
        step,
        trigger,
        panel,
        label,
        name: ((label ?? trigger).textContent ?? "").replace(/\s+/g, " ").trim(),
      });
    }
    if (this._entries.length === 0) return;

    this._index = this._initialIndex();
    this._furthest = this._index;

    for (const entry of this._entries) {
      this._remember(entry.step, STATE_ATTR);
      this._remember(entry.trigger, "aria-current");
      this._remember(entry.trigger, "aria-disabled");
      this._remember(entry.trigger, "tabindex");
      this._remember(entry.panel, "hidden");
      if (!entry.panel.hasAttribute("tabindex")) this._set(entry.panel, "tabindex", "-1");
    }
    // The served controls do nothing without JavaScript, so a fixture may hide
    // the whole row; `init` is what makes them worth showing.
    for (const button of root.querySelectorAll(`${CONTROL_SELECTOR}, ${CONTROLS_SELECTOR}`)) {
      if (this._owns(button)) this._unset(button, "hidden");
    }

    const status = doc.createElement("p");
    status.className = `${STATUS_CLASS} ${SR_ONLY_CLASS}`;
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    root.appendChild(status);
    this._status = status;

    /** @type {Map<Element, string|null>} `style` attributes as served. */
    this._styles = new Map();

    this._render();

    this._listen(root, "click", (event) => this._onClick(event));
    this._listen(root, "keydown", (event) => this._onKeydown(event));
    if (this.options.hash === true) {
      const view = doc.defaultView;
      if (view) this._listen(view, "hashchange", () => this._onHashChange());
    }
  }

  /** @returns {void} */
  _teardown() {
    for (const note of this._notes.values()) note.remove();
    this._notes.clear();
    if (this._status) {
      this._status.remove();
      this._status = null;
    }
    restoreStyles(this._styles);
    this._entries = [];
    this._overrides.clear();
    for (const [el, attributes] of this._saved) {
      for (const [name, value] of attributes) {
        if (value === null) el.removeAttribute(name);
        else el.setAttribute(name, value);
      }
    }
    this._saved.clear();
  }

  /**
   * Tells whether a descendant belongs to this instance and not to a nested stepper.
   *
   * @param {Element} el Candidate descendant.
   * @returns {boolean} `true` when the closest `.iv-stepper` is this element.
   */
  _owns(el) {
    return el.closest(ROOT_SELECTOR) === this._element;
  }

  /**
   * Resolves the panel a trigger points at through its `href` hash.
   *
   * @param {Element} trigger Trigger element.
   * @returns {HTMLElement|null} The panel, or `null` when it does not exist.
   */
  _panelFor(trigger) {
    const href = trigger.getAttribute("href") ?? "";
    const id = href.startsWith("#") ? href.slice(1) : "";
    if (!id) return null;
    for (const panel of this._element.querySelectorAll(PANEL_SELECTOR)) {
      if (panel.id === id && this._owns(panel)) return /** @type {HTMLElement} */ (panel);
    }
    return null;
  }

  /**
   * The step to start on: the hash when `hash` is on, then the step the author
   * marked as current, then the first one.
   *
   * @returns {number} The starting index.
   */
  _initialIndex() {
    if (this.options.hash === true) {
      const view = this._element.ownerDocument.defaultView;
      const hash = view && view.location ? view.location.hash.slice(1) : "";
      if (hash) {
        const found = this._entries.findIndex((entry) => entry.panel.id === hash);
        if (found >= 0) return found;
      }
    }
    const marked = this._entries.findIndex(
      (entry) =>
        entry.trigger.getAttribute("aria-current") === "step" ||
        entry.step.getAttribute(STATE_ATTR) === "current"
    );
    return marked >= 0 ? marked : 0;
  }

  /**
   * Remembers the current value of an attribute, once per element.
   *
   * @param {Element} el Element to remember.
   * @param {string} name Attribute name.
   * @returns {void}
   */
  _remember(el, name) {
    let attributes = this._saved.get(el);
    if (!attributes) {
      attributes = new Map();
      this._saved.set(el, attributes);
    }
    if (!attributes.has(name)) attributes.set(name, el.getAttribute(name));
  }

  /**
   * Sets a managed attribute, remembering its previous value.
   *
   * @param {Element} el Target element.
   * @param {string} name Attribute name.
   * @param {string} value Attribute value.
   * @returns {void}
   */
  _set(el, name, value) {
    this._remember(el, name);
    el.setAttribute(name, value);
  }

  /**
   * Removes a managed attribute, remembering its previous value.
   *
   * @param {Element} el Target element.
   * @param {string} name Attribute name.
   * @returns {void}
   */
  _unset(el, name) {
    this._remember(el, name);
    el.removeAttribute(name);
  }

  /**
   * The state a step shows: what `setState` forced, or the position of the
   * step relative to the current one.
   *
   * @param {number} index Step index.
   * @returns {StepperState} The state.
   */
  _stateOf(index) {
    const forced = this._overrides.get(index);
    if (forced) return forced;
    if (index === this._index) return "current";
    return index < this._index ? "done" : "upcoming";
  }

  /**
   * Whether a step can be reached from the index. Without `linear` every step
   * is reachable; with it, the ones already done and the current one are.
   *
   * @param {number} index Step index.
   * @returns {boolean} `true` when the trigger is active.
   */
  _reachable(index) {
    if (this.options.linear !== true) return true;
    return index <= Math.max(this._index, this._furthest);
  }

  /**
   * Writes the whole visible state: step states, reachability, panels, the
   * progress custom property and the live region.
   *
   * @returns {void}
   */
  _render() {
    const total = this._entries.length;
    for (let i = 0; i < total; i += 1) {
      const entry = this._entries[i];
      const state = this._stateOf(i);
      this._set(entry.step, STATE_ATTR, state);
      if (i === this._index) this._set(entry.trigger, "aria-current", "step");
      else this._unset(entry.trigger, "aria-current");
      if (this._reachable(i)) {
        this._unset(entry.trigger, "aria-disabled");
        this._unset(entry.trigger, "tabindex");
      } else {
        this._set(entry.trigger, "aria-disabled", "true");
        this._set(entry.trigger, "tabindex", "-1");
      }
      if (i === this._index) this._unset(entry.panel, "hidden");
      else this._set(entry.panel, "hidden", "");
      this._syncNote(i, state === "error");
    }

    const style = /** @type {HTMLElement} */ (this._element).style;
    if (style) {
      const ratio = total > 1 ? this._index / (total - 1) : 1;
      rememberStyle(this._styles, this._element);
      style.setProperty(PROGRESS_PROPERTY, String(Math.round(ratio * 1000) / 1000));
    }

    if (this._status) {
      const entry = this._entries[this._index];
      this._status.textContent = String(this.options.statusText)
        .replace("{index}", String(this._index + 1))
        .replace("{total}", String(total))
        .replace("{label}", entry ? entry.name : "");
    }
  }

  /**
   * Adds or removes the screen-reader note of a step in error. The note is a
   * node built here and written with `textContent`, never parsed markup.
   *
   * @param {number} index Step index.
   * @param {boolean} wanted Whether the step is in error.
   * @returns {void}
   */
  _syncNote(index, wanted) {
    const existing = this._notes.get(index);
    if (wanted === Boolean(existing)) return;
    const entry = this._entries[index];
    if (!entry) return;
    if (!wanted) {
      if (existing) existing.remove();
      this._notes.delete(index);
      return;
    }
    const host = entry.label ?? entry.trigger;
    const note = this._element.ownerDocument.createElement("span");
    note.className = SR_ONLY_CLASS;
    note.textContent = ERROR_TEXT;
    host.appendChild(note);
    this._notes.set(index, note);
  }

  /**
   * The triggers the arrow keys move between: the reachable ones.
   *
   * @returns {HTMLElement[]} The triggers, in document order.
   */
  _activeTriggers() {
    /** @type {HTMLElement[]} */
    const out = [];
    for (let i = 0; i < this._entries.length; i += 1) {
      if (this._reachable(i)) out.push(this._entries[i].trigger);
    }
    return out;
  }

  /**
   * The index of the step a descendant belongs to.
   *
   * @param {Element} target Element inside the stepper.
   * @returns {number} The index, or `-1`.
   */
  _indexOf(target) {
    return this._entries.findIndex(
      (entry) => entry.step.contains(target) || entry.panel.contains(target)
    );
  }

  /**
   * Index steps and the `data-iv-step` buttons. The triggers are anchors: they
   * never navigate while JavaScript runs, so the hash only changes when the
   * `hash` option asks for it.
   *
   * @param {Event} event Click event.
   * @returns {void}
   */
  _onClick(event) {
    const target = event.target;
    if (!isElement(target)) return;

    const trigger = target.closest(TRIGGER_SELECTOR);
    if (trigger && this._owns(trigger)) {
      event.preventDefault();
      const index = this._entries.findIndex((entry) => entry.trigger === trigger);
      if (index >= 0 && this._reachable(index)) this.go(index, "trigger");
      return;
    }

    const control = target.closest(CONTROL_SELECTOR);
    if (!control || !this._owns(control)) return;
    const direction = control.getAttribute("data-iv-step");
    if (direction === "next") this.next();
    else if (direction === "prev") this.prev();
  }

  /**
   * Arrow keys along the index, and Space on a trigger (Enter already produces
   * a click on an anchor).
   *
   * @param {Event} event Keydown event.
   * @returns {void}
   */
  _onKeydown(event) {
    const key = /** @type {KeyboardEvent} */ (event).key;
    const target = event.target;
    if (!isElement(target)) return;
    const trigger = target.closest(TRIGGER_SELECTOR);
    if (!trigger || !this._owns(trigger)) return;

    if (key === KEY_SPACE) {
      event.preventDefault();
      const index = this._entries.findIndex((entry) => entry.trigger === trigger);
      if (index >= 0 && this._reachable(index)) this.go(index, "trigger");
      return;
    }

    const triggers = this._activeTriggers();
    const position = triggers.indexOf(/** @type {HTMLElement} */ (trigger));
    if (position < 0 || triggers.length === 0) return;
    const last = triggers.length - 1;
    let next = -1;
    if (key === KEY_ARROW_RIGHT) next = position === last ? 0 : position + 1;
    else if (key === KEY_ARROW_LEFT) next = position === 0 ? last : position - 1;
    else if (key === KEY_HOME) next = 0;
    else if (key === KEY_END) next = last;
    else return;
    event.preventDefault();
    triggers[next].focus();
  }

  /**
   * Follows the hash when the `hash` option is on.
   *
   * @returns {void}
   */
  _onHashChange() {
    const view = this._element.ownerDocument.defaultView;
    const hash = view && view.location ? view.location.hash.slice(1) : "";
    if (!hash) return;
    const index = this._entries.findIndex((entry) => entry.panel.id === hash);
    if (index >= 0 && index !== this._index) this.go(index, "hash");
  }

  /**
   * Mirrors the current panel in the address bar. `replaceState` is preferred:
   * writing `location.hash` would scroll the page to the panel.
   *
   * @returns {void}
   */
  _syncHash() {
    if (this.options.hash !== true) return;
    const entry = this._entries[this._index];
    const view = this._element.ownerDocument.defaultView;
    if (!entry || !entry.panel.id || !view) return;
    const target = `#${entry.panel.id}`;
    if (view.location && view.location.hash === target) return;
    if (view.history && typeof view.history.replaceState === "function") {
      view.history.replaceState(null, "", target);
    } else if (view.location) {
      view.location.hash = target;
    }
  }

  /**
   * Validates the controls of one panel.
   *
   * @param {number} index Step index.
   * @returns {boolean} `true` when nothing is invalid.
   */
  _validate(index) {
    const entry = this._entries[index];
    if (!entry) return true;
    /** @type {StepperField[]} */
    const controls = [];
    for (const node of entry.panel.querySelectorAll(FIELD_SELECTOR)) {
      const control = /** @type {StepperField} */ (/** @type {unknown} */ (node));
      if (control.willValidate === false) continue;
      controls.push(control);
    }
    if (controls.length === 0) return true;

    const form = entry.panel.closest("form");
    const instance = form
      ? /** @type {{ validateField?: (control: Element) => boolean }} */ (
          /** @type {unknown} */ (getInstance(form, "form"))
        )
      : null;

    /** @type {StepperField|null} */
    let firstInvalid = null;
    if (instance && typeof instance.validateField === "function") {
      // Every control is validated, not only the first one: the form component
      // paints one message per field and the user should see them all at once.
      for (const control of controls) {
        if (!instance.validateField(control) && !firstInvalid) firstInvalid = control;
      }
    } else {
      for (const control of controls) {
        if (typeof control.checkValidity === "function" && !control.checkValidity()) {
          firstInvalid = control;
          break;
        }
      }
      if (firstInvalid && typeof firstInvalid.reportValidity === "function") {
        firstInvalid.reportValidity();
      }
    }
    if (!firstInvalid) return true;
    if (typeof firstInvalid.focus === "function") firstInvalid.focus();
    return false;
  }

  /**
   * Goes to a step. Emits the cancelable `iv:change` first.
   *
   * The reachability rule of `linear` guards the index, not this method: the
   * API is the way a consumer jumps wherever its own flow needs to.
   *
   * @param {number} index Zero based step index.
   * @param {StepperReason} [reason] Why the step changes.
   * @returns {void}
   */
  go(index, reason = "api") {
    const target = Math.trunc(Number(index));
    if (!Number.isFinite(target)) return;
    if (target < 0 || target >= this._entries.length) return;
    const previousIndex = this._index;
    if (target === previousIndex) return;
    const allowed = emit(
      this._element,
      "change",
      { instance: this, index: target, previousIndex, reason },
      { cancelable: true }
    );
    if (!allowed) return;
    this._index = target;
    this._furthest = Math.max(this._furthest, target);
    this._overrides.delete(target);
    this._render();
    this._syncHash();
    if (this.options.focus === "panel") {
      const panel = this._entries[target].panel;
      if (typeof panel.focus === "function") panel.focus();
    }
    emit(this._element, "changed", {
      instance: this,
      index: target,
      previousIndex,
      reason,
    });
  }

  /**
   * Validates the current panel and advances. On the last step it emits
   * `iv:complete` instead: submitting is the consumer's business.
   *
   * @returns {void}
   */
  next() {
    if (this._entries.length === 0) return;
    if (this.options.validate === true && !this._validate(this._index)) {
      this.setState(this._index, "error");
      return;
    }
    this._overrides.delete(this._index);
    if (this.isLast) {
      this._render();
      emit(this._element, "complete", { instance: this, index: this._index });
      return;
    }
    this.go(this._index + 1, "next");
  }

  /**
   * Goes back one step. Never validates: a user must always be able to return.
   *
   * @returns {void}
   */
  prev() {
    if (this.isFirst) return;
    this.go(this._index - 1, "prev");
  }

  /**
   * Returns to the first step and clears every forced state.
   *
   * @returns {void}
   */
  reset() {
    this._overrides.clear();
    this._furthest = 0;
    if (this._index === 0) {
      this._render();
      this._syncHash();
      return;
    }
    this.go(0, "api");
  }

  /**
   * Forces the state shown by one step. The forced state survives until that
   * step is entered again. `"error"` also adds a screen-reader note to the
   * label, because a colour alone is not a state.
   *
   * @param {number} index Zero based step index.
   * @param {StepperState} state The state to show.
   * @returns {void}
   */
  setState(index, state) {
    const target = Math.trunc(Number(index));
    if (!Number.isFinite(target)) return;
    if (target < 0 || target >= this._entries.length) return;
    if (!STATES.has(state)) {
      console.warn(`[iVOLT] Unknown state "${state}" for "stepper"; ignored.`);
      return;
    }
    this._overrides.set(target, state);
    this._render();
  }
}
