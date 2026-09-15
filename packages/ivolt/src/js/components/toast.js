/**
 * Toast: a live region that shows short, transient messages.
 *
 * The component is created on the region element; the items are created by the
 * API, never written by the author. Message and title are inserted with
 * `textContent`, so a toast can never introduce markup. At most `max` items are
 * visible at a time and the rest wait in a queue, so nothing is lost. Each item
 * owns its timer, which pauses on hover and on focus.
 *
 * @module components/toast
 */

import { IvComponent } from "../core/component.js";
import { getInstance } from "../core/registry.js";
import { emit } from "../core/events.js";
import { KEY_ESCAPE } from "../core/keys.js";

/**
 * @typedef {object} ToastOptions
 * @property {"bottom-end"|"bottom-start"|"top-end"|"top-start"} placement Corner the region is anchored to.
 * @property {number} max Maximum number of items visible at the same time.
 * @property {string} dismissText Accessible name of the dismiss button of every item.
 */

/**
 * @typedef {object} ToastShowOptions
 * @property {string} message Message text.
 * @property {string} [title] Optional title text.
 * @property {"info"|"success"|"warning"|"danger"} [variant] Tone of the toast. Defaults to `"info"`.
 * @property {number} [timeout] Auto-dismiss delay in ms; `0` disables it. Defaults to 6000.
 * @property {boolean} [dismissible] Whether a dismiss button is rendered. Defaults to `true`.
 */

/**
 * @typedef {"api"|"timeout"|"trigger"|"escape"} ToastReason
 */

/**
 * A listener attached to an item node.
 *
 * @typedef {object} ItemListener
 * @property {string} type Event type.
 * @property {EventListener} handler Listener.
 */

const VARIANTS = ["info", "success", "warning", "danger"];
const PLACEMENTS = ["bottom-end", "bottom-start", "top-end", "top-start"];
const DEFAULT_TIMEOUT = 6000;

/** Values already reported as invalid, so each one warns only once. */
const warnedValues = new Set();

/**
 * Warns once per invalid value.
 *
 * @param {string} option Option name.
 * @param {string} raw Offending value.
 * @param {string} fallback Value used instead.
 * @returns {void}
 */
function warnOnce(option, raw, fallback) {
  const key = `${option}:${raw}`;
  if (warnedValues.has(key)) return;
  warnedValues.add(key);
  console.warn(
    `[iVOLT] Invalid value "${raw}" for "${option}" of "toast"; using "${fallback}".`
  );
}

/**
 * A single toast, returned by {@link Toast#show}.
 */
export class ToastItem {
  /**
   * @param {Toast} region Owning region.
   * @param {HTMLElement} element Item node.
   * @param {number} timeout Auto-dismiss delay in ms; `0` disables it.
   * @param {boolean} dismissible Whether the item has a dismiss button.
   */
  constructor(region, element, timeout, dismissible) {
    /** @type {Toast} */
    this._region = region;
    /** @type {HTMLElement} */
    this._element = element;
    /** @type {number} */
    this.timeout = timeout;
    /** @type {boolean} */
    this.dismissible = dismissible;
    /** @type {boolean} Whether the item is currently visible. */
    this._open = false;
    /** @type {boolean} Whether the item has already been dismissed or dropped. */
    this._done = false;
    /** @type {HTMLElement | null} Element focus came from before entering this toast (restored on dismiss). */
    this._returnTo = null;
    /** @type {boolean} Whether the pointer is over the item. */
    this._hovered = false;
    /** @type {boolean} Whether focus is inside the item. */
    this._focused = false;
    /** @type {ReturnType<typeof setTimeout>|null} */
    this._timerId = null;
    /** @type {number} Milliseconds left before auto-dismiss. */
    this._remaining = timeout;
    /** @type {number} Timestamp the running timer started at. */
    this._startedAt = 0;
    /** @type {ItemListener[]} */
    this._listeners = [];
  }

  /**
   * The item node. It is only connected while the toast is visible.
   *
   * @returns {HTMLElement} The element.
   */
  get element() {
    return this._element;
  }

  /**
   * Whether the toast is visible. Queued toasts are not open yet.
   *
   * @returns {boolean} `true` while visible.
   */
  get isOpen() {
    return this._open;
  }

