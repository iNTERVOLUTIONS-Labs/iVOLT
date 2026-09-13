/**
 * Base class shared by every iVOLT component.
 *
 * @module core/component
 */

import { IvError, getInstance, setInstance, deleteInstance } from "./registry.js";
import { resolveOptions } from "./options.js";
import { emit } from "./events.js";

/**
 * A listener registered through {@link IvComponent#_listen}.
 *
 * @typedef {object} TrackedListener
 * @property {EventTarget} target Event target.
 * @property {string} type Event type.
 * @property {EventListener} handler Listener.
 * @property {boolean|AddEventListenerOptions|undefined} options Listener options.
 */

/** Whether `data-iv-js` has already been set on this document. */
let jsFlagSet = false;

/**
 * Marks `document.documentElement` with `data-iv-js=""` the first time a
 * component is created. CSS no-JS fallbacks are scoped with
 * `:root:not([data-iv-js])`. Never removed by `destroy`.
 *
 * @returns {void}
 */
function markJsFlag() {
  if (jsFlagSet) return;
  if (typeof document === "undefined" || !document.documentElement) return;
  jsFlagSet = true;
  document.documentElement.setAttribute("data-iv-js", "");
}

/**
 * Tells whether a node is an element.
 *
 * @param {unknown} node Candidate.
 * @returns {node is Element} `true` for elements.
 */
export function isElement(node) {
  return (
    typeof node === "object" &&
    node !== null &&
    /** @type {Node} */ (node).nodeType === 1
  );
}

/**
 * Base component: registry bookkeeping, option resolution, lifecycle events and
 * automatic listener cleanup. Subclasses implement `_setup` and `_teardown`.
 */
export class IvComponent {
  /**
   * Name used by `data-iv-component` and by the registry.
   *
   * @type {string}
   */
  static componentName = "";

  /**
   * Default options; also the list of allowed option keys and their types.
   *
   * @type {Readonly<Record<string, unknown>>}
   */
  static defaults = Object.freeze({});

  /**
   * Returns the instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {IvComponent|undefined} The instance or `undefined`.
   */
  static get(el) {
    const inst = getInstance(el, this.componentName);
    return inst instanceof IvComponent ? inst : undefined;
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Record<string, unknown>} [options] Options passed in JavaScript.
   * @returns {IvComponent} The instance.
   */
  static getOrCreate(el, options) {
    const existing = this.get(el);
    if (existing) return existing;
    return new this(el, options);
  }

  /**
   * Instantiates every `[data-iv-component="<name>"]` inside `root`, including
   * `root` itself when it matches. Elements that already have an instance are
   * skipped, so repeated calls are idempotent.
   *
   * @param {ParentNode} [root] Subtree to scan. Defaults to `document`.
   * @returns {IvComponent[]} Newly created instances.
   */
  static initAll(root = document) {
    const name = this.componentName;
    if (!name) return [];
    const selector = `[data-iv-component="${name}"]`;
    /** @type {Element[]} */
    const targets = [];
    if (isElement(root) && root.matches(selector)) targets.push(root);
    targets.push(...root.querySelectorAll(selector));
    /** @type {IvComponent[]} */
    const created = [];
    for (const el of targets) {
      if (this.get(el)) continue;
      created.push(new this(el));
    }
    return created;
  }

  /**
   * @param {Element} el Host element.
   * @param {Record<string, unknown>} [options] Options passed in JavaScript.
   * @throws {IvError} `instance-exists` when the element already has an instance.
   */
  constructor(el, options) {
    const ctor = /** @type {typeof IvComponent} */ (
      /** @type {unknown} */ (this.constructor)
    );
    const name = ctor.componentName;
    if (!isElement(el)) {
      throw new IvError("invalid-element", `"${name}" requires an element.`);
    }
    if (getInstance(el, name)) {
      throw new IvError(
        "instance-exists",
        `An instance of "${name}" already exists on this element.`
      );
    }

    /** @type {Element} */
    this._element = el;
    /** @type {Readonly<Record<string, unknown>>} */
    this._options = resolveOptions(
      el,
      /** @type {Record<string, unknown>} */ (ctor.defaults),
      options
    );
    /** @type {TrackedListener[]} */
    this._listeners = [];
    /** @type {boolean} */
    this._destroyed = false;

    setInstance(el, name, this);
    markJsFlag();
    this._setup();
    emit(el, "init", { instance: this });
  }

  /**
   * Host element.
   *
   * @returns {Element} The element the component is attached to.
   */
  get element() {
    return this._element;
  }

  /**
   * Resolved, frozen options.
   *
   * @returns {Readonly<Record<string, unknown>>} The options.
   */
  get options() {
    return this._options;
  }

  /**
   * Component name of this instance.
   *
   * @returns {string} The component name.
   */
  get name() {
    return /** @type {typeof IvComponent} */ (
      /** @type {unknown} */ (this.constructor)
    ).componentName;
  }

  /**
   * Registers a listener that `destroy` removes automatically.
   *
   * @param {EventTarget} target Event target.
   * @param {string} type Event type.
   * @param {EventListener} handler Listener.
   * @param {boolean|AddEventListenerOptions} [options] Listener options.
   * @returns {void}
   */
  _listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this._listeners.push({ target, type, handler, options });
  }

  /**
   * Subclass hook, called at the end of the constructor.
   *
   * @returns {void}
   */
  _setup() {}

  /**
   * Subclass hook, called by `destroy` before the registry entry is removed.
   *
   * @returns {void}
   */
  _teardown() {}

  /**
   * Releases the instance: emits `iv:destroy`, runs `_teardown`, removes every
   * tracked listener and unregisters the instance.
   *
   * @returns {void}
   */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    emit(this._element, "destroy", { instance: this });
    this._teardown();
    for (const { target, type, handler, options } of this._listeners) {
      target.removeEventListener(type, handler, options);
    }
    this._listeners = [];
    deleteInstance(this._element, this.name);
  }
}
