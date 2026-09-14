/**
 * Combobox: a text input with a filtered listbox (APG combobox pattern with
 * list autocomplete).
 *
 * The served HTML is a labelled `<input list="…">` plus a `<datalist>`: without
 * JavaScript the browser shows its own suggestions, so the control is already
 * usable (ADR-020). `init` promotes the input to `role="combobox"`, builds a
 * `<ul role="listbox">` from the `<option>` elements of the datalist, filters
 * it while the user types and adds the keyboard pattern; `destroy` removes the
 * list and restores every attribute it touched, `list` included.
 *
 * The datalist stays in the DOM as the data source (browsers never render it)
 * and every node of the listbox is built with `createElement` and
 * `textContent`: no markup is ever parsed from a string.
 *
 * Focus never leaves the input. The highlighted option is announced through
 * `aria-activedescendant`, which is why pointer selection listens to
 * `pointerdown` and cancels it: the default would blur the input.
 *
 * @module components/combobox
 */

import { IvComponent, isElement } from "../core/component.js";
import { IvError, getInstance } from "../core/registry.js";
import { emit } from "../core/events.js";
import {
  KEY_ARROW_DOWN,
  KEY_ARROW_UP,
  KEY_END,
  KEY_ENTER,
  KEY_ESCAPE,
  KEY_HOME,
  KEY_TAB,
} from "../core/keys.js";

/**
 * @typedef {object} ComboboxOptions
 * @property {"contains"|"starts"} filter How the typed text is matched against the options.
 * @property {number} minChars Characters needed before typing opens the list.
 * @property {boolean} strict Restore the last confirmed value when the text matches no option.
 * @property {boolean} autoselect Highlight the first match while typing.
 * @property {string} emptyText Text of the "no matches" row.
 */

/**
 * @typedef {"api"|"trigger"|"escape"|"external"} ComboboxReason
 */

/**
 * One row of the listbox and the `<option>` data behind it.
 *
 * @typedef {object} ComboboxItem
 * @property {HTMLElement} el The `<li role="option">` element.
 * @property {string} value Value written into the input when the row is confirmed.
 * @property {string} label Visible text of the row.
 * @property {boolean} disabled Whether the source `<option>` was disabled.
 * @property {string} searchValue Normalized `value`, for filtering.
 * @property {string} searchLabel Normalized `label`, for filtering.
 */

const ROOT_ATTRIBUTE = '[data-iv-component="combobox"]';
const INPUT_CLASS = "iv-combobox__input";
const LIST_CLASS = "iv-combobox__list";
const OPTION_CLASS = "iv-combobox__option";
const EMPTY_CLASS = "iv-combobox__empty";
const OPTION_SELECTOR = ".iv-combobox__option";
const DIACRITICS = /[\u0300-\u036f]/g;

/** Counter behind the generated `iv-cb-<n>-…` ids. */
let uid = 0;

/**
 * Folds case and diacritics so that "Cordoba" matches "Córdoba".
 *
 * @param {string} text Raw text.
 * @returns {string} Normalized text.
 */
function normalize(text) {
  return text.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
}

/**
 * Tells whether a descendant belongs to this instance and not to a nested one.
 *
 * @param {Element} root Host element.
 * @param {Element} el Candidate descendant.
 * @returns {boolean} `true` when the element is not owned by a nested combobox.
 */
function owns(root, el) {
  const owner = el.closest(ROOT_ATTRIBUTE);
  return owner === null || owner === root;
}

/**
 * Finds the input of a combobox: the one carrying `iv-combobox__input`, else
 * the first one with a `list` attribute, else the first one.
 *
 * @param {Element} root Host element.
 * @returns {HTMLInputElement|null} The input, or `null` when there is none.
 */
function findInput(root) {
  /** @type {HTMLInputElement|null} */
  let withList = null;
  /** @type {HTMLInputElement|null} */
  let first = null;
  for (const node of root.querySelectorAll("input")) {
    const el = /** @type {HTMLInputElement} */ (node);
    if (!owns(root, el)) continue;
    if (el.classList.contains(INPUT_CLASS)) return el;
    if (withList === null && el.hasAttribute("list")) withList = el;
    if (first === null) first = el;
  }
  return withList ?? first;
}

