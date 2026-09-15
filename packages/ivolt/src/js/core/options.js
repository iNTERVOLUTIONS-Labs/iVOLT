/**
 * Option resolution: `defaults < data-iv-*  < JavaScript options`.
 *
 * Attribute values are coerced with a tiny, explicit grammar: `"true"`/`"false"`
 * become booleans, a valueless attribute is `true` for a boolean option, plain
 * numbers become numbers, everything else stays a string.
 * No JSON, no expressions. A value whose coerced type does not match the type of
 * the default is ignored and warned about once per component and option.
 *
 * @module core/options
 */

/** @type {Set<string>} */
const warned = new Set();

/**
 * Converts a camelCase option name into its kebab-case attribute suffix.
 *
 * @param {string} name camelCase name, e.g. `closeOnBackdrop`.
 * @returns {string} kebab-case name, e.g. `close-on-backdrop`.
 */
export function kebab(name) {
  return name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/**
 * Converts a kebab-case attribute suffix into its camelCase option name.
 *
 * @param {string} name kebab-case name, e.g. `close-on-backdrop`.
 * @returns {string} camelCase name, e.g. `closeOnBackdrop`.
 */
export function camel(name) {
  return name.replace(/-([a-z0-9])/g, (_m, c) => String(c).toUpperCase());
}

const NUMERIC = /^-?\d+(\.\d+)?$/;

/**
 * Coerces a raw attribute value.
 *
 * @param {string} raw Attribute value.
 * @returns {string|number|boolean} Coerced value.
 */
function coerce(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (NUMERIC.test(raw)) return Number(raw);
  return raw;
}

/**
 * Tells whether a coerced value is compatible with the type of the default.
 * A `null` default accepts strings (selectors and similar optional values).
 *
 * @param {string|number|boolean} value Coerced attribute value.
 * @param {unknown} fallback Default value.
 * @returns {boolean} `true` when the value may be used.
 */
function matchesType(value, fallback) {
  if (fallback === null || fallback === undefined) return typeof value === "string";
  return typeof value === typeof fallback;
}

/**
 * Best effort component name for warning messages.
 *
 * @param {Element} el Host element.
 * @returns {string} Component name.
 */
function componentNameOf(el) {
  return el.getAttribute("data-iv-component") || el.tagName.toLowerCase();
}

/**
 * Warns once per component and option about an invalid attribute value.
 *
 * @param {string} component Component name.
 * @param {string} option Option name.
 * @param {string} raw Offending raw value.
 * @returns {void}
 */
function warnOnce(component, option, raw) {
  const key = `${component}:${option}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(
    `[iVOLT] Invalid value "${raw}" for option "${option}" of "${component}"; using the default.`
  );
}

/**
 * Resolves the options of a component instance.
 *
 * Only keys present in `defaults` are considered; unknown attributes and
 * unknown JavaScript keys are ignored. A JavaScript value of `undefined` does
 * not override the attribute or the default.
 *
 * @template {Record<string, unknown>} T
 * @param {Element} el Host element.
 * @param {T} defaults Default option values (defines the allowed keys and types).
 * @param {Partial<T>} [jsOptions] Options passed in JavaScript.
 * @returns {Readonly<T>} Frozen, resolved options.
 */
export function resolveOptions(el, defaults, jsOptions) {
  /** @type {Record<string, unknown>} */
  const out = {};
  const component = componentNameOf(el);
  for (const key of Object.keys(defaults)) {
    const fallback = defaults[key];
    let value = fallback;
    const attr = `data-iv-${kebab(key)}`;
    if (el.hasAttribute(attr)) {
      const raw = el.getAttribute(attr) ?? "";
      // `data-iv-sticky` with no value is the HTML spelling of `true`, exactly
      // like `disabled` or `hidden`; only a boolean option reads it that way, so
      // an empty string stays an empty string wherever one is meaningful
      // (`data-iv-placeholder=""` is "use the served placeholder").
      const coerced =
        raw === "" && typeof fallback === "boolean" ? true : coerce(raw);
      if (matchesType(coerced, fallback)) value = coerced;
      else warnOnce(component, key, raw);
    }
    if (jsOptions && Object.prototype.hasOwnProperty.call(jsOptions, key)) {
      const jsValue = jsOptions[key];
      if (jsValue !== undefined) value = jsValue;
    }
    out[key] = value;
  }
  return Object.freeze(/** @type {T} */ (/** @type {unknown} */ (out)));
}

/**
 * Test helper: clears the "warned once" memory.
 *
 * @internal Not part of the public API; may change without an ADR.
 * @returns {void}
 */
export function resetWarnings() {
  warned.clear();
}
