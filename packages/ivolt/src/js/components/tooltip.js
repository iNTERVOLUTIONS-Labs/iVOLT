/**
 * Tooltip: a short complementary label shown next to a focusable element.
 *
 * The served HTML needs nothing but `data-iv-tooltip="…"` on the element the
 * label belongs to. Without JavaScript there is no tooltip at all, which is
 * why the text must always be complementary and never the only explanation of
 * a control. `init` attaches one delegating root — `[data-iv-component=
 * "tooltip"]`, or `document.body` marked with `data-iv-auto` when the page
 * declares none — and a single `<div class="iv-tooltip" role="tooltip">` is
 * created under the body the first time something is shown, then removed by
 * `destroy`. The element being described gets the tooltip id appended to its
 * `aria-describedby`, and the previous value comes back when it hides.
 *
 * Pointer and keyboard are deliberately different: the pointer waits `delay`
 * milliseconds, the keyboard shows the label as soon as focus lands. Coarse
 * pointers get the focus path only, because a finger has no hover and the
 * label would appear on tap and read as a glitch.
 *
 * `pointerenter` and `pointerleave` do not bubble, so the root listens in the
 * capture phase: a non-bubbling event still travels down through its
 * ancestors. Nothing is read from the layout until something is shown, and the
 * media query runs in `_setup` through the view of the element, never at
 * module level, so the module stays importable on the server.
 *
 * @module components/tooltip
 */

import { IvComponent, isElement } from "../core/component.js";
import { emit } from "../core/events.js";
import { KEY_ESCAPE } from "../core/keys.js";

/**
 * @typedef {object} TooltipOptions
 * @property {number} delay Milliseconds the pointer must rest on the target.
 * @property {"top"|"bottom"} placement Preferred side of the target.
 */

const ROOT_SELECTOR = '[data-iv-component="tooltip"]';
const TARGET_SELECTOR = "[data-iv-tooltip]";
const TEXT_ATTRIBUTE = "data-iv-tooltip";
const PLACEMENT_ATTRIBUTE = "data-iv-placement";
const DESCRIBED_BY = "aria-describedby";
const AUTO_ATTRIBUTE = "data-iv-auto";
const COMPONENT_ATTRIBUTE = "data-iv-component";
const COARSE_QUERY = "(pointer: coarse)";
/** Gap between the target and the tooltip, in pixels. */
const OFFSET = 8;
/** Smallest gap kept between the tooltip and the edges of the viewport. */
const MARGIN = 8;

/** Counter behind the id of every shared tooltip element. */
let sequence = 0;

/**
 * An id that is free in `doc`.
 *
 * @param {Document} doc Document the element will live in.
 * @param {string} base Preferred id.
 * @returns {string} The first free id built from `base`.
 */
