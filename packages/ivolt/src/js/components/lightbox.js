/**
 * Lightbox: a gallery of links that opens a full-screen viewer (§8.20).
 *
 * The served HTML is a plain gallery of anchors pointing at the full image, so
 * without JavaScript every picture is still one click away. `init` builds one
 * `<dialog class="iv-dialog iv-lightbox">` right after the gallery, inside the
 * same `.iv-root`, and composes a `Dialog` on it: the top layer, the focus
 * trap, Esc and the focus return are the browser's and the dialog's job, never
 * reimplemented here. The item that was clicked is passed as the `trigger`, so
 * focus lands back on it when the viewer closes.
 *
 * Every generated node is built with `createElement`, `textContent` and
 * properties; no markup is ever parsed from a string, and the served gallery is
 * left untouched, so `destroy` only has to remove the dialog it created.
 *
 * @module components/lightbox
 */

import { IvComponent, isElement } from "../core/component.js";
import { emit } from "../core/events.js";
import {
  KEY_ARROW_LEFT,
  KEY_ARROW_RIGHT,
  KEY_END,
  KEY_HOME,
} from "../core/keys.js";
import { Dialog } from "./dialog.js";

/**
 * @typedef {object} LightboxOptions
 * @property {boolean} loop Wrap around at both ends.
 * @property {boolean} zoom Offer the zoom button and the `Z` shortcut.
 * @property {boolean} swipe Change image with a horizontal drag.
 * @property {number} preload How many neighbours are fetched ahead.
 * @property {boolean} counter Show the "3 / 12" counter.
 * @property {boolean} captions Show `data-iv-caption` under the image.
 * @property {string} closeText Accessible name of the close button.
 * @property {string} prevText Accessible name of the previous button.
 * @property {string} nextText Accessible name of the next button.
 * @property {string} zoomText Accessible name of the zoom button.
 * @property {string} galleryLabel Accessible name of the generated dialog.
 * @property {string} counterText Visible counter; `{index}` and `{total}` are replaced with digits in the language of the gallery.
 */

/**
 * @typedef {"next"|"prev"|"keyboard"|"swipe"|"api"} LightboxReason
 */

/**
 * A drag in progress over the stage.
 *
 * @typedef {object} LightboxDrag
 * @property {number} id Pointer id.
 * @property {number} x Client x where the press landed.
 * @property {number} y Client y where the press landed.
 * @property {number} lastX Last client x seen.
 * @property {number} lastY Last client y seen.
 * @property {number} scrollX `scrollLeft` of the stage when the press landed.
 * @property {number} scrollY `scrollTop` of the stage when the press landed.
 * @property {boolean} moved Whether the pointer ever moved.
 */

const ITEM_SELECTOR = ".iv-gallery__item";
const CAPTION_ATTRIBUTE = "data-iv-caption";
const ZOOMED_ATTRIBUTE = "data-iv-zoomed";
const SWAP_ATTRIBUTE = "data-iv-swap";
/** Same threshold as the carousel: a gesture is a gesture everywhere (§8.13). */
const SWIPE_THRESHOLD = 40;

/**
 * Reads the language that applies to an element: its own `lang`, else the one on
 * the document. The digits of a counter are formatted with it.
 *
 * @param {Element} el Element to read from.
 * @returns {string|undefined} The tag, or `undefined` for the runtime default.
 */
function langOf(el) {
  const owner = el.closest("[lang]");
  const tag = owner ? owner.getAttribute("lang") : null;
  const fallback = el.ownerDocument.documentElement.getAttribute("lang");
  return tag || fallback || undefined;
}

/**
 * Full-screen image viewer built on top of a served gallery.
 *
 * @augments IvComponent
 */
export class Lightbox extends IvComponent {
  /** @type {string} */
  static componentName = "lightbox";

  /** @type {Readonly<LightboxOptions>} */
  static defaults = Object.freeze({
    loop: true,
    zoom: true,
    swipe: true,
    preload: 1,
    counter: true,
    captions: true,
    closeText: "Close",
    prevText: "Previous",
    nextText: "Next",
    zoomText: "Zoom",
    galleryLabel: "Image viewer",
    counterText: "{index} / {total}",
  });

