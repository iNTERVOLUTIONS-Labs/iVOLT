/**
 * Command: a command palette built on top of the native `<dialog>`.
 *
 * The served HTML is a `<dialog class="iv-dialog iv-command">` holding a search
 * input and groups of links and buttons, plus a trigger with `data-iv-open`.
 * Without JavaScript the dialog never opens, which loses nothing: the same
 * links are part of the page navigation, and the trigger may be served `hidden`
 * so it only appears once `init` has run (§8.14).
 *
 * The modal behaviour is not reimplemented here: the palette composes a
 * `Dialog` on the same element (top layer, focus trap, Esc, backdrop, focus
 * return) and listens to its events. On top of it `init` adds the global
 * shortcut, promotes the groups to a single `role="listbox"` and turns the
 * items into `role="option"` rows driven by `aria-activedescendant`, exactly
 * like the combobox (§8.3): focus stays in the input.
 *
 * Every generated node is built with `createElement` and `textContent`, no
 * markup is ever parsed from a string, and `destroy` puts the served DOM back
 * as it was, attribute order included.
 *
 * @module components/command
 */

import { IvComponent, isElement } from "../core/component.js";
import { IvError, getInstance } from "../core/registry.js";
import { emit } from "../core/events.js";
import {
  KEY_ARROW_DOWN,
  KEY_ARROW_UP,
  KEY_END,
  KEY_ENTER,
  KEY_HOME,
  KEY_TAB,
} from "../core/keys.js";
import { Dialog } from "./dialog.js";

/**
 * @typedef {object} CommandOptions
 * @property {boolean} shortcut Open with `Ctrl+K` / `⌘K` from anywhere.
 * @property {boolean} slash Open with `/` when focus is not in an editable field.
 * @property {boolean} remember Keep the last activated commands in `localStorage`.
 * @property {string} recentText Heading of the generated "Recent" group.
 * @property {string} emptyText Text of the "no results" message.
 * @property {string} placeholder Placeholder of the input; empty keeps the served one.
 * @property {number} maxRecent How many recent commands are kept.
 */

/**
 * One command of the palette.
 *
 * @typedef {object} CommandAction
 * @property {string} id Stable identifier, from `data-iv-id`, `data-iv-command`, `id` or generated.
 * @property {string} label Visible text.
 * @property {string} group Name of the group it belongs to.
 * @property {string} keywords Extra words matched by the filter.
 * @property {string|null} href Destination when the command is a link.
 * @property {string} shortcut Text shown in the `<kbd>` of the row.
 * @property {((detail: Record<string, unknown>) => void)|null} run Callback of an API command.
 * @property {Element} el Element of the command in the served or generated DOM.
 * @property {boolean} api Whether the command was created by `add()`.
 */

/**
 * One rendered row: an action shown in a group (the same action can also be
 * shown in the generated "Recent" group).
 *
 * @typedef {object} CommandRow
 * @property {CommandAction} action The command behind the row.
 * @property {HTMLElement} el The `role="option"` element.
 * @property {Element|null} li The `<li>` wrapper, when there is one.
 * @property {Element} section The group section of the row.
 * @property {string} search Normalized label and keywords.
 * @property {boolean} recent Whether the row belongs to the generated group.
 */

const ROOT_ATTRIBUTE = '[data-iv-component="command"]';
const INPUT_CLASS = "iv-command__input";
const GROUPS_CLASS = "iv-command__groups";
const GROUP_CLASS = "iv-command__group";
const HEADING_CLASS = "iv-command__heading";
const LIST_CLASS = "iv-command__list";
const ITEM_CLASS = "iv-command__item";
const ICON_CLASS = "iv-command__icon";
const LABEL_CLASS = "iv-command__label";
const KBD_CLASS = "iv-command__kbd";
const EMPTY_CLASS = "iv-command__empty";
const STATUS_CLASS = "iv-command__status";
const ITEM_SELECTOR = ".iv-command__item";
const STORAGE_KEY = "iv-command-recent";
const DIACRITICS = /[\u0300-\u036f]/g;
const NON_TEXT_INPUT = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/** Counter behind the generated `iv-cmd-<n>-…` ids. */
let uid = 0;
/** Counter behind the generated `data-iv-id` of served commands. */
let actionUid = 0;

/**
 * Folds case and diacritics so that "informacion" matches "Información".
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
 * @returns {boolean} `true` when the element is not owned by a nested palette.
 */
