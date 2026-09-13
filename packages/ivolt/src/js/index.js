/**
 * Grouped entry point. Importing this module has no side effects: nothing is
 * initialised until `init` is called (ADR-007).
 *
 * @module index
 */

import { IvComponent } from "./core/component.js";
import { IvError } from "./core/registry.js";
import { initComponents, destroyComponents } from "./core/lifecycle.js";
import { Dialog } from "./components/dialog.js";

export { IvComponent } from "./core/component.js";
export { IvError } from "./core/registry.js";
export { Dialog } from "./components/dialog.js";
export { getTheme, setTheme, resolveTheme, restoreTheme } from "./theme.js";
export { breakpoints } from "./core/breakpoints.js";

/** Package version, kept in sync with `package.json`. */
export const version = "0.1.0-alpha.0";

/**
 * Component classes initialised by `init` when no explicit list is given.
 *
 * @type {ReadonlyArray<typeof IvComponent>}
 */
export const components = Object.freeze([Dialog]);

/**
 * Instantiates every iVOLT component found inside `root` and wires the
 * declarative triggers. Idempotent.
 *
 * @param {ParentNode} [root] Subtree to initialise. Defaults to `document`.
 * @param {{ components?: ReadonlyArray<typeof IvComponent> }} [options] Options.
 * @returns {IvComponent[]} Newly created instances.
 */
export function init(root = document, options) {
  const list = (options && options.components) || components;
  return initComponents(root, [...list]);
}

/**
 * Destroys every iVOLT instance inside `root`.
 *
 * @param {ParentNode} [root] Subtree to clean up. Defaults to `document`.
 * @returns {void}
 */
export function destroy(root = document) {
  destroyComponents(root);
}

export { IvError as IvoltError };
