/**
 * Drawer: a side panel built on the native `<dialog>` element.
 *
 * Below `staticFrom` the drawer is a modal opened with `showModal()`, so the
 * browser provides the top layer, the implicit `inert` of the rest of the page
 * and the focus trap. From `staticFrom` upwards the CSS shows the very same
 * element as a static panel (`[data-iv-static]`), which this component toggles
 * from a `matchMedia` listener (ADR-021). The three native close paths are
 * intercepted exactly like `Dialog` so that `iv:close` is always cancelable
 * (ADR-022); this component deliberately does not extend `Dialog`, so the two
 * modules stay independent.
 *
 * @module components/drawer
 */

import { IvComponent, isElement } from "../core/component.js";
import { IvError, getInstance } from "../core/registry.js";
import { emit } from "../core/events.js";
import { focusFirst } from "../core/focus.js";
import { breakpoints } from "../core/breakpoints.js";

/**
 * @typedef {object} DrawerOptions
 * @property {"start"|"end"} placement Side the drawer is attached to.
 * @property {string} staticFrom Breakpoint name from which the drawer is a static panel; `"none"` keeps it always modal.
 * @property {boolean} closeOnBackdrop Close when the backdrop is clicked.
 * @property {boolean} closeOnEscape Close when Esc is pressed.
 * @property {boolean} returnFocus Return focus to the trigger on close.
 */

/**
 * @typedef {"api"|"escape"|"backdrop"|"form"|"trigger"|"external"|"viewport"} DrawerReason
 */

const PANEL_SELECTOR = ".iv-drawer__panel";
const STATIC_ATTR = "data-iv-static";
const END_CLASS = "iv-drawer--end";

/** Breakpoint names already reported as unknown. */
const warnedBreakpoints = new Set();

/**
 * Tells whether an element is a `<dialog>`.
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
 * Side drawer component.
 *
 * @augments IvComponent
 */
export class Drawer extends IvComponent {
  /** @type {string} */
  static componentName = "drawer";

  /** @type {Readonly<DrawerOptions>} */
  static defaults = Object.freeze({
    /** @type {"start"|"end"} */
    placement: "start",
    staticFrom: "lg",
    closeOnBackdrop: true,
    closeOnEscape: true,
    returnFocus: true,
  });

  /**
   * Returns the drawer instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Drawer|undefined} The instance or `undefined`.
   */
  static get(el) {
    const inst = getInstance(el, "drawer");
    return inst instanceof Drawer ? inst : undefined;
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<DrawerOptions>} [options] Options passed in JavaScript.
   * @returns {Drawer} The instance.
   */
  static getOrCreate(el, options) {
    return this.get(el) ?? new Drawer(el, options);
  }

  /**
   * Instantiates every `[data-iv-component="drawer"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Drawer[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Drawer[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el A `<dialog>` element.
   * @param {Partial<DrawerOptions>} [options] Options passed in JavaScript.
   * @throws {IvError} `invalid-element` when `el` is not a `<dialog>`.
   */
  constructor(el, options) {
    if (!isElement(el) || !isDialogElement(el)) {
      throw new IvError("invalid-element", "Drawer requires a <dialog> element.");
    }
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; this assignment only declares the
    // type of the field it created, it never discards its value.
    /** @type {string|null} `data-iv-static` exactly as served. */
    this._servedStatic = this._servedStatic ?? null;
  }

