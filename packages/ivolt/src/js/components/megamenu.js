/**
 * Megamenu: a navigation bar whose items can unfold a wide panel.
 *
 * The served HTML works without JavaScript: the bar is a list of links, each
 * `__toggle` is `hidden` and the CSS reveals the panel on `:hover` /
 * `:focus-within` from the `staticFrom` breakpoint upwards, while below it the
 * panels are static and open inline. `init` shows the toggles, moves the state
 * to `data-iv-open` on the `__item` (the pure CSS hover is scoped with
 * `:root:not([data-iv-js])`), adds the page overlay, marks the closed panels
 * `inert` and adds intentional hover, keyboard support and the cancelable
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
import {
  KEY_ARROW_DOWN,
  KEY_ARROW_LEFT,
  KEY_ARROW_RIGHT,
  KEY_END,
  KEY_ESCAPE,
  KEY_HOME,
} from "../core/keys.js";

/**
 * @typedef {object} MegamenuOptions
 * @property {boolean} hover Open on intentional hover; `false` leaves click and keyboard only.
 * @property {number} openDelay Milliseconds the pointer must rest on an item before it opens.
 * @property {number} closeDelay Milliseconds before a panel closes after the pointer leaves.
 * @property {string} staticFrom Breakpoint name from which the panels float; below it they are an accordion. `"none"` keeps them floating.
 * @property {boolean} overlay Dim the page behind an open panel.
 * @property {boolean} closeOthers Close the open item when another one opens.
 */

/**
 * @typedef {"trigger"|"hover"|"escape"|"external"|"api"|"sibling"} MegamenuReason
 */

/**
 * One bar item and the parts it owns.
 *
 * @typedef {object} MegamenuEntry
 * @property {HTMLElement} item The `__item` element.
 * @property {HTMLElement|null} link Its `__link`, when it has one.
 * @property {HTMLElement|null} toggle Its `__toggle`, when it has one.
 * @property {HTMLElement|null} panel Its `__panel`, when it has one.
 * @property {boolean} [armed] Whether the next pointer movement may open the panel by hover.
 */

const LIST_SELECTOR = ".iv-megamenu__list";
const ITEM_SELECTOR = ".iv-megamenu__item";
const LINK_SELECTOR = ".iv-megamenu__link";
const TOGGLE_SELECTOR = ".iv-megamenu__toggle";
const PANEL_SELECTOR = ".iv-megamenu__panel";
const OVERLAY_CLASS = "iv-megamenu__overlay";
const OPEN_ATTR = "data-iv-open";
const POINTER_QUERY = "(hover: hover) and (pointer: fine)";
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Breakpoint names already reported as unknown. */
const warnedBreakpoints = new Set();

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
    this._entries = [];
    this._openItems = [];
    this._overlay = null;
    this._openTimer = 0;
    this._closeTimer = 0;
    this._accordion = false;
    this._mql = null;
    this._pointer = null;

    const root = this._element;
    const doc = root.ownerDocument;
    const list = root.querySelector(LIST_SELECTOR);
    const items = list
      ? Array.from(list.children).filter((child) => child.matches(ITEM_SELECTOR))
      : [];

    let n = 0;
    for (const node of items) {
      const item = /** @type {HTMLElement} */ (node);
      const entry = {
        item,
        link: this._ownPart(item, LINK_SELECTOR),
        toggle: this._ownPart(item, TOGGLE_SELECTOR),
        panel: this._ownPart(item, PANEL_SELECTOR),
        armed: false,
      };
      this._entries.push(entry);
      const { toggle, panel } = entry;
      if (!toggle || !panel) continue;

      n += 1;
      this._order.set(
        toggle,
        Array.from(toggle.attributes).map((attribute) => attribute.name)
      );
      if (!panel.id) this._set(panel, "id", uniqueId(doc, `iv-mm-${n}-panel`));
      this._unset(toggle, "hidden");
      this._set(toggle, "aria-expanded", "false");
      this._set(toggle, "aria-controls", panel.id);
      this._remember(item, OPEN_ATTR);
      item.removeAttribute(OPEN_ATTR);

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
  }

  /** @returns {void} */
  _teardown() {
    this._clearTimers();
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }
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
    for (const [el, names] of this._order) restoreAttributeOrder(el, names);
    this._order.clear();
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
   * Moves focus along the bar.
   *
   * @param {HTMLElement[]} controls The bar controls.
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
   * Opens and closes on the toggles.
   *
   * @param {Event} event Click event.
   * @returns {void}
   */
  _onClick(event) {
    const target = event.target;
    if (!isElement(target)) return;
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
   * Escape closes and hands focus back to the toggle.
   *
   * @param {Event} event Keydown event.
   * @returns {void}
   */
  _onDocumentKeydown(event) {
    if (/** @type {KeyboardEvent} */ (event).key !== KEY_ESCAPE) return;
    if (this._openItems.length === 0) return;
    event.preventDefault();
    const active = this._element.ownerDocument.activeElement;
    const inside = active && this._element.contains(active) ? this._entryFor(active) : null;
    const entry = inside && this._isOpen(inside.item) ? inside : this._entryFor(
      /** @type {HTMLElement} */ (this.openItem)
    );
    this.close("escape");
    if (entry && entry.toggle && typeof entry.toggle.focus === "function") {
      entry.toggle.focus();
    }
  }

  /**
   * Arrow keys along the bar and `↓` to enter a panel.
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
}