function owns(root, el) {
  const owner = el.closest(ROOT_ATTRIBUTE);
  return owner === null || owner === root;
}

/**
 * Finds the search input: the one carrying `iv-command__input`, else the first.
 *
 * @param {Element} root Host element.
 * @returns {HTMLInputElement|null} The input, or `null` when there is none.
 */
function findInput(root) {
  /** @type {HTMLInputElement|null} */
  let first = null;
  for (const node of root.querySelectorAll("input")) {
    const el = /** @type {HTMLInputElement} */ (node);
    if (!owns(root, el)) continue;
    if (el.classList.contains(INPUT_CLASS)) return el;
    if (first === null) first = el;
  }
  return first;
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
 * Tells whether a node is a `<dialog>`.
 *
 * @param {Element} el Candidate element.
 * @returns {boolean} `true` for dialog elements.
 */
function isDialogElement(el) {
  if (typeof HTMLDialogElement !== "undefined" && el instanceof HTMLDialogElement) {
    return true;
  }
  return el.tagName === "DIALOG";
}

/**
 * Tells whether the keyboard event happened inside an editable field, where a
 * bare `/` must keep typing a slash.
 *
 * @param {EventTarget|null} target Event target.
 * @returns {boolean} `true` inside an editable field.
 */
function isEditable(target) {
  if (!isElement(target)) return false;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (target.getAttribute("type") ?? "text").toLowerCase();
    return !NON_TEXT_INPUT.has(type);
  }
  return target.closest('[contenteditable]:not([contenteditable="false"])') !== null;
}

/**
 * Puts the attributes of an element back into their original order.
 *
 * Removing an attribute and setting it again appends it at the end of the
 * attribute list, so restoring `hidden` alone would change how the element
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
 * Command palette component.
 *
 * @augments IvComponent
 */
export class Command extends IvComponent {
  /** @type {string} */
  static componentName = "command";

  /** @type {Readonly<CommandOptions>} */
  static defaults = Object.freeze({
    shortcut: true,
    slash: true,
    remember: false,
    recentText: "Recent",
    emptyText: "No results",
    placeholder: "",
    maxRecent: 5,
  });

  /**
   * Returns the palette instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Command|undefined} The instance or `undefined`.
   */
  static get(el) {
    const inst = getInstance(el, "command");
    return inst instanceof Command ? inst : undefined;
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<CommandOptions>} [options] Options passed in JavaScript.
   * @returns {Command} The instance.
   */
  static getOrCreate(el, options) {
    return this.get(el) ?? new Command(el, options);
  }

