/**
 * Copy: a button that copies text to the clipboard.
 *
 * Shipped only as the subpath `@intervolutions/ivolt/copy` (and inside
 * `auto.min.js`); the grouped entry and the IIFE do not include it (ADR-053).
 *
 * The root is any element with `data-iv-component="copy"` (an `.iv-code`
 * frame, a section, the body). A click on a `[data-iv-copy]` inside it copies:
 * the text of the element the attribute names by selector, or, with an empty
 * value, the `<code>` (or `<pre>`) of the nearest `.iv-code`. The button says
 * what happened for `timeout` milliseconds through `data-iv-state="copied"` or
 * `"failed"` and its text, and a polite live region the component creates
 * announces it. The root gets `data-iv-copy-ready`; until then the CSS of
 * `iv-code` hides the buttons, because a button that does nothing is worse
 * than none.
 *
 * Nothing is read from or sent to anything but the clipboard; the text comes
 * from the page.
 *
 * @module components/copy
 */

import { IvComponent, isElement } from "../core/component.js";
import { emit } from "../core/events.js";

/**
 * @typedef {object} CopyOptions
 * @property {string} copiedText Label shown after a successful copy.
 * @property {string} failedText Label shown when the clipboard refused.
 * @property {number} timeout Milliseconds the feedback stays.
 */

const TRIGGER_SELECTOR = "[data-iv-copy]";
const ROOT_SELECTOR = '[data-iv-component="copy"]';
const STATE_ATTRIBUTE = "data-iv-state";
const READY_ATTRIBUTE = "data-iv-copy-ready";

/**
 * Copy component: one delegated listener per root.
 *
 * @augments IvComponent
 */
export class Copy extends IvComponent {
  /** @type {string} */
  static componentName = "copy";

  /** @type {Readonly<CopyOptions>} */
  static defaults = Object.freeze({
    copiedText: "Copied",
    failedText: "Press Ctrl+C to copy",
    timeout: 2000,
  });

  /**
   * Returns the instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Copy|undefined} The instance or `undefined`.
   */
  static get(el) {
    return /** @type {Copy|undefined} */ (super.get(el));
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<CopyOptions>} [options] Options passed in JavaScript.
   * @returns {Copy} The instance.
   */
  static getOrCreate(el, options) {
    return /** @type {Copy} */ (super.getOrCreate(el, /** @type {Record<string, unknown>} */ (options)));
  }

