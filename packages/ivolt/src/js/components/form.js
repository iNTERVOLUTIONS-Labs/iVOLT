/**
 * Form validation on top of the native constraint validation API.
 *
 * The served HTML is a plain `<form>` with native attributes (`required`,
 * `type`, `pattern`, `minlength`, `min`, `max`, `step`): without JavaScript the
 * browser validates it and shows its own bubbles. `init` adds `novalidate` and
 * takes over the presentation — a message inside the `.iv-field`, the state
 * classes, an optional summary at the top of the form — and `destroy` puts the
 * served markup back, attribute by attribute.
 *
 * Nothing is ever parsed from a string: every node is built with
 * `createElement` and every message is written with `textContent`. The
 * validity itself always comes from the browser, so a custom validity set by
 * another component (the counter, for instance) is honoured without any
 * coupling between them.
 *
 * @module components/form
 */

import { IvComponent, isElement } from "../core/component.js";
import { IvError } from "../core/registry.js";
import { emit } from "../core/events.js";

/**
 * @typedef {object} FormOptions
 * @property {string} validateOn When fields are validated: `blur`, `input` or `submit`.
 * @property {boolean} summary Whether the errors are also listed at the top of the form.
 * @property {string} summaryTitle Heading of that list.
 * @property {boolean} focusFirst Whether a failed submit moves the focus.
 * @property {boolean} scroll Whether the focused target is scrolled into view.
 * @property {boolean} live Whether error messages are announced while typing.
 */

/** A native control that takes part in constraint validation. */
/** @typedef {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} FormField */

/**
 * One control and the message currently shown for it.
 *
 * @typedef {object} FieldError
 * @property {FormField} control The invalid control.
 * @property {string} message The message shown to the user.
 */

/**
 * What `init` found (or built) around one control, so `destroy` can undo it.
 *
 * @typedef {object} FieldRecord
 * @property {HTMLElement|null} field The `.iv-field` container, when there is one.
 * @property {HTMLElement|null} error The message element, once it is needed.
 * @property {boolean} owned Whether that element was created here.
 * @property {string} text Text the served message element had.
 * @property {string|null} hidden Value of its `hidden` attribute, if it had one.
 */

const FIELD_SELECTOR = ".iv-field";
const ERROR_CLASS = "iv-field__error";
const INVALID_CLASS = "iv-field--invalid";
const VALID_CLASS = "iv-field--valid";
const SHAKE_CLASS = "iv-shake";
const SUMMARY_CLASS = "iv-form__summary";
const SHAKE_MS = 400;
const FIELD_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA"]);
const SKIP_TYPES = new Set(["submit", "reset", "button", "image", "hidden"]);

/**
 * Validity flags in the order the contract checks them, with the suffix of the
 * `data-iv-error-*` attribute that overrides each one.
 *
 * @type {ReadonlyArray<readonly [keyof ValidityState, string]>}
 */
const VALIDITY_KEYS = [
  ["valueMissing", "value-missing"],
  ["typeMismatch", "type-mismatch"],
  ["patternMismatch", "pattern-mismatch"],
  ["tooShort", "too-short"],
  ["tooLong", "too-long"],
  ["rangeUnderflow", "range-underflow"],
  ["rangeOverflow", "range-overflow"],
  ["stepMismatch", "step-mismatch"],
  ["badInput", "bad-input"],
  ["customError", "custom"],
];

/** Serial used for the ids of generated elements. */
let uid = 0;

/**
 * Tells whether an element is a control this component validates.
 *
 * @param {Element} el Candidate.
 * @returns {boolean} `true` for an enabled input, select or textarea.
 */
function isField(el) {
  if (!isElement(el) || !FIELD_TAGS.has(el.tagName)) return false;
  const control = /** @type {FormField} */ (/** @type {unknown} */ (el));
  if (control.disabled) return false;
  if (
    control.tagName === "INPUT" &&
    SKIP_TYPES.has(/** @type {HTMLInputElement} */ (control).type)
  ) {
    return false;
  }
  return control.willValidate !== false;
}