  /**
   * Instantiates every `[data-iv-component="command"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Command[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Command[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el A `<dialog class="iv-command">` element.
   * @param {Partial<CommandOptions>} [options] Options passed in JavaScript.
   * @throws {IvError} `invalid-element` when `el` is not a `<dialog>` or has no input.
   */
  constructor(el, options) {
    if (!isElement(el) || !isDialogElement(el)) {
      throw new IvError("invalid-element", "Command requires a <dialog> element.");
    }
    if (!findInput(el)) {
      throw new IvError("invalid-element", "Command requires an <input> element.");
    }
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    const doc = el.ownerDocument;
    /** @type {HTMLInputElement} The search input. */
    this._input = this._input ?? /** @type {HTMLInputElement} */ (findInput(el));
    /** @type {Dialog} The dialog the palette is built on. */
    this._dialog = this._dialog ?? Dialog.getOrCreate(el);
    /** @type {boolean} Whether this instance created the dialog. */
    this._ownsDialog = this._ownsDialog ?? false;
    /** @type {Element} The listbox holding the groups. */
    this._groups = this._groups ?? doc.createElement("nav");
    /** @type {Element} The "no results" message. */
    this._empty = this._empty ?? doc.createElement("p");
    /** @type {Element} The generated live region. */
    this._status = this._status ?? doc.createElement("p");
    /** @type {Element|null} The generated "Recent" group. */
    this._recent = this._recent ?? null;
    /** @type {CommandAction[]} Commands of the palette. */
    this._actions = this._actions ?? [];
    /** @type {CommandRow[]} Rendered rows, in document order. */
    this._rows = this._rows ?? [];
    /** @type {number} Index of the highlighted row, or `-1`. */
    this._active = this._active ?? -1;
    /** @type {Map<Element, Map<string, string|null>>} Attributes to restore. */
    this._saved = this._saved ?? new Map();
    /** @type {Map<Element, string[]>} Attribute order of the touched elements. */
    this._order = this._order ?? new Map();
    /** @type {Element[]} Generated nodes removed by `destroy`. */
    this._generated = this._generated ?? [];
    /** @type {{ node: Element, parent: Node, next: Node|null }[]} Nodes taken out by `remove()`. */
    this._detached = this._detached ?? [];
    /** @type {boolean} Guard against the synthetic click of a keyboard activation. */
    this._activating = this._activating ?? false;
    /** @type {number} Counter behind the option ids of this instance. */
    this._seq = this._seq ?? 0;
    /** @type {number} Id of this instance, used in generated ids. */
    this._uid = this._uid ?? 0;
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<CommandOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<CommandOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * Whether the palette is open.
   *
   * @returns {boolean} `true` when open.
   */
  get isOpen() {
    return this._dialog.isOpen;
  }

  /**
   * Current text of the search input.
   *
   * @returns {string} The query.
   */
  get query() {
    return this._input.value;
  }

  /**
   * The commands of the palette, in document order.
   *
   * @returns {CommandAction[]} A copy of the command list.
   */
  get actions() {
    return this._actions.map((action) => ({ ...action }));
  }

  /**
   * The search input.
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
    // The constructor already rejected this case; this keeps the types simple.
    if (!input) return;

    this._uid = ++uid;
    this._seq = 0;
    this._input = input;
    this._saved = new Map();
    this._order = new Map();
    this._actions = [];
    this._rows = [];
    this._generated = [];
    this._detached = [];
    this._recent = null;
    this._active = -1;
    this._activating = false;

    this._ownsDialog = Dialog.get(root) === undefined;
    this._dialog = Dialog.getOrCreate(root);

    const panel = root.querySelector(".iv-dialog__panel") ?? root;

    let groups = root.querySelector(`.${GROUPS_CLASS}`);
    if (!groups) {
      groups = doc.createElement("nav");
      groups.className = GROUPS_CLASS;
      const field = root.querySelector(".iv-command__field");
      if (field) field.after(groups);
      else panel.append(groups);
      this._generated.push(groups);
    }
    this._groups = groups;
    if (!groups.id) this._set(groups, "id", uniqueId(doc, `iv-cmd-${this._uid}-list`));
    this._set(groups, "role", "listbox");
    const labelId = this._labelFor(input);
    if (labelId) this._set(groups, "aria-labelledby", labelId);

    let empty = root.querySelector(`.${EMPTY_CLASS}`);
    if (!empty) {
      empty = doc.createElement("p");
      empty.className = EMPTY_CLASS;
      empty.textContent = String(this.options.emptyText);
      /** @type {HTMLElement} */ (empty).hidden = true;
      groups.after(empty);
      this._generated.push(empty);
    }
    this._empty = empty;

    const status = doc.createElement("p");
    status.className = `${STATUS_CLASS} iv-u-sr-only`;
    status.id = uniqueId(doc, `iv-cmd-${this._uid}-status`);
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    empty.after(status);
    this._generated.push(status);
    this._status = status;

    this._scan();

    this._set(input, "role", "combobox");
    this._set(input, "aria-autocomplete", "list");
    this._set(input, "aria-expanded", "true");
    this._set(input, "aria-controls", groups.id);
    if (this.options.placeholder) {
      this._set(input, "placeholder", String(this.options.placeholder));
    }

    this._revealTriggers();

    this._listen(input, "input", () => this._onInput());
    this._listen(input, "keydown", (event) => this._onKeydown(event));
    this._listen(groups, "click", (event) => this._onClick(event));
    this._listen(root, "iv:opened", () => this._onOpened());
    this._listen(root, "iv:closed", () => this._onClosed());
    this._listen(doc, "keydown", (event) => this._onDocumentKeydown(event));

