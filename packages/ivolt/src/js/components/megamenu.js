/**
 * Megamenu (v2): a navigation bar whose items unfold a wide editorial panel.
 *
 * The served HTML works without JavaScript: the bar is a list of links, the
 * `__toggle`, the `__close` and the `__filter` are `hidden`, the tabs are plain
 * links to their `__set` (shown by `:target`) and the CSS reveals the panel on
 * `:hover` / `:focus-within` from the `staticFrom` breakpoint upwards, while
 * below it the panels are static and open inline.
 *
 * `init` shows the toggles, the close button and the filter, moves the state to
 * `data-iv-open` on the `__item` (the pure CSS hover is scoped with
 * `:root:not([data-iv-js])`), adds the page overlay, marks the closed panels
 * `inert`, points a caret at the open toggle, runs the APG tab pattern inside
 * the panel and adds intentional hover, keyboard support and the cancelable
 * `iv:open` / `iv:close` events.
 *
 * Below `staticFrom` the very same markup behaves as an accordion: the panel
 * stays in the flow, there is no overlay and no `inert` (a collapsed panel is
 * taken out of the tab order by `visibility: hidden` in the CSS, which needs no
 * attribute to restore).
 *
 * @module components/megamenu
 */

import { IvComponent, isElement } from "../core/component.js";
import { IvError, getInstance } from "../core/registry.js";
import { emit } from "../core/events.js";
import { breakpoints } from "../core/breakpoints.js";
import { rememberStyle, restoreStyles } from "../core/style.js";
import {
  KEY_ARROW_DOWN,
  KEY_ARROW_LEFT,
  KEY_ARROW_RIGHT,
  KEY_END,
  KEY_ENTER,
  KEY_ESCAPE,
  KEY_HOME,
  KEY_SPACE,
} from "../core/keys.js";

/**
 * @typedef {object} MegamenuOptions
 * @property {boolean} hover Open on intentional hover; `false` leaves click and keyboard only.
 * @property {number} openDelay Milliseconds the pointer must rest on an item before it opens.
 * @property {number} closeDelay Milliseconds before a panel closes after the pointer leaves.
 * @property {string} staticFrom Breakpoint name from which the panels float; below it they are an accordion. `"none"` keeps them floating.
 * @property {boolean} overlay Dim the page behind an open panel.
 * @property {boolean} closeOthers Close the open item when another one opens.
 * @property {boolean} filter Run the in-panel filter when the panel has a `__filter`.
 * @property {string} emptyText Message shown when nothing matches the filter.
 * @property {string} countText Live announcement of the filter, with `{count}`.
 * @property {string} closeText Accessible name given to a `__close` that has none.
 */

/**
 * @typedef {"trigger"|"hover"|"escape"|"external"|"api"|"sibling"} MegamenuReason
 */

/**
 * A tab of a panel and the set it shows.
 *
 * @typedef {object} MegamenuTab
 * @property {HTMLElement} tab The `__tab` element.
 * @property {HTMLElement|null} set Its `__set`, when the `href` resolves to one.
 */

/**
 * One bar item and the parts it owns.
 *
 * @typedef {object} MegamenuEntry
 * @property {HTMLElement} item The `__item` element.
 * @property {HTMLElement|null} link Its `__link`, when it has one.
 * @property {HTMLElement|null} toggle Its `__toggle`, when it has one.
 * @property {HTMLElement|null} panel Its `__panel`, when it has one.
 * @property {HTMLElement|null} close The `__close` of its panel, when it has one.
 * @property {HTMLInputElement|null} input The filter input of its panel, when it has one.
 * @property {MegamenuTab[]} tabs The tabs of its panel, in document order.
 * @property {number} tabIndex Index of the selected tab, or `-1`.
 * @property {HTMLElement|null} empty Generated "no matches" message.
 * @property {HTMLElement|null} status Generated live region of the filter.
 * @property {boolean} armed Whether the next pointer movement may open the panel by hover.
 */

const LIST_SELECTOR = ".iv-megamenu__list";
const ITEM_SELECTOR = ".iv-megamenu__item";
const LINK_SELECTOR = ".iv-megamenu__link";
const TOGGLE_SELECTOR = ".iv-megamenu__toggle";
const PANEL_SELECTOR = ".iv-megamenu__panel";
const CLOSE_SELECTOR = ".iv-megamenu__close";
const FILTER_SELECTOR = ".iv-megamenu__filter";
const INPUT_SELECTOR = ".iv-megamenu__filter-input";
const TAB_SELECTOR = ".iv-megamenu__tab";
const SET_SELECTOR = ".iv-megamenu__set";
const OVERLAY_CLASS = "iv-megamenu__overlay";
const EMPTY_CLASS = "iv-megamenu__empty";
const STATUS_CLASS = "iv-megamenu__status";
const BODY_SELECTOR = ".iv-megamenu__body";
const OPEN_ATTR = "data-iv-open";
const CARET_PROPERTY = "--iv-megamenu-caret-x";
const POINTER_QUERY = "(hover: hover) and (pointer: fine)";
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
/** Groups the filter walks, and the selector of the entries inside each one. */
const FILTER_GROUPS = [
  [".iv-megamenu__cards", ".iv-megamenu__card"],
  [".iv-megamenu__dirlist", "a"],
  [".iv-megamenu__cloud", "a"],
  [".iv-megamenu__recent", "a"],
  [".iv-megamenu__ticker", "a"],
];
const DIACRITICS = /[\u0300-\u036f]/g;

