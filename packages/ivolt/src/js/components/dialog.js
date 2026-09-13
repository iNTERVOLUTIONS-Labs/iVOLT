/**
 * Dialog: a thin, accessible layer over the native `<dialog>` element.
 *
 * The browser provides the top layer, the implicit `inert` of the rest of the
 * page and the focus trap. iVOLT adds initial focus, focus return, cancelable
 * events and backdrop closing, intercepting the three native close paths
 * (`submit` of `form[method="dialog"]`, the `cancel` event and the backdrop
 * click) so that `iv:close` is always cancelable (ADR-022).
 *
 * @module components/dialog
 */

import { IvComponent, isElement } from "../core/component.js";
import { IvError, getInstance } from "../core/registry.js";
import { emit } from "../core/events.js";
import { focusFirst } from "../core/focus.js";

/**
 * @typedef {object} DialogOptions
 * @property {boolean} closeOnBackdrop Close when the backdrop is clicked.
 * @property {boolean} closeOnEscape Close when Esc is pressed.
 * @property {string|null} initialFocus Selector, scoped to the dialog, focused on open.
 * @property {boolean} returnFocus Return focus to the trigger on close.
 */

/**
 * @typedef {"api"|"escape"|"backdrop"|"form"|"trigger"|"external"} DialogReason
 */

const PANEL_SELECTOR = ".iv-dialog__panel";

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
 * Modal dialog component.
 *
 * @augments IvComponent
 */
export class Dialog extends IvComponent {
  /** @type {string} */
  static componentName = "dialog";

  /** @type {Readonly<DialogOptions>} */
  static defaults = Object.freeze({
    closeOnBackdrop: true,
    closeOnEscape: true,
    /** @type {string|null} */
    initialFocus: null,
    returnFocus: true,
  });

  /**
   * Returns the dialog instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Dialog|undefined} The instance or `undefined`.
   */
  static get(el) {
    const inst = getInstance(el, "dialog");
    return inst instanceof Dialog ? inst : undefined;
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<DialogOptions>} [options] Options passed in JavaScript.
   * @returns {Dialog} The instance.
   */
  static getOrCreate(el, options) {
    return this.get(el) ?? new Dialog(el, options);
  }

  /**
   * Instantiates every `[data-iv-component="dialog"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Dialog[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Dialog[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el A `<dialog>` element.
   * @param {Partial<DialogOptions>} [options] Options passed in JavaScript.
   * @throws {IvError} `invalid-element` when `el` is not a `<dialog>`.
   */
  constructor(el, options) {
    if (!isElement(el) || !isDialogElement(el)) {
      throw new IvError(
        "invalid-element",
        "Dialog requires a <dialog> element."
      );
    }
    super(el, /** @type {Record<string, unknown>} */ (options));

    /** @type {Element|null} Element focus returns to on close. */
    this._trigger = null;
    /** @type {DialogReason|null} Reason of a close started by this instance. */
    this._closingReason = null;
    /** @type {boolean} Whether this instance added a temporary `tabindex`. */
    this._addedTabindex = false;
    /** @type {boolean} Whether the instance is being destroyed. */
    this._destroying = false;
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
   * @returns {Readonly<DialogOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<DialogOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * Whether the dialog is currently open.
   *
   * @returns {boolean} `true` when open.
   */
  get isOpen() {
    return this.dialog.hasAttribute("open");
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
    this._listen(this._element, "cancel", (event) => {
      // Always intercept: the native Esc close is not cancelable through iv:close.
      event.preventDefault();
      if (this.options.closeOnEscape) this.close("escape");
    });

    this._listen(this._element, "click", (event) => {
      if (!this.options.closeOnBackdrop) return;
      const mouse = /** @type {MouseEvent} */ (event);
      if (mouse.target !== this._element) return;
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
   * Opens the dialog as a modal.
   *
   * @param {{ trigger?: Element }} [opts] Opening context.
   * @returns {void}
   */
  open(opts) {
    if (this.isOpen) return;
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
   * Closes the dialog.
   *
   * @param {DialogReason} [reason] Why the dialog is closing.
   * @param {string} [returnValue] Native return value.
   * @returns {void}
   */
  close(reason = "api", returnValue) {
    if (!this.isOpen) return;
    const allowed = emit(
      this._element,
      "close",
      {
        instance: this,
        reason,
        returnValue: returnValue ?? this.returnValue,
      },
      { cancelable: true }
    );
    if (!allowed) return;
    this._closingReason = reason;
    if (returnValue === undefined) this.dialog.close();
    else this.dialog.close(returnValue);
  }

  /**
   * Opens the dialog when closed, closes it when open.
   *
   * @returns {void}
   */
  toggle() {
    if (this.isOpen) this.close("api");
    else this.open();
  }

  /**
   * Moves focus inside the dialog after opening.
   *
   * @returns {void}
   */
  _focusInitial() {
    const focused = focusFirst(this._element, this.options.initialFocus);
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
   * Closes the dialog without emitting iVOLT events and releases the instance.
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
