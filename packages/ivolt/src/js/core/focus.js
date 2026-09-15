/**
 * Focus helpers. The browser already traps focus inside a modal `<dialog>`, so
 * these helpers only need to find and move focus, never to build a trap.
 *
 * @module core/focus
 */

/** Standard focusable candidates (§5.2, enmienda v0.8). */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "iframe",
  '[contenteditable]:not([contenteditable="false"])',
  "audio[controls]",
  "video[controls]",
  "[tabindex]",
].join(",");

/**
 * Tells whether a candidate is currently focusable.
 *
 * @param {HTMLElement} el Candidate element.
 * @returns {boolean} `true` when the element can receive focus.
 */
function isFocusable(el) {
  if (el.hasAttribute("disabled")) return false;
  // A hidden ancestor hides its subtree too, and `focus()` on an unrendered
  // element is a silent no-op that drops focus to <body>.
  if (el.closest("[hidden]")) return false;
  // `type="hidden"` inputs are never focusable, and a form inside a dialog very
  // often starts with one; jsdom still reports `tabIndex === 0` for them.
  if (el.tagName === "INPUT" && /** @type {HTMLInputElement} */ (el).type === "hidden") {
    return false;
  }
  if (el.getAttribute("aria-hidden") === "true") return false;
  // `tabIndex` is only authoritative when the author wrote `tabindex`: engines
  // disagree on what they report for natively focusable tags (jsdom says -1 for
  // `contenteditable` and for media with controls), and every tag in the
  // selector above is focusable by itself once it is rendered and enabled.
  if (el.hasAttribute("tabindex") && el.tabIndex < 0) return false;
  if (el.closest("[inert]")) return false;
  // A disabled <fieldset> disables every control in it but its first legend.
  const fieldset = el.closest("fieldset[disabled]");
  if (fieldset && !el.closest("fieldset[disabled] > legend:first-of-type")) {
    return false;
  }
  return true;
}

/**
 * Returns the focusable descendants of `container`, in document order.
 *
 * @param {Element} container Container to search.
 * @returns {HTMLElement[]} Focusable elements.
 */
export function getFocusable(container) {
  const nodes = /** @type {NodeListOf<HTMLElement>} */ (
    container.querySelectorAll(FOCUSABLE_SELECTOR)
  );
  return Array.from(nodes).filter(isFocusable);
}

/**
 * Focuses the preferred element, or the first focusable descendant.
 *
 * @param {Element} container Container to search.
 * @param {string|null} [preferredSelector] Selector tried first, scoped to `container`.
 * @returns {HTMLElement|null} The focused element, or `null` when nothing was focused.
 */
export function focusFirst(container, preferredSelector) {
  if (preferredSelector) {
    const preferred = /** @type {HTMLElement|null} */ (
      container.querySelector(preferredSelector)
    );
    if (preferred && typeof preferred.focus === "function") {
      preferred.focus();
      return preferred;
    }
  }
  const [first] = getFocusable(container);
  if (first) {
    first.focus();
    return first;
  }
  return null;
}
