/**
 * Inline-style bookkeeping.
 *
 * Removing a custom property with `style.removeProperty()` re-serializes the
 * whole declaration block, so a served `style="--iv-parallax: 0.2"` comes back
 * as `style="--iv-parallax: 0.2;"` and an element that had no `style` attribute
 * at all keeps an empty one. Neither changes the computed style, but both break
 * the contract that `destroy` hands the DOM back exactly as it was served
 * (§5.2). These helpers remember the served attribute verbatim, before the
 * first write, and put it back untouched.
 *
 * @module core/style
 */

/**
 * Remembers the `style` attribute of an element as it was served, once per
 * element. Call it immediately before the first write to that element.
 *
 * @param {Map<Element, string|null>} store Per-instance memory.
 * @param {Element} el Element about to be styled.
 * @returns {void}
 */
export function rememberStyle(store, el) {
  if (store.has(el)) return;
  store.set(el, el.getAttribute("style"));
}

/**
 * Puts every remembered `style` attribute back, exactly as it was served, and
 * empties the memory.
 *
 * @param {Map<Element, string|null>} store Per-instance memory.
 * @returns {void}
 */
export function restoreStyles(store) {
  for (const [el, value] of store) {
    if (value === null) el.removeAttribute("style");
    else el.setAttribute("style", value);
  }
  store.clear();
}
