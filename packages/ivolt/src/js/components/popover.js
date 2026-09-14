/**
 * Popover: a small panel anchored to the control that opened it.
 *
 * The served HTML is a native popover: a button with `popovertarget` and a
 * `[popover]` element. Without JavaScript the browser already opens it, closes
 * it on Escape or on a click outside, and paints it in the top layer, centred
 * in the viewport — a degradation we accept. `init` only adds what the browser
 * does not do: it reports the lifecycle as `iv:open`/`iv:opened` and
 * `iv:close`/`iv:closed` (cancelling the first two also cancels the native
 * toggle), it moves the panel next to its invoker, and it takes focus into the
 * panel and brings it back to the invoker afterwards.
 *
 * Placement has two branches. With CSS anchor positioning the browser does the
 * work: the invoker gets an `anchor-name`, the panel a `position-anchor` and a
 * `position-area`, and nothing is measured or recalculated here. Without it,
 * the panel gets an inline `inset` in pixels, flipped to the other side when
 * there is no room and clamped to the viewport, recomputed while it is open on
 * every `resize`. Both branches mark the panel with `data-iv-placement`, which
 * is what drops the centring margins of the user agent in the stylesheet.
 * `destroy` removes every style and attribute both elements received.
 *
 * The native events do not distinguish Escape from a click outside: both
 * arrive as `light-dismiss`, as the contract says.
 *
 * @module components/popover
 */

import { IvComponent, isElement } from "../core/component.js";
import { emit } from "../core/events.js";
import { getFocusable } from "../core/focus.js";

/**
 * @typedef {object} PopoverOptions
 * @property {"bottom"|"top"} placement Preferred side of the invoker.
 * @property {"start"|"center"|"end"} align Alignment along the invoker.
 * @property {number} offset Gap between invoker and panel, in pixels.
 * @property {boolean} focus Whether opening moves the focus into the panel.
 */

/** @typedef {"trigger"|"light-dismiss"|"api"} PopoverReason */

const PLACEMENT_ATTRIBUTE = "data-iv-placement";
const ANCHOR_SUPPORT = "position-anchor: --iv-probe";
/** Properties written on the panel; all of them are removed again. */
const PANEL_PROPERTIES = [
  "inset",
  "margin-block-start",
  "margin-block-end",
  "margin-inline-start",
  "margin-inline-end",
  "position-anchor",
  "position-area",
  "inset-area",
  "position-try-fallbacks",
];
/** Smallest gap kept between the panel and the edges of the viewport. */
const MARGIN = 8;

/** Counter behind the anchor name of every placed popover. */
let sequence = 0;

/**
 * Removes the style attribute of an element when nothing is left in it.
 *
 * @param {HTMLElement} el Element to tidy.
 * @returns {void}
 */
function tidy(el) {
  if (el.getAttribute("style") === "") el.removeAttribute("style");
}

/**
 * Popover component: the native element, placed and reported.
 *
 * @augments IvComponent
 */
export class Popover extends IvComponent {
  /** @type {string} */
  static componentName = "popover";

  /** @type {Readonly<PopoverOptions>} */
  static defaults = Object.freeze({
    placement: "bottom",
    align: "start",
    offset: 8,
    focus: true,
  });

  /**
   * Returns the instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Popover|undefined} The instance or `undefined`.
   */
  static get(el) {
    return /** @type {Popover|undefined} */ (super.get(el));
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<PopoverOptions>} [options] Options passed in JavaScript.
   * @returns {Popover} The instance.
   */
  static getOrCreate(el, options) {
    return /** @type {Popover} */ (
      super.getOrCreate(el, /** @type {Record<string, unknown>} */ (options))
    );
  }

