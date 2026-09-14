/**
 * Navbar: the site header. Brand, links, actions and, on narrow screens, a
 * collapsible panel (API_CONTRACT §8.16).
 *
 * The served HTML works without JavaScript: above the collapse breakpoint the
 * panel is a bar in the flow, below it the panel is served open and stacked
 * under the brand — nothing is out of reach — and the `__toggle` is `hidden`.
 * `init` shows the toggle, marks the header as collapsible for the CSS
 * (`data-iv-collapsible`, only under `[data-iv-js]`) and folds the panel until
 * `data-iv-open` lands on the header.
 *
 * It is not a `Drawer`: the panel is content in the flow, never a modal, so it
 * traps no focus, marks nothing `inert` and never locks the document scroll.
 *
 * @module components/navbar
 */

import { IvComponent, isElement } from "../core/component.js";
import { emit } from "../core/events.js";
import { breakpoints } from "../core/breakpoints.js";
import { KEY_ESCAPE } from "../core/keys.js";

/**
 * @typedef {object} NavbarOptions
 * @property {string} collapseBelow Breakpoint name below which the panel folds. `"none"` never folds.
 * @property {boolean} sticky Keep the header at the top of the viewport and condense it on scroll.
 * @property {number} condenseAt Scroll offset, in pixels, that turns the condensed state on.
 * @property {boolean} hideOnScroll Slide the header away while scrolling down.
 * @property {boolean} closeOnOutside Close the open panel when a click lands outside the header.
 */

/**
 * @typedef {"trigger"|"escape"|"external"|"api"|"viewport"} NavbarReason
 */

const TOGGLE_SELECTOR = ".iv-navbar__toggle";
const PANEL_SELECTOR = ".iv-navbar__panel";
const OPEN_ATTR = "data-iv-open";
const COLLAPSIBLE_ATTR = "data-iv-collapsible";
const CONDENSED_ATTR = "data-iv-condensed";
const HIDDEN_ATTR = "data-iv-hidden";
const STICKY_ATTR = "data-iv-sticky";

/** Pixels the page must travel before `hideOnScroll` reacts, so a jitter does not flicker the bar. */
const SCROLL_DEADZONE = 6;

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
 * Site header component.
 *
 * @augments IvComponent
 */
export class Navbar extends IvComponent {
  /** @type {string} */
  static componentName = "navbar";

  /** @type {Readonly<NavbarOptions>} */
  static defaults = Object.freeze({
    collapseBelow: "lg",
    sticky: false,
    condenseAt: 24,
    hideOnScroll: false,
    closeOnOutside: true,
  });

  /**
   * Returns the navbar instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Navbar|undefined} The instance or `undefined`.
   */
  static get(el) {
    const inst = super.get(el);
    return inst instanceof Navbar ? inst : undefined;
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<NavbarOptions>} [options] Options passed in JavaScript.
   * @returns {Navbar} The instance.
   */
  static getOrCreate(el, options) {
    return this.get(el) ?? new Navbar(el, options);
  }