  /**
   * Returns the instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Lightbox|undefined} The instance or `undefined`.
   */
  static get(el) {
    return /** @type {Lightbox|undefined} */ (super.get(el));
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<LightboxOptions>} [options] Options passed in JavaScript.
   * @returns {Lightbox} The instance.
   */
  static getOrCreate(el, options) {
    return /** @type {Lightbox} */ (
      super.getOrCreate(el, /** @type {Record<string, unknown>} */ (options))
    );
  }

  /**
   * Instantiates every `[data-iv-component="lightbox"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Lightbox[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Lightbox[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el Gallery root.
   * @param {Partial<LightboxOptions>} [options] Options passed in JavaScript.
   */
  constructor(el, options) {
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {HTMLDialogElement|null} The generated viewer. */
    this._dialogEl = this._dialogEl ?? null;
    /** @type {Dialog|null} The dialog composed on it. */
    this._dialog = this._dialog ?? null;
    /** @type {boolean} Whether this instance created that dialog instance. */
    this._ownsDialog = this._ownsDialog ?? false;
    /** @type {HTMLImageElement|null} The image on stage. */
    this._img = this._img ?? null;
    /** @type {HTMLElement|null} The `<figure>` that holds it. */
    this._stage = this._stage ?? null;
    /** @type {HTMLElement|null} The `<figcaption>`. */
    this._caption = this._caption ?? null;
    /** @type {HTMLElement|null} The "3 / 12" counter. */
    this._counter = this._counter ?? null;
    /** @type {HTMLButtonElement|null} The zoom button. */
    this._zoomButton = this._zoomButton ?? null;
    /** @type {number} Index currently on stage. */
    this._index = this._index ?? 0;
    /** @type {boolean} Whether the stage is zoomed in. */
    this._zoomed = this._zoomed ?? false;
    /** @type {LightboxDrag|null} Drag in progress. */
    this._drag = this._drag ?? null;
    /** @type {boolean} Whether the click after a swipe must be swallowed. */
    this._swallowClick = this._swallowClick ?? false;
    /** @type {EventTarget|null} Where the press behind the current click landed. */
    this._pressTarget = this._pressTarget ?? null;
    /** @type {number} Pending frame that ends the crossfade. */
    this._frame = this._frame ?? 0;
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<LightboxOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<LightboxOptions>} */ (
      /** @type {unknown} */ (super.options)
    );
  }

  /**
   * The gallery items, in document order.
   *
   * @returns {HTMLElement[]} The `.iv-gallery__item` elements.
   */
  get items() {
    return /** @type {HTMLElement[]} */ ([
      ...this._element.querySelectorAll(ITEM_SELECTOR),
    ]);
  }

  /**
   * Index of the image on stage.
   *
   * @returns {number} Zero-based index.
   */
  get index() {
    return this._index;
  }

  /**
   * Whether the viewer is open.
   *
   * @returns {boolean} `true` while the dialog is open.
   */
  get isOpen() {
    return this._dialog !== null && this._dialog.isOpen;
  }

  /**
   * Whether the stage is zoomed in.
   *
   * @returns {boolean} `true` when zoomed.
   */
  get zoomed() {
    return this._zoomed;
  }

  /**
   * The generated viewer.
   *
   * @returns {HTMLDialogElement|null} The `<dialog>` or `null` before `init`.
   */
  get dialog() {
    return this._dialogEl;
  }

  /** @returns {void} */
  _setup() {
    this._index = 0;
    this._zoomed = false;
    this._drag = null;
    this._swallowClick = false;
    this._pressTarget = null;
    this._frame = 0;

    this._build();

    this._listen(this._element, "click", (event) => this._onGalleryClick(event));

    const dialogEl = /** @type {HTMLDialogElement} */ (this._dialogEl);
    this._listen(dialogEl, "keydown", (event) => this._onKeydown(event));
    this._listen(dialogEl, "iv:open", (event) => this._mirror(event, "open"));
    this._listen(dialogEl, "iv:opened", (event) => this._mirror(event, "opened"));
    this._listen(dialogEl, "iv:close", (event) => this._mirror(event, "close"));
    this._listen(dialogEl, "iv:closed", (event) => this._mirror(event, "closed"));

    const stage = /** @type {HTMLElement} */ (this._stage);
    // A native drag of the image would cancel the pointer sequence before `pointerup`.
    this._listen(stage, "dragstart", (event) => event.preventDefault());
    this._listen(stage, "pointerdown", (event) => this._onPointerDown(event));
    this._listen(stage, "pointermove", (event) => this._onPointerMove(event));
    this._listen(stage, "pointerup", (event) => this._onPointerUp(event));
    this._listen(stage, "pointercancel", () => {
      this._drag = null;
    });
    this._listen(stage, "click", (event) => this._onStageClick(event), true);
  }

  /** @returns {void} */
  _teardown() {
    const view = this._element.ownerDocument.defaultView;
    if (this._frame && view && typeof view.cancelAnimationFrame === "function") {
      view.cancelAnimationFrame(this._frame);
    }
    this._frame = 0;
    if (this._dialog && this._ownsDialog) this._dialog.destroy();
    this._dialog = null;
    if (this._dialogEl) this._dialogEl.remove();
    this._dialogEl = null;
    this._img = null;
    this._stage = null;
    this._caption = null;
    this._counter = null;
    this._zoomButton = null;
    this._drag = null;
    this._pressTarget = null;
    this._zoomed = false;
  }

  /**
   * Builds the viewer and inserts it right after the gallery.
   *
   * @returns {void}
   */
  _build() {
    const root = this._element;
    const doc = root.ownerDocument;
    const options = this.options;

    const dialogEl = /** @type {HTMLDialogElement} */ (doc.createElement("dialog"));
    dialogEl.className = "iv-dialog iv-lightbox";
    dialogEl.setAttribute("aria-label", String(options.galleryLabel));

    const panel = doc.createElement("div");
    panel.className = "iv-dialog__panel iv-lightbox__panel";

    const stage = doc.createElement("figure");
    stage.className = "iv-lightbox__stage";

    const img = /** @type {HTMLImageElement} */ (doc.createElement("img"));
    img.className = "iv-lightbox__img";
    img.alt = "";
    img.draggable = false;

    const caption = doc.createElement("figcaption");
    caption.className = "iv-lightbox__caption";
    caption.hidden = true;

    stage.append(img, caption);
    panel.append(stage);

    if (options.counter) {
      const counter = doc.createElement("p");
      counter.className = "iv-lightbox__counter";
      counter.setAttribute("aria-live", "polite");
      panel.append(counter);
      this._counter = counter;
    } else {
      this._counter = null;
    }

    panel.append(this._button(doc, "prev", String(options.prevText)));
    panel.append(this._button(doc, "next", String(options.nextText)));
    if (options.zoom) {
      const zoomButton = this._button(doc, "zoom", String(options.zoomText));
      zoomButton.setAttribute("aria-pressed", "false");
      panel.append(zoomButton);
      this._zoomButton = zoomButton;
    } else {
      this._zoomButton = null;
    }
    panel.append(this._button(doc, "close", String(options.closeText)));

    dialogEl.append(panel);
    root.after(dialogEl);

    this._dialogEl = dialogEl;
    this._stage = stage;
    this._img = img;
    this._caption = caption;
    this._ownsDialog = Dialog.get(dialogEl) === undefined;
    this._dialog = Dialog.getOrCreate(dialogEl, {
      initialFocus: ".iv-lightbox__close",
    });
  }

  /**
   * Builds one control of the viewer.
   *
   * @param {Document} doc Owner document.
   * @param {"close"|"prev"|"next"|"zoom"} kind Which control.
   * @param {string} label Accessible name.
   * @returns {HTMLButtonElement} The button.
   */
  _button(doc, kind, label) {
    const button = /** @type {HTMLButtonElement} */ (doc.createElement("button"));
    button.type = "button";
    button.className = `iv-lightbox__button iv-lightbox__${kind}`;
    button.setAttribute("aria-label", label);
    this._listen(button, "click", () => this._onButton(kind));
    return button;
  }

  /**
   * Reacts to a control.
   *
   * @param {"close"|"prev"|"next"|"zoom"} kind Which control.
   * @returns {void}
   */
  _onButton(kind) {
    if (kind === "close") this.close();
    else if (kind === "prev") this.prev();
    else if (kind === "next") this.next();
    else this.zoom();
  }

  /**
   * Opens the viewer when a gallery item is activated.
   *
   * @param {Event} event Click event.
   * @returns {void}
   */
  _onGalleryClick(event) {
    const target = event.target;
    if (!isElement(target)) return;
    const item = /** @type {Element} */ (target).closest(ITEM_SELECTOR);
    if (!item || !this._element.contains(item)) return;
    const index = this.items.indexOf(/** @type {HTMLElement} */ (item));
    if (index < 0) return;
    event.preventDefault();
    this.open(index);
  }

  /**
   * Keyboard of the viewer: arrows, Home, End and `Z`.
   *
   * @param {Event} event Keydown event.
   * @returns {void}
   */
  _onKeydown(event) {
    const key = /** @type {KeyboardEvent} */ (event);
    if (key.altKey || key.ctrlKey || key.metaKey) return;
    if (this.options.zoom && (key.key === "z" || key.key === "Z")) {
      event.preventDefault();
      this.zoom();
      return;
    }
    // Zoomed in, the arrows belong to the stage: they scroll the picture the
    // browser is already scrolling, they do not change image.
    if (this._zoomed) return;
    const last = this.items.length - 1;
    if (key.key === KEY_ARROW_LEFT) {
      event.preventDefault();
      this._step(-1, "keyboard");
    } else if (key.key === KEY_ARROW_RIGHT) {
      event.preventDefault();
      this._step(1, "keyboard");
    } else if (key.key === KEY_HOME) {
      event.preventDefault();
      this.go(0, "keyboard");
    } else if (key.key === KEY_END) {
      event.preventDefault();
      this.go(last, "keyboard");
    }
  }

  /**
   * Mirrors a dialog event on the gallery root. The two cancelable ones carry
   * the cancellation back to the dialog, so a prevented `iv:open` on the
   * gallery really does keep the viewer closed.
   *
   * @param {Event} event The dialog event.
   * @param {"open"|"opened"|"close"|"closed"} name Mirrored name.
   * @returns {void}
   */
  _mirror(event, name) {
    const detail = /** @type {CustomEvent} */ (event).detail ?? {};
    const cancelable = name === "open" || name === "close";
    const allowed = emit(
      this._element,
      name,
      {
        instance: this,
        index: this._index,
        trigger: detail.trigger ?? null,
        reason: detail.reason ?? "api",
      },
      { cancelable }
    );
    if (!allowed && cancelable) event.preventDefault();
    if (name === "closed") this._resetZoom();
  }

  /**
   * Opens the viewer on one item.
   *
   * @param {number} [index] Zero-based index of the image to show.
   * @returns {void}
   */
  open(index = 0) {
    const items = this.items;
    if (items.length === 0 || !this._dialog) return;
    const target = this._clamp(index);
    this._index = target;
    this._render(false);
    this._dialog.open({ trigger: items[target] });
    this._preload();
  }

  /**
   * Closes the viewer.
   *
   * @param {string} [reason] Why the viewer closes.
   * @returns {void}
   */
  close(reason = "api") {
    if (!this._dialog) return;
    this._dialog.close(/** @type {"api"} */ (reason));
  }

  /**
   * Shows the next image.
   *
   * @returns {void}
   */
  next() {
    this._step(1, "next");
  }

  /**
   * Shows the previous image.
   *
   * @returns {void}
   */
  prev() {
    this._step(-1, "prev");
  }

  /**
   * Shows one image by index.
   *
   * @param {number} index Zero-based index; wrapped when `loop` is on.
   * @param {LightboxReason} [reason] Why the viewer moves.
   * @returns {void}
   */
  go(index, reason = "api") {
    const count = this.items.length;
    if (count === 0) return;
    const target = this._clamp(index);
    if (target === this._index) return;
    const previousIndex = this._index;
    const allowed = emit(
      this._element,
      "change",
      { instance: this, index: target, previousIndex, reason },
      { cancelable: true }
    );
    if (!allowed) return;
    this._index = target;
    this._resetZoom();
    this._render(true);
    this._preload();
    emit(this._element, "changed", {
      instance: this,
      index: target,
      previousIndex,
      reason,
    });
  }

  /**
   * Zooms the stage in or out.
   *
   * @param {boolean} [on] Target state; omitted toggles.
   * @returns {void}
   */
  zoom(on) {
    if (!this.options.zoom || !this._stage) return;
    const next = on === undefined ? !this._zoomed : on === true;
    if (next === this._zoomed) return;
    this._zoomed = next;
    if (next) {
      this._stage.setAttribute(ZOOMED_ATTRIBUTE, "");
      // A scroll container has to be reachable from the keyboard.
      this._stage.setAttribute("tabindex", "0");
    } else {
      this._stage.removeAttribute(ZOOMED_ATTRIBUTE);
      this._stage.removeAttribute("tabindex");
    }
    if (!next) {
      this._stage.scrollTop = 0;
      this._stage.scrollLeft = 0;
    }
    if (this._zoomButton) {
      this._zoomButton.setAttribute("aria-pressed", next ? "true" : "false");
    }
    emit(this._element, "zoom", {
      instance: this,
      zoomed: next,
      index: this._index,
    });
  }

  /**
   * Moves by one step in either direction, honouring `loop`.
   *
   * @param {number} delta `1` forwards, `-1` backwards.
   * @param {LightboxReason} reason Why the viewer moves.
   * @returns {void}
   */
  _step(delta, reason) {
    const count = this.items.length;
    if (count === 0) return;
    const raw = this._index + delta;
    if (!this.options.loop && (raw < 0 || raw > count - 1)) return;
    this.go(raw, reason);
  }

  /**
   * Wraps or clamps an index depending on `loop`.
   *
   * @param {number} index Requested index.
   * @returns {number} A valid index.
   */
  _clamp(index) {
    const count = this.items.length;
    if (count === 0) return 0;
    let target = Math.trunc(Number(index));
    if (!Number.isFinite(target)) target = 0;
    if (this.options.loop) target = ((target % count) + count) % count;
    else target = Math.min(Math.max(target, 0), count - 1);
    return target;
  }

  /**
   * Puts the current item on stage.
   *
   * @param {boolean} fade Whether the swap crossfades.
   * @returns {void}
   */
  _render(fade) {
    const item = this.items[this._index];
    const img = this._img;
    if (!item || !img) return;

    const source = item.getAttribute("href") ?? "";
    const thumb = item.querySelector("img");
    const alt = thumb ? thumb.getAttribute("alt") ?? "" : "";
    const caption = item.getAttribute(CAPTION_ATTRIBUTE) ?? "";

    if (fade) this._fade();
    img.setAttribute("src", source);
    img.alt = alt;

    if (this._caption) {
      const show = this.options.captions && caption !== "";
      this._caption.textContent = show ? caption : "";
      this._caption.hidden = !show;
    }
    if (this._counter) {
      const digits = new Intl.NumberFormat(langOf(this._element));
      this._counter.textContent = String(this.options.counterText)
        .replace(/\{index\}/g, digits.format(this._index + 1))
        .replace(/\{total\}/g, digits.format(this.items.length));
    }
  }

  /**
   * Crossfades the stage: the image is faded out by an attribute, and the next
   * pair of frames takes it away again so the transition plays forwards.
   *
   * @returns {void}
   */
  _fade() {
    const img = this._img;
    const view = this._element.ownerDocument.defaultView;
    if (!img || !view || typeof view.requestAnimationFrame !== "function") return;
    if (this._frame) view.cancelAnimationFrame(this._frame);
    img.setAttribute(SWAP_ATTRIBUTE, "");
    this._frame = view.requestAnimationFrame(() => {
      this._frame = view.requestAnimationFrame(() => {
        this._frame = 0;
        img.removeAttribute(SWAP_ATTRIBUTE);
      });
    });
  }

  /**
   * Fetches the neighbours of the current image, so a swipe or an arrow lands
   * on a picture the browser already has.
   *
   * @returns {void}
   */
  _preload() {
    const depth = Math.trunc(Number(this.options.preload));
    if (!Number.isFinite(depth) || depth < 1) return;
    const view = this._element.ownerDocument.defaultView;
    if (!view || typeof view.Image !== "function") return;
    const items = this.items;
    const count = items.length;
    for (let step = 1; step <= depth; step += 1) {
      for (const offset of [step, -step]) {
        let index = this._index + offset;
        if (this.options.loop) index = ((index % count) + count) % count;
        if (index < 0 || index > count - 1 || index === this._index) continue;
        const source = items[index].getAttribute("href");
        if (!source) continue;
        const image = new view.Image();
        image.src = source;
      }
    }
  }

  /**
   * Leaves the zoom without emitting a state change nobody asked for.
   *
   * @returns {void}
   */
  _resetZoom() {
    if (!this._zoomed) return;
    this.zoom(false);
  }

  /**
   * Starts tracking a drag over the stage.
   *
   * @param {Event} event Pointer event.
   * @returns {void}
   */
  _onPointerDown(event) {
    const pointer = /** @type {PointerEvent} */ (event);
    if (typeof pointer.button === "number" && pointer.button > 0) return;
    this._pressTarget = event.target;
    if (!this._zoomed && !this.options.swipe) return;
    const stage = /** @type {HTMLElement} */ (this._stage);
    this._swallowClick = false;
    this._drag = {
      id: pointer.pointerId,
      x: pointer.clientX,
      y: pointer.clientY,
      lastX: pointer.clientX,
      lastY: pointer.clientY,
      scrollX: stage.scrollLeft,
      scrollY: stage.scrollTop,
      moved: false,
    };
    if (typeof stage.setPointerCapture !== "function") return;
    try {
      stage.setPointerCapture(pointer.pointerId);
    } catch {
      // Pointer capture is an optimisation; the gesture works without it.
    }
  }

  /**
   * Pans the zoomed stage, or just remembers where the pointer travelled.
   *
   * @param {Event} event Pointer event.
   * @returns {void}
   */
  _onPointerMove(event) {
    const drag = this._drag;
    if (!drag) return;
    const pointer = /** @type {PointerEvent} */ (event);
    drag.lastX = pointer.clientX;
    drag.lastY = pointer.clientY;
    drag.moved = true;
    if (!this._zoomed) return;
    const stage = /** @type {HTMLElement} */ (this._stage);
    stage.scrollLeft = drag.scrollX - (pointer.clientX - drag.x);
    stage.scrollTop = drag.scrollY - (pointer.clientY - drag.y);
  }

  /**
   * Turns a horizontal drag longer than the threshold into a change.
   *
   * @param {Event} event Pointer event.
   * @returns {void}
   */
  _onPointerUp(event) {
    const drag = this._drag;
    if (!drag) return;
    this._drag = null;
    const pointer = /** @type {PointerEvent} */ (event);
    const stage = /** @type {HTMLElement} */ (this._stage);
    if (typeof stage.releasePointerCapture === "function") {
      try {
        stage.releasePointerCapture(drag.id);
      } catch {
        // The capture was never taken; nothing to release.
      }
    }
    if (this._zoomed) {
      // A pan is not a swipe: only the click that follows it has to go.
      if (drag.moved) this._swallowClick = true;
      return;
    }
    if (!this.options.swipe) return;
    const x = drag.moved ? drag.lastX : pointer.clientX;
    const y = drag.moved ? drag.lastY : pointer.clientY;
    const dx = x - drag.x;
    const dy = y - drag.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
    this._swallowClick = true;
    this._step(dx < 0 ? 1 : -1, "swipe");
  }

  /**
   * A click on the dark surround closes the viewer; the click that ends a
   * gesture never does.
   *
   * @param {Event} event Click event.
   * @returns {void}
   */
  _onStageClick(event) {
    // Pointer capture retargets the click to the stage, so where the press
    // landed is the only reliable way to tell the picture from its surround.
    const press = this._pressTarget;
    this._pressTarget = null;
    if (this._swallowClick) {
      this._swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (this._zoomed) return;
    if ((press ?? event.target) !== this._stage) return;
    this.close("backdrop");
  }
}
