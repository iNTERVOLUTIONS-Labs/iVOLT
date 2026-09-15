/**
 * Picker: a rich select (chips, popover, search and groups) built on top of a
 * native `<select>`.
 *
 * The served HTML is a labelled `<select>`: without JavaScript the browser
 * renders its own control, so the field is already usable and submits with the
 * form (ADR-030). `init` keeps that `<select>` in the DOM as the single source
 * of truth — visually hidden, out of the tab order and `aria-hidden` — and
 * builds a button plus a listbox popover next to it. Selecting flips
 * `option.selected` and dispatches native `input`/`change` on the select, so a
 * consumer that only listens to the native element keeps working; an external
 * `change` and a form `reset` repaint the control.
 *
 * Every node is created with `createElement` and `textContent`: no markup is
 * ever parsed from a string. `destroy` removes what it created and puts the
 * `<select>` back exactly as the author wrote it, attribute order included.
 *
 * The chips of a multiple picker live in their own list next to the control,
 * never inside it: a button may not contain another interactive element
 * (ADR-031). The control then names the selection by counting it.
 *
 * Focus lives on the control, or on the search field while the popover is
 * open; the highlighted option is announced with `aria-activedescendant` on
 * whichever of the two holds focus, never by moving focus into the list.
 *
 * @module components/picker
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
  KEY_SPACE,
  KEY_TAB,
} from "../core/keys.js";

/**
 * @typedef {object} PickerOptions
 * @property {"auto"|"on"|"off"} search Search field in the popover; `auto` turns it on above seven options.
 * @property {string} placeholder Text shown while nothing is selected.
 * @property {string} searchPlaceholder Placeholder and accessible name of the search field.
 * @property {string} emptyText Text of the "no matches" row.
 * @property {string} countText Label of a multiple control, with `{count}` replaced by the number of chips.
 * @property {string} clearText Accessible name of the clear button.
 * @property {string} removeText Accessible name of a chip's remove button; `{label}` is replaced.
 * @property {boolean} clearable Whether a clear button is created.
 * @property {boolean} closeOnSelect Whether choosing an option closes the popover.
 * @property {number} maxItems Maximum number of selected options; `0` means no limit.
 */

/**
 * @typedef {"api"|"trigger"|"escape"|"external"} PickerReason
 */

/**
 * One row of the listbox and the `<option>` behind it.
 *
 * @typedef {object} PickerItem
 * @property {HTMLElement} el The `<li role="option">` element.
 * @property {HTMLOptionElement} option The native option it mirrors.
 * @property {string} value Value of the native option.
 * @property {string} label Visible text of the row.
 * @property {boolean} disabled Whether the option (or its group) is disabled.
 * @property {string} search Normalized label and value, for filtering.
 */

/**
 * A rendered `<optgroup>`.
 *
 * @typedef {object} PickerGroup
 * @property {HTMLElement} el The `<li role="group">` element.
 * @property {PickerItem[]} items Rows inside the group.
 */

const ROOT_ATTRIBUTE = '[data-iv-component="picker"]';
/** Smallest list height the placement logic will settle for, in px. */
const MIN_LIST_HEIGHT = 120;
/** Bare selects that keep their native look when JavaScript runs. */
const NATIVE_ATTRIBUTE = "data-iv-native";
const NATIVE_CLASS = "iv-picker__native";
const OPTION_CLASS = "iv-picker__option";
const OPTION_SELECTOR = ".iv-picker__option";
const CHIP_REMOVE_SELECTOR = ".iv-picker__chip-remove";
const ACTIVE_CLASS = "iv-picker__option--active";
/** `search: "auto"` turns the field on above this many options. */
const AUTO_SEARCH_ABOVE = 7;
/** `core/keys.js` has no Backspace constant and is owned by the integrator. */
const KEY_BACKSPACE = "Backspace";
const DIACRITICS = /[\u0300-\u036f]/g;

/** Counter behind the generated `iv-pk-<n>-…` ids. */
let uid = 0;

/**
 * Folds case and diacritics so that "Leon" matches "León".
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
 * @returns {boolean} `true` when the element is not owned by a nested picker.
 */
function owns(root, el) {
  const owner = el.closest(ROOT_ATTRIBUTE);
  return owner === null || owner === root;
}

/**
 * Finds the `<select>` of a picker.
 *
 * @param {Element} root Host element.
 * @returns {HTMLSelectElement|null} The select, or `null` when there is none.
 */
function findSelect(root) {
  for (const node of root.querySelectorAll("select")) {
    const el = /** @type {HTMLSelectElement} */ (node);
    if (owns(root, el)) return el;
  }
  return null;
}

/**
 * The leading `<option value="">`, which the contract turns into the
 * placeholder instead of a selectable row.
 *
 * @param {HTMLSelectElement} select The native select.
 * @returns {HTMLOptionElement|null} The placeholder option, or `null`.
 */
