/**
 * Lifecycle helpers: instantiate components inside a root and wire the
 * declarative triggers (`data-iv-open`, `data-iv-toggle`, `data-iv-close`) with
 * a single delegated listener per root.
 *
 * @module core/lifecycle
 */

import { IvComponent, isElement } from "./component.js";
import { getInstances } from "./registry.js";

/**
 * Anything that can be opened or closed by a declarative trigger.
 *
 * @typedef {object} Openable
 * @property {(opts?: { trigger?: Element }) => void} [open] Opens the component.
 * @property {(reason?: string) => void} [close] Closes the component.
 * @property {() => void} [toggle] Toggles the component.
 */

/** Roots that already have the delegated click listener. */
const wiredRoots = new WeakSet();

/** @type {WeakMap<ParentNode, EventListener>} */
const rootHandlers = new WeakMap();

const TRIGGER_SELECTOR = "[data-iv-open],[data-iv-toggle],[data-iv-close]";

/**
 * Views a root as an event target. `ParentNode` is a structural mixin, but every
 * concrete root (`Document`, `Element`, `ShadowRoot`) is also an `EventTarget`.
 *
 * @param {ParentNode} root Root node.
 * @returns {EventTarget} The same node, typed as an event target.
 */
function asTarget(root) {
  return /** @type {EventTarget} */ (/** @type {unknown} */ (root));
}

/**
 * Returns the first registered instance of `el` exposing `method`.
 *
 * @param {Element} el Element to inspect.
 * @param {"open"|"close"|"toggle"} method Required method.
 * @returns {Openable|null} Matching instance or `null`.
 */
function instanceWith(el, method) {
  const map = getInstances(el);
  if (!map) return null;
  for (const inst of map.values()) {
    const candidate = /** @type {Openable} */ (inst);
    if (typeof candidate[method] === "function") return candidate;
  }
  return null;
}

/**
 * Walks up from `el` looking for an ancestor with an instance exposing `method`.
 *
 * @param {Element} el Starting element.
 * @param {"open"|"close"|"toggle"} method Required method.
 * @returns {Openable|null} Matching instance or `null`.
 */
function closestInstanceWith(el, method) {
  /** @type {Element|null} */
  let node = el;
  while (node) {
    const found = instanceWith(node, method);
    if (found) return found;
    node = node.parentElement;
  }
  return null;
}

/**
 * Resolves a trigger target by id.
 *
 * Errors are reported with `console.warn` instead of being thrown: throwing
 * inside an event handler would only produce an unhandled rejection.
 *
 * @param {string} id Element id.
 * @param {"open"|"close"|"toggle"} method Required method.
 * @returns {Openable|null} Matching instance or `null`.
 */
function resolveTarget(id, method) {
  const target = document.getElementById(id);
  if (!target) {
    console.warn(`[iVOLT] missing-target: no element with id "${id}".`);
    return null;
  }
  const inst = instanceWith(target, method);
  if (!inst) {
    console.warn(
      `[iVOLT] missing-target: element "${id}" has no instance with a ${method}() method.`
    );
    return null;
  }
  return inst;
}

/**
 * Builds the delegated click handler of a root.
 *
 * @returns {EventListener} The handler.
 */
function createTriggerHandler() {
  return (event) => {
    const target = event.target;
    if (!isElement(target)) return;
    const trigger = target.closest(TRIGGER_SELECTOR);
    if (!trigger) return;

    const openId = trigger.getAttribute("data-iv-open");
    const toggleId = trigger.getAttribute("data-iv-toggle");
    const hasClose = trigger.hasAttribute("data-iv-close");
    const closeId = trigger.getAttribute("data-iv-close");

    /** @type {Openable|null} */
    let instance = null;
    /** @type {"open"|"close"|"toggle"|null} */
    let action = null;

    // Empty values are state, not triggers (the megamenu marks its open item with `data-iv-open=""`).
    if (openId) {
      action = "open";
      instance = resolveTarget(openId, "open");
    } else if (toggleId) {
      action = "toggle";
      instance = resolveTarget(toggleId, "toggle");
    } else if (hasClose) {
      action = "close";
      instance = closeId
        ? resolveTarget(closeId, "close")
        : closestInstanceWith(trigger, "close");
      if (!instance && !closeId) {
        console.warn(
          "[iVOLT] missing-target: no ancestor component with a close() method."
        );
      }
    }

    // Only a real trigger loses its navigation: a link that merely carries the
    // empty state marker keeps its href (§5.4).
    if (action === null) return;
    if (trigger.tagName === "A") event.preventDefault();
    if (!instance) return;

    if (action === "open" && instance.open) instance.open({ trigger });
    else if (action === "toggle" && instance.toggle) instance.toggle();
    else if (action === "close" && instance.close) instance.close("trigger");
  };
}

/**
 * Instantiates the given components inside `root` and wires the declarative
 * triggers once per root. Safe to call repeatedly: already instantiated
 * elements are skipped and the delegated listener is added only once.
 *
 * @param {ParentNode} [root] Subtree to initialise. Defaults to `document`.
 * @param {Array<typeof IvComponent>} [components] Component classes to use.
 * @returns {IvComponent[]} Newly created instances.
 */
export function initComponents(root = document, components = []) {
  /** @type {IvComponent[]} */
  const created = [];
  for (const Component of components) {
    created.push(...Component.initAll(root));
  }
  if (!wiredRoots.has(root)) {
    wiredRoots.add(root);
    const handler = createTriggerHandler();
    rootHandlers.set(root, handler);
    asTarget(root).addEventListener("click", handler);
  }
  return created;
}

/**
 * Destroys every instance inside `root` (and on `root` itself) and removes the
 * delegated trigger listener of that root, so `initComponents` can run again.
 *
 * @param {ParentNode} [root] Subtree to clean up. Defaults to `document`.
 * @returns {void}
 */
export function destroyComponents(root = document) {
  const isDocument = typeof document !== "undefined" && root === document;
  /** @type {Element[]} */
  const targets = [];
  if (isElement(root)) targets.push(root);
  targets.push(
    ...root.querySelectorAll(isDocument ? "[data-iv-component]" : "*")
  );
  for (const el of targets) {
    const map = getInstances(el);
    if (!map) continue;
    for (const inst of [...map.values()]) {
      const candidate = /** @type {{ destroy?: () => void }} */ (inst);
      if (typeof candidate.destroy === "function") candidate.destroy();
    }
  }
  const handler = rootHandlers.get(root);
  if (handler) {
    asTarget(root).removeEventListener("click", handler);
    rootHandlers.delete(root);
  }
  wiredRoots.delete(root);
}