  /**
   * Instantiates every `[data-iv-component="navbar"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Navbar[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Navbar[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el A `<header class="iv-navbar">` element.
   * @param {Partial<NavbarOptions>} [options] Options passed in JavaScript.
   */
  constructor(el, options) {
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {Map<Element, Map<string, string|null>>} Attributes to restore. */
    this._saved = this._saved ?? new Map();
    /** @type {Map<Element, string[]>} Original attribute order, per element. */
    this._order = this._order ?? new Map();
    /** @type {HTMLElement|null} The `__toggle` of this header. */
    this._toggle = this._toggle ?? null;
    /** @type {HTMLElement|null} The `__panel` of this header. */
    this._panel = this._panel ?? null;
    /** @type {boolean} Whether the collapsed panel is unfolded. */
    this._open = this._open ?? false;
    /** @type {boolean} Whether the header is currently condensed. */
    this._condensed = this._condensed ?? false;
    /** @type {boolean} Whether the header is currently slid away. */
    this._away = this._away ?? false;
    /** @type {boolean} Whether the viewport is below the collapse breakpoint. */
    this._collapsible = this._collapsible ?? false;
    /** @type {MediaQueryList|null} Watcher of the collapse breakpoint. */
    this._mql = this._mql ?? null;
    /** @type {number} Pending animation frame of the scroll handler. */
    this._frame = this._frame ?? 0;
    /** @type {boolean} Whether a measurement is already scheduled. */
    this._pending = this._pending ?? false;
    /** @type {number} Scroll offset read on the previous frame. */
    this._lastY = this._lastY ?? 0;
    /** @type {string|null} Inline `scroll-padding-block-start` this instance replaced. */
    this._scrollPadding = this._scrollPadding ?? null;
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<NavbarOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<NavbarOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * Whether the collapsed panel is unfolded. Above the collapse breakpoint the
   * panel is always visible and this getter stays `false`: there is nothing
   * folded to open.
   *
   * @returns {boolean} `true` while the panel is unfolded.
   */
  get isOpen() {
    return this._open;
  }

  /**
   * Whether the header is condensed by the scroll offset.
   *
   * @returns {boolean} `true` while condensed.
   */
  get isCondensed() {
    return this._condensed;
  }

  /** @returns {void} */
  _setup() {
    this._saved = new Map();
    this._order = new Map();
    this._toggle = null;
    this._panel = null;
    this._open = false;
    this._condensed = false;
    this._away = false;
    this._collapsible = false;
    this._mql = null;
    this._frame = 0;
    this._pending = false;
    this._lastY = 0;
    this._scrollPadding = null;

    const root = this._element;
    const doc = root.ownerDocument;
    this._toggle = /** @type {HTMLElement|null} */ (root.querySelector(TOGGLE_SELECTOR));
    this._panel = /** @type {HTMLElement|null} */ (root.querySelector(PANEL_SELECTOR));

    if (this._toggle && this._panel) {
      const toggle = this._toggle;
      const panel = this._panel;
      this._order.set(
        toggle,
        Array.from(toggle.attributes).map((attribute) => attribute.name)
      );
      if (!panel.id) this._set(panel, "id", uniqueId(doc, "iv-navbar-panel"));
      this._unset(toggle, "hidden");
      this._set(toggle, "aria-expanded", "false");
      this._set(toggle, "aria-controls", panel.id);
      this._listen(toggle, "click", () => this.toggle());
    }

    this._remember(root, OPEN_ATTR);
    this._remember(root, COLLAPSIBLE_ATTR);
    this._remember(root, CONDENSED_ATTR);
    this._remember(root, HIDDEN_ATTR);
    root.removeAttribute(OPEN_ATTR);
    root.removeAttribute(CONDENSED_ATTR);
    root.removeAttribute(HIDDEN_ATTR);

    this._setupCollapse();
    this._setupScroll();

    this._listen(doc, "click", (event) => this._onDocumentClick(event));
    this._listen(doc, "keydown", (event) => this._onDocumentKeydown(event));
  }

  /** @returns {void} */
  _teardown() {
    const view = this._element.ownerDocument.defaultView;
    if (this._frame && view) view.cancelAnimationFrame(this._frame);
    this._frame = 0;
    this._pending = false;
    this._restoreScrollPadding();
    this._toggle = null;
    this._panel = null;
    this._mql = null;
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
   * Subscribes to the collapse breakpoint. Below it the panel folds; above it
   * the panel is the bar itself. An unknown name is reported once and leaves
   * the header unfolded.
   *
   * @returns {void}
   */
  _setupCollapse() {
    const name = this.options.collapseBelow;
    if (!name || name === "none") return;
    if (typeof matchMedia !== "function") return;
    const query = mediaQueryFor(name);
    if (!query) {
      if (!warnedBreakpoints.has(name)) {
        warnedBreakpoints.add(name);
        console.warn(
          `[iVOLT] Unknown breakpoint "${name}" for option "collapseBelow" of "navbar"; the panel never folds.`
        );
      }
      return;
    }
    const mql = matchMedia(query);
    this._mql = mql;
    this._collapsible = !mql.matches;
    this._syncCollapsible();
    this._listen(mql, "change", (event) => {
      // The two layouts do not share a state: an open panel is folded back
      // before the header changes shape.
      this.close("viewport");
      this._collapsible = !(/** @type {MediaQueryListEvent} */ (event).matches);
      this._syncCollapsible();
    });
  }

  /**
   * Reflects the collapse state on the header, which is what the CSS reads to
   * fold the panel and to show the toggle.
   *
   * @returns {void}
   */
  _syncCollapsible() {
    if (!this._toggle || !this._panel) return;
    if (this._collapsible) this._set(this._element, COLLAPSIBLE_ATTR, "");
    else this._unset(this._element, COLLAPSIBLE_ATTR);
  }

  /**
   * Installs the scroll watcher when the header is sticky or hides on scroll,
   * plus the scroll padding that keeps anchors clear of a sticky header.
   *
   * @returns {void}
   */
  _setupScroll() {
    const sticky = this.options.sticky === true;
    if (sticky) this._set(this._element, STICKY_ATTR, "true");
    if (!sticky && this.options.hideOnScroll !== true) return;
    const view = this._element.ownerDocument.defaultView;
    if (!view) return;
    if (sticky) this._applyScrollPadding();
    this._lastY = Math.max(0, view.scrollY || 0);
    this._listen(view, "scroll", () => this._onScroll(), { passive: true });
    this._measure();
  }

  /**
   * Keeps in-page anchors from landing under the sticky header.
   *
   * @returns {void}
   */
  _applyScrollPadding() {
    const root = this._element.ownerDocument.documentElement;
    if (!root || !(/** @type {HTMLElement} */ (root).style)) return;
    const style = /** @type {HTMLElement} */ (root).style;
    this._scrollPadding = style.getPropertyValue("scroll-padding-block-start") || "";
    style.setProperty("scroll-padding-block-start", "var(--iv-navbar-height, 4rem)");
  }

  /**
   * Puts the scroll padding back the way the page had it.
   *
   * @returns {void}
   */
  _restoreScrollPadding() {
    if (this._scrollPadding === null) return;
    const root = this._element.ownerDocument.documentElement;
    const style = root ? /** @type {HTMLElement} */ (root).style : null;
    if (style) {
      if (this._scrollPadding === "") style.removeProperty("scroll-padding-block-start");
      else style.setProperty("scroll-padding-block-start", this._scrollPadding);
    }
    this._scrollPadding = null;
  }

  /**
   * Coalesces scroll events into one measurement per frame.
   *
   * @returns {void}
   */
  _onScroll() {
    if (this._pending) return;
    const view = this._element.ownerDocument.defaultView;
    if (!view) return;
    this._pending = true;
    const id = view.requestAnimationFrame(() => {
      this._pending = false;
      this._frame = 0;
      this._measure();
    });
    // A frame that already ran (a synchronous scheduler) has nothing to cancel.
    if (this._pending) this._frame = id;
  }

  /**
   * Reads the scroll offset and updates the condensed and slid-away states.
   *
   * @returns {void}
   */
  _measure() {
    const view = this._element.ownerDocument.defaultView;
    if (!view) return;
    const y = Math.max(0, view.scrollY || 0);

    if (this.options.sticky === true) {
      const condensed = y > Number(this.options.condenseAt);
      if (condensed !== this._condensed) {
        this._condensed = condensed;
        if (condensed) this._set(this._element, CONDENSED_ATTR, "");
        else this._unset(this._element, CONDENSED_ATTR);
        emit(this._element, "condense", { instance: this, condensed });
      }
    }

    if (this.options.hideOnScroll === true) {
      // An open panel or a keyboard user inside the header pins it in place:
      // sliding it away would take the focused control off screen.
      const pinned = this._open || this._focusInside() || y <= Number(this.options.condenseAt);
      let away = this._away;
      if (pinned) away = false;
      else if (y > this._lastY + SCROLL_DEADZONE) away = true;
      else if (y < this._lastY - SCROLL_DEADZONE) away = false;
      if (away !== this._away) {
        this._away = away;
        if (away) this._set(this._element, HIDDEN_ATTR, "");
        else this._unset(this._element, HIDDEN_ATTR);
      }
    }

    this._lastY = y;
  }

  /**
   * Whether focus currently sits inside the header.
   *
   * @returns {boolean} `true` when it does.
   */
  _focusInside() {
    const active = this._element.ownerDocument.activeElement;
    return active !== null && this._element.contains(active);
  }

  /**
   * Closes when a click lands outside the header.
   *
   * @param {Event} event Click event.
   * @returns {void}
   */
  _onDocumentClick(event) {
    if (!this._open || this.options.closeOnOutside === false) return;
    const target = event.target;
    if (isElement(target) && this._element.contains(target)) return;
    this.close("external");
  }

  /**
   * Escape closes the panel and hands focus back to the toggle.
   *
   * @param {Event} event Keydown event.
   * @returns {void}
   */
  _onDocumentKeydown(event) {
    if (!this._open) return;
    if (/** @type {KeyboardEvent} */ (event).key !== KEY_ESCAPE) return;
    event.preventDefault();
    const toggle = this._toggle;
    this.close("escape");
    if (toggle && typeof toggle.focus === "function") toggle.focus();
  }

  /**
   * Unfolds the panel. Emits the cancelable `iv:open` first. A no-op above the
   * collapse breakpoint, where the panel is already the bar.
   *
   * @param {{ trigger?: Element }} [detail] Element that asked for it.
   * @returns {void}
   */
  open(detail) {
    this._unfold("api", detail && detail.trigger);
  }

  /**
   * Shared body of `open` and `toggle`: the only difference is the reason and
   * the element credited as the trigger.
   *
   * @param {NavbarReason} reason Why it opens.
   * @param {Element} [trigger] Element that asked for it.
   * @returns {void}
   */
  _unfold(reason, trigger) {
    if (this._open || !this._collapsible || !this._toggle || !this._panel) return;
    const source = trigger ?? this._toggle;
    const allowed = emit(
      this._element,
      "open",
      { instance: this, trigger: source, reason },
      { cancelable: true }
    );
    if (!allowed) return;
    this._open = true;
    this._element.setAttribute(OPEN_ATTR, "");
    this._toggle.setAttribute("aria-expanded", "true");
    // A header that slid away must come back before it unfolds its panel.
    if (this._away) {
      this._away = false;
      this._unset(this._element, HIDDEN_ATTR);
    }
    emit(this._element, "opened", { instance: this, trigger: source, reason });
  }

  /**
   * Folds the panel back. Emits the cancelable `iv:close` first.
   *
   * @param {NavbarReason} [reason] Why it closes.
   * @returns {void}
   */
  close(reason = "api") {
    if (!this._open || !this._toggle) return;
    const trigger = this._toggle;
    const allowed = emit(
      this._element,
      "close",
      { instance: this, trigger, reason },
      { cancelable: true }
    );
    if (!allowed) return;
    this._open = false;
    this._element.removeAttribute(OPEN_ATTR);
    this._toggle.setAttribute("aria-expanded", "false");
    emit(this._element, "closed", { instance: this, trigger, reason });
  }

  /**
   * Unfolds the panel when folded, folds it when open.
   *
   * @returns {void}
   */
  toggle() {
    if (this._open) this.close("trigger");
    else this._unfold("trigger");
  }
}
