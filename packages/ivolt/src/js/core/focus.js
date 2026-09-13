/**
 * Focus helpers. The browser already traps focus inside a modal `<dialog>`, so
 * these helpers only need to find and move focus, never to build a trap.
 *
 * @module core/focus
 */

/** Standard focusable candidates. */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
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
  if (el.hasAttribute("hidden")) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (el.tabIndex < 0) return false;
  if (el.closest("[inert]")) return false;
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