  /**
   * Dismisses the toast. Queued toasts are simply dropped.
   *
   * @param {ToastReason} [reason] Why the toast is closing.
   * @returns {void}
   */
  dismiss(reason = "api") {
    this._region._dismiss(this, reason);
  }
}

/**
 * Toast region component.
 *
 * @augments IvComponent
 */
export class Toast extends IvComponent {
  /** @type {string} */
  static componentName = "toast";

  /** @type {Readonly<ToastOptions>} */
  static defaults = Object.freeze({
    /** @type {"bottom-end"|"bottom-start"|"top-end"|"top-start"} */
    placement: "bottom-end",
    max: 3,
    dismissText: "Dismiss",
  });

  /**
   * Returns the toast region attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Toast|undefined} The instance or `undefined`.
   */
  static get(el) {
    const inst = getInstance(el, "toast");
    return inst instanceof Toast ? inst : undefined;
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<ToastOptions>} [options] Options passed in JavaScript.
   * @returns {Toast} The instance.
   */
  static getOrCreate(el, options) {
    return this.get(el) ?? new Toast(el, /** @type {Record<string, unknown>} */ (options));
  }

  /**
   * Instantiates every `[data-iv-component="toast"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Toast[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Toast[]} */ (super.initAll(root));
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<ToastOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<ToastOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * Visible toasts, oldest first.
   *
   * @returns {ToastItem[]} The visible items.
   */
  get items() {
    return [...this._items];
  }

  /**
   * @param {Element} el The region element.
   * @param {Partial<ToastOptions>} [options] Options passed in JavaScript.
   */
  constructor(el, options) {
    super(el, /** @type {Record<string, unknown>} */ (options));

    /** @type {ToastItem[]} Visible items, oldest first. */
    this._items = [];
    /** @type {ToastItem[]} Items waiting for a free slot. */
    this._queue = [];
    /** @type {boolean} Whether this instance added role="region" to the element. */
    this._addedRole = this._addedRole ?? false;
    /** @type {boolean} Whether this instance added aria-live to the region. */
    this._addedLive = this._addedLive ?? false;
  }

  /**
   * Class name for the resolved placement; an invalid value falls back to the
   * default corner.
   *
   * @returns {string} The placement class.
   */
  get _placementClassName() {
    const placement = this.options.placement;
    const resolved = PLACEMENTS.includes(placement) ? placement : "bottom-end";
    return `iv-toast-region--${resolved}`;
  }

  /** @returns {void} */
  _setup() {
    if (!PLACEMENTS.includes(this.options.placement)) {
      warnOnce("placement", String(this.options.placement), "bottom-end");
    }
    const className = this._placementClassName;
    if (!this._element.classList.contains(className)) {
      this._element.classList.add(className);
      /** @type {boolean} Whether this instance added the placement class. */
      this._addedPlacementClass = true;
    }
    // A labelled region needs a role (aria-label on a bare div is prohibited); add it when the author did not.
    if (!this._element.hasAttribute("role")) {
      this._element.setAttribute("role", "region");
      /** @type {boolean} Whether this instance added role="region". */
      this._addedRole = true;
    }
    // The region is a polite live region: items are inserted fully formed, and additions inside an
    // existing live region are announced. Danger items carry role="alert" for assertive announcement.
    if (!this._element.hasAttribute("aria-live")) {
      this._element.setAttribute("aria-live", "polite");
      /** @type {boolean} Whether this instance added aria-live. */
      this._addedLive = true;
    }
    // Top layer (ADR-034): as a manual popover the region paints over modal dialogs where supported.
    const host = /** @type {HTMLElement} */ (this._element);
    if (typeof host.showPopover === "function" && !host.hasAttribute("popover")) {
      host.setAttribute("popover", "manual");
      /** @type {boolean} Whether this instance added the popover attribute. */
      this._addedPopover = true;
    }
    /** @type {boolean} Whether the region is currently shown in the top layer. */
    this._layerOpen = false;

    // Declarative triggers (API_CONTRACT §8.18): one delegated listener on the document,
    // so any served button carrying this region's id can show a toast without writing JS.
    // `destroy` removes it with the rest of the listeners registered through `_listen`.
    const id = this._element.id;
    if (id) {
      this._listen(this._element.ownerDocument, "click", (event) => {
        const target = /** @type {Element|null} */ (event.target);
        if (!target || typeof target.closest !== "function") return;
        const trigger = target.closest("[data-iv-toast]");
        if (!trigger || trigger.getAttribute("data-iv-toast") !== id) return;
        this.showFromTrigger(trigger);
      });
    }
  }