  /**
   * Instantiates every `[data-iv-component="popover"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Popover[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Popover[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el The `[popover]` panel itself.
   * @param {Partial<PopoverOptions>} [options] Options passed in JavaScript.
   */
  constructor(el, options) {
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {boolean} Whether the panel is showing. */
    this._open = this._open ?? false;
    /** @type {HTMLElement|null} Control the panel is anchored to. */
    this._invoker = this._invoker ?? null;
    /** @type {PopoverReason} Reason carried from `beforetoggle` to `toggle`. */
    this._reason = this._reason ?? "api";
    /** @type {PopoverReason|null} Reason forced by a call to the API. */
    this._called = this._called ?? null;
    /** @type {boolean} Whether focus was inside the panel when it closed. */
    this._returning = this._returning ?? false;
    /** @type {boolean} Whether the temporary `tabindex` is ours. */
    this._tabindex = this._tabindex ?? false;
    /** @type {EventListener|null} Resize listener while the panel is open. */
    this._resize = this._resize ?? null;
    /** @type {string} Anchor name given to the invoker, empty when unused. */
    this._anchorName = this._anchorName ?? "";
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<PopoverOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<PopoverOptions>} */ (
      /** @type {unknown} */ (super.options)
    );
  }

  /**
   * Whether the panel is showing.
   *
   * @returns {boolean} `true` while it is open.
   */
  get isOpen() {
    return this._open;
  }

  /**
   * Control the panel is anchored to.
   *
   * @returns {HTMLElement|null} The invoker, or `null` while closed.
   */
  get invoker() {
    return this._invoker;
  }

  /** @returns {void} */
  _setup() {
    this._open = false;
    this._invoker = null;
    this._reason = "api";
    this._called = null;
    this._returning = false;
    this._tabindex = false;
    this._resize = null;
    this._anchorName = "";
    this._listen(this._element, "beforetoggle", (event) => this._onBefore(event));
    this._listen(this._element, "toggle", (event) => this._onToggle(event));
  }

  /** @returns {void} */
  _teardown() {
    this._stopResize();
    this._clear();
    this._invoker = null;
    this._open = false;
  }

  /**
   * Opens the panel through the native API. Reported with reason `api`.
   *
   * @returns {void}
   */
  open() {
    if (this._open) return;
    const el = /** @type {HTMLElement} */ (this._element);
    if (typeof el.showPopover !== "function") return;
    this._called = "api";
    try {
      el.showPopover();
    } finally {
      this._called = null;
    }
  }

  /**
   * Closes the panel through the native API. Reported with reason `api`.
   *
   * @returns {void}
   */
  close() {
    if (!this._open) return;
    const el = /** @type {HTMLElement} */ (this._element);
    if (typeof el.hidePopover !== "function") return;
    this._called = "api";
    try {
      el.hidePopover();
    } finally {
      this._called = null;
    }
  }

  /**
   * Opens the panel when it is closed, closes it when it is open.
   *
   * @returns {void}
   */
  toggle() {
    if (this._open) this.close();
    else this.open();
  }

  /**
   * The native `beforetoggle`: the cancelable half of the contract. Cancelling
   * `iv:open` or `iv:close` cancels the native toggle as well.
   *
   * @param {Event} event The native event.
   * @returns {void}
   */
  _onBefore(event) {
    const opening =
      /** @type {{ newState?: string }} */ (/** @type {unknown} */ (event))
        .newState === "open";
    const source = /** @type {{ source?: unknown }} */ (
      /** @type {unknown} */ (event)
    ).source;
    const invoker = opening
      ? this._resolveInvoker(source)
      : this._invoker ?? this._resolveInvoker(source);
    // Opening always answers to something the user did unless the API did it.
    // Closing tells `trigger` from `light-dismiss` by the invoker the browser
    // reports; Escape and an outside click both arrive without one.
    const reason = this._called
      ? this._called
      : opening
        ? "trigger"
        : isElement(source)
          ? "trigger"
          : "light-dismiss";
    this._reason = reason;
    const allowed = emit(
      this._element,
      opening ? "open" : "close",
      { instance: this, trigger: invoker, reason },
      { cancelable: true }
    );
    if (!allowed) {
      event.preventDefault();
      return;
    }
    if (opening) {
      this._invoker = invoker;
      this._place();
      return;
    }
    // The browser moves the focus out as it hides the panel: remember now
    // whether it was inside, or the invoker never gets it back.
    const doc = this._element.ownerDocument;
    this._returning =
      this.options.focus && this._element.contains(doc.activeElement);
  }

  /**
   * The native `toggle`: the panel is in its new state.
   *
   * @param {Event} event The native event.
   * @returns {void}
   */
  _onToggle(event) {
    const opening =
      /** @type {{ newState?: string }} */ (/** @type {unknown} */ (event))
        .newState === "open";
    this._open = opening;
    const invoker = this._invoker;
    const reason = this._reason;
    if (opening) {
      // Measured again now that the panel has a size: `beforetoggle` runs while
      // it is still `display: none`.
      this._place();
      this._startResize();
      if (this.options.focus) this._focus();
      emit(this._element, "opened", { instance: this, trigger: invoker, reason });
      return;
    }
    this._stopResize();
    this._clear();
    this._invoker = null;
    if (this._returning && invoker && invoker.isConnected) {
      const doc = this._element.ownerDocument;
      const active = doc.activeElement;
      // Only when nothing else has claimed the focus in the meantime.
      if (active === null || active === doc.body || this._element.contains(active)) {
        invoker.focus();
      }
    }
    this._returning = false;
    emit(this._element, "closed", { instance: this, trigger: invoker, reason });
  }

  /**
   * The control the panel belongs to: the invoker the browser reports, or the
   * nearest `[popovertarget]` pointing at this panel.
   *
   * @param {unknown} source `source` of the native event, when the browser has one.
   * @returns {HTMLElement|null} The invoker, or `null` when there is none.
   */
  _resolveInvoker(source) {
    if (isElement(source)) return /** @type {HTMLElement} */ (source);
    const el = this._element;
    const id = el.id;
    if (!id) return null;
    const doc = el.ownerDocument;
    const view = doc.defaultView;
    const escaped =
      view && view.CSS && typeof view.CSS.escape === "function"
        ? view.CSS.escape(id)
        : id;
    const matches = /** @type {HTMLElement[]} */ ([
      ...doc.querySelectorAll(`[popovertarget="${escaped}"]`),
    ]);
    if (matches.length === 0) return null;
    let best = matches[0];
    for (const node of matches) {
      // Keep the last control that comes before the panel in document order.
      if (node.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) {
        best = node;
      }
    }
    return best;
  }

  /**
   * Places the panel next to its invoker, by anchor positioning when the
   * browser has it and by measurement when it does not.
   *
   * @returns {void}
   */
  _place() {
    const invoker = this._invoker;
    // Nothing to anchor to: the browser keeps the panel centred, as without JS.
    if (!invoker) return;
    const el = /** @type {HTMLElement} */ (this._element);
    const view = el.ownerDocument.defaultView;
    const placement = this.options.placement === "top" ? "top" : "bottom";
    const offset = Number(this.options.offset) || 0;
    if (view && view.CSS && typeof view.CSS.supports === "function" &&
        view.CSS.supports(ANCHOR_SUPPORT)) {
      if (!this._anchorName) {
        sequence += 1;
        this._anchorName = `--iv-popover-${sequence}`;
      }
      const name = this._anchorName;
      invoker.style.setProperty("anchor-name", name);
      el.style.setProperty("position-anchor", name);
      const area = this._area(placement);
      el.style.setProperty("position-area", area);
      // Chromium shipped the property as `inset-area` first; the browser that
      // knows `position-area` ignores this one.
      el.style.setProperty("inset-area", area);
      el.style.setProperty("position-try-fallbacks", "flip-block, flip-inline");
      if (offset > 0) {
        el.style.setProperty(
          placement === "top" ? "margin-block-end" : "margin-block-start",
          `${offset}px`
        );
      }
      // The area reaches the edge of the viewport on the side the panel grows
      // towards: a margin there keeps the same gutter the measured branch
      // leaves, without moving the edge that is aligned to the invoker.
      const align = this.options.align;
      if (align !== "end") el.style.setProperty("margin-inline-end", `${MARGIN}px`);
      if (align !== "start") el.style.setProperty("margin-inline-start", `${MARGIN}px`);
      el.setAttribute(PLACEMENT_ATTRIBUTE, placement);
      return;
    }
    const vw = view ? view.innerWidth : 0;
    const vh = view ? view.innerHeight : 0;
    const rect = invoker.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const width = el.offsetWidth || box.width || 0;
    const height = el.offsetHeight || box.height || 0;
    const above = rect.top - offset - MARGIN;
    const below = vh - rect.bottom - offset - MARGIN;
    // The preferred side wins unless the panel does not fit there and the other
    // side has more room.
    let side = placement;
    if (placement === "bottom" && height > below && above > below) side = "top";
    else if (placement === "top" && height > above && below > above) side = "bottom";
    const top = side === "top" ? rect.top - height - offset : rect.bottom + offset;
    const alignment = this.options.align;
    let left = rect.left;
    if (alignment === "end") left = rect.right - width;
    else if (alignment === "center") left = rect.left + rect.width / 2 - width / 2;
    const lastLeft = vw - MARGIN - width;
    left = lastLeft < MARGIN ? MARGIN : Math.min(Math.max(left, MARGIN), lastLeft);
    const lastTop = vh - MARGIN - height;
    const y = lastTop < MARGIN ? MARGIN : Math.min(Math.max(top, MARGIN), lastTop);
    el.setAttribute(PLACEMENT_ATTRIBUTE, side);
    el.style.setProperty("inset", `${Math.round(y)}px auto auto ${Math.round(left)}px`);
  }

  /**
   * Area the panel occupies around its anchor, in the grammar of
   * `position-area`.
   *
   * @param {"top"|"bottom"} placement Preferred side.
   * @returns {string} The value written on the panel.
   */
  _area(placement) {
    const block = placement === "top" ? "block-start" : "block-end";
    const align = this.options.align;
    // `span-inline-end` grows away from the start edge of the anchor, which is
    // what `align: "start"` means.
    if (align === "center") return block;
    return `${block} ${align === "end" ? "span-inline-start" : "span-inline-end"}`;
  }

  /**
   * Moves the focus into the panel: the first focusable element, or the panel
   * itself with a `tabindex` that leaves with it.
   *
   * @returns {void}
   */
  _focus() {
    const el = /** @type {HTMLElement} */ (this._element);
    const [first] = getFocusable(el);
    if (first) {
      first.focus();
      return;
    }
    if (!el.hasAttribute("tabindex")) {
      el.setAttribute("tabindex", "-1");
      this._tabindex = true;
    }
    el.focus();
  }

  /**
   * Removes every style and attribute this instance wrote.
   *
   * @returns {void}
   */
  _clear() {
    const el = /** @type {HTMLElement} */ (this._element);
    for (const name of PANEL_PROPERTIES) el.style.removeProperty(name);
    tidy(el);
    el.removeAttribute(PLACEMENT_ATTRIBUTE);
    if (this._tabindex) {
      el.removeAttribute("tabindex");
      this._tabindex = false;
    }
    const invoker = this._invoker;
    if (invoker && this._anchorName) {
      invoker.style.removeProperty("anchor-name");
      tidy(invoker);
    }
  }

  /**
   * Follows the viewport while the panel is open: a resize changes the room on
   * each side, and a measured placement would otherwise fall off the screen.
   *
   * @returns {void}
   */
  _startResize() {
    const view = this._element.ownerDocument.defaultView;
    if (!view || this._resize) return;
    /** @type {EventListener} */
    const handler = () => this._place();
    this._resize = handler;
    this._listen(view, "resize", handler);
  }

  /**
   * Drops the resize listener.
   *
   * @returns {void}
   */
  _stopResize() {
    const view = this._element.ownerDocument.defaultView;
    const handler = this._resize;
    if (!handler) return;
    this._resize = null;
    if (!view) return;
    view.removeEventListener("resize", handler);
    this._listeners = this._listeners.filter(
      (entry) =>
        entry.target !== view || entry.type !== "resize" || entry.handler !== handler
    );
  }
}