function uniqueId(doc, base) {
  let id = base;
  let n = 2;
  while (doc.getElementById(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

/**
 * Body of the document a scan root belongs to.
 *
 * @param {ParentNode} root Subtree being scanned.
 * @returns {HTMLElement|null} The body, or `null` outside a document.
 */
function bodyOf(root) {
  const doc = isElement(root)
    ? /** @type {Element} */ (root).ownerDocument
    : /** @type {Document} */ (/** @type {unknown} */ (root));
  return doc && doc.body ? doc.body : null;
}

/**
 * Tooltip component: one delegating root, one shared bubble.
 *
 * @augments IvComponent
 */
export class Tooltip extends IvComponent {
  /** @type {string} */
  static componentName = "tooltip";

  /** @type {Readonly<TooltipOptions>} */
  static defaults = Object.freeze({
    delay: 300,
    placement: "top",
  });

  /**
   * Returns the instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Tooltip|undefined} The instance or `undefined`.
   */
  static get(el) {
    return /** @type {Tooltip|undefined} */ (super.get(el));
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<TooltipOptions>} [options] Options passed in JavaScript.
   * @returns {Tooltip} The instance.
   */
  static getOrCreate(el, options) {
    return /** @type {Tooltip} */ (
      super.getOrCreate(el, /** @type {Record<string, unknown>} */ (options))
    );
  }

  /**
   * Instantiates every `[data-iv-component="tooltip"]` inside `root`. When the
   * page declares no root and there are elements carrying `data-iv-tooltip`,
   * the body becomes a generated root marked with `data-iv-auto`, which
   * `destroy` removes again: tooltips are opt-out, like the picker (ADR-032).
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Tooltip[]} Newly created instances.
   */
  static initAll(root = document) {
    /** @type {Tooltip[]} */
    const generated = [];
    const declared =
      (isElement(root) && /** @type {Element} */ (root).matches(ROOT_SELECTOR)) ||
      root.querySelector(ROOT_SELECTOR) !== null;
    if (!declared && root.querySelector(TARGET_SELECTOR)) {
      const body = bodyOf(root);
      if (body && !body.matches(ROOT_SELECTOR)) {
        body.setAttribute(COMPONENT_ATTRIBUTE, "tooltip");
        body.setAttribute(AUTO_ATTRIBUTE, "");
        // A fragment being mounted does not contain the body: instantiate it here.
        if (!root.contains(body) && !Tooltip.get(body)) {
          generated.push(new Tooltip(body));
        }
      }
    }
    return [...generated, .../** @type {Tooltip[]} */ (super.initAll(root))];
  }

  /**
   * @param {Element} el Container holding the elements with `data-iv-tooltip`.
   * @param {Partial<TooltipOptions>} [options] Options passed in JavaScript.
   */
  constructor(el, options) {
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {HTMLElement|null} The shared bubble, created on first use. */
    this._tip = this._tip ?? null;
    /** @type {HTMLElement|null} Element currently described. */
    this._target = this._target ?? null;
    /** @type {HTMLElement|null} Element waiting for the pointer delay. */
    this._pending = this._pending ?? null;
    /** @type {string|null} `aria-describedby` of the target before it was described. */
    this._described = this._described ?? null;
    /** @type {ReturnType<typeof setTimeout>|0} Pending delay. */
    this._timer = this._timer ?? 0;
    /** @type {boolean} Whether the primary pointer is coarse. */
    this._coarse = this._coarse ?? false;
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<TooltipOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<TooltipOptions>} */ (
      /** @type {unknown} */ (super.options)
    );
  }

  /**
   * Element the visible tooltip describes.
   *
   * @returns {HTMLElement|null} The element, or `null` when nothing is shown.
   */
  get target() {
    return this._target;
  }

  /** @returns {void} */
  _setup() {
    this._tip = null;
    this._target = null;
    this._pending = null;
    this._described = null;
    this._timer = 0;
    const el = this._element;
    const view = el.ownerDocument.defaultView;
    this._coarse = Boolean(
      view &&
        typeof view.matchMedia === "function" &&
        view.matchMedia(COARSE_QUERY).matches
    );
    // `pointerenter` and `pointerleave` never bubble: the root has to listen in
    // the capture phase, which does reach it on the way down to the target.
    this._listen(el, "pointerenter", (event) => this._onEnter(event), {
      capture: true,
    });
    this._listen(el, "pointerleave", (event) => this._onLeave(event), {
      capture: true,
    });
    this._listen(el, "focusin", (event) => this._onFocusIn(event));
    this._listen(el, "focusout", (event) => this._onFocusOut(event));
    this._listen(el, "keydown", (event) => this._onKeydown(event));
    // A fixed bubble does not follow the page: any scroll, from any scroller,
    // hides it instead of leaving it pointing at nothing.
    if (view) {
      this._listen(view, "scroll", () => this.hide(), {
        capture: true,
        passive: true,
      });
    }
  }

  /** @returns {void} */
  _teardown() {
    this._cancel();
    this._restore();
    this._target = null;
    if (this._tip) {
      this._tip.remove();
      this._tip = null;
    }
    if (this._element.hasAttribute(AUTO_ATTRIBUTE)) {
      this._element.removeAttribute(AUTO_ATTRIBUTE);
      this._element.removeAttribute(COMPONENT_ATTRIBUTE);
    }
  }

  /**
   * Shows the label of `target`. Emits the cancelable `iv:show` first and
   * `iv:shown` once the bubble is placed. An element without text to show, or
   * the element already being described, is a no-op.
   *
   * @param {Element} target Element carrying `data-iv-tooltip`.
   * @returns {void}
   */
  show(target) {
    if (!isElement(target)) return;
    const el = /** @type {HTMLElement} */ (target);
    const text = el.getAttribute(TEXT_ATTRIBUTE);
    if (text === null || text.trim() === "") return;
    if (this._target === el) return;
    this._cancel();
    if (this._target) this.hide();
    const allowed = emit(
      this._element,
      "show",
      { instance: this, target: el },
      { cancelable: true }
    );
    if (!allowed) return;
    const tip = this._bubble();
    tip.textContent = text;
    tip.hidden = false;
    this._target = el;
    this._describe(el, tip.id);
    this._place();
    emit(this._element, "shown", { instance: this, target: el });
  }

  /**
   * Hides the visible label and restores the target. Emits `iv:hide` and
   * `iv:hidden`; hiding cannot be cancelled, so the label never gets stuck.
   *
   * @returns {void}
   */
  hide() {
    this._cancel();
    const target = this._target;
    if (!target) return;
    emit(this._element, "hide", { instance: this, target });
    this._restore();
    this._target = null;
    const tip = this._tip;
    if (tip) {
      tip.hidden = true;
      tip.textContent = "";
      tip.removeAttribute(PLACEMENT_ATTRIBUTE);
      tip.removeAttribute("style");
    }
    emit(this._element, "hidden", { instance: this, target });
  }

  /**
   * The shared bubble, created under the body on first use.
   *
   * @returns {HTMLElement} The tooltip element.
   */
  _bubble() {
    if (this._tip) return this._tip;
    const doc = this._element.ownerDocument;
    const tip = doc.createElement("div");
    tip.className = "iv-tooltip";
    tip.setAttribute("role", "tooltip");
    sequence += 1;
    tip.id = uniqueId(doc, `iv-tooltip-${sequence}`);
    tip.hidden = true;
    doc.body.append(tip);
    this._tip = tip;
    return tip;
  }

  /**
   * Appends the bubble id to `aria-describedby`, keeping whatever the author
   * wrote, and remembers the previous value for {@link Tooltip#_restore}.
   *
   * @param {HTMLElement} target Element being described.
   * @param {string} id Id of the bubble.
   * @returns {void}
   */
  _describe(target, id) {
    const previous = target.getAttribute(DESCRIBED_BY);
    this._described = previous;
    const tokens = previous === null ? [] : previous.split(/\s+/).filter(Boolean);
    if (!tokens.includes(id)) tokens.push(id);
    target.setAttribute(DESCRIBED_BY, tokens.join(" "));
  }

  /**
   * Puts `aria-describedby` back the way the author left it.
   *
   * @returns {void}
   */
  _restore() {
    const target = this._target;
    if (!target) return;
    if (this._described === null) target.removeAttribute(DESCRIBED_BY);
    else target.setAttribute(DESCRIBED_BY, this._described);
    this._described = null;
  }

  /**
   * Places the bubble above the target, centred, and below it when it does not
   * fit above. The offset never leaves the viewport horizontally, and the
   * arrow keeps pointing at the target when the bubble had to be pushed in.
   *
   * @returns {void}
   */
  _place() {
    const target = this._target;
    const tip = this._tip;
    if (!target || !tip) return;
    const view = this._element.ownerDocument.defaultView;
    const vw = view ? view.innerWidth : 0;
    const vh = view ? view.innerHeight : 0;
    const rect = target.getBoundingClientRect();
    const box = tip.getBoundingClientRect();
    const width = tip.offsetWidth || box.width || 0;
    const height = tip.offsetHeight || box.height || 0;
    const wanted = this.options.placement === "bottom" ? "bottom" : "top";
    const above = rect.top - OFFSET - MARGIN;
    const below = vh - rect.bottom - OFFSET - MARGIN;
    // Above is the default; below only when the bubble does not fit above.
    let placement = wanted;
    if (wanted === "top" && height > above) placement = "bottom";
    else if (wanted === "bottom" && height > below) placement = "top";
    const top = placement === "top" ? rect.top - height - OFFSET : rect.bottom + OFFSET;
    const centre = rect.left + rect.width / 2;
    let left = centre - width / 2;
    const last = vw - MARGIN - width;
    left = last < MARGIN ? MARGIN : Math.min(Math.max(left, MARGIN), last);
    tip.setAttribute(PLACEMENT_ATTRIBUTE, placement);
    tip.style.setProperty("inset", `${Math.round(top)}px auto auto ${Math.round(left)}px`);
    if (width > 0) {
      const arrow = Math.min(Math.max(centre - left, MARGIN), width - MARGIN);
      tip.style.setProperty("--iv-tooltip-arrow", `${Math.round(arrow)}px`);
    }
  }

  /**
   * Target of an event: the closest element carrying the attribute, unless a
   * nested root owns it.
   *
   * @param {Event} event Delegated event.
   * @returns {HTMLElement|null} The target, or `null` when there is none.
   */
  _from(event) {
    const node = event.target;
    if (!isElement(node)) return null;
    const target = /** @type {Element} */ (node).closest(TARGET_SELECTOR);
    if (!target || !this._element.contains(target)) return null;
    const owner = target.closest(ROOT_SELECTOR);
    if (owner !== null && owner !== this._element) return null;
    return /** @type {HTMLElement} */ (target);
  }

  /**
   * Pointer over a target: the label waits for `delay` before appearing.
   *
   * @param {Event} event The `pointerenter`.
   * @returns {void}
   */
  _onEnter(event) {
    if (this._coarse) return;
    const target = this._from(event);
    if (!target || this._target === target) return;
    this._cancel();
    const delay = this.options.delay;
    if (!(delay > 0)) {
      this.show(target);
      return;
    }
    this._pending = target;
    this._timer = setTimeout(() => {
      this._timer = 0;
      const pending = this._pending;
      this._pending = null;
      if (pending) this.show(pending);
    }, delay);
  }

  /**
   * Pointer gone: the label goes with it, unless the target still has focus.
   *
   * @param {Event} event The `pointerleave`.
   * @returns {void}
   */
  _onLeave(event) {
    const target = this._from(event);
    if (!target) return;
    if (this._pending === target) this._cancel();
    if (this._target !== target) return;
    if (this._element.ownerDocument.activeElement === target) return;
    this.hide();
  }

  /**
   * Focus on a target: the label appears at once, with no delay to wait for.
   *
   * @param {Event} event The `focusin`.
   * @returns {void}
   */
  _onFocusIn(event) {
    const target = this._from(event);
    if (!target) return;
    this._cancel();
    this.show(target);
  }

  /**
   * Focus leaving a target hides its label.
   *
   * @param {Event} event The `focusout`.
   * @returns {void}
   */
  _onFocusOut(event) {
    const target = this._from(event);
    if (!target) return;
    if (this._pending === target) this._cancel();
    if (this._target === target) this.hide();
  }

  /**
   * Escape dismisses the label without moving the focus.
   *
   * @param {Event} event The `keydown`.
   * @returns {void}
   */
  _onKeydown(event) {
    if (/** @type {KeyboardEvent} */ (event).key !== KEY_ESCAPE) return;
    if (!this._target && !this._pending) return;
    this.hide();
  }

  /**
   * Drops any pending delay.
   *
   * @returns {void}
   */
  _cancel() {
    if (this._timer) clearTimeout(this._timer);
    this._timer = 0;
    this._pending = null;
  }
}