/**
 * Resolves the `<datalist>` referenced by the `list` attribute of the input.
 *
 * @param {Element} root Host element.
 * @param {HTMLInputElement} input The combobox input.
 * @returns {HTMLElement|null} The datalist, or `null` when it does not exist.
 */
function findDatalist(root, input) {
  const id = input.getAttribute("list");
  if (!id) return null;
  const found = root.ownerDocument.getElementById(id);
  if (found && found.tagName === "DATALIST") return found;
  for (const node of root.querySelectorAll("datalist")) {
    if (node.id === id) return /** @type {HTMLElement} */ (node);
  }
  return null;
}

/**
 * Returns an id that is free in the document.
 *
 * @param {Document} doc Owner document.
 * @param {string} base Preferred id.
 * @returns {string} A free id.
 */
function uniqueId(doc, base) {
  if (!doc.getElementById(base)) return base;
  let n = 2;
  while (doc.getElementById(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Puts the attributes of an element back into their original order.
 *
 * Removing an attribute and setting it again appends it at the end of the
 * attribute list, so restoring `list` alone would change how the element
 * serializes. Only runs when the order actually changed.
 *
 * @param {Element} el Element to normalize.
 * @param {string[]} names Attribute names in their original order.
 * @returns {void}
 */
function restoreAttributeOrder(el, names) {
  const current = Array.from(el.attributes).map((attribute) => attribute.name);
  const expected = names.filter((name) => current.includes(name));
  const actual = current.filter((name) => names.includes(name));
  if (
    expected.length === actual.length &&
    expected.every((name, index) => name === actual[index])
  ) {
    return;
  }
  /** @type {Map<string, string>} */
  const values = new Map();
  for (const name of expected) values.set(name, el.getAttribute(name) ?? "");
  for (const name of expected) el.removeAttribute(name);
  for (const name of expected) el.setAttribute(name, values.get(name) ?? "");
}

/**
 * Combobox component.
 *
 * @augments IvComponent
 */
export class Combobox extends IvComponent {
  /** @type {string} */
  static componentName = "combobox";

  /** @type {Readonly<ComboboxOptions>} */
  static defaults = Object.freeze({
    filter: "contains",
    minChars: 0,
    strict: false,
    autoselect: false,
    emptyText: "No matches",
  });

  /**
   * Returns the combobox instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Combobox|undefined} The instance or `undefined`.
   */
  static get(el) {
    const inst = getInstance(el, "combobox");
    return inst instanceof Combobox ? inst : undefined;
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<ComboboxOptions>} [options] Options passed in JavaScript.
   * @returns {Combobox} The instance.
   */
  static getOrCreate(el, options) {
    return this.get(el) ?? new Combobox(el, options);
  }

  /**
   * Instantiates every `[data-iv-component="combobox"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Combobox[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Combobox[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el A `<div class="iv-combobox">` element.
   * @param {Partial<ComboboxOptions>} [options] Options passed in JavaScript.
   * @throws {IvError} `invalid-element` when there is no input to promote.
   * @throws {IvError} `missing-target` when `list` is missing or points nowhere.
   */
  constructor(el, options) {
    if (!isElement(el)) {
      throw new IvError("invalid-element", "Combobox requires an element.");
    }
    const input = findInput(el);
    if (!input) {
      throw new IvError("invalid-element", "Combobox requires an <input> element.");
    }
    const datalist = findDatalist(el, input);
    if (!datalist) {
      throw new IvError(
        "missing-target",
        'Combobox requires a "list" attribute pointing at a <datalist>.'
      );
    }
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {HTMLInputElement} The promoted input. */
    this._input = this._input ?? input;
    /** @type {HTMLElement} The datalist kept as the data source. */
    this._datalist = this._datalist ?? datalist;
    /** @type {HTMLElement} The generated listbox. */
    this._list = this._list ?? el.ownerDocument.createElement("ul");
    /** @type {HTMLElement} The "no matches" row. */
    this._empty = this._empty ?? el.ownerDocument.createElement("li");
    /** @type {ComboboxItem[]} One entry per `<option>`. */
    this._items = this._items ?? [];
    /** @type {Map<Element, Map<string, string|null>>} Attributes to restore. */
    this._saved = this._saved ?? new Map();
    /** @type {string[]} Attribute names of the input, in their original order. */
    this._inputAttributes = this._inputAttributes ?? [];
    /** @type {boolean} Whether the listbox is open. */
    this._open = this._open ?? false;
    /** @type {number} Index of the highlighted item, or `-1`. */
    this._active = this._active ?? -1;
    /** @type {string} Last confirmed value. */
    this._value = this._value ?? "";
    /** @type {boolean} Guard against the synthetic `input` event. */
    this._silent = this._silent ?? false;
    /** @type {EventListener|null} Outside pointer listener while open. */
    this._outside = this._outside ?? null;
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<ComboboxOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<ComboboxOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * Whether the listbox is currently open.
   *
   * @returns {boolean} `true` when open.
   */
  get isOpen() {
    return this._open;
  }

  /**
   * Last confirmed value. Typing does not change it; confirming does.
   *
   * @returns {string} The confirmed value, or an empty string.
   */
  get value() {
    return this._value;
  }

  /**
   * The rows of the listbox, in document order.
   *
   * @returns {HTMLElement[]} The `<li role="option">` elements.
   */
  get optionElements() {
    return this._items.map((item) => item.el);
  }

  /**
   * The promoted input.
   *
   * @returns {HTMLInputElement} The input element.
   */
  get input() {
    return this._input;
  }

  /** @returns {void} */
  _setup() {
    const root = this._element;
    const doc = root.ownerDocument;
    const input = findInput(root);
    const datalist = input ? findDatalist(root, input) : null;
    // The constructor already rejected both cases; this keeps the types simple.
    if (!input || !datalist) return;

    this._input = input;
    this._datalist = datalist;
    this._saved = new Map();
    this._items = [];
    this._open = false;
    this._active = -1;
    this._silent = false;
    this._outside = null;
    this._inputAttributes = Array.from(input.attributes).map(
      (attribute) => attribute.name
    );

    const n = ++uid;
    const list = doc.createElement("ul");
    list.className = LIST_CLASS;
    list.id = uniqueId(doc, `iv-cb-${n}-list`);
    list.setAttribute("role", "listbox");
    list.hidden = true;

    let index = 0;
    for (const node of datalist.querySelectorAll("option")) {
      const option = /** @type {HTMLOptionElement} */ (node);
      const text = (option.textContent ?? "").trim();
      const value = option.value || text;
      if (!value) continue;
      const label = text || option.getAttribute("label") || value;
      const disabled = option.hasAttribute("disabled");
      const li = doc.createElement("li");
      li.className = OPTION_CLASS;
      li.id = uniqueId(doc, `iv-cb-${n}-opt-${(index += 1)}`);
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      if (disabled) li.setAttribute("aria-disabled", "true");
      li.textContent = label;
      list.append(li);
      this._items.push({
        el: li,
        value,
        label,
        disabled,
        searchValue: normalize(value),
        searchLabel: normalize(label),
      });
    }

    const empty = doc.createElement("li");
    empty.className = EMPTY_CLASS;
    empty.setAttribute("role", "option");
    empty.setAttribute("aria-disabled", "true");
    empty.textContent = String(this.options.emptyText);
    empty.hidden = true;
    list.append(empty);

    this._list = list;
    this._empty = empty;
    input.after(list);

    const label = this._labelFor(input);
    if (label) list.setAttribute("aria-labelledby", label);

    this._set(input, "role", "combobox");
    this._set(input, "aria-autocomplete", "list");
    this._set(input, "aria-expanded", "false");
    this._set(input, "aria-controls", list.id);
    this._unset(input, "list");

    const initial = this._exactMatch(input.value);
    this._value = initial ? initial.value : "";
    this._filterList(input.value);

    this._listen(input, "input", (event) => this._onInput(event));
    this._listen(input, "keydown", (event) => this._onKeydown(event));
    this._listen(root, "focusout", (event) => this._onFocusOut(event));
    this._listen(list, "pointerdown", (event) => this._onPointerDown(event));
  }

  /** @returns {void} */
  _teardown() {
    this._list.remove();
    this._items = [];
    this._open = false;
    this._active = -1;
    this._outside = null;
    for (const [el, attributes] of this._saved) {
      for (const [name, value] of attributes) {
        if (value === null) el.removeAttribute(name);
        else el.setAttribute(name, value);
      }
    }
    this._saved.clear();
    restoreAttributeOrder(this._input, this._inputAttributes);
  }

  /**
   * Id of the `<label>` of the input, generated when the label has none, so the
   * listbox can be named. Returns `null` when there is no label.
   *
   * @param {HTMLInputElement} input The combobox input.
   * @returns {string|null} The label id, or `null`.
   */
  _labelFor(input) {
    if (!input.id) return null;
    for (const node of this._element.querySelectorAll("label")) {
      const label = /** @type {HTMLLabelElement} */ (node);
      if (label.getAttribute("for") !== input.id) continue;
      if (!label.id) {
        this._set(label, "id", uniqueId(this._element.ownerDocument, `${input.id}-label`));
      }
      return label.id;
    }
    return null;
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
   * Removes a listener registered with `_listen` before `destroy` runs.
   *
   * @param {EventTarget} target Event target.
   * @param {string} type Event type.
   * @param {EventListener} handler Listener.
   * @returns {void}
   */
  _unlisten(target, type, handler) {
    target.removeEventListener(type, handler);
    this._listeners = this._listeners.filter(
      (entry) =>
        entry.target !== target ||
        entry.type !== type ||
        entry.handler !== handler
    );
  }

  /**
   * Hides the options that do not match and toggles the "no matches" row.
   *
   * `minChars` gates opening, never filtering.
   *
   * @param {string} query Text typed in the input.
   * @returns {number} How many options remain visible.
   */
  _filterList(query) {
    const needle = normalize(query.trim());
    const starts = this.options.filter === "starts";
    let visible = 0;
    for (const item of this._items) {
      const match =
        needle === "" ||
        (starts
          ? item.searchValue.startsWith(needle) ||
            item.searchLabel.startsWith(needle)
          : item.searchValue.includes(needle) ||
            item.searchLabel.includes(needle));
      item.el.hidden = !match;
      if (match) visible += 1;
    }
    this._empty.hidden = visible > 0;
    return visible;
  }

  /**
   * The options a user can move to: visible and not disabled.
   *
   * @returns {ComboboxItem[]} Navigable items.
   */
  _navigable() {
    return this._items.filter((item) => !item.disabled && !item.el.hidden);
  }

  /**
   * The highlighted item, if any.
   *
   * @returns {ComboboxItem|null} The item, or `null`.
   */
  _activeItem() {
    if (this._active < 0 || this._active >= this._items.length) return null;
    return this._items[this._active];
  }

  /**
   * Highlights one option (or none) and syncs `aria-activedescendant`.
   *
   * @param {ComboboxItem|null} item Item to highlight.
   * @returns {void}
   */
  _highlight(item) {
    for (const entry of this._items) {
      entry.el.setAttribute("aria-selected", entry === item ? "true" : "false");
    }
    this._active = item ? this._items.indexOf(item) : -1;
    if (!item) {
      this._unset(this._input, "aria-activedescendant");
      return;
    }
    this._set(this._input, "aria-activedescendant", item.el.id);
    // jsdom and older engines do not implement scrolling.
    if (typeof item.el.scrollIntoView === "function") {
      item.el.scrollIntoView({ block: "nearest" });
    }
  }

  /**
   * Moves the highlight, wrapping around the visible options.
   *
   * @param {number} delta `1` for the next option, `-1` for the previous one.
   * @returns {void}
   */
  _step(delta) {
    const items = this._navigable();
    if (items.length === 0) {
      this._highlight(null);
      return;
    }
    const current = this._activeItem();
    const at = current ? items.indexOf(current) : -1;
    if (at === -1) {
      this._highlight(delta > 0 ? items[0] : items[items.length - 1]);
      return;
    }
    const next = (((at + delta) % items.length) + items.length) % items.length;
    this._highlight(items[next]);
  }

  /**
   * Places the list below the input, or above it only when it does not fit
   * below and there is more room above, and caps its height to that room so
   * it never leaves the viewport (ADR-034, same rule as the picker).
   *
   * @returns {void}
   */
  _place() {
    const view = this._element.ownerDocument.defaultView;
    const height = view ? view.innerHeight : 0;
    if (!height) return;
    const gap = 8;
    const rect = this._input.getBoundingClientRect();
    const below = height - rect.bottom - gap;
    const above = rect.top - gap;
    const needed = this._list.offsetHeight || 0;
    const top = needed > below && above > below;
    this._list.setAttribute("data-iv-placement", top ? "top" : "bottom");
    const room = Math.max(120, Math.floor(top ? above : below));
    this._list.style.setProperty("--iv-combobox-max-height", `${room}px`);
  }

  /**
   * Opens the listbox. Emits the cancelable `iv:open` first.
   *
   * @param {ComboboxReason} reason Why the list is opening.
   * @returns {void}
   */
  _openList(reason) {
    if (this._open) return;
    const allowed = emit(
      this._element,
      "open",
      { instance: this, trigger: this._input, reason },
      { cancelable: true }
    );
    if (!allowed) return;
    this._open = true;
    this._list.hidden = false;
    this._place();
    this._set(this._input, "aria-expanded", "true");
    /** @type {EventListener} */
    const handler = (event) => this._onDocumentPointer(event);
    this._outside = handler;
    this._listen(this._element.ownerDocument, "pointerdown", handler);
    emit(this._element, "opened", {
      instance: this,
      trigger: this._input,
      reason,
    });
  }

  /**
   * Closes the listbox. Emits the cancelable `iv:close` first.
   *
   * @param {ComboboxReason} reason Why the list is closing.
   * @returns {void}
   */
  _closeList(reason) {
    if (!this._open) return;
    const allowed = emit(
      this._element,
      "close",
      { instance: this, trigger: this._input, reason },
      { cancelable: true }
    );
    if (!allowed) return;
    this._open = false;
    this._list.hidden = true;
    this._list.removeAttribute("data-iv-placement");
    this._list.style.removeProperty("--iv-combobox-max-height");
    this._set(this._input, "aria-expanded", "false");
    this._highlight(null);
    if (this._outside) {
      this._unlisten(
        this._element.ownerDocument,
        "pointerdown",
        this._outside
      );
      this._outside = null;
    }
    emit(this._element, "closed", {
      instance: this,
      trigger: this._input,
      reason,
    });
  }

  /**
   * Confirms a value: `iv:change` (cancelable) → input value → native
   * `input`/`change` → `iv:changed` → close.
   *
   * @param {ComboboxItem|null} item Item to confirm, or `null` to clear.
   * @param {ComboboxReason} reason Why the list closes afterwards.
   * @returns {void}
   */
  _commit(item, reason) {
    const previousValue = this._value;
    const value = item ? item.value : "";
    const option = item ? item.el : null;
    if (value === previousValue && this._input.value === value) {
      this._closeList(reason);
      return;
    }
    const allowed = emit(
      this._element,
      "change",
      { instance: this, value, option, previousValue },
      { cancelable: true }
    );
    if (!allowed) return;
    this._value = value;
    this._input.value = value;
    this._silent = true;
    this._input.dispatchEvent(new Event("input", { bubbles: true }));
    this._input.dispatchEvent(new Event("change", { bubbles: true }));
    this._silent = false;
    emit(this._element, "changed", {
      instance: this,
      value,
      option,
      previousValue,
    });
    this._closeList(reason);
    this._filterList(value);
  }

  /**
   * The option whose value or label equals `text`, ignoring case.
   *
   * @param {string} text Text to match.
   * @returns {ComboboxItem|null} The item, or `null`.
   */
  _exactMatch(text) {
    const needle = text.trim().toLowerCase();
    if (!needle) return null;
    return (
      this._items.find(
        (item) =>
          !item.disabled &&
          (item.value.toLowerCase() === needle ||
            item.label.toLowerCase() === needle)
      ) ?? null
    );
  }

  /**
   * Resolves the argument of `select` into an item.
   *
   * @param {string|Element} target A value, a row, or a node inside a row.
   * @returns {ComboboxItem|null} The item, or `null`.
   */
  _resolve(target) {
    if (isElement(target)) {
      const node = target.closest(OPTION_SELECTOR) ?? target;
      const found = this._items.find((item) => item.el === node) ?? null;
      return found && !found.disabled ? found : null;
    }
    if (typeof target !== "string") return null;
    const exact = this._items.find(
      (item) => !item.disabled && item.value === target
    );
    return exact ?? this._exactMatch(target);
  }

  /**
   * `strict` correction: keep an exact match (confirming it) or put the last
   * confirmed value back into the input.
   *
   * @returns {void}
   */
  _restoreStrict() {
    const match = this._exactMatch(this._input.value);
    if (match) {
      this._commit(match, "external");
      return;
    }
    if (this._input.value === this._value) return;
    this._input.value = this._value;
  }

  /**
   * Filters while typing and opens the list once `minChars` is reached.
   *
   * @param {Event} event Input event.
   * @returns {void}
   */
  _onInput(event) {
    if (this._silent) return;
    const text = this._input.value;
    const visible = this._filterList(text);
    if (text.trim().length < this.options.minChars) {
      this._highlight(null);
      this._closeList("trigger");
      return;
    }
    this._openList("trigger");
    if (!this._open) return;
    const [first] = this._navigable();
    this._highlight(this.options.autoselect && visible > 0 ? first : null);
  }

  /**
   * Keyboard pattern of the combobox. Focus always stays in the input.
   *
   * @param {Event} event Keydown event.
   * @returns {void}
   */
  _onKeydown(event) {
    const key = /** @type {KeyboardEvent} */ (event).key;

    if (key === KEY_ARROW_DOWN || key === KEY_ARROW_UP) {
      event.preventDefault();
      const delta = key === KEY_ARROW_DOWN ? 1 : -1;
      if (!this._open) {
        this._openList("trigger");
        if (!this._open) return;
      }
      this._step(delta);
      return;
    }
    if (key === KEY_HOME || key === KEY_END) {
      if (!this._open) return; // Closed, the caret moves natively.
      const items = this._navigable();
      if (items.length === 0) return;
      event.preventDefault();
      this._highlight(key === KEY_HOME ? items[0] : items[items.length - 1]);
      return;
    }
    if (key === KEY_ENTER) {
      const item = this._activeItem();
      if (!this._open || !item) return; // No highlight: let the form submit.
      event.preventDefault();
      this._commit(item, "trigger");
      return;
    }
    if (key === KEY_ESCAPE) {
      if (this._open) {
        event.preventDefault();
        this._closeList("escape");
        return;
      }
      // Closed: never cancel the key, so a parent dialog still closes on Esc.
      if (this.options.strict) this._restoreStrict();
      return;
    }
    if (key === KEY_TAB) {
      if (!this._open) return;
      const item = this._activeItem();
      // Never cancelled: focus must keep moving.
      if (this.options.autoselect && item) this._commit(item, "trigger");
      else this._closeList("external");
    }
  }

  /**
   * Confirms the option under the pointer without blurring the input.
   *
   * @param {Event} event Pointerdown event.
   * @returns {void}
   */
  _onPointerDown(event) {
    const target = event.target;
    if (!isElement(target)) return;
    const row = target.closest(OPTION_SELECTOR);
    if (!row || !this._list.contains(row)) return;
    event.preventDefault(); // Keeps focus in the input.
    const item = this._resolve(row);
    if (!item) return;
    this._commit(item, "trigger");
  }

  /**
   * Closes the list when a pointer goes down outside the component.
   *
   * @param {Event} event Pointerdown event.
   * @returns {void}
   */
  _onDocumentPointer(event) {
    if (!this._open) return;
    const target = event.target;
    if (isElement(target) && this._element.contains(target)) return;
    this._closeList("external");
  }

  /**
   * Closes the list, and corrects the text in `strict` mode, when focus leaves
   * the component.
   *
   * @param {Event} event Focusout event.
   * @returns {void}
   */
  _onFocusOut(event) {
    const next = /** @type {FocusEvent} */ (event).relatedTarget;
    if (isElement(next) && this._element.contains(next)) return;
    this._closeList("external");
    if (this.options.strict) this._restoreStrict();
  }

  /**
   * Opens the listbox.
   *
   * @returns {void}
   */
  open() {
    this._openList("api");
  }

  /**
   * Closes the listbox.
   *
   * @param {ComboboxReason} [reason] Why the list is closing.
   * @returns {void}
   */
  close(reason = "api") {
    this._closeList(reason);
  }

  /**
   * Confirms an option by value or by element.
   *
   * @param {string|Element} target The value to confirm, or one of `optionElements`.
   * @returns {void}
   */
  select(target) {
    const item = this._resolve(target);
    if (!item) return;
    this._commit(item, "api");
  }

  /**
   * Clears the confirmed value and the text of the input.
   *
   * @returns {void}
   */
  clear() {
    this._commit(null, "api");
  }
}
