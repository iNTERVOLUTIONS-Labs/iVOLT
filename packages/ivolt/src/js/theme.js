/**
 * Optional theme helpers around `data-iv-theme`.
 *
 * The framework works without this module: `data-iv-theme="system"` follows the
 * operating system with CSS alone. Persistence is opt-in. Every DOM access
 * happens inside a function, never at module scope (SSR safe).
 *
 * @module theme
 */

import { IvError } from "./core/registry.js";

/** @typedef {"light"|"dark"|"system"} ThemeSetting */
/** @typedef {"light"|"dark"} ResolvedTheme */

const ATTRIBUTE = "data-iv-theme";
const DEFAULT_STORAGE_KEY = "iv-theme";

/** @type {ReadonlyArray<ThemeSetting>} */
const VALID = ["light", "dark", "system"];

/**
 * Tells whether a value is a valid theme setting.
 *
 * @param {unknown} value Candidate value.
 * @returns {value is ThemeSetting} `true` for `light`, `dark` or `system`.
 */
function isThemeSetting(value) {
  return typeof value === "string" && VALID.includes(/** @type {ThemeSetting} */ (value));
}

/**
 * Reads the theme declared on `root`. Without the attribute the theme is light.
 *
 * @param {Element} [root] Element carrying `data-iv-theme`.
 * @returns {ThemeSetting} The declared theme.
 */
export function getTheme(root = document.documentElement) {
  const value = root.getAttribute(ATTRIBUTE);
  return isThemeSetting(value) ? value : "light";
}

/**
 * Resolves the effective theme, following the operating system when the
 * declared theme is `system`.
 *
 * @param {Element} [root] Element carrying `data-iv-theme`.
 * @returns {ResolvedTheme} `light` or `dark`.
 */
export function resolveTheme(root = document.documentElement) {
  const theme = getTheme(root);
  if (theme !== "system") return theme;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Sets the theme on `root`, optionally persisting it, and dispatches
 * `iv:themechange` on `document`.
 *
 * @param {ThemeSetting} theme Theme to apply.
 * @param {{ root?: Element, persist?: boolean, storageKey?: string }} [options] Options.
 * @returns {ResolvedTheme} The resolved theme after applying.
 * @throws {IvError} `invalid-option` when `theme` is not valid.
 */
export function setTheme(theme, options) {
  if (!isThemeSetting(theme)) {
    throw new IvError(
      "invalid-option",
      `Invalid theme "${String(theme)}"; expected "light", "dark" or "system".`
    );
  }
  const opts = options ?? {};
  const root = opts.root ?? document.documentElement;
  const storageKey = opts.storageKey ?? DEFAULT_STORAGE_KEY;
  root.setAttribute(ATTRIBUTE, theme);
  if (opts.persist === true) {
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      // Storage can be unavailable (private mode, blocked cookies): ignore.
    }
  }
  const resolved = resolveTheme(root);
  document.dispatchEvent(
    new CustomEvent("iv:themechange", {
      bubbles: true,
      composed: false,
      cancelable: false,
      detail: { theme, resolved },
    })
  );
  return resolved;
}

/**
 * Applies the persisted theme, when there is a valid one.
 *
 * @param {{ root?: Element, storageKey?: string }} [options] Options.
 * @returns {ThemeSetting|null} The applied theme, or `null` when nothing was applied.
 */
export function restoreTheme(options) {
  const opts = options ?? {};
  const storageKey = opts.storageKey ?? DEFAULT_STORAGE_KEY;
  /** @type {string|null} */
  let stored = null;
  try {
    stored = window.localStorage.getItem(storageKey);
  } catch {
    stored = null;
  }
  if (!isThemeSetting(stored)) return null;
  setTheme(stored, { root: opts.root, storageKey });
  return stored;
}
