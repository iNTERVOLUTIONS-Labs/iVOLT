/**
 * Dropdown: an actions menu built on `<details>` / `<summary>` (ADR-020).
 *
 * The served HTML works without JavaScript: `<details>` opens and closes on its
 * own and the items are plain buttons and links. `init` promotes it to the APG
 * menu button pattern (`aria-haspopup`, `aria-expanded`, `role="menu"`,
 * `role="menuitem"`, roving `tabindex`) and adds keyboard navigation, outside
 * click closing and the cancelable `iv:open` / `iv:close` events.
 *
 * Cancelation caveat: the native `toggle` event is asynchronous and fires after
 * `open` has already changed, so a user interaction is "cancelled" by restoring
 * the previous state and skipping the `iv:opened` / `iv:closed` counterpart.
 * `open()`, `close()` and `toggle()` emit before changing `open`.
 *
 * @module components/dropdown
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
 * @typedef {object} DropdownOptions
 * @property {"bottom-start"|"bottom-end"} placement Menu alignment; only `bottom-end` adds a class.
 * @property {boolean} closeOnSelect Close the menu when an item is activated.
 */

/**
 * @typedef {"api"|"trigger"|"escape"|"external"} DropdownReason
 */

const MENU_SELECTOR = ".iv-dropdown__menu";
const ITEM_SELECTOR = ".iv-dropdown__item";
const SEPARATOR_SELECTOR = ".iv-dropdown__separator";
const END_CLASS = "iv-dropdown--end";

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
 * Dropdown component.
 *
 * @augments IvComponent
 */
export class Dropdown extends IvComponent {
  /** @type {string} */
  static componentName = "dropdown";

  /** @type {Readonly<DropdownOptions>} */
  static defaults = Object.freeze({
    placement: "bottom-start",
    closeOnSelect: true,
  });

  /**
   * Returns the dropdown instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Dropdown|undefined} The instance or `undefined`.
   */
  static get(el) {
    const inst = getInstance(el, "dropdown");
    return inst instanceof Dropdown ? inst : undefined;
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<DropdownOptions>} [options] Options passed in JavaScript.
   * @returns {Dropdown} The instance.
   */
  static getOrCreate(el, options) {
    return this.get(el) ?? new Dropdown(el, options);
  }

