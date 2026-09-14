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
import { Disclosure } from "./components/disclosure.js";
import { Tabs } from "./components/tabs.js";
import { Dropdown } from "./components/dropdown.js";
import { Drawer } from "./components/drawer.js";
import { Toast } from "./components/toast.js";
import { Combobox } from "./components/combobox.js";
import { DataTable } from "./components/datatable.js";
import { Picker } from "./components/picker.js";
import { Carousel } from "./components/carousel.js";

export { IvComponent } from "./core/component.js";
export { IvError } from "./core/registry.js";
export { Dialog } from "./components/dialog.js";
export { Disclosure } from "./components/disclosure.js";
export { Tabs } from "./components/tabs.js";
export { Dropdown } from "./components/dropdown.js";
export { Drawer } from "./components/drawer.js";
export { Toast, ToastItem } from "./components/toast.js";
export { Combobox } from "./components/combobox.js";
export { DataTable } from "./components/datatable.js";
export { Picker } from "./components/picker.js";
export { Carousel } from "./components/carousel.js";
export { getTheme, setTheme, resolveTheme, restoreTheme } from "./theme.js";
export { breakpoints } from "./core/breakpoints.js";

/** Package version, kept in sync with `package.json`. */
export const version = "0.2.0-beta.0";

/**
 * Component classes initialised by `init` when no explicit list is given.
 *
 * @type {ReadonlyArray<typeof IvComponent>}
 */
export const components = Object.freeze([Dialog, Disclosure, Tabs, Dropdown, Drawer, Toast, Combobox, DataTable, Picker, Carousel]);

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
