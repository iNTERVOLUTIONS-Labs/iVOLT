/**
 * Theme change with a view transition (1.1).
 *
 * Shipped as the subpath `@intervolutions/ivolt/theme-transition` so the
 * grouped entry does not grow (ADR-053). `setThemeWithTransition` is
 * `setTheme` run inside `document.startViewTransition`: the browser
 * snapshots the page, the theme changes, and old and new cross-fade (or run
 * whatever the page declares for `::view-transition-*`). Without the API or
 * under `prefers-reduced-motion: reduce` it is `setTheme`, synchronously.
 * Every DOM access happens inside the function (SSR safe).
 *
 * @module theme-transition
 */

import { setTheme } from "./theme.js";

const THEMES = ["light", "dark", "system"];

/**
 * Sets the theme like `setTheme`, inside a view transition when the browser
 * has one and the reader has not asked for less motion. In a transition the
 * attribute is written and `iv:themechange` fires once the browser has taken
 * its snapshot (the next frame); the promise resolves then.
 *
 * @param {"light"|"dark"|"system"} theme Theme to apply.
 * @param {{ root?: Element, persist?: boolean, storageKey?: string }} [options] Options of `setTheme`.
 * @returns {Promise<"light"|"dark">} The resolved theme after applying.
 * @throws {Error} `IvError` `invalid-option` (synchronously) when `theme` is not valid.
 */
export function setThemeWithTransition(theme, options) {
  // An invalid theme throws here, before anything is scheduled.
  if (!THEMES.includes(/** @type {string} */ (theme))) setTheme(theme, options);
  const doc = typeof document === "undefined" ? null : document;
  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = doc ? /** @type {{ startViewTransition?: Function }} */ (/** @type {unknown} */ (doc)).startViewTransition : undefined;
  if (!doc || reduced || typeof start !== "function") return Promise.resolve(setTheme(theme, options));
  return new Promise((resolve, reject) => {
    try {
      start.call(doc, () => {
        resolve(setTheme(theme, options));
      });
    } catch (error) {
      reject(error);
    }
  });
}
