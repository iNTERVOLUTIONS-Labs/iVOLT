/**
 * Instance registry and error type.
 *
 * Keeps one `Map<componentName, instance>` per element inside a `WeakMap`, so
 * instances are garbage collected with their elements and no global list is
 * needed. No DOM access at module scope (SSR safe).
 *
 * @module core/registry
 */

/**
 * Error codes used across the package.
 *
 * @typedef {"instance-exists"|"missing-target"|"invalid-option"|"invalid-element"} IvErrorCode
 */

/**
 * Error thrown by iVOLT with a stable, documented `code`.
 */
export class IvError extends Error {
  /**
   * @param {IvErrorCode} code Stable machine readable code.
   * @param {string} message Human readable message.
   */
  constructor(code, message) {
    super(message);
    /** @type {string} */
    this.name = "IvError";
    /** @type {IvErrorCode} */
    this.code = code;
  }
}

/**
 * Any registered component instance. Kept structural so that `registry.js`
 * never imports `component.js` (which imports this module).
 *
 * @typedef {object} RegisteredInstance
 */

/** @type {WeakMap<Element, Map<string, RegisteredInstance>>} */
const registry = new WeakMap();

/**
 * Returns the instance of `name` registered on `el`, if any.
 *
 * @param {Element} el Host element.
 * @param {string} name Component name.
 * @returns {RegisteredInstance|undefined} The instance or `undefined`.
 */
export function getInstance(el, name) {
  const map = registry.get(el);
  return map ? map.get(name) : undefined;
}

/**
 * Returns the whole instance map of `el`, if the element has any instance.
 *
 * Needed by the lifecycle helpers, which must operate on every component of an
 * element without knowing the component names.
 *
 * @internal Not part of the public API; may change without an ADR.
 * @param {Element} el Host element.
 * @returns {Map<string, RegisteredInstance>|undefined} The map or `undefined`.
 */
export function getInstances(el) {
  return registry.get(el);
}

/**
 * Registers `inst` on `el` under `name`.
 *
 * @param {Element} el Host element.
 * @param {string} name Component name.
 * @param {RegisteredInstance} inst Instance to store.
 * @returns {void}
 * @throws {IvError} `instance-exists` when `name` is already registered on `el`.
 */
export function setInstance(el, name, inst) {
  let map = registry.get(el);
  if (!map) {
    map = new Map();
    registry.set(el, map);
  }
  if (map.has(name)) {
    throw new IvError(
      "instance-exists",
      `An instance of "${name}" already exists on this element.`
    );
  }
  map.set(name, inst);
}

/**
 * Removes the instance of `name` from `el`.
 *
 * @param {Element} el Host element.
 * @param {string} name Component name.
 * @returns {boolean} `true` when an instance was removed.
 */
export function deleteInstance(el, name) {
  const map = registry.get(el);
  if (!map) return false;
  const removed = map.delete(name);
  if (map.size === 0) registry.delete(el);
  return removed;
}

/**
 * Tells whether `el` has at least one registered instance.
 *
 * @param {Element} el Host element.
 * @returns {boolean} `true` when the element has instances.
 */
export function hasInstances(el) {
  const map = registry.get(el);
  return Boolean(map && map.size > 0);
}