  /**
   * Shows a toast described by the `data-iv-*` attributes of a trigger element.
   *
   * Every value is text: it reaches the item through `textContent`, never as
   * markup. An unknown `data-iv-variant` falls back to `info` and a
   * non-numeric `data-iv-timeout` to the default of the region.
   *
   * @param {Element} trigger Element carrying the `data-iv-*` description.
   * @returns {ToastItem} The item, visible or queued.
   */
  showFromTrigger(trigger) {
    /**
     * @param {string} name Suffix of the `data-iv-*` attribute to read.
     * @returns {string|undefined} The value, or `undefined` when the attribute is absent.
     */
    const attr = (name) => {
      const value = trigger.getAttribute(`data-iv-${name}`);
      return value === null ? undefined : value;
    };
    const rawTimeout = attr("timeout");
    const timeout = rawTimeout !== undefined && rawTimeout.trim() !== "" ? Number(rawTimeout) : Number.NaN;
    /** @type {ToastShowOptions} */
    const opts = { message: attr("message") ?? "" };
    const title = attr("title");
    if (title !== undefined) opts.title = title;
    const variant = attr("variant");
    if (variant !== undefined) opts.variant = /** @type {"info"|"success"|"warning"|"danger"} */ (variant);
    if (Number.isFinite(timeout) && timeout >= 0) opts.timeout = timeout;
    if (attr("dismissible") === "false") opts.dismissible = false;
    return this.show(opts);
  }

  /**
   * Moves the region to the top layer before the first visible item, so a
   * toast is reachable above a modal dialog. No-op without popover support.
   *
   * @returns {void}
   */
  _showLayer() {
    const el = /** @type {HTMLElement} */ (this._element);
    if (this._layerOpen || !el.hasAttribute("popover") || typeof el.showPopover !== "function") return;
    try {
      el.showPopover();
      this._layerOpen = true;
    } catch {
      // Not connected or already shown by the author: the fixed region still works.
    }
  }

  /**
   * Leaves the top layer once nothing is visible or queued.
   *
   * @returns {void}
   */
  _hideLayer() {
    const el = /** @type {HTMLElement} */ (this._element);
    if (!this._layerOpen || this._items.length > 0 || this._queue.length > 0) return;
    this._layerOpen = false;
    if (typeof el.hidePopover === "function") {
      try {
        el.hidePopover();
      } catch {
        // Already hidden.
      }
    }
  }

  /**
   * Maximum number of visible toasts, never below one.
   *
   * @returns {number} The limit.
   */
  get _max() {
    const max = this.options.max;
    return typeof max === "number" && max >= 1 ? Math.floor(max) : 1;
  }

  /**
   * Shows a toast, or queues it when `max` toasts are already visible.
   *
   * @param {ToastShowOptions} opts Toast content and behaviour.
   * @returns {ToastItem} The item, visible or queued.
   */
  show(opts) {
    const message = opts && opts.message != null ? String(opts.message) : "";
    const title = opts && opts.title != null ? String(opts.title) : "";
    let variant = opts && opts.variant ? opts.variant : "info";
    if (!VARIANTS.includes(variant)) {
      warnOnce("variant", String(variant), "info");
      variant = "info";
    }
    const dismissible = !opts || opts.dismissible !== false;
    // A danger toast never auto-dismisses: the reader decides when it goes.
    const timeout =
      variant === "danger"
        ? 0
        : opts && typeof opts.timeout === "number" && opts.timeout >= 0
          ? opts.timeout
          : DEFAULT_TIMEOUT;

    const element = this._createNode({ message, title, variant, dismissible });
    const item = new ToastItem(this, element, timeout, dismissible);

    if (this._items.length >= this._max) this._queue.push(item);
    else this._present(item);
    return item;
  }