function placeholderOption(select) {
  const first = select.options.item(0);
  return first && first.value === "" ? first : null;
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
 * attribute list, so restoring `tabindex` alone would change how the element
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
 * Fills in the two defaults that depend on the markup.
 *
 * `closeOnSelect` defaults to `false` on a multiple select and `placeholder`
 * to the text of the empty option; both stay below an explicit `data-iv-*` or
 * JavaScript value.
 *
 * @param {Element} el Host element.
 * @param {HTMLSelectElement} select The native select.
 * @param {Partial<PickerOptions>} [options] Options passed in JavaScript.
 * @returns {Record<string, unknown>} Options to hand to the base class.
 */
function presetOptions(el, select, options) {
  /** @type {Record<string, unknown>} */
  const out = { ...(options ?? {}) };
  if (
    out.closeOnSelect === undefined &&
    !el.hasAttribute("data-iv-close-on-select") &&
    select.multiple
  ) {
    out.closeOnSelect = false;
  }
  if (out.placeholder === undefined && !el.hasAttribute("data-iv-placeholder")) {
    const option = placeholderOption(select);
    const text = option ? (option.textContent ?? "").trim() : "";
    if (text) out.placeholder = text;
  }
  return out;
}

/**
 * Picker component.
 *
 * @augments IvComponent
 */
export class Picker extends IvComponent {
  /** @type {string} */
  static componentName = "picker";

  /** @type {Readonly<PickerOptions>} */
  static defaults = Object.freeze(
    /** @type {PickerOptions} */ ({
      search: "auto",
      placeholder: "Select…",
      searchPlaceholder: "Search",
      emptyText: "No matches",
      countText: "{count} selected",
      clearText: "Clear selection",
      removeText: "Remove {label}",
      clearable: true,
      closeOnSelect: true,
      maxItems: 0,
    })
  );

  /**
   * Returns the picker instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Picker|undefined} The instance or `undefined`.
   */
  static get(el) {
    const inst = getInstance(el, "picker");
    return inst instanceof Picker ? inst : undefined;
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<PickerOptions>} [options] Options passed in JavaScript.
   * @returns {Picker} The instance.
   */
  static getOrCreate(el, options) {
    return this.get(el) ?? new Picker(el, options);
  }

  /**
   * Instantiates every `[data-iv-component="picker"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Picker[]} Newly created instances.
   */
  static initAll(root = document) {
    // Every `select.iv-select` is enhanced when JavaScript runs (ADR-032). A bare select gets a
    // generated root that `destroy` removes again; `data-iv-native` on the select or an ancestor
    // keeps the native control. Options written on the select (`data-iv-*`) move to the root.
    for (const node of root.querySelectorAll("select.iv-select")) {
      const select = /** @type {HTMLSelectElement} */ (node);
      if (select.closest(ROOT_ATTRIBUTE) || select.closest(`[${NATIVE_ATTRIBUTE}]`)) continue;
      const wrap = select.ownerDocument.createElement("div");
      wrap.className = "iv-picker";
      wrap.setAttribute("data-iv-component", "picker");
      wrap.setAttribute("data-iv-auto", "");
      for (const attribute of Array.from(select.attributes)) {
        if (attribute.name.startsWith("data-iv-")) wrap.setAttribute(attribute.name, attribute.value);
      }
      select.replaceWith(wrap);
      wrap.append(select);
    }
    return /** @type {Picker[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el A `<div class="iv-picker">` element.
   * @param {Partial<PickerOptions>} [options] Options passed in JavaScript.
   * @throws {IvError} `invalid-element` when there is no `<select>` to enrich.
   */
  constructor(el, options) {
    if (!isElement(el)) {
      throw new IvError("invalid-element", "Picker requires an element.");
    }
    const select = findSelect(el);
    if (!select) {
      throw new IvError("invalid-element", "Picker requires a <select> element.");
    }
    super(el, presetOptions(el, select, options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    const doc = el.ownerDocument;
    /** @type {HTMLSelectElement} The native select, kept as the source of truth. */
    this._native = this._native ?? select;
    /** @type {HTMLElement} The visual box holding the chips, the control and the clear button. */
    this._field = this._field ?? doc.createElement("div");
    /** @type {HTMLButtonElement} The generated control. */
    this._control = this._control ?? doc.createElement("button");
    /** @type {HTMLElement} The value area inside the control. */
    this._value = this._value ?? doc.createElement("span");
    /** @type {HTMLElement} The chip list of a multiple picker. */
    this._chipsBox = this._chipsBox ?? doc.createElement("ul");
    /** @type {HTMLElement} The placeholder shown while nothing is selected. */
    this._placeholder = this._placeholder ?? doc.createElement("span");
    /** @type {HTMLButtonElement|null} The clear button, when `clearable`. */
    this._clear = this._clear ?? null;
    /** @type {HTMLElement} The popover holding the search field and the list. */
    this._popover = this._popover ?? doc.createElement("div");
    /** @type {HTMLInputElement|null} The search field, when `search` resolves to true. */
    this._search = this._search ?? null;
    /** @type {HTMLElement} The generated listbox. */
    this._list = this._list ?? doc.createElement("ul");
    /** @type {HTMLElement} The "no matches" row. */
    this._empty = this._empty ?? doc.createElement("li");
    /** @type {HTMLElement|null} The `<label>` of the select, when there is one. */
    this._label = this._label ?? null;
    /** @type {{ parent: Node, next: Node|null }|null} Where the moved label came from. */
    this._labelHome = this._labelHome ?? null;
    /** @type {PickerItem[]} One entry per selectable `<option>`. */
    this._items = this._items ?? [];
    /** @type {PickerGroup[]} One entry per `<optgroup>`. */
    this._groups = this._groups ?? [];
    /** @type {Map<string, HTMLElement>} Chips in use, by value. */
    this._chips = this._chips ?? new Map();
    /** @type {Map<Element, Map<string, string|null>>} Attributes to restore. */
    this._saved = this._saved ?? new Map();
    /** @type {string[]} Attribute names of the select, in their original order. */
    this._nativeAttributes = this._nativeAttributes ?? [];
    /** @type {boolean} Whether the popover is open. */
    this._open = this._open ?? false;
    /** @type {number} Index of the highlighted item, or `-1`. */
    this._active = this._active ?? -1;
    /** @type {boolean} Guard against the synthetic `input`/`change` events. */
    this._silent = this._silent ?? false;
    /** @type {EventListener|null} Outside pointer listener while open. */
    this._outside = this._outside ?? null;
    /** @type {EventListener|null} Viewport resize listener while open. */
    this._resize = this._resize ?? null;
    /** @type {ReturnType<typeof setTimeout>|0} Pending repaint after a form reset. */
    this._resetTimer = this._resetTimer ?? 0;
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<PickerOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<PickerOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * Whether the popover is currently open.
   *
   * @returns {boolean} `true` when open.
   */
  get isOpen() {
    return this._open;
  }

  /**
   * The native select behind the control.
   *
   * @returns {HTMLSelectElement} The select element.
   */
  get native() {
    return this._native;
  }

  /**
   * Current selection: a string on a single select, an array on a multiple one.
   *
   * @returns {string|string[]} The selected value or values.
   */
  get value() {
    const values = this._selectedValues();
    return this._native.multiple ? values : values[0] ?? "";
  }

  /**
   * The rows of the listbox, in document order.
   *
   * @returns {HTMLElement[]} The `<li role="option">` elements.
   */
  get optionElements() {
    return this._items.map((item) => item.el);
  }

  /** @returns {void} */
  _setup() {
    const root = this._element;
    const doc = root.ownerDocument;
    const select = findSelect(root);
    // The constructor already rejected this case; it keeps the types simple.
    if (!select) return;

    this._native = select;
    this._saved = new Map();
    this._items = [];
    this._groups = [];
    this._chips = new Map();
    this._open = false;
    this._active = -1;
    this._silent = false;
    this._outside = null;
    this._resize = null;
    this._resetTimer = 0;
    this._nativeAttributes = Array.from(select.attributes).map(
      (attribute) => attribute.name
    );

    const n = ++uid;
    const controlId = uniqueId(doc, `iv-pk-${n}-control`);
    const valueId = uniqueId(doc, `iv-pk-${n}-value`);
    const listId = uniqueId(doc, `iv-pk-${n}-list`);

    // The select stays in the DOM, and in the form: hidden visually, never with
    // `display: none`, so constraint validation and submission keep working.
    this._remember(select, "class");
    select.classList.add(NATIVE_CLASS);
    this._set(select, "tabindex", "-1");
    this._set(select, "aria-hidden", "true");

    const label = select.labels && select.labels.length ? select.labels[0] : null;
    this._label = label;
    this._labelHome = null;
    let labelId = "";
    if (label) {
      if (!label.id) this._set(label, "id", uniqueId(doc, `iv-pk-${n}-label`));
      labelId = label.id;
      // A `for` pointing at the hidden select would move focus nowhere useful.
      if (select.id && label.getAttribute("for") === select.id) {
        this._set(label, "for", controlId);
      }
    }

    const control = doc.createElement("button");
    control.type = "button";
    control.className = "iv-picker__control";
    control.id = controlId;
    control.setAttribute("aria-haspopup", "listbox");
    control.setAttribute("aria-expanded", "false");
    control.setAttribute("aria-controls", listId);
    control.setAttribute(
      "aria-labelledby",
      labelId ? `${labelId} ${valueId}` : valueId
    );

    const value = doc.createElement("span");
    value.className = "iv-picker__value";
    value.id = valueId;
    control.append(value);

    const caret = doc.createElement("span");
    caret.className = "iv-picker__caret";
    caret.setAttribute("aria-hidden", "true");
    control.append(caret);

    const field = doc.createElement("div");
    field.className = "iv-picker__field";

    const chips = doc.createElement("ul");
    chips.className = "iv-picker__chips";
    chips.hidden = true;
    if (select.multiple) field.append(chips);
    field.append(control);

    const placeholder = doc.createElement("span");
    placeholder.className = "iv-picker__placeholder";
    placeholder.textContent = String(this.options.placeholder);

    /** @type {HTMLButtonElement|null} */
    let clear = null;
    if (this.options.clearable) {
      clear = doc.createElement("button");
      clear.type = "button";
      clear.className = "iv-picker__clear";
      clear.setAttribute("aria-label", String(this.options.clearText));
      clear.hidden = true;
    }

    const popover = doc.createElement("div");
    popover.className = "iv-picker__popover";
    popover.hidden = true;
    popover.setAttribute("data-iv-placement", "bottom");

    /** @type {HTMLInputElement|null} */
    let search = null;
    if (this._searchEnabled(select)) {
      search = doc.createElement("input");
      search.type = "search";
      search.className = "iv-input iv-picker__search";
      search.autocomplete = "off";
      search.placeholder = String(this.options.searchPlaceholder);
      search.setAttribute("aria-label", String(this.options.searchPlaceholder));
      search.setAttribute("aria-controls", listId);
      popover.append(search);
    }

    const list = doc.createElement("ul");
    list.className = "iv-picker__list";
    list.id = listId;
    list.setAttribute("role", "listbox");
    if (select.multiple) list.setAttribute("aria-multiselectable", "true");
    if (labelId) list.setAttribute("aria-labelledby", labelId);
    popover.append(list);

    this._buildRows(doc, select, list, n);

    const empty = doc.createElement("li");
    empty.className = "iv-picker__empty";
    empty.setAttribute("role", "option");
    empty.setAttribute("aria-disabled", "true");
    empty.textContent = String(this.options.emptyText);
    empty.hidden = true;
    list.append(empty);

    this._field = field;
    this._control = control;
    this._value = value;
    this._chipsBox = chips;
    this._placeholder = placeholder;
    this._clear = clear;
    this._popover = popover;
    this._search = search;
    this._list = list;
    this._empty = empty;

    if (clear) field.append(clear);
    root.append(field);
    root.append(popover);
    this._moveLabel(field);
    this._render();

    this._listen(control, "click", () => this.toggle());
    this._listen(control, "keydown", (event) => this._onControlKeydown(event));
    this._listen(chips, "click", (event) => this._onChipsClick(event));
    if (clear) this._listen(clear, "click", () => this.clear());
    if (search) {
      this._listen(search, "input", () => this._onSearchInput());
      this._listen(search, "keydown", (event) => this._onKeys(event, false));
    }
    this._listen(popover, "pointerdown", (event) =>
      this._onPopoverPointerDown(event)
    );
    this._listen(list, "click", (event) => this._onListClick(event));
    this._listen(select, "change", () => this._onNativeChange());
    const form = select.form;
    if (form) this._listen(form, "reset", () => this._onFormReset());
  }

  /** @returns {void} */
  _teardown() {
    if (this._resetTimer) {
      clearTimeout(this._resetTimer);
      this._resetTimer = 0;
    }
    this._restoreLabel();
    this._field.remove();
    this._popover.remove();
    this._items = [];
    this._groups = [];
    this._chips.clear();
    this._open = false;
    this._active = -1;
    this._outside = null;
    this._resize = null;
    for (const [el, attributes] of this._saved) {
      for (const [name, value] of attributes) {
        if (value === null) el.removeAttribute(name);
        else el.setAttribute(name, value);
      }
    }
    this._saved.clear();
    restoreAttributeOrder(this._native, this._nativeAttributes);
    // A root generated by `initAll` leaves with the instance: the select goes back where it was.
    if (this._element.hasAttribute("data-iv-auto") && this._element.parentNode) {
      this._element.replaceWith(this._native);
    }
  }

  /**
   * Moves the label of the select next to the visible field, so that the sibling
   * selectors of `form.css` (a floating label, above all) keep matching what the
   * reader sees instead of the wrapper that hides the native control
   * (API_CONTRACT §8.6). Only a single label that is a direct sibling of the
   * picker inside the same `.iv-field` travels: anything else is a layout the
   * author built on purpose, and moving a node out of it would be a surprise.
   *
   * @param {HTMLElement} field The visible field the label becomes a sibling of.
   * @returns {void}
   */
  _moveLabel(field) {
    const label = this._label;
    const root = this._element;
    const parent = root.parentNode;
    if (!label || !parent || label.parentNode !== parent) return;
    const scope = /** @type {Element|null} */ (
      root.closest ? root.closest(".iv-field") : null
    );
    // Two labels in the same field are a group (a set of radios, a compound
    // control): the pairing is the author's, not ours.
    const home = scope && scope.contains(label) ? scope : parent;
    if (home.querySelectorAll("label").length !== 1) return;
    this._labelHome = { parent, next: label.nextSibling };
    // The label keeps the side it was served on — above the control or below it — and
    // still follows the native select, which is what the sibling rules read.
    const above = Boolean(
      label.compareDocumentPosition(root) & Node.DOCUMENT_POSITION_FOLLOWING
    );
    if (above) field.before(label);
    else field.after(label);
  }

  /**
   * Puts a moved label back where it was served: same parent, same next sibling.
   *
   * @returns {void}
   */
  _restoreLabel() {
    const home = this._labelHome;
    this._labelHome = null;
    if (!home || !this._label) return;
    home.parent.insertBefore(this._label, home.next);
  }

  /**
   * Whether the popover gets a search field: `auto` turns it on above seven
   * selectable options.
   *
   * @param {HTMLSelectElement} select The native select.
   * @returns {boolean} `true` when the field is created.
   */
  _searchEnabled(select) {
    const setting = this.options.search;
    if (setting === "on") return true;
    if (setting === "off") return false;
    const total = placeholderOption(select)
      ? select.options.length - 1
      : select.options.length;
    return total > AUTO_SEARCH_ABOVE;
  }

  /**
   * Builds one row per `<option>`, wrapping each `<optgroup>` in a
   * `role="group"` item. A nested `<ul role="none">` keeps the markup valid
   * while the group itself carries the accessible name.
   *
   * @param {Document} doc Owner document.
   * @param {HTMLSelectElement} select The native select.
   * @param {HTMLElement} list The generated listbox.
   * @param {number} n Instance counter, for ids.
   * @returns {void}
   */
  _buildRows(doc, select, list, n) {
    const skip = placeholderOption(select);
    let index = 0;
    let groups = 0;
    /**
     * @param {HTMLOptionElement} option Native option.
     * @param {HTMLElement} parent Where the row goes.
     * @param {boolean} groupDisabled Whether the group is disabled.
     * @returns {PickerItem|null} The created item, or `null` when skipped.
     */
    const addRow = (option, parent, groupDisabled) => {
      if (option === skip) return null;
      const text = (option.textContent ?? "").trim() || option.value;
      const li = doc.createElement("li");
      li.className = OPTION_CLASS;
      li.id = uniqueId(doc, `iv-pk-${n}-opt-${(index += 1)}`);
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", option.selected ? "true" : "false");
      li.textContent = text;
      parent.append(li);
      /** @type {PickerItem} */
      const item = {
        el: li,
        option,
        value: option.value,
        label: text,
        disabled: option.disabled || groupDisabled,
        search: normalize(`${text} ${option.value}`),
      };
      this._items.push(item);
      return item;
    };

    for (const node of Array.from(select.children)) {
      if (node.tagName === "OPTGROUP") {
        const group = /** @type {HTMLOptGroupElement} */ (node);
        const li = doc.createElement("li");
        li.className = "iv-picker__group";
        li.setAttribute("role", "group");
        const labelId = uniqueId(doc, `iv-pk-${n}-grp-${(groups += 1)}`);
        li.setAttribute("aria-labelledby", labelId);
        const caption = doc.createElement("span");
        caption.className = "iv-picker__group-label";
        caption.id = labelId;
        caption.textContent = group.label || "";
        li.append(caption);
        const inner = doc.createElement("ul");
        inner.className = "iv-picker__group-list";
        inner.setAttribute("role", "none");
        li.append(inner);
        /** @type {PickerItem[]} */
        const items = [];
        for (const child of Array.from(group.children)) {
          if (child.tagName !== "OPTION") continue;
          const item = addRow(
            /** @type {HTMLOptionElement} */ (child),
            inner,
            group.disabled
          );
          if (item) items.push(item);
        }
        list.append(li);
        this._groups.push({ el: li, items });
      } else if (node.tagName === "OPTION") {
        addRow(/** @type {HTMLOptionElement} */ (node), list, false);
      }
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
   * Values currently selected in the native select, in document order.
   *
   * @returns {string[]} The selected values.
   */
  _selectedValues() {
    return this._selectedItems().map((item) => item.value);
  }

  /**
   * Rows whose native option is selected, in document order.
   *
   * @returns {PickerItem[]} The selected items.
   */
  _selectedItems() {
    return this._items.filter((item) => item.option.selected);
  }

  /**
   * Whether `maxItems` has been reached.
   *
   * @returns {boolean} `true` when no further option may be added.
   */
  _capped() {
    const max = this.options.maxItems;
    return max > 0 && this._selectedItems().length >= max;
  }

  /**
   * Repaints the value area, the chips, the clear button and the state of
   * every row from the native select.
   *
   * @returns {void}
   */
  _render() {
    const multiple = this._native.multiple;
    const selected = this._selectedItems();
    const capped = this._capped();
    for (const item of this._items) {
      const isSelected = item.option.selected;
      item.el.setAttribute("aria-selected", isSelected ? "true" : "false");
      if (item.disabled || (capped && !isSelected)) {
        item.el.setAttribute("aria-disabled", "true");
      } else {
        item.el.removeAttribute("aria-disabled");
      }
    }

    if (multiple) {
      this._chipsBox.hidden = selected.length === 0;
      this._renderChips(selected);
    }
    if (selected.length === 0) {
      this._value.replaceChildren(this._placeholder);
    } else if (multiple) {
      this._placeholder.remove();
      this._value.textContent = String(this.options.countText).replace(
        "{count}",
        String(selected.length)
      );
    } else {
      this._placeholder.remove();
      this._value.textContent = selected[0].label;
    }

    if (this._clear) {
      this._clear.hidden = selected.length === 0;
      this._field.toggleAttribute("data-iv-has-clear", !this._clear.hidden);
    }
  }

  /**
   * Syncs the chips with the selection, reusing the elements already on screen
   * so that only the new ones play the appearance animation.
   *
   * @param {PickerItem[]} selected Selected items, in document order.
   * @returns {void}
   */
  _renderChips(selected) {
    const doc = this._element.ownerDocument;
    const wanted = new Set(selected.map((item) => item.value));
    for (const [value, el] of Array.from(this._chips)) {
      if (wanted.has(value)) continue;
      el.remove();
      this._chips.delete(value);
    }
    /** @type {ChildNode|null} */
    let cursor = this._chipsBox.firstChild;
    for (const item of selected) {
      let chip = this._chips.get(item.value);
      if (!chip) {
        chip = doc.createElement("li");
        chip.className = "iv-picker__chip";
        const text = doc.createElement("span");
        text.className = "iv-picker__chip-label";
        text.textContent = item.label;
        chip.append(text);
        const remove = doc.createElement("button");
        remove.type = "button";
        remove.className = "iv-picker__chip-remove";
        remove.setAttribute(
          "aria-label",
          String(this.options.removeText).replace(/\{label\}/g, item.label)
        );
        remove.setAttribute("data-iv-value", item.value);
        chip.append(remove);
        this._chips.set(item.value, chip);
      }
      if (cursor === chip) cursor = chip.nextSibling;
      else this._chipsBox.insertBefore(chip, cursor);
    }
  }

  /**
   * Hides the rows that do not match and toggles the empty row and the groups
   * left without visible rows.
   *
   * @param {string} query Text typed in the search field.
   * @returns {number} How many rows remain visible.
   */
  _filter(query) {
    const needle = normalize(query.trim());
    let visible = 0;
    for (const item of this._items) {
      const match = needle === "" || item.search.includes(needle);
      item.el.hidden = !match;
      if (match) visible += 1;
    }
    for (const group of this._groups) {
      group.el.hidden = group.items.every((item) => item.el.hidden);
    }
    this._empty.hidden = visible > 0;
    return visible;
  }

  /**
   * The rows a user can move to: visible and not disabled.
   *
   * @returns {PickerItem[]} Navigable items.
   */
  _navigable() {
    return this._items.filter(
      (item) => !item.el.hidden && item.el.getAttribute("aria-disabled") !== "true"
    );
  }

  /**
   * The highlighted item, if any.
   *
   * @returns {PickerItem|null} The item, or `null`.
   */
  _activeItem() {
    if (this._active < 0 || this._active >= this._items.length) return null;
    return this._items[this._active];
  }

  /**
   * The element that holds focus while the popover is open, and therefore the
   * one carrying `aria-activedescendant`.
   *
   * @returns {HTMLElement} The control or the search field.
   */
  _focusTarget() {
    return this._search ?? this._control;
  }

  /**
   * Highlights one row (or none) and syncs `aria-activedescendant`.
   *
   * @param {PickerItem|null} item Item to highlight.
   * @returns {void}
   */
  _highlight(item) {
    for (const entry of this._items) {
      entry.el.classList.toggle(ACTIVE_CLASS, entry === item);
    }
    this._active = item ? this._items.indexOf(item) : -1;
    const target = this._focusTarget();
    const other = target === this._control ? this._search : this._control;
    if (other) other.removeAttribute("aria-activedescendant");
    if (!item) {
      target.removeAttribute("aria-activedescendant");
      return;
    }
    target.setAttribute("aria-activedescendant", item.el.id);
    // jsdom and older engines do not implement scrolling.
    if (typeof item.el.scrollIntoView === "function") {
      item.el.scrollIntoView({ block: "nearest" });
    }
  }

  /**
   * Highlights the first selected row, or the first (or last) navigable one.
   *
   * @param {boolean} fromEnd `true` when the popover was opened with ArrowUp.
   * @returns {void}
   */
  _highlightInitial(fromEnd) {
    const items = this._navigable();
    if (items.length === 0) {
      this._highlight(null);
      return;
    }
    const selected = items.find((item) => item.option.selected);
    this._highlight(selected ?? (fromEnd ? items[items.length - 1] : items[0]));
  }

  /**
   * Moves the highlight, wrapping around the visible rows.
   *
   * @param {number} delta `1` for the next row, `-1` for the previous one.
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
   * Places the popover below the control, or above it when there is no room.
   * Measured when opening, never on scroll: the popover closes on an outside
   * pointer, so a stale placement never survives a viewport change.
   *
   * @returns {void}
   */
  _place() {
    const view = this._element.ownerDocument.defaultView;
    const height = view ? view.innerHeight : 0;
    const rect = this._field.getBoundingClientRect();
    const gap = 8;
    const below = height - rect.bottom - gap;
    const above = rect.top - gap;
    const needed = this._popover.offsetHeight || 0;
    // Below is the default; above only when the popover does not fit below and there is more room above.
    const top = needed > below && above > below;
    this._popover.setAttribute("data-iv-placement", top ? "top" : "bottom");
    // The list never overflows the viewport: it is capped to the room left on the chosen side.
    const chrome = Math.max(0, needed - (this._list.offsetHeight || 0));
    const room = Math.max(MIN_LIST_HEIGHT, Math.floor((top ? above : below) - chrome));
    if (height > 0) this._popover.style.setProperty("--iv-picker-max-height", `${room}px`);
  }

  /**
   * Opens the popover. Emits the cancelable `iv:open` first.
   *
   * @param {PickerReason} reason Why the popover is opening.
   * @returns {void}
   */
  _openPopover(reason) {
    if (this._open) return;
    const allowed = emit(
      this._element,
      "open",
      { instance: this, trigger: this._control, reason },
      { cancelable: true }
    );
    if (!allowed) return;
    this._open = true;
    this._popover.hidden = false;
    this._field.setAttribute("data-iv-open", "");
    this._control.setAttribute("aria-expanded", "true");
    if (this._search) {
      this._search.value = "";
      this._filter("");
      this._search.focus();
    }
    this._highlightInitial(false);
    this._place();
    /** @type {EventListener} */
    const handler = (event) => this._onDocumentPointer(event);
    this._outside = handler;
    this._listen(this._element.ownerDocument, "pointerdown", handler);
    // A resize changes the room left on each side: without this the popover keeps
    // the placement and the height it was measured with and falls off the viewport.
    const view = this._element.ownerDocument.defaultView;
    if (view) {
      /** @type {EventListener} */
      const onResize = () => this._place();
      this._resize = onResize;
      this._listen(view, "resize", onResize);
    }
    emit(this._element, "opened", {
      instance: this,
      trigger: this._control,
      reason,
    });
  }

  /**
   * Closes the popover. Emits the cancelable `iv:close` first.
   *
   * @param {PickerReason} reason Why the popover is closing.
   * @returns {void}
   */
  _closePopover(reason) {
    if (!this._open) return;
    const allowed = emit(
      this._element,
      "close",
      { instance: this, trigger: this._control, reason },
      { cancelable: true }
    );
    if (!allowed) return;
    // Focus must leave the popover before it is hidden, or it falls to <body>.
    const doc = this._element.ownerDocument;
    if (this._popover.contains(doc.activeElement)) this._control.focus();
    this._open = false;
    this._highlight(null);
    this._popover.hidden = true;
    this._popover.style.removeProperty("--iv-picker-max-height");
    this._field.removeAttribute("data-iv-open");
    this._control.setAttribute("aria-expanded", "false");
    if (this._search) this._search.value = "";
    this._filter("");
    if (this._outside) {
      this._unlisten(doc, "pointerdown", this._outside);
      this._outside = null;
    }
    if (this._resize && doc.defaultView) {
      this._unlisten(doc.defaultView, "resize", this._resize);
      this._resize = null;
    }
    emit(this._element, "closed", {
      instance: this,
      trigger: this._control,
      reason,
    });
  }

  /**
   * Applies a new selection: `iv:change` (cancelable) → native `option.selected`
   * → native `input`/`change` → repaint → `iv:changed`.
   *
   * @param {string[]} values Values that must end up selected, in any order.
   * @param {PickerReason} reason Why the selection changed.
   * @returns {"applied"|"unchanged"|"blocked"|"cancelled"} What happened.
   */
  _apply(values, reason) {
    const multiple = this._native.multiple;
    const wanted = new Set(values);
    const next = this._items
      .filter((item) => wanted.has(item.value))
      .map((item) => item.value);
    if (!multiple && next.length > 1) next.length = 1;
    const max = this.options.maxItems;
    if (max > 0 && next.length > max) return "blocked";
    const current = this._selectedValues();
    const added = next.filter((value) => !current.includes(value));
    const removed = current.filter((value) => !next.includes(value));
    if (added.length === 0 && removed.length === 0) return "unchanged";
    const value = multiple ? next : next[0] ?? "";
    const allowed = emit(
      this._element,
      "change",
      { instance: this, value, added, removed, reason },
      { cancelable: true }
    );
    if (!allowed) return "cancelled";

    for (const item of this._items) item.option.selected = wanted.has(item.value);
    if (!multiple && next.length === 0) {
      const placeholder = placeholderOption(this._native);
      if (placeholder) placeholder.selected = true;
      else this._native.selectedIndex = -1;
    }
    this._silent = true;
    this._native.dispatchEvent(new Event("input", { bubbles: true }));
    this._native.dispatchEvent(new Event("change", { bubbles: true }));
    this._silent = false;
    this._render();
    emit(this._element, "changed", {
      instance: this,
      value,
      added,
      removed,
      reason,
    });
    return "applied";
  }

  /**
   * Selects or unselects one row from the list.
   *
   * @param {PickerItem} item The row.
   * @param {PickerReason} reason Why the selection changed.
   * @returns {void}
   */
  _toggleItem(item, reason) {
    if (item.el.getAttribute("aria-disabled") === "true") return;
    const multiple = this._native.multiple;
    const current = this._selectedValues();
    if (item.option.selected) {
      this._apply(
        multiple ? current.filter((value) => value !== item.value) : [],
        reason
      );
      return;
    }
    const result = this._apply(
      multiple ? [...current, item.value] : [item.value],
      reason
    );
    if (result === "blocked" || result === "cancelled") return;
    if (this.options.closeOnSelect) this._closePopover("trigger");
  }

  /**
   * Resolves a value or an element into a row.
   *
   * @param {string|Element} target A value, a row, or a node inside a row.
   * @returns {PickerItem|null} The item, or `null`.
   */
  _resolve(target) {
    if (isElement(target)) {
      const row = target.closest(OPTION_SELECTOR) ?? target;
      return this._items.find((item) => item.el === row) ?? null;
    }
    if (typeof target !== "string") return null;
    return this._items.find((item) => item.value === target) ?? null;
  }

  /**
   * Removes the chip whose button was pressed. Focus would otherwise fall to
   * the body when the chip leaves the DOM, so it goes back to the control.
   *
   * @param {Event} event Click event.
   * @returns {void}
   */
  _onChipsClick(event) {
    const target = event.target;
    if (!isElement(target)) return;
    const remove = target.closest(CHIP_REMOVE_SELECTOR);
    if (!remove || !this._chipsBox.contains(remove)) return;
    event.preventDefault();
    const item = this._resolve(remove.getAttribute("data-iv-value") ?? "");
    if (!item) return;
    const doc = this._element.ownerDocument;
    const hadFocus = remove.contains(doc.activeElement);
    this._apply(
      this._selectedValues().filter((value) => value !== item.value),
      "trigger"
    );
    if (hadFocus) this._control.focus();
  }

  /**
   * Keyboard of the control.
   *
   * @param {Event} event Keydown event.
   * @returns {void}
   */
  _onControlKeydown(event) {
    this._onKeys(event, true);
  }

  /**
   * Shared keyboard pattern of the control and the search field.
   *
   * @param {Event} event Keydown event.
   * @param {boolean} fromControl Whether the control has focus.
   * @returns {void}
   */
  _onKeys(event, fromControl) {
    const key = /** @type {KeyboardEvent} */ (event).key;

    if (key === KEY_ARROW_DOWN || key === KEY_ARROW_UP) {
      event.preventDefault();
      if (!this._open) {
        this._openPopover("trigger");
        if (this._open && key === KEY_ARROW_UP) this._highlightInitial(true);
        return;
      }
      this._step(key === KEY_ARROW_DOWN ? 1 : -1);
      return;
    }
    if (key === KEY_HOME || key === KEY_END) {
      if (!this._open) return;
      const items = this._navigable();
      if (items.length === 0) return;
      event.preventDefault();
      this._highlight(key === KEY_HOME ? items[0] : items[items.length - 1]);
      return;
    }
    if (key === KEY_ENTER || (key === KEY_SPACE && fromControl)) {
      event.preventDefault();
      if (!this._open) {
        this._openPopover("trigger");
        return;
      }
      const item = this._activeItem();
      if (item) this._toggleItem(item, "trigger");
      return;
    }
    if (key === KEY_ESCAPE) {
      // Closed: never cancel the key, so a parent dialog still closes on Esc.
      if (!this._open) return;
      event.preventDefault();
      this._closePopover("escape");
      this._control.focus();
      return;
    }
    if (key === KEY_TAB) {
      // Never cancelled: focus must keep moving.
      if (this._open) this._closePopover("external");
      return;
    }
    if (key === KEY_BACKSPACE && fromControl && this._native.multiple) {
      const selected = this._selectedItems();
      if (selected.length === 0) return;
      event.preventDefault();
      const last = selected[selected.length - 1];
      this._apply(
        this._selectedValues().filter((value) => value !== last.value),
        "trigger"
      );
      return;
    }
    if (
      fromControl &&
      this._search &&
      key.length === 1 &&
      !(/** @type {KeyboardEvent} */ (event).ctrlKey) &&
      !(/** @type {KeyboardEvent} */ (event).metaKey) &&
      !(/** @type {KeyboardEvent} */ (event).altKey)
    ) {
      event.preventDefault();
      if (!this._open) {
        this._openPopover("trigger");
        if (!this._open) return;
      }
      const search = this._search;
      search.value = key;
      search.focus();
      this._onSearchInput();
    }
  }

  /**
   * Filters while typing and highlights the first match.
   *
   * @returns {void}
   */
  _onSearchInput() {
    if (!this._search) return;
    this._filter(this._search.value);
    const [first] = this._navigable();
    this._highlight(first ?? null);
  }

  /**
   * Keeps focus on the control or the search field when the popover is pressed.
   *
   * A press that lands on the chrome (padding, a group caption) would otherwise
   * blur the focused element, and with it the `aria-activedescendant` host, so
   * the popover stayed open with the keyboard dead. Two targets keep their
   * native press: the search field, which needs it to place the caret, and the
   * list itself, which owns the scrollbar.
   *
   * @param {Event} event Pointerdown event.
   * @returns {void}
   */
  _onPopoverPointerDown(event) {
    const target = event.target;
    if (!isElement(target)) return;
    if (target === this._list) return;
    const search = this._search;
    if (search && (target === search || search.contains(target))) return;
    event.preventDefault();
  }

  /**
   * Selects the row under the pointer.
   *
   * @param {Event} event Click event.
   * @returns {void}
   */
  _onListClick(event) {
    const target = event.target;
    if (!isElement(target)) return;
    const row = target.closest(OPTION_SELECTOR);
    if (!row || !this._list.contains(row)) return;
    const item = this._resolve(row);
    if (!item) return;
    this._highlight(item);
    this._toggleItem(item, "trigger");
  }

  /**
   * Closes the popover when a pointer goes down outside the component.
   *
   * @param {Event} event Pointerdown event.
   * @returns {void}
   */
  _onDocumentPointer(event) {
    if (!this._open) return;
    const target = event.target;
    if (isElement(target) && this._element.contains(target)) return;
    this._closePopover("external");
  }

  /**
   * Repaints after a change made directly on the native select.
   *
   * @returns {void}
   */
  _onNativeChange() {
    if (this._silent) return;
    this._render();
  }

  /**
   * Repaints after the form was reset. The reset event fires before the
   * controls go back to their defaults, so the repaint waits one task.
   *
   * @returns {void}
   */
  _onFormReset() {
    if (this._resetTimer) clearTimeout(this._resetTimer);
    this._resetTimer = setTimeout(() => {
      this._resetTimer = 0;
      this._render();
    }, 0);
  }

  /**
   * Opens the popover.
   *
   * @returns {void}
   */
  open() {
    this._openPopover("api");
  }

  /**
   * Closes the popover.
   *
   * @param {PickerReason} [reason] Why the popover is closing.
   * @returns {void}
   */
  close(reason = "api") {
    this._closePopover(reason);
  }

  /**
   * Opens the popover when closed, closes it when open.
   *
   * @returns {void}
   */
  toggle() {
    if (this._open) {
      this._closePopover("trigger");
      return;
    }
    this._openPopover("trigger");
  }

  /**
   * Selects one option by value.
   *
   * @param {string|Element} target The value, or one of `optionElements`.
   * @returns {void}
   */
  select(target) {
    const item = this._resolve(target);
    if (!item || item.disabled || item.option.selected) return;
    const current = this._selectedValues();
    this._apply(
      this._native.multiple ? [...current, item.value] : [item.value],
      "api"
    );
  }

  /**
   * Unselects one option by value.
   *
   * @param {string|Element} target The value, or one of `optionElements`.
   * @returns {void}
   */
  deselect(target) {
    const item = this._resolve(target);
    if (!item || !item.option.selected) return;
    this._apply(
      this._selectedValues().filter((value) => value !== item.value),
      "api"
    );
  }

  /**
   * Clears the selection.
   *
   * @returns {void}
   */
  clear() {
    this._apply([], "api");
  }
}