/** Breakpoint names already reported as unknown. */
const warnedBreakpoints = new Set();

/**
 * Folds a string for comparison: no case, no diacritics, no edge whitespace.
 *
 * @param {string} text Raw text.
 * @returns {string} The folded text.
 */
function fold(text) {
  return text.normalize("NFD").replace(DIACRITICS, "").toLowerCase().trim();
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
 * attribute list, so restoring `hidden` alone would change how the toggle
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
 * Resolves a breakpoint name into a media query string.
 *
 * @param {string} name Breakpoint name, e.g. `lg`.
 * @returns {string|null} The media query, or `null` when the name is unknown.
 */
function mediaQueryFor(name) {
  const table = /** @type {Record<string, string|undefined>} */ (
    /** @type {unknown} */ (breakpoints)
  );
  return table[name] ?? null;
}

/**
 * Navigation megamenu component.
 *
 * @augments IvComponent
 */
export class Megamenu extends IvComponent {
  /** @type {string} */
  static componentName = "megamenu";

  /** @type {Readonly<MegamenuOptions>} */
  static defaults = Object.freeze({
    hover: true,
    openDelay: 120,
    closeDelay: 320,
    staticFrom: "lg",
    overlay: true,
    closeOthers: true,
    filter: true,
    emptyText: "No matches",
    countText: "{count} results",
    closeText: "Close",
  });

  /**
   * Returns the megamenu instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Megamenu|undefined} The instance or `undefined`.
   */
  static get(el) {
    const inst = getInstance(el, "megamenu");
    return inst instanceof Megamenu ? inst : undefined;
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<MegamenuOptions>} [options] Options passed in JavaScript.
   * @returns {Megamenu} The instance.
   */
  static getOrCreate(el, options) {
    return this.get(el) ?? new Megamenu(el, options);
  }

  /**
   * Instantiates every `[data-iv-component="megamenu"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Megamenu[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Megamenu[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el A `<nav class="iv-megamenu">` element.
   * @param {Partial<MegamenuOptions>} [options] Options passed in JavaScript.
   * @throws {IvError} `invalid-element` when `el` holds no `.iv-megamenu__list`.
   */
  constructor(el, options) {
    if (!isElement(el) || !el.querySelector(LIST_SELECTOR)) {
      throw new IvError(
        "invalid-element",
        "Megamenu requires a .iv-megamenu__list element."
      );
    }
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {Map<Element, Map<string, string|null>>} Attributes to restore. */
    this._saved = this._saved ?? new Map();
    /** @type {Map<Element, string[]>} Original attribute order, per element. */
    this._order = this._order ?? new Map();
    /** @type {Map<Element, string|null>} Served `style` attributes. */
    this._styles = this._styles ?? new Map();
    /** @type {Map<HTMLInputElement, string>} Served filter queries. */
    this._values = this._values ?? new Map();
    /** @type {Element[]} Elements this instance added to the DOM. */
    this._generated = this._generated ?? [];
    /** @type {MegamenuEntry[]} The bar items, in document order. */
    this._entries = this._entries ?? [];
    /** @type {HTMLElement[]} Items currently open, in opening order. */
    this._openItems = this._openItems ?? [];
    /** @type {HTMLElement|null} The overlay this instance added. */
    this._overlay = this._overlay ?? null;
    /** @type {ReturnType<typeof setTimeout>|0} Pending intentional-open timer. */
    this._openTimer = this._openTimer ?? 0;
    /** @type {ReturnType<typeof setTimeout>|0} Pending intentional-close timer. */
    this._closeTimer = this._closeTimer ?? 0;
    /** @type {boolean} Whether the panels behave as an accordion. */
    this._accordion = this._accordion ?? false;
    /** @type {MediaQueryList|null} Watcher of the `staticFrom` breakpoint. */
    this._mql = this._mql ?? null;
    /** @type {MediaQueryList|null} Watcher of the fine-pointer query. */
    this._pointer = this._pointer ?? null;
    /** @type {number} Serial used by the generated ids. */
    this._uid = this._uid ?? 0;
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<MegamenuOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<MegamenuOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * The item whose panel is open; the last one opened when `closeOthers` is
   * `false` and several are open at once.
   *
   * @returns {HTMLElement|null} The open `__item`, or `null`.
   */
  get openItem() {
    return this._openItems.length > 0
      ? this._openItems[this._openItems.length - 1]
      : null;
  }

  /** @returns {void} */
  _setup() {
    this._saved = new Map();
    this._order = new Map();
    this._styles = new Map();
    this._values = new Map();
    this._generated = [];
    this._entries = [];
    this._openItems = [];
    this._overlay = null;
    this._openTimer = 0;
    this._closeTimer = 0;
    this._accordion = false;
    this._mql = null;
    this._pointer = null;
    this._uid = 0;

    const root = this._element;
    const doc = root.ownerDocument;
    const list = root.querySelector(LIST_SELECTOR);
    const items = list
      ? Array.from(list.children).filter((child) => child.matches(ITEM_SELECTOR))
      : [];

    for (const node of items) {
      const item = /** @type {HTMLElement} */ (node);
      /** @type {MegamenuEntry} */
      const entry = {
        item,
        link: this._ownPart(item, LINK_SELECTOR),
        toggle: this._ownPart(item, TOGGLE_SELECTOR),
        panel: this._ownPart(item, PANEL_SELECTOR),
        close: null,
        input: null,
        tabs: [],
        tabIndex: -1,
        empty: null,
        status: null,
        armed: false,
      };
      this._entries.push(entry);
      const { toggle, panel } = entry;
      if (!toggle || !panel) continue;

      this._uid += 1;
      this._order.set(
        toggle,
        Array.from(toggle.attributes).map((attribute) => attribute.name)
      );
      if (!panel.id) this._set(panel, "id", uniqueId(doc, `iv-mm-${this._uid}-panel`));
      this._unset(toggle, "hidden");
      this._set(toggle, "aria-expanded", "false");
      this._set(toggle, "aria-controls", panel.id);
      this._remember(item, OPEN_ATTR);
      item.removeAttribute(OPEN_ATTR);

      this._setupClose(entry);
      this._setupTabs(entry);
      this._setupFilter(entry);

      // Hover intent needs real movement: a pointer that merely rests on the item after a page
      // swap or a scroll must not open the panel. `pointerenter` arms, the first `pointermove` fires.
      this._listen(item, "pointerenter", () => {
        entry.armed = true;
      });
      this._listen(item, "pointermove", () => {
        if (!entry.armed) return;
        entry.armed = false;
        this._hoverOpen(entry);
      });
      this._listen(item, "pointerleave", () => {
        entry.armed = false;
        this._hoverClose();
      });
      // The panel sits below the bar with a gap: entering it must cancel the
      // pending close even though the pointer left the item on the way.
      this._listen(panel, "pointerenter", () => this._hoverOpen(entry));
    }

    if (this.options.overlay !== false) {
      const overlay = doc.createElement("div");
      overlay.className = OVERLAY_CLASS;
      overlay.hidden = true;
      root.appendChild(overlay);
      this._overlay = overlay;
      this._generated.push(overlay);
      this._listen(overlay, "click", () => this.close("external"));
    }

    this._setupStatic();
    this._syncInert();

    this._listen(root, "click", (event) => this._onClick(event));
    this._listen(root, "keydown", (event) => this._onKeydown(event));
    this._listen(root, "focusout", (event) => this._onFocusout(event));
    this._listen(doc, "click", (event) => this._onDocumentClick(event));
    // Escape closes wherever focus is, including when the panel was opened by
    // hover and focus never entered it.
    this._listen(doc, "keydown", (event) => this._onDocumentKeydown(event));
    // The panel is centred on the page while the toggle is not: a resize moves
    // one and not the other, so the caret is measured again.
    const view = doc.defaultView;
    if (view) this._listen(view, "resize", () => this._syncCarets());
  }

  /** @returns {void} */
  _teardown() {
    this._clearTimers();
    for (const el of this._generated) el.remove();
    this._generated = [];
    this._overlay = null;
    this._openItems = [];
    this._entries = [];
    this._mql = null;
    this._pointer = null;
    for (const [el, attributes] of this._saved) {
      for (const [name, value] of attributes) {
        if (value === null) el.removeAttribute(name);
        else el.setAttribute(name, value);
      }
    }
    this._saved.clear();
    // A filter left running must not survive the component: the query goes
    // back to what the author served.
    for (const [input, value] of this._values) input.value = value;
    this._values.clear();
    for (const [el, names] of this._order) restoreAttributeOrder(el, names);
    this._order.clear();
    restoreStyles(this._styles);
    // Chromium materializes the `style` attribute lazily: a property written
    // through `element.style` may leave an attribute that `removeAttribute`
    // never saw, which then serializes as `style=""`. Reading it forces the
    // attribute into existence, so an empty one can be dropped for good.
    if (this._element.getAttribute("style") === "") {
      this._element.removeAttribute("style");
    }
  }

  /**
   * Shows the close button of a panel and gives it a name when it has none.
   *
   * @param {MegamenuEntry} entry The item.
   * @returns {void}
   */
  _setupClose(entry) {
    const panel = /** @type {HTMLElement} */ (entry.panel);
    const close = /** @type {HTMLElement|null} */ (panel.querySelector(CLOSE_SELECTOR));
    if (!close) return;
    entry.close = close;
    this._order.set(
      close,
      Array.from(close.attributes).map((attribute) => attribute.name)
    );
    this._unset(close, "hidden");
    if (!close.getAttribute("aria-label") && !close.textContent?.trim()) {
      this._set(close, "aria-label", String(this.options.closeText));
    }
    this._listen(close, "click", () => {
      this._clearTimers();
      if (this._closeItem(entry.item, "trigger") && entry.toggle) {
        entry.toggle.focus();
      }
    });
  }

  /**
   * Wires the APG tab pattern of a panel: roving `tabindex`, `aria-selected`
   * and one visible `__set` at a time.
   *
   * @param {MegamenuEntry} entry The item.
   * @returns {void}
   */
  _setupTabs(entry) {
    const panel = /** @type {HTMLElement} */ (entry.panel);
    const tabs = Array.from(panel.querySelectorAll(TAB_SELECTOR));
    if (tabs.length === 0) return;
    const doc = panel.ownerDocument;
    let n = 0;
    for (const node of tabs) {
      const tab = /** @type {HTMLElement} */ (node);
      const href = tab.getAttribute("href") ?? "";
      const id = href.startsWith("#") ? href.slice(1) : "";
      const set = id ? doc.getElementById(id) : null;
      entry.tabs.push({ tab, set: set && set.matches(SET_SELECTOR) ? set : null });
      if (!tab.id) this._set(tab, "id", uniqueId(doc, `iv-mm-${this._uid}-tab-${n}`));
      if (set) this._set(tab, "aria-controls", set.id);
      if (tab.hasAttribute("data-iv-tab-default")) entry.tabIndex = n;
      n += 1;
    }
    if (entry.tabIndex < 0) {
      const selected = entry.tabs.findIndex(
        (pair) => pair.tab.getAttribute("aria-selected") === "true"
      );
      entry.tabIndex = selected >= 0 ? selected : 0;
    }
    for (const pair of entry.tabs) {
      if (pair.set) this._remember(pair.set, "hidden");
      this._remember(pair.tab, "aria-selected");
      this._remember(pair.tab, "tabindex");
    }
    this._reflectTabs(entry);
  }

  /**
   * Reflects the selected tab on the tabs and their sets.
   *
   * @param {MegamenuEntry} entry The item.
   * @returns {void}
   */
  _reflectTabs(entry) {
    let n = 0;
    for (const { tab, set } of entry.tabs) {
      const active = n === entry.tabIndex;
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.setAttribute("tabindex", active ? "0" : "-1");
      if (set) set.hidden = !active;
      n += 1;
    }
  }

  /**
   * Shows the filter of a panel and prepares its empty message and live region.
   *
   * @param {MegamenuEntry} entry The item.
   * @returns {void}
   */
  _setupFilter(entry) {
    if (this.options.filter === false) return;
    const panel = /** @type {HTMLElement} */ (entry.panel);
    const box = /** @type {HTMLElement|null} */ (panel.querySelector(FILTER_SELECTOR));
    const input = /** @type {HTMLInputElement|null} */ (panel.querySelector(INPUT_SELECTOR));
    if (!box || !input) return;
    entry.input = input;
    if (!this._values.has(input)) this._values.set(input, input.value);
    this._order.set(
      box,
      Array.from(box.attributes).map((attribute) => attribute.name)
    );
    this._unset(box, "hidden");

    const doc = panel.ownerDocument;
    const empty = doc.createElement("p");
    empty.className = EMPTY_CLASS;
    empty.textContent = String(this.options.emptyText);
    empty.hidden = true;
    const body = panel.querySelector(BODY_SELECTOR);
    if (body) body.after(empty);
    else panel.appendChild(empty);
    this._generated.push(empty);
    entry.empty = empty;

    const status = doc.createElement("p");
    status.className = `${STATUS_CLASS} iv-u-sr-only`;
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    empty.after(status);
    this._generated.push(status);
    entry.status = status;

    this._listen(input, "input", () => this._applyFilter(entry, input.value));
  }

  /**
   * Returns the part of an item that belongs to the item itself, never one
   * that lives inside its panel.
   *
   * @param {HTMLElement} item The `__item` element.
   * @param {string} selector Part selector.
   * @returns {HTMLElement|null} The part, or `null`.
   */
  _ownPart(item, selector) {
    for (const child of item.children) {
      if (child.matches(selector)) return /** @type {HTMLElement} */ (child);
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
   * Subscribes to the `staticFrom` breakpoint. Below it the panels are an
   * accordion. An unknown name is reported once and leaves them floating.
   *
   * @returns {void}
   */
  _setupStatic() {
    const name = this.options.staticFrom;
    if (!name || name === "none") return;
    if (typeof matchMedia !== "function") return;
    const query = mediaQueryFor(name);
    if (!query) {
      if (!warnedBreakpoints.has(name)) {
        warnedBreakpoints.add(name);
        console.warn(
          `[iVOLT] Unknown breakpoint "${name}" for option "staticFrom" of "megamenu"; the panels stay floating.`
        );
      }
      return;
    }
    const mql = matchMedia(query);
    this._mql = mql;
    this._accordion = !mql.matches;
    this._listen(mql, "change", (event) => {
      // The two modes do not share a state: whatever is open is closed first.
      this.close("external");
      this._accordion = !(/** @type {MediaQueryListEvent} */ (event).matches);
      this._syncInert();
      this._syncOverlay();
    });
  }

  /**
   * Whether hover may open a panel right now.
   *
   * @returns {boolean} `true` when hover is on, the panels float and the
   *   pointer is fine.
   */
  _hoverEnabled() {
    if (this.options.hover === false || this._accordion) return false;
    if (!this._pointer) {
      if (typeof matchMedia !== "function") return false;
      this._pointer = matchMedia(POINTER_QUERY);
    }
    return this._pointer.matches === true;
  }

  /**
   * Schedules the intentional opening of an item.
   *
   * @param {MegamenuEntry} entry The item.
   * @returns {void}
   */
  _hoverOpen(entry) {
    if (!this._hoverEnabled()) return;
    // An item without a panel is a plain link: hovering it on the way to an open panel must not close it.
    if (!entry.panel) return;
    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = 0;
    }
    if (this._isOpen(entry.item)) return;
    if (this._openTimer) clearTimeout(this._openTimer);
    this._openTimer = setTimeout(() => {
      this._openTimer = 0;
      this._openEntry(entry, "hover");
    }, Number(this.options.openDelay) || 0);
  }

  /**
   * Schedules the intentional closing after the pointer leaves.
   *
   * @returns {void}
   */
  _hoverClose() {
    if (!this._hoverEnabled()) return;
    if (this._openTimer) {
      clearTimeout(this._openTimer);
      this._openTimer = 0;
    }
    if (this._openItems.length === 0) return;
    if (this._closeTimer) clearTimeout(this._closeTimer);
    this._closeTimer = setTimeout(() => {
      this._closeTimer = 0;
      // Someone is reading the panel with the keyboard: leave it alone.
      if (this._focusInsideOpenPanel()) return;
      this.close("hover");
    }, Number(this.options.closeDelay) || 0);
  }

  /**
   * Cancels both intentional-hover timers.
   *
   * @returns {void}
   */
  _clearTimers() {
    if (this._openTimer) clearTimeout(this._openTimer);
    if (this._closeTimer) clearTimeout(this._closeTimer);
    this._openTimer = 0;
    this._closeTimer = 0;
  }

  /**
   * Whether focus currently sits inside one of the open panels.
   *
   * @returns {boolean} `true` when it does.
   */
  _focusInsideOpenPanel() {
    const active = this._element.ownerDocument.activeElement;
    if (!active) return false;
    for (const item of this._openItems) {
      const entry = this._entryFor(item);
      if (entry && entry.panel && entry.panel.contains(active)) return true;
    }
    return false;
  }

  /**
   * The entry that owns an element, if any.
   *
   * @param {Element} target Element inside the bar.
   * @returns {MegamenuEntry|null} The entry, or `null`.
   */
  _entryFor(target) {
    for (const entry of this._entries) {
      if (entry.item === target || entry.item.contains(target)) return entry;
    }
    return null;
  }

  /**
   * Whether an item is open.
   *
   * @param {HTMLElement} item The `__item` element.
   * @returns {boolean} `true` when open.
   */
  _isOpen(item) {
    return this._openItems.includes(item);
  }

  /**
   * Reflects `inert` on the closed panels. In accordion mode nothing is marked:
   * a collapsed panel leaves the tab order through `visibility: hidden`.
   *
   * @returns {void}
   */
  _syncInert() {
    for (const entry of this._entries) {
      const panel = entry.panel;
      if (!panel || !entry.toggle) continue;
      if (this._accordion || this._isOpen(entry.item)) this._unset(panel, "inert");
      else this._set(panel, "inert", "");
    }
  }

  /**
   * Shows the overlay while a floating panel is open.
   *
   * @returns {void}
   */
  _syncOverlay() {
    if (!this._overlay) return;
    this._overlay.hidden = this._accordion || this._openItems.length === 0;
  }

  /**
   * Points the caret of the panel at the centre of its toggle.
   *
   * @param {MegamenuEntry} entry The open item.
   * @returns {void}
   */
  _syncCaret(entry) {
    const { toggle, panel } = entry;
    if (!toggle || !panel || this._accordion) return;
    // Offsets, not client rects: the panel lands with a scale, and a rect taken
    // mid-transition would put the caret a few pixels off its toggle. Both
    // parts hang from the same positioned ancestor, so their offsets cancel.
    if (!panel.offsetParent || panel.offsetParent !== toggle.offsetParent) return;
    const width = panel.offsetWidth;
    if (!width) return;
    const root = /** @type {HTMLElement} */ (this._element);
    const centre = toggle.offsetLeft + toggle.offsetWidth / 2;
    const x = this._isRtl()
      ? panel.offsetLeft + width - centre
      : centre - panel.offsetLeft;
    rememberStyle(this._styles, root);
    root.style.setProperty(CARET_PROPERTY, `${Math.round(x)}px`);
  }

  /**
   * Points the caret again for whatever is open.
   *
   * @returns {void}
   */
  _syncCarets() {
    for (const item of this._openItems) {
      const entry = this._entryFor(item);
      if (entry) this._syncCaret(entry);
    }
  }

  /**
   * Whether the component reads right to left.
   *
   * @returns {boolean} `true` in a right-to-left context.
   */
  _isRtl() {
    const root = this._element;
    const view = root.ownerDocument.defaultView;
    if (!view || typeof view.getComputedStyle !== "function") return false;
    return view.getComputedStyle(root).direction === "rtl";
  }

  /**
   * Opens one item. Emits the cancelable `iv:open` first.
   *
   * @param {MegamenuEntry} entry The item.
   * @param {MegamenuReason} reason Why it opens.
   * @returns {void}
   */
  _openEntry(entry, reason) {
    if (!entry.panel || !entry.toggle || this._isOpen(entry.item)) return;
    const allowed = emit(
      this._element,
      "open",
      { instance: this, item: entry.item, trigger: entry.toggle, reason },
      { cancelable: true }
    );
    if (!allowed) return;
    if (this.options.closeOthers !== false) {
      for (const other of [...this._openItems]) {
        if (other !== entry.item) this._closeItem(other, "sibling");
      }
    }
    this._openItems.push(entry.item);
    entry.item.setAttribute(OPEN_ATTR, "");
    entry.toggle.setAttribute("aria-expanded", "true");
    this._syncInert();
    this._syncOverlay();
    this._syncCaret(entry);
    emit(this._element, "opened", {
      instance: this,
      item: entry.item,
      trigger: entry.toggle,
      reason,
    });
  }

  /**
   * Closes one item. Emits the cancelable `iv:close` first.
   *
   * @param {HTMLElement} item The `__item` element.
   * @param {MegamenuReason} reason Why it closes.
   * @returns {boolean} `false` when the event was cancelled.
   */
  _closeItem(item, reason) {
    const entry = this._entryFor(item);
    if (!entry || !entry.panel || !entry.toggle || !this._isOpen(item)) return false;
    const allowed = emit(
      this._element,
      "close",
      { instance: this, item, trigger: entry.toggle, reason },
      { cancelable: true }
    );
    if (!allowed) return false;
    this._openItems = this._openItems.filter((open) => open !== item);
    item.removeAttribute(OPEN_ATTR);
    entry.toggle.setAttribute("aria-expanded", "false");
    // Focus must leave the panel before `inert` lands on it, or it would fall
    // to <body>; the toggle is where the keyboard user came from.
    const active = this._element.ownerDocument.activeElement;
    if (active && entry.panel.contains(active)) entry.toggle.focus();
    this._syncInert();
    this._syncOverlay();
    emit(this._element, "closed", {
      instance: this,
      item,
      trigger: entry.toggle,
      reason,
    });
    return true;
  }

  /**
   * Moves focus to the first link of a panel.
   *
   * @param {HTMLElement|null} panel The panel.
   * @returns {void}
   */
  _focusFirst(panel) {
    if (!panel) return;
    const first = /** @type {HTMLElement|null} */ (panel.querySelector(FOCUSABLE));
    if (first && typeof first.focus === "function") first.focus();
  }

  /**
   * The bar controls used by the arrow keys: the toggles when focus is on a
   * toggle, the links otherwise, with the other part as a fallback so an item
   * without a panel is never skipped.
   *
   * @param {boolean} fromToggle Whether focus sits on a toggle.
   * @returns {HTMLElement[]} The controls, in document order.
   */
  _barControls(fromToggle) {
    /** @type {HTMLElement[]} */
    const out = [];
    for (const entry of this._entries) {
      const control = fromToggle
        ? entry.toggle ?? entry.link
        : entry.link ?? entry.toggle;
      if (control) out.push(control);
    }
    return out;
  }

  /**
   * Moves focus along a ring of controls.
   *
   * @param {HTMLElement[]} controls The controls.
   * @param {number} index Target index; wraps around.
   * @returns {void}
   */
  _focusControl(controls, index) {
    if (controls.length === 0) return;
    const bounded = ((index % controls.length) + controls.length) % controls.length;
    const control = controls[bounded];
    if (typeof control.focus === "function") control.focus();
  }

  /**
   * Opens and closes on the toggles, and switches tabs inside a panel.
   *
   * @param {Event} event Click event.
   * @returns {void}
   */
  _onClick(event) {
    const target = event.target;
    if (!isElement(target)) return;
    const tab = target.closest(TAB_SELECTOR);
    if (tab) {
      const owner = this._entryFor(tab);
      const index = owner
        ? owner.tabs.findIndex((pair) => pair.tab === tab)
        : -1;
      if (index >= 0) {
        event.preventDefault();
        this._selectTab(/** @type {MegamenuEntry} */ (owner), index);
      }
      return;
    }
    const toggle = target.closest(TOGGLE_SELECTOR);
    if (!toggle) return;
    const entry = this._entryFor(toggle);
    if (!entry || entry.toggle !== toggle) return;
    this._clearTimers();
    if (this._isOpen(entry.item)) this._closeItem(entry.item, "trigger");
    else this._openEntry(entry, "trigger");
  }

  /**
   * Closes when a click lands outside the component.
   *
   * @param {Event} event Click event.
   * @returns {void}
   */
  _onDocumentClick(event) {
    if (this._openItems.length === 0) return;
    const target = event.target;
    if (isElement(target) && this._element.contains(target)) return;
    this.close("external");
  }

  /**
   * Escape clears a filter that still holds text, and closes otherwise.
   *
   * @param {Event} event Keydown event.
   * @returns {void}
   */
  _onDocumentKeydown(event) {
    if (/** @type {KeyboardEvent} */ (event).key !== KEY_ESCAPE) return;
    if (this._openItems.length === 0) return;
    const active = this._element.ownerDocument.activeElement;
    const inside = active && this._element.contains(active) ? this._entryFor(active) : null;
    const entry = inside && this._isOpen(inside.item) ? inside : this._entryFor(
      /** @type {HTMLElement} */ (this.openItem)
    );
    // The key is only claimed when focus is inside the menu: a dialog opened above a
    // hover-opened panel keeps its own Escape, and the panel still closes underneath.
    if (inside) event.preventDefault();
    if (entry && entry.input && entry.input.value !== "") {
      entry.input.value = "";
      this._applyFilter(entry, "");
      entry.input.focus();
      return;
    }
    this.close("escape");
    if (entry && entry.toggle && typeof entry.toggle.focus === "function") {
      entry.toggle.focus();
    }
  }

  /**
   * Arrow keys along the bar and along the tab strip, and `↓` to enter a panel.
   *
   * @param {Event} event Keydown event.
   * @returns {void}
   */
  _onKeydown(event) {
    const key = /** @type {KeyboardEvent} */ (event).key;
    const target = event.target;
    if (!isElement(target)) return;
    const entry = this._entryFor(target);
    if (!entry) return;

    const tab = target.closest(TAB_SELECTOR);
    if (tab && entry.tabs.length > 0) {
      this._onTabKeydown(event, entry, tab);
      return;
    }

    const onToggle = entry.toggle !== null && entry.toggle.contains(target);
    const onLink = entry.link !== null && entry.link.contains(target);

    if (key === KEY_ARROW_DOWN && onToggle) {
      event.preventDefault();
      this._clearTimers();
      if (!this._isOpen(entry.item)) this._openEntry(entry, "trigger");
      this._focusFirst(entry.panel);
      return;
    }
    if (!onToggle && !onLink) return;

    const controls = this._barControls(onToggle);
    const index = controls.indexOf(/** @type {HTMLElement} */ (
      onToggle ? entry.toggle : entry.link
    ));
    if (index < 0) return;
    if (key === KEY_ARROW_RIGHT) {
      event.preventDefault();
      this._focusControl(controls, index + 1);
      return;
    }
    if (key === KEY_ARROW_LEFT) {
      event.preventDefault();
      this._focusControl(controls, index - 1);
      return;
    }
    if (key === KEY_HOME) {
      event.preventDefault();
      this._focusControl(controls, 0);
      return;
    }
    if (key === KEY_END) {
      event.preventDefault();
      this._focusControl(controls, controls.length - 1);
    }
  }

  /**
   * The APG tab keyboard: `← →` move and select, `Home`/`End` jump, `Enter`
   * and `Space` select without following the link.
   *
   * @param {Event} event Keydown event.
   * @param {MegamenuEntry} entry The item that owns the tabs.
   * @param {Element} tab The focused tab.
   * @returns {void}
   */
  _onTabKeydown(event, entry, tab) {
    const key = /** @type {KeyboardEvent} */ (event).key;
    const tabs = entry.tabs.map((pair) => pair.tab);
    const index = tabs.indexOf(/** @type {HTMLElement} */ (tab));
    if (index < 0) return;
    /** @type {Record<string, number|undefined>} */
    const moves = {
      [KEY_ARROW_RIGHT]: index + 1,
      [KEY_ARROW_LEFT]: index - 1,
      [KEY_HOME]: 0,
      [KEY_END]: tabs.length - 1,
    };
    const next = moves[key];
    if (next !== undefined) {
      event.preventDefault();
      const bounded = ((next % tabs.length) + tabs.length) % tabs.length;
      this._selectTab(entry, bounded);
      this._focusControl(tabs, bounded);
      return;
    }
    if (key === KEY_ENTER || key === KEY_SPACE) {
      event.preventDefault();
      this._selectTab(entry, index);
    }
  }

  /**
   * Selects a tab. Emits the cancelable `iv:change` first.
   *
   * @param {MegamenuEntry} entry The item that owns the tabs.
   * @param {number} index Index of the tab.
   * @returns {void}
   */
  _selectTab(entry, index) {
    const pair = entry.tabs[index];
    if (!pair || index === entry.tabIndex) return;
    const previous = entry.tabs[entry.tabIndex];
    const allowed = emit(
      this._element,
      "change",
      {
        instance: this,
        item: entry.item,
        tab: pair.tab,
        set: pair.set,
        previousTab: previous ? previous.tab : null,
      },
      { cancelable: true }
    );
    if (!allowed) return;
    entry.tabIndex = index;
    this._reflectTabs(entry);
    if (entry.input && entry.input.value !== "") {
      this._applyFilter(entry, entry.input.value);
    }
    emit(this._element, "changed", {
      instance: this,
      item: entry.item,
      tab: pair.tab,
      set: pair.set,
      previousTab: previous ? previous.tab : null,
    });
  }

  /**
   * Hides everything in the panel that does not match `query`, shows the empty
   * message when nothing is left and announces the count.
   *
   * @param {MegamenuEntry} entry The item that owns the panel.
   * @param {string} query Raw query.
   * @returns {void}
   */
  _applyFilter(entry, query) {
    const panel = entry.panel;
    if (!panel) return;
    const needle = fold(query);
    let visible = 0;
    for (const [groupSelector, itemSelector] of FILTER_GROUPS) {
      for (const node of panel.querySelectorAll(groupSelector)) {
        const group = /** @type {HTMLElement} */ (node);
        let shown = 0;
        for (const candidate of group.querySelectorAll(itemSelector)) {
          const el = /** @type {HTMLElement} */ (candidate);
          const keywords = el.getAttribute("data-iv-keywords") ?? "";
          const hay = fold(`${el.textContent ?? ""} ${keywords}`);
          const match = needle === "" || hay.includes(needle);
          // The row of a group, never an ancestor outside it: the entries of a
          // `__cloud` are bare links, and `closest("li")` would climb out of
          // the panel and hide the whole bar item.
          const row = el.closest("li");
          const box = /** @type {HTMLElement} */ (
            row && group.contains(row) ? row : el
          );
          this._remember(box, "hidden");
          box.hidden = !match;
          if (match) shown += 1;
        }
        this._remember(group, "hidden");
        group.hidden = needle !== "" && shown === 0;
        // Cards of a tab that is not on screen match all the same, so the set
        // is already filtered when the reader switches to it, but they are not
        // counted: the announcement and the empty message describe what is
        // visible right now.
        if (!this._inHiddenSet(group)) visible += shown;
      }
    }
    if (entry.empty) entry.empty.hidden = needle === "" || visible > 0;
    if (entry.status) {
      entry.status.textContent =
        needle === ""
          ? ""
          : String(this.options.countText).replace("{count}", String(visible));
    }
    emit(this._element, "filter", {
      instance: this,
      item: entry.item,
      query,
      visible,
    });
  }

  /**
   * Whether a group sits inside a `__set` that the tab strip keeps hidden.
   *
   * @param {HTMLElement} group A filtered group.
   * @returns {boolean} `true` when the group is off screen.
   */
  _inHiddenSet(group) {
    const set = group.closest(SET_SELECTOR);
    return set !== null && /** @type {HTMLElement} */ (set).hidden === true;
  }

  /**
   * Closes the panel that focus just left, which is how Tab out of a panel
   * closes it. A `relatedTarget` of `null` (focus left the page, or a click
   * landed on plain text inside the panel) is ignored: the outside click
   * handler covers the pointer case.
   *
   * @param {Event} event Focusout event.
   * @returns {void}
   */
  _onFocusout(event) {
    if (this._openItems.length === 0) return;
    const next = /** @type {FocusEvent} */ (event).relatedTarget;
    if (!isElement(next)) return;
    for (const item of [...this._openItems]) {
      if (!item.contains(next)) this._closeItem(item, "external");
    }
  }

  /**
   * Resolves the argument of the public methods into an entry.
   *
   * @param {Element|number} itemOrIndex The `__item` (or any element inside it)
   *   or its index in the bar.
   * @returns {MegamenuEntry|null} The entry, or `null`.
   */
  _resolve(itemOrIndex) {
    if (typeof itemOrIndex === "number") {
      return this._entries[itemOrIndex] ?? null;
    }
    if (!isElement(itemOrIndex)) return null;
    return this._entryFor(itemOrIndex);
  }

  /**
   * Opens the panel of an item. Items without a panel are ignored.
   *
   * @param {Element|number} itemOrIndex The item or its index in the bar.
   * @returns {void}
   */
  open(itemOrIndex) {
    const entry = this._resolve(itemOrIndex);
    if (!entry) return;
    this._clearTimers();
    this._openEntry(entry, "api");
  }

  /**
   * Closes every open panel.
   *
   * @param {MegamenuReason} [reason] Why they are closing.
   * @returns {void}
   */
  close(reason = "api") {
    this._clearTimers();
    for (const item of [...this._openItems].reverse()) this._closeItem(item, reason);
  }

  /**
   * Opens the panel of an item when closed, closes it when open.
   *
   * @param {Element|number} itemOrIndex The item or its index in the bar.
   * @returns {void}
   */
  toggle(itemOrIndex) {
    const entry = this._resolve(itemOrIndex);
    if (!entry) return;
    this._clearTimers();
    if (this._isOpen(entry.item)) this._closeItem(entry.item, "api");
    else this._openEntry(entry, "api");
  }

  /**
   * Selects a tab of the panel of an item.
   *
   * @param {Element|number} itemOrIndex The item or its index in the bar.
   * @param {number} index Index of the tab inside that panel.
   * @returns {void}
   */
  selectTab(itemOrIndex, index) {
    const entry = this._resolve(itemOrIndex);
    if (!entry) return;
    this._selectTab(entry, index);
  }

  /**
   * Filters the panel of an item, as typing in its filter input would.
   *
   * @param {Element|number} itemOrIndex The item or its index in the bar.
   * @param {string} query Raw query; an empty string restores everything.
   * @returns {void}
   */
  filter(itemOrIndex, query) {
    const entry = this._resolve(itemOrIndex);
    if (!entry) return;
    if (entry.input) entry.input.value = query;
    this._applyFilter(entry, query);
  }
}