/**
 * Tells whether a control holds something the user entered or chose. Used to
 * decide when the "valid" state is worth showing: an untouched empty optional
 * field gets no green check.
 *
 * @param {FormField} control The control.
 * @returns {boolean} `true` when it has a value.
 */
function hasValue(control) {
  if (control.tagName === "INPUT") {
    const input = /** @type {HTMLInputElement} */ (control);
    if (input.type === "checkbox" || input.type === "radio") return input.checked;
  }
  return control.value !== "";
}

/**
 * Accessible name of a control, used as the label of its summary link.
 *
 * @param {FormField} control The control.
 * @returns {string} The label text, or an empty string.
 */
function labelOf(control) {
  const labels = control.labels;
  const label = labels && labels.length > 0 ? labels[0] : control.closest("label");
  if (label) {
    // The required marker and other decorations are hidden from assistive
    // technology; they have no place in the link either. The label is cloned,
    // never touched.
    const copy = /** @type {HTMLElement} */ (label.cloneNode(true));
    for (const el of copy.querySelectorAll('[aria-hidden="true"]')) el.remove();
    const text = (copy.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text) return text.replace(/[:：]$/, "");
  }
  const aria = control.getAttribute("aria-label");
  return aria ? aria.trim() : "";
}

/**
 * Form component: validation, messages, summary and focus management.
 *
 * @augments IvComponent
 */
export class Form extends IvComponent {
  /** @type {string} */
  static componentName = "form";

  /** @type {Readonly<FormOptions>} */
  static defaults = Object.freeze({
    validateOn: "blur",
    summary: false,
    summaryTitle: "Please fix the following",
    focusFirst: true,
    scroll: true,
    live: true,
  });

  /**
   * Returns the instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Form|undefined} The instance or `undefined`.
   */
  static get(el) {
    return /** @type {Form|undefined} */ (super.get(el));
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<FormOptions>} [options] Options passed in JavaScript.
   * @returns {Form} The instance.
   */
  static getOrCreate(el, options) {
    return /** @type {Form} */ (
      super.getOrCreate(el, /** @type {Record<string, unknown>} */ (options))
    );
  }