  /**
   * Instantiates every `[data-iv-component="copy"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Copy[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Copy[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el Root that holds one or more copy buttons.
   * @param {Partial<CopyOptions>} [options] Options passed in JavaScript.
   */
  constructor(el, options) {
    super(el, /** @type {Record<string, unknown>} */ (options));
    /** @type {HTMLElement|null} Live region announcing the result. */
    this._status = this._status ?? null;
    /** @type {Map<HTMLElement, { label: string, face: HTMLElement|null, timer: ReturnType<typeof setTimeout> }>} Buttons showing feedback. */
    this._busy = this._busy ?? new Map();
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<CopyOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<CopyOptions>} */ (/** @type {unknown} */ (super.options));
  }

  /** @returns {void} */
  _setup() {
    this._busy = new Map();
    this._status = null;
    // The stylesheet shows the copy buttons of a root only once this is set.
    this._element.setAttribute(READY_ATTRIBUTE, "");
    this._listen(this._element, "click", (event) => {
      const node = event.target;
      if (!isElement(node)) return;
      const trigger = /** @type {Element} */ (node).closest(TRIGGER_SELECTOR);
      if (!trigger || !this._element.contains(trigger)) return;
      const owner = trigger.closest(ROOT_SELECTOR);
      if (owner !== null && owner !== this._element) return;
      event.preventDefault();
      void this.copy(/** @type {HTMLElement} */ (trigger));
    });
  }

  /** @returns {void} */
  _teardown() {
    for (const [button, { label, face, timer }] of this._busy) {
      clearTimeout(timer);
      if (face && label.trim()) face.textContent = label;
      button.removeAttribute(STATE_ATTRIBUTE);
    }
    this._busy.clear();
    if (this._status) this._status.remove();
    this._status = null;
    this._element.removeAttribute(READY_ATTRIBUTE);
  }

  /**
   * The text a trigger copies: the element named by its selector, or the
   * code of the nearest `.iv-code`.
   *
   * @param {Element} trigger Button carrying `data-iv-copy`.
   * @returns {string|null} The text, or `null` when there is nothing to copy.
   */
  textOf(trigger) {
    const selector = (trigger.getAttribute("data-iv-copy") || "").trim();
    const doc = trigger.ownerDocument;
    let source = null;
    if (selector) {
      try {
        source = doc.querySelector(selector);
      } catch {
        source = null;
      }
    } else {
      const frame = trigger.closest(".iv-code");
      source = frame ? frame.querySelector("pre code, code, pre") : null;
    }
    if (!source) return null;
    if ("value" in source && (source.tagName === "INPUT" || source.tagName === "TEXTAREA")) return String(/** @type {HTMLInputElement} */ (source).value);
    return source.textContent;
  }

  /**
   * Copies the text of `trigger`. Emits the cancelable `iv:copy` first and
   * `iv:copied` with `ok` once the clipboard answered.
   *
   * @param {HTMLElement} trigger Button carrying `data-iv-copy`.
   * @returns {Promise<boolean>} Whether the text reached the clipboard.
   */
  async copy(trigger) {
    const text = this.textOf(trigger);
    if (text === null) return false;
    if (!emit(this._element, "copy", { instance: this, trigger, text }, { cancelable: true })) return false;
    let ok = false;
    const clip = trigger.ownerDocument.defaultView?.navigator?.clipboard;
    if (clip && typeof clip.writeText === "function") {
      try {
        await clip.writeText(text);
        ok = true;
      } catch {
        ok = false;
      }
    }
    if (!ok) this._select(trigger);
    this._feedback(trigger, ok);
    emit(this._element, "copied", { instance: this, trigger, text, ok });
    return ok;
  }

  /**
   * Where the clipboard refused, the text is selected so the keyboard
   * shortcut the feedback names copies it.
   *
   * @param {Element} trigger Button carrying `data-iv-copy`.
   * @returns {void}
   */
  _select(trigger) {
    const selector = (trigger.getAttribute("data-iv-copy") || "").trim();
    const doc = trigger.ownerDocument;
    let source = null;
    try {
      source = selector ? doc.querySelector(selector) : trigger.closest(".iv-code")?.querySelector("pre code, code, pre");
    } catch {
      source = null;
    }
    const selection = doc.defaultView?.getSelection?.();
    if (!source || !selection) return;
    const range = doc.createRange();
    range.selectNodeContents(source);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Shows the result on the button and in the live region.
   *
   * @param {HTMLElement} button The trigger.
   * @param {boolean} ok Whether the copy succeeded.
   * @returns {void}
   */
  _feedback(button, ok) {
    const previous = this._busy.get(button);
    if (previous) clearTimeout(previous.timer);
    // The words that change: an element marked `.iv-code__copy-label` inside
    // the button, or the button itself when it holds only text. An icon-only
    // button keeps its icon; the live region speaks for it.
    const face = /** @type {HTMLElement|null} */ (button.querySelector(".iv-code__copy-label")) || (button.children.length === 0 ? button : null);
    const label = previous ? previous.label : face ? face.textContent || "" : "";
    const message = ok ? this.options.copiedText : this.options.failedText;
    button.setAttribute(STATE_ATTRIBUTE, ok ? "copied" : "failed");
    if (face && label.trim()) face.textContent = message;
    this._announce(message);
    const timer = setTimeout(() => {
      this._busy.delete(button);
      if (face && label.trim()) face.textContent = label;
      button.removeAttribute(STATE_ATTRIBUTE);
    }, Math.max(0, Number(this.options.timeout) || 0));
    this._busy.set(button, { label, face, timer });
  }

  /**
   * Writes `message` into a polite live region owned by this instance.
   *
   * @param {string} message Text to announce.
   * @returns {void}
   */
  _announce(message) {
    if (!this._status) {
      const status = this._element.ownerDocument.createElement("span");
      status.className = "iv-u-sr-only";
      status.setAttribute("role", "status");
      this._element.append(status);
      this._status = status;
    }
    this._status.textContent = "";
    this._status.textContent = message;
  }
}