  /**
   * The host element, typed as a dialog.
   *
   * @returns {HTMLDialogElement} The `<dialog>` element.
   */
  get dialog() {
    return /** @type {HTMLDialogElement} */ (this._element);
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<DrawerOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<DrawerOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * Side the drawer is attached to. Read-only, resolved at construction.
   *
   * @returns {"start"|"end"} The placement.
   */
  get placement() {
    return this.options.placement === "end" ? "end" : "start";
  }

  /**
   * Whether the drawer is currently open as a modal.
   *
   * @returns {boolean} `true` when open.
   */
  get isOpen() {
    return this.dialog.hasAttribute("open");
  }

  /**
   * Whether the viewport is wide enough for the drawer to be a static panel.
   * In that state the panel is already visible and `open()` is a no-op.
   *
   * @returns {boolean} `true` in static mode.
   */
  get isStatic() {
    return this._element.hasAttribute(STATIC_ATTR);
  }

  /**
   * The native `returnValue` of the dialog.
   *
   * @returns {string} The return value.
   */
  get returnValue() {
    return this.dialog.returnValue ?? "";
  }

  /** @returns {void} */
  _setup() {
    /** @type {Element|null} Element focus returns to on close. */
    this._trigger = null;
    /** @type {DrawerReason|null} Reason of a close started by this instance. */
    this._closingReason = null;
    /** @type {boolean} Whether this instance added a temporary `tabindex`. */
    this._addedTabindex = false;
    /** @type {boolean} Whether this instance added the placement class. */
    this._addedEndClass = false;
    /** @type {boolean} Whether the instance is being destroyed. */
    this._destroying = false;
    /** @type {EventTarget|null} Where the press behind the current click landed. */
    this._pressTarget = null;
    /** @type {MediaQueryList|null} Watcher of the static breakpoint. */
    this._mql = null;
    /** @type {string|null} `data-iv-static` exactly as served. */
    this._servedStatic = this._element.getAttribute(STATIC_ATTR);

    this._applyPlacement();
    this._setupStatic();

    this._listen(this._element, "cancel", (event) => {
      // Always intercept: the native Esc close is not cancelable through iv:close.
      event.preventDefault();
      if (this.options.closeOnEscape) this.close("escape");
    });

    // A click whose press started inside the panel (selecting text and releasing
    // on the backdrop) has the <drawer> as its target; remembering where the press
    // landed is the only way to tell it from a real backdrop click.
    this._listen(this._element, "pointerdown", (event) => {
      this._pressTarget = event.target;
    });

    this._listen(this._element, "click", (event) => {
      const press = this._pressTarget;
      this._pressTarget = null;
      if (!this.options.closeOnBackdrop) return;
      const mouse = /** @type {MouseEvent} */ (event);
      if (mouse.target !== this._element) return;
      // `null` means no press was recorded (a synthetic click), which still closes.
      if (press !== null && press !== this._element) return;
      const panel = this._element.querySelector(PANEL_SELECTOR);
      if (panel) {
        const rect = panel.getBoundingClientRect();
        const inside =
          mouse.clientX >= rect.left &&
          mouse.clientX <= rect.right &&
          mouse.clientY >= rect.top &&
          mouse.clientY <= rect.bottom;
        if (inside) return;
      }
      this.close("backdrop");
    });

    this._listen(
      this._element,
      "submit",
      (event) => {
        const form = /** @type {Element|null} */ (event.target);
        if (!isElement(form) || !form.matches('form[method="dialog"]')) return;
        event.preventDefault();
        const submitter = /** @type {SubmitEvent} */ (event).submitter;
        const value =
          submitter && "value" in submitter
            ? /** @type {HTMLButtonElement} */ (submitter).value
            : "";
        this.close("form", value ?? "");
      },
      true
    );

    this._listen(this._element, "close", () => {
      this._onNativeClose();
    });
  }

  /**
   * Adds the placement class when the drawer sits on the inline end.
   *
   * @returns {void}
   */
  _applyPlacement() {
    if (this.placement !== "end") return;
    if (this._element.classList.contains(END_CLASS)) return;
    this._element.classList.add(END_CLASS);
    this._addedEndClass = true;
  }

  /**
   * Subscribes to the static breakpoint and reflects its current state.
   * An unknown breakpoint name is reported once and treated as `"none"`.
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
          `[iVOLT] Unknown breakpoint "${name}" for option "staticFrom" of "drawer"; the drawer stays modal.`
        );
      }
      return;
    }
    const mql = matchMedia(query);
    this._mql = mql;
    this._syncStatic(mql.matches);
    this._listen(mql, "change", (event) => {
      const matches = /** @type {MediaQueryListEvent} */ (event).matches;
      // Crossing upwards closes the modal; the CSS then shows the static panel.
      if (matches && this.isOpen) this.close("viewport");
      this._syncStatic(matches);
    });
  }

  /**
   * Reflects the static state on the element.
   *
   * @param {boolean} matches Whether the viewport is at or above the breakpoint.
   * @returns {void}
   */
  _syncStatic(matches) {
    if (matches) this._element.setAttribute(STATIC_ATTR, "");
    else this._element.removeAttribute(STATIC_ATTR);
  }

  /**
   * Opens the drawer as a modal. In static mode the panel is already visible,
   * so the call is a no-op and emits nothing.
   *
   * @param {{ trigger?: Element }} [opts] Opening context.
   * @returns {void}
   */
  open(opts) {
    if (this.isStatic || this.isOpen) return;
    const trigger = opts && opts.trigger ? opts.trigger : null;
    const allowed = emit(
      this._element,
      "open",
      { instance: this, trigger, reason: "api" },
      { cancelable: true }
    );
    if (!allowed) return;

    const active = /** @type {Element|null} */ (document.activeElement);
    this._trigger = trigger ?? active;
    this.dialog.showModal();
    this._focusInitial();
    emit(this._element, "opened", {
      instance: this,
      trigger: this._trigger,
      reason: "api",
    });
  }

  /**
   * Closes the drawer.
   *
   * @param {DrawerReason} [reason] Why the drawer is closing.
   * @param {string} [returnValue] Native return value.
   * @returns {void}
   */
  close(reason = "api", returnValue) {
    if (!this.isOpen) return;
    const allowed = emit(
      this._element,
      "close",
      { instance: this, reason, returnValue: returnValue ?? this.returnValue },
      { cancelable: true }
    );
    if (!allowed) return;
    this._closingReason = reason;
    if (returnValue === undefined) this.dialog.close();
    else this.dialog.close(returnValue);
  }

  /**
   * Opens the drawer when closed, closes it when open.
   *
   * @returns {void}
   */
  toggle() {
    if (this.isOpen) this.close("api");
    else this.open();
  }

  /**
   * Moves focus inside the drawer after opening.
   *
   * @returns {void}
   */
  _focusInitial() {
    const focused = focusFirst(this._element);
    if (focused) return;
    const host = /** @type {HTMLElement} */ (this._element);
    if (!host.hasAttribute("tabindex")) {
      host.setAttribute("tabindex", "-1");
      this._addedTabindex = true;
    }
    if (typeof host.focus === "function") host.focus();
  }

  /**
   * Removes the temporary `tabindex` added on open.
   *
   * @returns {void}
   */
  _restoreTabindex() {
    if (!this._addedTabindex) return;
    this._addedTabindex = false;
    this._element.removeAttribute("tabindex");
  }

  /**
   * Reacts to the native `close` event, whoever caused it.
   *
   * @returns {void}
   */
  _onNativeClose() {
    if (this._destroying) {
      this._restoreTabindex();
      this._closingReason = null;
      this._trigger = null;
      return;
    }
    const reason = this._closingReason ?? "external";
    this._closingReason = null;
    this._restoreTabindex();
    emit(this._element, "closed", {
      instance: this,
      reason,
      returnValue: this.returnValue,
    });
    const trigger = /** @type {HTMLElement|null} */ (this._trigger);
    if (
      this.options.returnFocus &&
      trigger &&
      trigger.isConnected &&
      typeof trigger.focus === "function"
    ) {
      trigger.focus();
    }
    this._trigger = null;
  }

  /**
   * Restores only what this instance changed. The `change` listener of the
   * media query is removed by the base class with the rest of the listeners.
   *
   * @returns {void}
   */
  _teardown() {
    this._mql = null;
    // Only what this instance wrote goes away: an author who served
    // `data-iv-static` keeps it (§5.2).
    if (this._servedStatic === null) this._element.removeAttribute(STATIC_ATTR);
    else this._element.setAttribute(STATIC_ATTR, this._servedStatic);
    this._servedStatic = null;
    if (this._addedEndClass) {
      this._addedEndClass = false;
      this._element.classList.remove(END_CLASS);
    }
  }

  /**
   * Closes the drawer without emitting iVOLT events and releases the instance.
   *
   * @returns {void}
   */
  destroy() {
    this._destroying = true;
    if (this.isOpen) this.dialog.close();
    this._restoreTabindex();
    super.destroy();
    this._destroying = false;
  }
}