  /**
   * Builds the item node. Text is written with `textContent`, never as HTML.
   *
   * @param {{ message: string, title: string, variant: string, dismissible: boolean }} parts Content.
   * @returns {HTMLElement} The item node.
   */
  _createNode({ message, title, variant, dismissible }) {
    const el = document.createElement("div");
    el.className = `iv-toast iv-toast--${variant}`;
    // A danger toast interrupts; the rest are announced politely.
    el.setAttribute("role", variant === "danger" ? "alert" : "status");
    el.setAttribute("tabindex", "0");

    const body = document.createElement("div");
    body.className = "iv-toast__body";
    if (title) {
      const heading = document.createElement("strong");
      heading.className = "iv-toast__title";
      heading.textContent = title;
      body.append(heading);
    }
    const text = document.createElement("p");
    text.className = "iv-toast__message";
    text.textContent = message;
    body.append(text);
    el.append(body);

    if (dismissible) {
      const button = document.createElement("button");
      button.className =
        "iv-toast__dismiss iv-button iv-button--ghost iv-button--icon iv-button--sm";
      button.type = "button";
      button.setAttribute("aria-label", String(this.options.dismissText));
      // The glyph is decoration: the accessible name is the option above.
      const glyph = document.createElement("span");
      glyph.setAttribute("aria-hidden", "true");
      glyph.textContent = "×";
      button.append(glyph);
      el.append(button);
    }
    return el;
  }

  /**
   * Inserts an item and starts its timer.
   *
   * The node is inserted before `iv:open` is emitted so the event bubbles to
   * `document`; a cancelled `iv:open` removes it again in the same task, so
   * nothing is ever painted.
   *
   * @param {ToastItem} item Item to show.
   * @returns {void}
   */
  _present(item) {
    if (item._done) return;
    this._showLayer();
    this._element.append(item.element);
    const allowed = emit(
      item.element,
      "open",
      { instance: this, item, trigger: null, reason: "api" },
      { cancelable: true }
    );
    if (!allowed) {
      item.element.remove();
      item._done = true;
      return;
    }
    this._items.push(item);
    item._open = true;
    this._bindItem(item);
    this._startTimer(item);
    emit(item.element, "opened", {
      instance: this,
      item,
      trigger: null,
      reason: "api",
    });
  }

  /**
   * Attaches the listeners of an item. They are removed when it is dismissed.
   *
   * @param {ToastItem} item Visible item.
   * @returns {void}
   */
  _bindItem(item) {
    /** @type {ItemListener[]} */
    const listeners = [
      {
        type: "mouseenter",
        handler: () => {
          item._hovered = true;
          this._pauseTimer(item);
        },
      },
      {
        type: "mouseleave",
        handler: () => {
          item._hovered = false;
          this._resumeTimer(item);
        },
      },
      {
        type: "focusin",
        handler: (event) => {
          // Remember where focus came from (outside the region) to restore it after a dismissal.
          const from = /** @type {FocusEvent} */ (event).relatedTarget;
          if (from instanceof HTMLElement && !this._element.contains(from)) item._returnTo = from;
          item._focused = true;
          this._pauseTimer(item);
        },
      },
      {
        type: "focusout",
        handler: (event) => {
          // Focus moving between the message and the dismiss button is not a leave.
          const to = /** @type {FocusEvent} */ (event).relatedTarget;
          if (to instanceof Node && item.element.contains(to)) return;
          item._focused = false;
          this._resumeTimer(item);
        },
      },
      {
        type: "keydown",
        handler: (event) => {
          const key = /** @type {KeyboardEvent} */ (event).key;
          if (key !== KEY_ESCAPE) return;
          this._dismiss(item, "escape");
        },
      },
      {
        type: "click",
        handler: (event) => {
          const target = /** @type {Element|null} */ (event.target);
          if (!target || typeof target.closest !== "function") return;
          if (!target.closest(".iv-toast__dismiss")) return;
          this._dismiss(item, "trigger");
        },
      },
    ];
    for (const { type, handler } of listeners) {
      item.element.addEventListener(type, handler);
    }
    item._listeners = listeners;
  }

  /**
   * Removes the listeners of an item.
   *
   * @param {ToastItem} item Item to unbind.
   * @returns {void}
   */
  _unbindItem(item) {
    for (const { type, handler } of item._listeners) {
      item.element.removeEventListener(type, handler);
    }
    item._listeners = [];
  }