  /**
   * Instantiates every `[data-iv-component="dropdown"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Dropdown[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Dropdown[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el A `<details class="iv-dropdown">` element.
   * @param {Partial<DropdownOptions>} [options] Options passed in JavaScript.
   * @throws {IvError} `invalid-element` when `el` is not a `<details>`.
   */
  constructor(el, options) {
    if (!isElement(el) || !isDetailsElement(el)) {
      throw new IvError(
        "invalid-element",
        "Dropdown requires a <details> element."
      );
    }
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {boolean} Last committed state; guards the async `toggle`. */
    this._open = this._open ?? this.details.open;
    /** @type {Map<Element, Map<string, string|null>>} Attributes to restore. */
    this._saved = this._saved ?? new Map();
    /** @type {boolean} Whether this instance added the placement class. */
    this._addedEndClass = this._addedEndClass ?? false;
    /** @type {boolean} Whether the current opening came from the keyboard. */
    this._fromKeyboard = this._fromKeyboard ?? false;
    /** @type {HTMLElement|null} The trigger. */
    this._summary = this._summary ?? null;
    /** @type {Element|null} The menu container. */
    this._menu = this._menu ?? null;
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
   * @returns {Readonly<DropdownOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<DropdownOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * Whether the menu is currently open.
   *
   * @returns {boolean} `true` when open.
   */
  get isOpen() {
    return this.details.open;
  }

  /** @returns {void} */
  _setup() {
    this._open = this.details.open;
    this._saved = new Map();
    this._addedEndClass = false;
    this._fromKeyboard = false;

    const root = this._element;
    const summary = root.querySelector("summary");
    this._summary =
      summary && summary.parentElement === root
        ? /** @type {HTMLElement} */ (summary)
        : null;
    const menu = root.querySelector(MENU_SELECTOR);
    this._menu = menu && menu.closest(".iv-dropdown") === root ? menu : null;

    if (this._summary) {
      this._set(this._summary, "aria-haspopup", "menu");
      this._set(this._summary, "aria-expanded", this._open ? "true" : "false");
    }
    if (this._menu) {
      this._set(this._menu, "role", "menu");
      for (const item of this._items()) {
        this._set(item, "role", "menuitem");
        this._set(item, "tabindex", "-1");
      }
      for (const separator of this._menu.querySelectorAll(SEPARATOR_SELECTOR)) {
        // `<hr>` already maps to the separator role; do not duplicate it.
        if (separator.tagName === "HR") continue;
        this._set(separator, "role", "separator");
      }
    }
    if (this.options.placement === "bottom-end" && !root.classList.contains(END_CLASS)) {
      root.classList.add(END_CLASS);
      this._addedEndClass = true;
    }

    this._listen(root, "toggle", () => this._onToggle());
    this._listen(root, "keydown", (event) => this._onKeydown(event));
    this._listen(root, "click", (event) => this._onClick(event));
    this._listen(document, "click", (event) => this._onDocumentClick(event));
  }

  /** @returns {void} */
  _teardown() {
    if (this._addedEndClass) {
      this._element.classList.remove(END_CLASS);
      this._addedEndClass = false;
    }
    for (const [el, attributes] of this._saved) {
      for (const [name, value] of attributes) {
        if (value === null) el.removeAttribute(name);
        else el.setAttribute(name, value);
      }
    }
    this._saved.clear();
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
    let attributes = this._saved.get(el);
    if (!attributes) {
      attributes = new Map();
      this._saved.set(el, attributes);
    }
    if (!attributes.has(name)) attributes.set(name, el.getAttribute(name));
    el.setAttribute(name, value);
  }

  /**
   * The focusable menu items, in document order.
   *
   * @returns {HTMLElement[]} Enabled items.
   */
  _items() {
    if (!this._menu) return [];
    const nodes = /** @type {NodeListOf<HTMLElement>} */ (
      this._menu.querySelectorAll(ITEM_SELECTOR)
    );
    return Array.from(nodes).filter(
      (item) =>
        !item.hasAttribute("disabled") &&
        item.getAttribute("aria-disabled") !== "true"
    );
  }

  /**
   * Keeps `aria-expanded` in sync with the state.
   *
   * @returns {void}
   */
  _syncExpanded() {
    if (!this._summary) return;
    this._summary.setAttribute("aria-expanded", this._open ? "true" : "false");
  }

  /**
   * Moves focus to a menu item.
   *
   * @param {number} index Index in the item list; clamped by the caller.
   * @returns {void}
   */
  _focusItem(index) {
    const items = this._items();
    if (items.length === 0) return;
    const bounded = ((index % items.length) + items.length) % items.length;
    items[bounded].focus();
  }

  /**
   * Returns focus to the trigger.
   *
   * @returns {void}
   */
  _focusSummary() {
    if (this._summary && typeof this._summary.focus === "function") {
      this._summary.focus();
    }
  }

  /**
   * Handles the native `toggle` event, i.e. a state change made by the user.
   *
   * @returns {void}
   */
  _onToggle() {
    const open = this.details.open;
    if (open === this._open) return; // Programmatic change, already announced.
    const allowed = emit(
      this._element,
      open ? "open" : "close",
      { instance: this, trigger: this._summary, reason: "trigger" },
      { cancelable: true }
    );
    if (!allowed) {
      this.details.open = this._open;
      return;
    }
    this._open = open;
    this._syncExpanded();
    emit(this._element, open ? "opened" : "closed", {
      instance: this,
      trigger: this._summary,
      reason: "trigger",
    });
    if (open && this._fromKeyboard) this._focusItem(0);
    this._fromKeyboard = false;
  }

  /**
   * Closes the menu when a click lands outside the component.
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
   * Closes the menu when an item is activated with the pointer.
   *
   * @param {Event} event Click event.
   * @returns {void}
   */
  _onClick(event) {
    if (!this.options.closeOnSelect) return;
    const target = event.target;
    if (!isElement(target)) return;
    const item = target.closest(ITEM_SELECTOR);
    if (!item || !this._element.contains(item)) return;
    this.close("trigger");
  }

  /**
   * Menu button and menu keyboard handling.
   *
   * @param {Event} event Keydown event.
   * @returns {void}
   */
  _onKeydown(event) {
    const key = /** @type {KeyboardEvent} */ (event).key;
    const target = event.target;
    if (!isElement(target)) return;
    const onSummary = this._summary !== null && this._summary.contains(target);
    const item = target.closest(ITEM_SELECTOR);

    if (onSummary) {
      if (key === KEY_ENTER || key === KEY_SPACE) {
        event.preventDefault(); // The native toggle would run without our flag.
        this._fromKeyboard = !this._open;
        this.toggle();
        if (this._open) this._focusItem(0);
        this._fromKeyboard = false;
        return;
      }
      if (key === KEY_ARROW_DOWN) {
        event.preventDefault();
        if (!this._open) this.open();
        this._focusItem(0);
        return;
      }
      if (key === KEY_ARROW_UP) {
        event.preventDefault();
        if (!this._open) this.open();
        this._focusItem(this._items().length - 1);
        return;
      }
      if (key === KEY_ESCAPE && this._open) {
        event.preventDefault();
        this.close("escape");
        return;
      }
      return;
    }

    if (!item) return;
    const items = this._items();
    const index = items.indexOf(/** @type {HTMLElement} */ (item));

    if (key === KEY_ARROW_DOWN) {
      event.preventDefault();
      this._focusItem(index + 1);
      return;
    }
    if (key === KEY_ARROW_UP) {
      event.preventDefault();
      this._focusItem(index - 1);
      return;
    }
    if (key === KEY_HOME) {
      event.preventDefault();
      this._focusItem(0);
      return;
    }
    if (key === KEY_END) {
      event.preventDefault();
      this._focusItem(items.length - 1);
      return;
    }
    if (key === KEY_ESCAPE) {
      event.preventDefault();
      this.close("escape");
      this._focusSummary();
      return;
    }
    if (key === KEY_TAB) {
      // Focus is never trapped: park focus on the summary so the browser's default Tab / Shift+Tab
      // continues from the button instead of from <body>, then close the menu.
      this._focusSummary();
      this.close("external");
      return;
    }
    if (key === KEY_ENTER || key === KEY_SPACE) {
      // The native activation still runs; only the menu state is handled here.
      if (!this.options.closeOnSelect) return;
      this.close("trigger");
      this._focusSummary();
    }
  }

  /**
   * Opens the menu. Emits the cancelable `iv:open` first.
   *
   * @returns {void}
   */
  open() {
    if (this._open) return;
    const allowed = emit(
      this._element,
      "open",
      { instance: this, trigger: this._summary, reason: "api" },
      { cancelable: true }
    );
    if (!allowed) return;
    this._open = true;
    this.details.open = true;
    this._syncExpanded();
    emit(this._element, "opened", {
      instance: this,
      trigger: this._summary,
      reason: "api",
    });
  }

  /**
   * Closes the menu. Emits the cancelable `iv:close` first.
   *
   * @param {DropdownReason} [reason] Why the menu is closing.
   * @returns {void}
   */
  close(reason = "api") {
    if (!this._open) return;
    const allowed = emit(
      this._element,
      "close",
      { instance: this, trigger: this._summary, reason },
      { cancelable: true }
    );
    if (!allowed) return;
    this._open = false;
    this.details.open = false;
    this._syncExpanded();
    emit(this._element, "closed", {
      instance: this,
      trigger: this._summary,
      reason,
    });
  }

  /**
   * Opens the menu when closed, closes it when open.
   *
   * @returns {void}
   */
  toggle() {
    if (this._open) this.close("api");
    else this.open();
  }
}