  /**
   * Instantiates every `[data-iv-component="form"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Form[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Form[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el A `<form class="iv-form">` element.
   * @param {Partial<FormOptions>} [options] Options passed in JavaScript.
   * @throws {IvError} `invalid-element` when the element is not a `<form>`.
   */
  constructor(el, options) {
    if (!isElement(el)) {
      throw new IvError("invalid-element", "Form requires an element.");
    }
    if (el.tagName !== "FORM") {
      throw new IvError("invalid-element", "Form requires a <form> element.");
    }
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {HTMLFormElement} The enhanced form. */
    this._form = this._form ?? /** @type {HTMLFormElement} */ (el);
    /** @type {Map<Element, Map<string, string|null>>} Attributes to restore. */
    this._saved = this._saved ?? new Map();
    /** @type {Map<FormField, FieldRecord>} What was built around each control. */
    this._records = this._records ?? new Map();
    /** @type {Map<FormField, string>} Message currently shown per control. */
    this._messages = this._messages ?? new Map();
    /** @type {Set<FormField>} Controls the user has already interacted with. */
    this._touched = this._touched ?? new Set();
    /** @type {HTMLElement|null} The summary, when the option is on. */
    this._summary = this._summary ?? null;
    /** @type {boolean} Whether the summary element was created here. */
    this._ownsSummary = this._ownsSummary ?? false;
    /** @type {ChildNode[]} Children the served summary had. */
    this._summaryNodes = this._summaryNodes ?? [];
    /** @type {Set<ReturnType<typeof setTimeout>>} Pending shake timers. */
    this._timers = this._timers ?? new Set();
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<FormOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<FormOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * Controls currently in error, in document order.
   *
   * @returns {FieldError[]} The errors.
   */
  get errors() {
    /** @type {FieldError[]} */
    const out = [];
    for (const control of this.fields) {
      const message = this._messages.get(control);
      if (message) out.push({ control, message });
    }
    return out;
  }

  /**
   * Controls that take part in validation, in document order. Only the first
   * radio of a group is listed: the group shares one validity and one message.
   *
   * @returns {FormField[]} The controls.
   */
  get fields() {
    /** @type {FormField[]} */
    const out = [];
    /** @type {Set<string>} */
    const groups = new Set();
    for (const el of Array.from(this._form.elements)) {
      if (!isField(el)) continue;
      const control = /** @type {FormField} */ (/** @type {unknown} */ (el));
      if (control.tagName === "INPUT") {
        const input = /** @type {HTMLInputElement} */ (control);
        if (input.type === "radio" && input.name) {
          if (groups.has(input.name)) continue;
          groups.add(input.name);
        }
      }
      out.push(control);
    }
    return out;
  }

  /** @returns {void} */
  _setup() {
    const form = /** @type {HTMLFormElement} */ (this._element);
    this._form = form;
    this._saved = new Map();
    this._records = new Map();
    this._messages = new Map();
    this._touched = new Set();
    this._summary = null;
    this._ownsSummary = false;
    this._summaryNodes = [];
    this._timers = new Set();

    this._set(form, "novalidate", "");
    if (this.options.summary) this._buildSummary();

    this._listen(form, "submit", /** @type {EventListener} */ (
      (event) => this._onSubmit(/** @type {SubmitEvent} */ (event))
    ));
    this._listen(form, "reset", () => this.reset());
    const when = this.options.validateOn;
    if (when === "blur") {
      this._listen(form, "focusout", /** @type {EventListener} */ (
        (event) => this._onFocusOut(event)
      ));
    }
    if (when === "blur" || when === "input") {
      this._listen(form, "input", /** @type {EventListener} */ (
        (event) => this._onInput(event)
      ));
      this._listen(form, "change", /** @type {EventListener} */ (
        (event) => this._onInput(event)
      ));
    }
  }

  /** @returns {void} */
  _teardown() {
    for (const timer of this._timers) clearTimeout(timer);
    this._timers.clear();
    for (const control of Array.from(this._records.keys())) {
      this._clearField(control, false);
    }
    for (const record of this._records.values()) {
      if (!record.error) continue;
      if (record.owned) record.error.remove();
    }
    this._records.clear();
    this._messages.clear();
    this._touched.clear();
    this._restoreSummary();
    for (const [el, attributes] of this._saved) {
      for (const [name, value] of attributes) {
        if (value === null) el.removeAttribute(name);
        else el.setAttribute(name, value);
      }
    }
    this._saved.clear();
  }

  /**
   * Validates every control and applies the resulting state.
   *
   * @returns {boolean} `true` when the form has no errors.
   */
  validate() {
    let valid = true;
    for (const control of this.fields) {
      this._touched.add(control);
      if (!this.validateField(control)) valid = false;
    }
    this._updateSummary();
    return valid;
  }

  /**
   * Validates one control and applies the resulting state.
   *
   * @param {Element} control The control to validate.
   * @returns {boolean} `true` when the control has no error.
   */
  validateField(control) {
    if (!isField(control)) return true;
    const field = /** @type {FormField} */ (/** @type {unknown} */ (control));
    const message = this._resolve(field);
    if (message) {
      this._messages.set(field, message);
      this._showError(field, message);
      return false;
    }
    this._messages.delete(field);
    this._clearField(field, this._touched.has(field));
    return true;
  }

  /**
   * Clears every state this component applied, as after a `reset` of the form.
   *
   * @returns {void}
   */
  reset() {
    for (const control of Array.from(this._records.keys())) {
      this._clearField(control, false);
    }
    this._messages.clear();
    this._touched.clear();
    this._updateSummary();
  }

  /**
   * Resolves the message of a control: the browser validity first, then the
   * author overrides, then any listener of `iv:validate`.
   *
   * @param {FormField} control The control.
   * @returns {string} The message, or an empty string when the control is valid.
   */
  _resolve(control) {
    let message = this._messageFor(control);
    const setError = /** @param {string} value @returns {void} */ (value) => {
      message = typeof value === "string" ? value : String(value);
    };
    emit(control, "validate", { instance: this, control, message, setError });
    return message;
  }

  /**
   * Message the browser and the author attributes give for a control.
   *
   * @param {FormField} control The control.
   * @returns {string} The message, or an empty string when the control is valid.
   */
  _messageFor(control) {
    const validity = control.validity;
    if (validity.valid) return "";
    for (const [key, suffix] of VALIDITY_KEYS) {
      if (!validity[key]) continue;
      const custom = control.getAttribute(`data-iv-error-${suffix}`);
      if (custom !== null) return custom;
    }
    const generic = control.getAttribute("data-iv-error");
    if (generic !== null) return generic;
    return control.validationMessage;
  }

  /**
   * Shows the message of a control and marks its field invalid.
   *
   * @param {FormField} control The control.
   * @param {string} message The message.
   * @returns {void}
   */
  _showError(control, message) {
    const record = this._record(control);
    const error = this._errorElement(control, record);
    error.textContent = message;
    if (error.hasAttribute("hidden")) error.removeAttribute("hidden");
    this._set(control, "aria-invalid", "true");
    this._describe(control, error.id);
    if (record.field) {
      record.field.classList.add(INVALID_CLASS);
      record.field.classList.remove(VALID_CLASS);
    }
  }

  /**
   * Removes the error state of a control.
   *
   * @param {FormField} control The control.
   * @param {boolean} markValid Whether the "valid" state should be shown.
   * @returns {void}
   */
  _clearField(control, markValid) {
    // A control that never failed has no record yet; the "valid" state needs
    // one all the same, and an empty record restores nothing on destroy.
    const record = this._record(control);
    const error = record.error;
    if (error) {
      error.textContent = record.owned ? "" : record.text;
      if (!record.owned && record.hidden !== null) {
        error.setAttribute("hidden", record.hidden);
      }
    }
    this._restore(control, "aria-invalid");
    this._restore(control, "aria-describedby");
    if (record.field) {
      record.field.classList.remove(INVALID_CLASS, SHAKE_CLASS);
      if (markValid && hasValue(control)) record.field.classList.add(VALID_CLASS);
      else record.field.classList.remove(VALID_CLASS);
    }
  }

  /**
   * Returns the bookkeeping record of a control, creating it on first use.
   *
   * @param {FormField} control The control.
   * @returns {FieldRecord} The record.
   */
  _record(control) {
    let record = this._records.get(control);
    if (record) return record;
    const field = /** @type {HTMLElement|null} */ (control.closest(FIELD_SELECTOR));
    record = { field, error: null, owned: false, text: "", hidden: null };
    this._records.set(control, record);
    return record;
  }

  /**
   * Returns the message element of a control: the one the author served inside
   * the field (or referenced by `aria-describedby`) if there is one, a new
   * `<p class="iv-field__error">` otherwise.
   *
   * @param {FormField} control The control.
   * @param {FieldRecord} record Bookkeeping record of the control.
   * @returns {HTMLElement} The message element.
   */
  _errorElement(control, record) {
    if (record.error) return record.error;
    const doc = control.ownerDocument;
    let error = record.field
      ? /** @type {HTMLElement|null} */ (record.field.querySelector(`.${ERROR_CLASS}`))
      : null;
    if (!error) error = this._describedError(control);
    if (error) {
      record.owned = false;
      record.text = error.textContent ?? "";
      record.hidden = error.getAttribute("hidden");
    } else {
      error = doc.createElement("p");
      error.className = ERROR_CLASS;
      record.owned = true;
      const parent = record.field ?? control.parentElement;
      if (record.field) record.field.append(error);
      else if (parent) control.after(error);
    }
    if (!error.id) this._set(error, "id", `iv-error-${++uid}`);
    this._set(error, "role", "alert");
    this._set(error, "aria-live", this.options.live ? "polite" : "off");
    record.error = error;
    return error;
  }

  /**
   * Looks for a served message element among the ids of `aria-describedby`.
   *
   * @param {FormField} control The control.
   * @returns {HTMLElement|null} The element, or `null`.
   */
  _describedError(control) {
    const described = control.getAttribute("aria-describedby");
    if (!described) return null;
    const doc = control.ownerDocument;
    for (const id of described.split(/\s+/)) {
      if (!id) continue;
      const el = doc.getElementById(id);
      if (el && el.classList.contains(ERROR_CLASS)) {
        return /** @type {HTMLElement} */ (el);
      }
    }
    return null;
  }

  /**
   * Adds an id to `aria-describedby` without repeating what is already there.
   *
   * @param {FormField} control The control.
   * @param {string} id Id of the message element.
   * @returns {void}
   */
  _describe(control, id) {
    const current = control.getAttribute("aria-describedby") ?? "";
    const ids = current.split(/\s+/).filter(Boolean);
    if (ids.includes(id)) return;
    ids.push(id);
    this._set(control, "aria-describedby", ids.join(" "));
  }

  /**
   * Builds (or adopts) the summary shown at the top of the form.
   *
   * @returns {void}
   */
  _buildSummary() {
    const form = this._form;
    const doc = form.ownerDocument;
    let summary = /** @type {HTMLElement|null} */ (
      form.querySelector(`.${SUMMARY_CLASS}`)
    );
    if (summary) {
      this._ownsSummary = false;
      this._summaryNodes = Array.from(summary.childNodes);
    } else {
      summary = doc.createElement("div");
      summary.className = SUMMARY_CLASS;
      this._ownsSummary = true;
      this._summaryNodes = [];
      form.prepend(summary);
    }
    this._set(summary, "role", "alert");
    this._set(summary, "tabindex", "-1");
    this._set(summary, "hidden", "");
    this._summary = summary;
    this._listen(summary, "click", /** @type {EventListener} */ (
      (event) => this._onSummaryClick(event)
    ));
  }

  /**
   * Fills the summary with the current errors, or hides it when there are none.
   *
   * @returns {void}
   */
  _updateSummary() {
    const summary = this._summary;
    if (!summary) return;
    const errors = this.errors;
    if (errors.length === 0) {
      summary.replaceChildren();
      summary.setAttribute("hidden", "");
      return;
    }
    const doc = summary.ownerDocument;
    const title = doc.createElement("p");
    title.className = "iv-form__summary-title";
    title.textContent = this.options.summaryTitle;
    const list = doc.createElement("ul");
    list.className = "iv-form__summary-list";
    for (const { control, message } of errors) {
      if (!control.id) this._set(control, "id", `iv-control-${++uid}`);
      const item = doc.createElement("li");
      const link = doc.createElement("a");
      link.href = `#${control.id}`;
      const label = labelOf(control);
      link.textContent = label ? `${label}: ${message}` : message;
      item.append(link);
      list.append(item);
    }
    summary.replaceChildren(title, list);
    summary.removeAttribute("hidden");
  }

  /**
   * Puts the served summary back, or removes the generated one.
   *
   * @returns {void}
   */
  _restoreSummary() {
    const summary = this._summary;
    if (!summary) return;
    if (this._ownsSummary) summary.remove();
    else summary.replaceChildren(...this._summaryNodes);
    this._summary = null;
    this._summaryNodes = [];
  }

  /**
   * Moves the focus to a control from the summary.
   *
   * @param {Event} event The click.
   * @returns {void}
   */
  _onSummaryClick(event) {
    const target = event.target;
    if (!isElement(target)) return;
    const link = /** @type {HTMLAnchorElement|null} */ (target.closest("a[href^='#']"));
    if (!link || !this._summary || !this._summary.contains(link)) return;
    const id = link.getAttribute("href")?.slice(1) ?? "";
    const control = id ? this._form.ownerDocument.getElementById(id) : null;
    if (!control) return;
    event.preventDefault();
    this._focus(/** @type {HTMLElement} */ (control));
  }

  /**
   * Validates the control that lost the focus.
   *
   * @param {Event} event The `focusout`.
   * @returns {void}
   */
  _onFocusOut(event) {
    const target = event.target;
    if (!isElement(target) || !isField(target)) return;
    const control = /** @type {FormField} */ (/** @type {unknown} */ (target));
    this._touched.add(control);
    this.validateField(control);
    this._updateSummary();
  }

  /**
   * Validates while typing: always with `validateOn: "input"`, and only on a
   * control that is already showing an error with `validateOn: "blur"`.
   *
   * @param {Event} event The `input` or `change`.
   * @returns {void}
   */
  _onInput(event) {
    const target = event.target;
    if (!isElement(target) || !isField(target)) return;
    const control = /** @type {FormField} */ (/** @type {unknown} */ (target));
    if (this.options.validateOn === "input") this._touched.add(control);
    else if (!this._messages.has(control)) return;
    this.validateField(control);
    this._updateSummary();
  }

  /**
   * Validates on submit: a failed form never reaches the server, and a valid
   * one can still be held back by cancelling `iv:valid`.
   *
   * @param {SubmitEvent} event The `submit`.
   * @returns {void}
   */
  _onSubmit(event) {
    if (this.validate()) {
      const ok = emit(this._form, "valid", { instance: this }, { cancelable: true });
      if (!ok) event.preventDefault();
      return;
    }
    event.preventDefault();
    const errors = this.errors;
    this._shake();
    if (this.options.focusFirst) {
      const first = this._summary ?? (errors[0] ? errors[0].control : null);
      if (first) this._focus(/** @type {HTMLElement} */ (first));
    }
    emit(this._form, "invalid", { instance: this, errors });
  }

  /**
   * Focuses a target and, when asked to, brings it into view.
   *
   * @param {HTMLElement} target Element to focus.
   * @returns {void}
   */
  _focus(target) {
    if (this.options.scroll && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "center" });
    }
    if (typeof target.focus === "function") target.focus();
  }

  /**
   * Shakes the invalid fields for a moment, unless the user asked for less
   * motion.
   *
   * @returns {void}
   */
  _shake() {
    const view = this._form.ownerDocument.defaultView;
    if (view && typeof view.matchMedia === "function") {
      if (view.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    }
    for (const record of this._records.values()) {
      const field = record.field;
      if (!field || !field.classList.contains(INVALID_CLASS)) continue;
      field.classList.add(SHAKE_CLASS);
      const timer = setTimeout(() => {
        this._timers.delete(timer);
        field.classList.remove(SHAKE_CLASS);
      }, SHAKE_MS);
      this._timers.add(timer);
    }
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
    if (attributes.has(name)) return;
    attributes.set(name, el.getAttribute(name));
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
   * Puts a managed attribute back to the value the author served.
   *
   * @param {Element} el Target element.
   * @param {string} name Attribute name.
   * @returns {void}
   */
  _restore(el, name) {
    const attributes = this._saved.get(el);
    if (!attributes || !attributes.has(name)) return;
    const value = attributes.get(name) ?? null;
    if (value === null) el.removeAttribute(name);
    else el.setAttribute(name, value);
  }
}