  /**
   * Starts (or restarts) the auto-dismiss timer of an item.
   *
   * @param {ToastItem} item Visible item.
   * @returns {void}
   */
  _startTimer(item) {
    if (item._remaining <= 0) return;
    item._startedAt = Date.now();
    item._timerId = setTimeout(() => {
      item._timerId = null;
      this._dismiss(item, "timeout");
    }, item._remaining);
  }

  /**
   * Pauses the timer, keeping the time left.
   *
   * @param {ToastItem} item Visible item.
   * @returns {void}
   */
  _pauseTimer(item) {
    if (item._timerId === null) return;
    clearTimeout(item._timerId);
    item._timerId = null;
    const elapsed = Date.now() - item._startedAt;
    item._remaining = Math.max(0, item._remaining - elapsed);
  }

  /**
   * Resumes a paused timer with the time left.
   *
   * @param {ToastItem} item Visible item.
   * @returns {void}
   */
  _resumeTimer(item) {
    if (!item._open || item._timerId !== null) return;
    // Every hold has to be gone: a pointer resting on the toast used to see the
    // countdown restart as soon as focus left it.
    if (item._hovered || item._focused) return;
    this._startTimer(item);
  }

  /**
   * Dismisses a visible item or drops a queued one.
   *
   * `iv:closed` is emitted while the node is still connected, so the event
   * reaches listeners on `document`; the node is removed right after.
   *
   * @param {ToastItem} item Item to dismiss.
   * @param {ToastReason} reason Why the toast is closing.
   * @returns {void}
   */
  _dismiss(item, reason) {
    if (item._done) return;
    if (!item._open) {
      const queued = this._queue.indexOf(item);
      if (queued !== -1) this._queue.splice(queued, 1);
      item._done = true;
      return;
    }
    const allowed = emit(
      item.element,
      "close",
      { instance: this, item, reason },
      { cancelable: true }
    );
    if (!allowed) return;

    this._pauseTimer(item);
    this._unbindItem(item);
    item._open = false;
    item._done = true;
    const index = this._items.indexOf(item);
    if (index !== -1) this._items.splice(index, 1);

    const hadFocus = item.element.contains(document.activeElement);
    emit(item.element, "closed", { instance: this, item, reason });
    item.element.remove();
    this._flushQueue();
    this._hideLayer();
    if (hadFocus) {
      // Keep keyboard users oriented: next remaining toast, else the element focus came from.
      const next = this._items[Math.min(index === -1 ? 0 : index, this._items.length - 1)];
      const target = next ? next.element : item._returnTo && item._returnTo.isConnected ? item._returnTo : null;
      if (target) target.focus();
    }
  }

  /**
   * Shows queued items while there is room for them.
   *
   * @returns {void}
   */
  _flushQueue() {
    while (this._items.length < this._max && this._queue.length > 0) {
      const next = /** @type {ToastItem} */ (this._queue.shift());
      this._present(next);
    }
  }

  /**
   * Dismisses every visible toast and empties the queue.
   *
   * @returns {void}
   */
  clear() {
    this._queue.splice(0).forEach((item) => {
      item._done = true;
    });
    for (const item of [...this._items]) this._dismiss(item, "api");
  }

  /**
   * Drops every timer, node and queued item without emitting close events.
   *
   * @returns {void}
   */
  _teardown() {
    if (this._layerOpen) {
      this._layerOpen = false;
      try {
        /** @type {HTMLElement} */ (this._element).hidePopover();
      } catch {
        // Already hidden.
      }
    }
    if (this._addedPopover) {
      this._element.removeAttribute("popover");
      this._addedPopover = false;
    }
    if (this._addedRole) {
      this._element.removeAttribute("role");
      this._addedRole = false;
    }
    if (this._addedLive) {
      this._element.removeAttribute("aria-live");
      this._addedLive = false;
    }
    for (const item of [...this._items]) {
      this._pauseTimer(item);
      this._unbindItem(item);
      item._open = false;
      item._done = true;
      item.element.remove();
    }
    this._items = [];
    this._queue.splice(0).forEach((item) => {
      item._done = true;
    });
    if (this._addedPlacementClass) {
      this._addedPlacementClass = false;
      this._element.classList.remove(this._placementClassName);
    }
  }
}