    this._apply(input.value);
  }

  /** @returns {void} */
  _teardown() {
    this._dropRecent();
    for (const { node, parent, next } of this._detached.reverse()) {
      if (next && next.parentNode === parent) parent.insertBefore(node, next);
      else parent.appendChild(node);
    }
    this._detached = [];
    for (const node of this._generated) node.remove();
    this._generated = [];
    for (const [el, attributes] of this._saved) {
      for (const [name, value] of attributes) {
        if (value === null) el.removeAttribute(name);
        else el.setAttribute(name, value);
      }
    }
    for (const [el, names] of this._order) restoreAttributeOrder(el, names);
    this._saved.clear();
    this._order.clear();
    this._actions = [];
    this._rows = [];
    this._active = -1;
    if (this._ownsDialog) this._dialog.destroy();
  }

  /**
   * Id of the `<label>` of the input, generated when the label has none, so the
   * listbox can be named. Returns `null` when there is no label.
   *
   * @param {HTMLInputElement} input The search input.
   * @returns {string|null} The label id, or `null`.
   */
  _labelFor(input) {
    if (!input.id) return null;
    for (const node of this._element.querySelectorAll("label")) {
      const label = /** @type {HTMLLabelElement} */ (node);
      if (label.getAttribute("for") !== input.id) continue;
      if (!label.id) {
        this._set(
          label,
          "id",
          uniqueId(this._element.ownerDocument, `${input.id}-label`)
        );
      }
      return label.id;
    }
    return null;
  }

  /**
   * Remembers the current value of an attribute, once per element, together
   * with the attribute order the element was served with.
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
      this._order.set(
        el,
        Array.from(el.attributes).map((attribute) => attribute.name)
      );
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
   * Shows or hides an element, remembering how it was served.
   *
   * @param {Element} el Target element.
   * @param {boolean} hidden Whether the element must be hidden.
   * @returns {void}
   */
  _setHidden(el, hidden) {
    this._remember(el, "hidden");
    /** @type {HTMLElement} */ (el).hidden = hidden;
  }

  /**
   * Shows the declarative triggers of this palette that were served `hidden`,
   * and declares the keyboard shortcut on them when the author did not.
   *
   * @returns {void}
   */
  _revealTriggers() {
    const id = this._element.id;
    if (!id) return;
    const doc = this._element.ownerDocument;
    for (const node of doc.querySelectorAll("[data-iv-open]")) {
      if (node.getAttribute("data-iv-open") !== id) continue;
      const trigger = /** @type {HTMLElement} */ (node);
      if (trigger.hasAttribute("hidden")) this._unset(trigger, "hidden");
      if (this.options.shortcut && !trigger.hasAttribute("aria-keyshortcuts")) {
        this._set(trigger, "aria-keyshortcuts", "Control+K Meta+K");
      }
    }
  }

  /**
   * Promotes the served groups: the container becomes the listbox, each section
   * a labelled group and each item an option.
   *
   * @returns {void}
   */
  _scan() {
    for (const node of this._groups.querySelectorAll(`.${GROUP_CLASS}`)) {
      if (!owns(this._element, node)) continue;
      this._promoteSection(node);
      for (const item of node.querySelectorAll(ITEM_SELECTOR)) {
        if (!owns(this._element, item)) continue;
        this._addRow(this._readAction(item), /** @type {HTMLElement} */ (item), node, false);
      }
    }
  }

  /**
   * Gives a section its `role="group"` and a heading to be named by.
   *
   * @param {Element} section The `.iv-command__group` element.
   * @returns {void}
   */
  _promoteSection(section) {
    this._set(section, "role", "group");
    const heading = section.querySelector(`.${HEADING_CLASS}`);
    if (heading) {
      if (!heading.id) {
        this._set(
          heading,
          "id",
          uniqueId(
            this._element.ownerDocument,
            `iv-cmd-${this._uid}-group-${(this._seq += 1)}`
          )
        );
      }
      this._set(section, "aria-labelledby", heading.id);
    } else {
      const name = section.getAttribute("data-iv-group");
      if (name) this._set(section, "aria-label", name);
    }
    for (const list of section.querySelectorAll(`.${LIST_CLASS}`)) {
      // A presentational `<ul>` also makes its `<li>` children presentational,
      // so the options are owned directly by the group.
      this._set(list, "role", "presentation");
    }
  }

  /**
   * Reads the command described by a served item.
   *
   * @param {Element} el The `.iv-command__item` element.
   * @returns {CommandAction} The command.
   */
  _readAction(el) {
    let id =
      el.getAttribute("data-iv-id") ??
      el.getAttribute("data-iv-command") ??
      el.id;
    if (!id) {
      id = `iv-cmd-${(actionUid += 1)}`;
      this._set(el, "data-iv-id", id);
    }
    const labelEl = el.querySelector(`.${LABEL_CLASS}`);
    const kbd = el.querySelector(`.${KBD_CLASS}`);
    const section = el.closest(`.${GROUP_CLASS}`);
    return {
      id,
      label: ((labelEl ?? el).textContent ?? "").trim(),
      group: (section && section.getAttribute("data-iv-group")) || "",
      keywords: el.getAttribute("data-iv-keywords") ?? "",
      href: el.getAttribute("href"),
      shortcut: kbd ? (kbd.textContent ?? "").trim() : "",
      run: null,
      el,
      api: false,
    };
  }

  /**
   * Registers a row: promotes its element to `role="option"` and indexes it for
   * filtering and navigation.
   *
   * @param {CommandAction} action The command behind the row.
   * @param {HTMLElement} el The element of the row.
   * @param {Element} section The group section.
   * @param {boolean} recent Whether the row is part of the generated group.
   * @returns {CommandRow} The registered row.
   */
  _addRow(action, el, section, recent) {
    const doc = this._element.ownerDocument;
    if (!el.id) {
      const id = uniqueId(doc, `iv-cmd-${this._uid}-opt-${(this._seq += 1)}`);
      if (recent) el.id = id;
      else this._set(el, "id", id);
    }
    if (recent) {
      el.setAttribute("role", "option");
      el.setAttribute("aria-selected", "false");
      el.setAttribute("tabindex", "-1");
    } else {
      this._set(el, "role", "option");
      this._set(el, "aria-selected", "false");
      this._set(el, "tabindex", "-1");
    }
    const parent = el.parentElement;
    const li = parent && parent.tagName === "LI" ? parent : null;
    /** @type {CommandRow} */
    const row = {
      action,
      el,
      li,
      section,
      search: normalize(`${action.label} ${action.keywords}`),
      recent,
    };
    if (recent) this._rows.unshift(row);
    else {
      this._rows.push(row);
      if (!this._actions.includes(action)) this._actions.push(action);
    }
    return row;
  }

  /**
   * Builds one `.iv-command__item` element for a command.
   *
   * @param {CommandAction} action The command.
   * @param {Element|null} source Element to copy the icon from.
   * @returns {HTMLElement} The created element.
   */
  _buildItem(action, source) {
    const doc = this._element.ownerDocument;
    const el = doc.createElement(action.href === null ? "button" : "a");
    el.className = ITEM_CLASS;
    if (action.href === null) el.setAttribute("type", "button");
    else el.setAttribute("href", action.href);
    const icon = source ? source.querySelector(`.${ICON_CLASS}`) : null;
    if (icon) el.append(icon.cloneNode(true));
    const label = doc.createElement("span");
    label.className = LABEL_CLASS;
    label.textContent = action.label;
    el.append(label);
    if (action.shortcut) {
      const kbd = doc.createElement("kbd");
      kbd.className = KBD_CLASS;
      kbd.textContent = action.shortcut;
      el.append(kbd);
    }
    return el;
  }

  /**
   * Finds the section of a group by name, creating it when it does not exist.
   *
   * @param {string} name Group name.
   * @returns {Element} The section.
   */
  _sectionFor(name) {
    const doc = this._element.ownerDocument;
    for (const node of this._groups.querySelectorAll(`.${GROUP_CLASS}`)) {
      if (node === this._recent) continue;
      if ((node.getAttribute("data-iv-group") ?? "") === name) return node;
    }
    const section = doc.createElement("section");
    section.className = GROUP_CLASS;
    if (name) {
      section.setAttribute("data-iv-group", name);
      const heading = doc.createElement("h3");
      heading.className = HEADING_CLASS;
      heading.textContent = name;
      section.append(heading);
    }
    const list = doc.createElement("ul");
    list.className = LIST_CLASS;
    section.append(list);
    this._groups.append(section);
    this._generated.push(section);
    this._promoteSection(section);
    return section;
  }

  /**
   * Reads the stored recent ids.
   *
   * @returns {string[]} The ids, most recent first.
   */
  _readRecent() {
    try {
      const view = this._element.ownerDocument.defaultView;
      const raw = view && view.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      return list
        .filter((id) => typeof id === "string")
        .slice(0, Math.max(0, Number(this.options.maxRecent)));
    } catch {
      // Private mode, disabled storage or corrupted JSON: no recents, no noise.
      return [];
    }
  }

  /**
   * Pushes an id to the front of the stored recent list.
   *
   * @param {string} id Command id.
   * @returns {void}
   */
  _pushRecent(id) {
    if (!this.options.remember || !id) return;
    const max = Math.max(0, Number(this.options.maxRecent));
    const list = [id, ...this._readRecent().filter((entry) => entry !== id)].slice(0, max);
    try {
      const view = this._element.ownerDocument.defaultView;
      if (view) view.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Storage unavailable: the palette keeps working without recents.
    }
  }

  /**
   * Builds the generated "Recent" group at the top of the list.
   *
   * @returns {void}
   */
  _buildRecent() {
    const ids = this._readRecent();
    if (ids.length === 0) return;
    const doc = this._element.ownerDocument;
    const section = doc.createElement("section");
    section.className = GROUP_CLASS;
    section.setAttribute("data-iv-group", String(this.options.recentText));
    const heading = doc.createElement("h3");
    heading.className = HEADING_CLASS;
    heading.id = uniqueId(doc, `iv-cmd-${this._uid}-recent`);
    heading.textContent = String(this.options.recentText);
    section.append(heading);
    section.setAttribute("role", "group");
    section.setAttribute("aria-labelledby", heading.id);
    const list = doc.createElement("ul");
    list.className = LIST_CLASS;
    list.setAttribute("role", "presentation");
    section.append(list);

    let built = 0;
    for (const id of ids) {
      const action = this._actions.find((entry) => entry.id === id);
      if (!action) continue;
      const li = doc.createElement("li");
      const el = this._buildItem(action, action.el);
      li.append(el);
      list.append(li);
      this._addRow(action, el, section, true);
      built += 1;
    }
    if (built === 0) return;
    this._groups.prepend(section);
    this._recent = section;
  }

  /**
   * Removes the generated "Recent" group and its rows.
   *
   * @returns {void}
   */
  _dropRecent() {
    if (!this._recent) return;
    const active = this._activeRow();
    this._rows = this._rows.filter((row) => !row.recent);
    this._recent.remove();
    this._recent = null;
    this._active = active && !active.recent ? this._rows.indexOf(active) : -1;
  }

  /**
   * Applies a query: hides the rows that do not match, hides the groups left
   * empty, toggles the "no results" message and updates the live region.
   *
   * @param {string} query Text to match.
   * @returns {number} How many rows remain visible.
   */
  _apply(query) {
    const needle = normalize(query.trim());
    const wantRecent = this.options.remember && needle === "" && this.isOpen;
    if (!wantRecent && this._recent) this._dropRecent();
    if (wantRecent && !this._recent) this._buildRecent();

    /** @type {Map<Element, number>} */
    const perSection = new Map();
    let visible = 0;
    for (const row of this._rows) {
      const match = needle === "" || row.search.includes(needle);
      this._setHidden(row.el, !match);
      if (row.li) this._setHidden(row.li, !match);
      if (match) visible += 1;
      perSection.set(row.section, (perSection.get(row.section) ?? 0) + (match ? 1 : 0));
    }
    for (const [section, count] of perSection) this._setHidden(section, count === 0);
    this._setHidden(this._empty, visible > 0);
    this._status.textContent = this._statusText(visible);

    const active = this._activeRow();
    if (active && active.el.hidden) this._highlight(null);
    return visible;
  }

  /**
   * Text announced by the live region.
   *
   * @param {number} visible How many rows are visible.
   * @returns {string} The announcement.
   */
  _statusText(visible) {
    if (visible === 0) return String(this.options.emptyText);
    return visible === 1 ? "1 result" : `${visible} results`;
  }

  /**
   * The rows a user can move to.
   *
   * @returns {CommandRow[]} Visible rows.
   */
  _navigable() {
    return this._rows.filter((row) => !row.el.hidden);
  }

  /**
   * The highlighted row, if any.
   *
   * @returns {CommandRow|null} The row, or `null`.
   */
  _activeRow() {
    if (this._active < 0 || this._active >= this._rows.length) return null;
    return this._rows[this._active];
  }

  /**
   * Highlights one row (or none) and syncs `aria-activedescendant`.
   *
   * @param {CommandRow|null} row Row to highlight.
   * @returns {void}
   */
  _highlight(row) {
    for (const entry of this._rows) {
      entry.el.setAttribute("aria-selected", entry === row ? "true" : "false");
    }
    this._active = row ? this._rows.indexOf(row) : -1;
    if (!row) {
      this._unset(this._input, "aria-activedescendant");
      return;
    }
    this._set(this._input, "aria-activedescendant", row.el.id);
    // jsdom and older engines do not implement scrolling.
    if (typeof row.el.scrollIntoView === "function") {
      row.el.scrollIntoView({ block: "nearest" });
    }
  }

  /**
   * Moves the highlight, wrapping around the visible rows.
   *
   * @param {number} delta `1` for the next row, `-1` for the previous one.
   * @returns {void}
   */
  _step(delta) {
    const rows = this._navigable();
    if (rows.length === 0) {
      this._highlight(null);
      return;
    }
    const current = this._activeRow();
    const at = current ? rows.indexOf(current) : -1;
    if (at === -1) {
      this._highlight(delta > 0 ? rows[0] : rows[rows.length - 1]);
      return;
    }
    const next = (((at + delta) % rows.length) + rows.length) % rows.length;
    this._highlight(rows[next]);
  }

  /**
   * Activates a row: `iv:command` (cancelable) → link or `run` → `iv:commanded`,
   * and closes the palette.
   *
   * @param {CommandRow} row Row to activate.
   * @param {"key"|"pointer"|"api"} source How the activation started.
   * @returns {boolean} `false` when `iv:command` was cancelled.
   */
  _activate(row, source) {
    const { action } = row;
    const detail = {
      instance: this,
      id: action.id,
      label: action.label,
      item: row.el,
      href: action.href,
    };
    if (!emit(this._element, "command", detail, { cancelable: true })) return false;
    this._pushRecent(action.id);
    if (action.href !== null) {
      if (source !== "pointer") {
        // The row is a real link: let the browser follow it.
        this._activating = true;
        row.el.click();
        this._activating = false;
      }
    } else if (typeof action.run === "function") {
      action.run(detail);
    }
    emit(this._element, "commanded", detail);
    this._dialog.close("trigger");
    return true;
  }

  /**
   * Filters while typing and highlights the first match.
   *
   * @returns {void}
   */
  _onInput() {
    const query = this._input.value;
    const visible = this._apply(query);
    const [first] = this._navigable();
    this._highlight(query.trim() !== "" && visible > 0 ? first : null);
    emit(this._element, "filter", { instance: this, query, visible });
  }

  /**
   * Keyboard pattern of the palette. Focus always stays in the input.
   *
   * @param {Event} event Keydown event.
   * @returns {void}
   */
  _onKeydown(event) {
    const key = /** @type {KeyboardEvent} */ (event).key;
    if (key === KEY_ARROW_DOWN || key === KEY_ARROW_UP) {
      event.preventDefault();
      this._step(key === KEY_ARROW_DOWN ? 1 : -1);
      return;
    }
    if (key === KEY_HOME || key === KEY_END) {
      const rows = this._navigable();
      if (rows.length === 0) return;
      event.preventDefault();
      this._highlight(key === KEY_HOME ? rows[0] : rows[rows.length - 1]);
      return;
    }
    if (key === KEY_ENTER) {
      const row = this._activeRow();
      if (!row) return;
      event.preventDefault();
      this._activate(row, "key");
      return;
    }
    if (key === KEY_TAB) {
      // The palette is a modal list, not a form: Tab leaves it.
      event.preventDefault();
      this._dialog.close("external");
    }
  }

  /**
   * Activates the clicked row. A cancelled `iv:command` also cancels the click,
   * so the link is not followed.
   *
   * @param {Event} event Click event.
   * @returns {void}
   */
  _onClick(event) {
    if (this._activating) return;
    const target = event.target;
    if (!isElement(target)) return;
    const el = target.closest(ITEM_SELECTOR);
    if (!el || !this._groups.contains(el)) return;
    const row = this._rows.find((entry) => entry.el === el);
    if (!row) return;
    if (!this._activate(row, "pointer")) event.preventDefault();
  }

  /**
   * Global shortcut: `Ctrl+K` / `⌘K` anywhere, `/` outside editable fields.
   *
   * @param {Event} event Keydown event.
   * @returns {void}
   */
  _onDocumentKeydown(event) {
    const e = /** @type {KeyboardEvent} */ (event);
    if (e.defaultPrevented || e.isComposing) return;
    const combo =
      this.options.shortcut &&
      (e.ctrlKey || e.metaKey) &&
      !e.altKey &&
      typeof e.key === "string" &&
      e.key.toLowerCase() === "k";
    const slash =
      this.options.slash &&
      e.key === "/" &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !isEditable(e.target);
    if (!combo && !slash) return;
    event.preventDefault();
    if (!this.isOpen) this._dialog.open();
    this._focusInput();
  }

  /**
   * Puts focus in the input and selects whatever it holds.
   *
   * @returns {void}
   */
  _focusInput() {
    const input = this._input;
    if (typeof input.focus !== "function") return;
    input.focus();
    if (typeof input.select === "function" && input.value) input.select();
  }

  /**
   * Resets the palette every time it opens: empty query, recents rebuilt and
   * focus in the input.
   *
   * @returns {void}
   */
  _onOpened() {
    this._input.value = "";
    this._apply("");
    this._highlight(null);
    this._focusInput();
  }

  /**
   * Drops the generated group and the highlight when the palette closes.
   *
   * @returns {void}
   */
  _onClosed() {
    this._highlight(null);
    this._dropRecent();
    this._apply(this._input.value);
  }

  /**
   * Opens the palette.
   *
   * @param {{ trigger?: Element }} [opts] Opening context.
   * @returns {void}
   */
  open(opts) {
    this._dialog.open(opts);
  }

  /**
   * Closes the palette.
   *
   * @param {string} [reason] Why the palette is closing.
   * @returns {void}
   */
  close(reason = "api") {
    this._dialog.close(/** @type {"api"} */ (reason));
  }

  /**
   * Adds a command. Adding an id that already exists replaces it.
   *
   * @param {{ id?: string, label: string, group?: string, keywords?: string, href?: string, shortcut?: string, run?: (detail: Record<string, unknown>) => void }} action Command description.
   * @returns {CommandAction} The created command.
   * @throws {IvError} `invalid-option` when the command has no label.
   */
  add(action) {
    if (!action || typeof action.label !== "string" || action.label === "") {
      throw new IvError("invalid-option", "Command.add() requires a label.");
    }
    const id = action.id ?? `iv-cmd-${(actionUid += 1)}`;
    if (this._actions.some((entry) => entry.id === id)) this.remove(id);
    const group = action.group ?? "";
    /** @type {CommandAction} */
    const record = {
      id,
      label: action.label,
      group,
      keywords: action.keywords ?? "",
      href: action.href ?? null,
      shortcut: action.shortcut ?? "",
      run: typeof action.run === "function" ? action.run : null,
      el: /** @type {Element} */ (/** @type {unknown} */ (null)),
      api: true,
    };
    const section = this._sectionFor(group);
    const list =
      section.querySelector(`.${LIST_CLASS}`) ?? /** @type {Element} */ (section);
    const doc = this._element.ownerDocument;
    const li = doc.createElement("li");
    const el = this._buildItem(record, null);
    record.el = el;
    li.append(el);
    list.append(li);
    this._generated.push(li);
    this._addRow(record, el, section, false);
    this._set(el, "data-iv-id", id);
    this._apply(this._input.value);
    return { ...record };
  }

  /**
   * Removes a command and its rows. Served commands are put back by `destroy`.
   *
   * @param {string} id Command id.
   * @returns {boolean} `true` when a command was removed.
   */
  remove(id) {
    const action = this._actions.find((entry) => entry.id === id);
    if (!action) return false;
    for (const row of this._rows.filter((entry) => entry.action === action)) {
      const node = row.li ?? row.el;
      const parent = node.parentNode;
      if (!parent) continue;
      if (!row.recent && !row.action.api) {
        this._detached.push({ node, parent, next: node.nextSibling });
      }
      node.remove();
    }
    this._rows = this._rows.filter((entry) => entry.action !== action);
    this._actions = this._actions.filter((entry) => entry !== action);
    this._active = -1;
    this._unset(this._input, "aria-activedescendant");
    this._apply(this._input.value);
    return true;
  }

  /**
   * Removes every command.
   *
   * @returns {void}
   */
  clear() {
    for (const id of this._actions.map((action) => action.id)) this.remove(id);
  }

  /**
   * Filters the palette from JavaScript, as if the query had been typed.
   *
   * @param {string} query Text to match.
   * @returns {number} How many rows remain visible.
   */
  filter(query) {
    const text = typeof query === "string" ? query : "";
    this._input.value = text;
    const visible = this._apply(text);
    const [first] = this._navigable();
    this._highlight(text.trim() !== "" && visible > 0 ? first : null);
    emit(this._element, "filter", { instance: this, query: text, visible });
    return visible;
  }
}
