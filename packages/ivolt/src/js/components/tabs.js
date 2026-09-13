/**
 * Tabs: progressive enhancement of anchor links plus sections (ADR-020).
 *
 * The served HTML is a list of `<a href="#panel-id">` inside `.iv-tabs__list`
 * and one `.iv-tabs__panel` section per link, each with its own heading. It is
 * usable and correctly announced without JavaScript. `init` promotes it to the
 * APG tabs pattern (`tablist` / `tab` / `tabpanel`, `aria-selected`, roving
 * `tabindex`, `hidden`) and `destroy` puts the served HTML back, keeping every
 * attribute the author had written.
 *
 * @module components/tabs
 */

import { IvComponent, isElement } from "../core/component.js";
import { getInstance } from "../core/registry.js";
import { emit } from "../core/events.js";
import {
  KEY_ARROW_DOWN,
  KEY_ARROW_LEFT,
  KEY_ARROW_RIGHT,
  KEY_ARROW_UP,
  KEY_END,
  KEY_ENTER,
  KEY_HOME,
  KEY_SPACE,
} from "../core/keys.js";

/**
 * @typedef {object} TabsOptions
 * @property {"automatic"|"manual"} activation Whether moving focus also selects.
 * @property {"horizontal"|"vertical"} orientation Arrow keys and `aria-orientation`.
 */

/**
 * @typedef {object} TabPair
 * @property {HTMLElement} tab The tab control.
 * @property {HTMLElement} panel The panel it controls.
 */

const ROOT_SELECTOR = ".iv-tabs";
const LIST_SELECTOR = ".iv-tabs__list";
const TAB_SELECTOR = ".iv-tabs__tab";
const PANEL_SELECTOR = ".iv-tabs__panel";
const HEADING_SELECTOR = ".iv-tabs__heading";
const SR_ONLY_CLASS = "iv-u-sr-only";

/** Incremental suffix for generated ids. */
let uid = 0;

/**
 * Tabs component.
 *
 * @augments IvComponent
 */
export class Tabs extends IvComponent {
  /** @type {string} */
  static componentName = "tabs";

  /** @type {Readonly<TabsOptions>} */
  static defaults = Object.freeze({
    activation: "automatic",
    orientation: "horizontal",
  });

  /**
   * Returns the tabs instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Tabs|undefined} The instance or `undefined`.
   */
  static get(el) {
    const inst = getInstance(el, "tabs");
    return inst instanceof Tabs ? inst : undefined;
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<TabsOptions>} [options] Options passed in JavaScript.
   * @returns {Tabs} The instance.
   */
  static getOrCreate(el, options) {
    return this.get(el) ?? new Tabs(el, options);
  }

  /**
   * Instantiates every `[data-iv-component="tabs"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Tabs[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Tabs[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el The `.iv-tabs` container.
   * @param {Partial<TabsOptions>} [options] Options passed in JavaScript.
   */
  constructor(el, options) {
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {Map<Element, Map<string, string|null>>} Attributes to restore. */
    this._saved = this._saved ?? new Map();
    /** @type {Element[]} Headings this instance made screen-reader only. */
    this._srOnly = this._srOnly ?? [];
    /** @type {TabPair[]} Tab/panel pairs, in document order. */
    this._pairs = this._pairs ?? [];
    /** @type {HTMLElement|null} Currently selected tab. */
    this._active = this._active ?? null;
    /** @type {Element|null} The `.iv-tabs__list` of this instance. */
    this._list = this._list ?? null;
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<TabsOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<TabsOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * The currently selected tab.
   *
   * @returns {HTMLElement|null} The active tab, or `null` when there is none.
   */
  get activeTab() {
    return this._active;
  }

  /**
   * The panel of the currently selected tab.
   *
   * @returns {HTMLElement|null} The active panel, or `null`.
   */
  get activePanel() {
    const pair = this._active ? this._pairOf(this._active) : null;
    return pair ? pair.panel : null;
  }

  /** @returns {void} */
  _setup() {
    this._saved = new Map();
    this._srOnly = [];
    this._pairs = [];
    this._active = null;

    const root = this._element;
    const list = root.querySelector(LIST_SELECTOR);
    this._list = list && this._owns(list) ? list : null;

    for (const tab of root.querySelectorAll(TAB_SELECTOR)) {
      if (!this._owns(tab)) continue;
      const panel = this._panelFor(tab);
      if (!panel) continue; // Missing target: the link keeps its plain behaviour.
      this._pairs.push({
        tab: /** @type {HTMLElement} */ (tab),
        panel: /** @type {HTMLElement} */ (panel),
      });
    }
    if (this._pairs.length === 0) return;

    const preselected = this._pairs.find(
      (pair) => pair.tab.getAttribute("aria-selected") === "true"
    );
    const active = (preselected ?? this._pairs[0]).tab;

    if (this._list) {
      this._set(this._list, "role", "tablist");
      if (this.options.orientation === "vertical") {
        this._set(this._list, "aria-orientation", "vertical");
      }
    }

    for (const { tab, panel } of this._pairs) {
      const isActive = tab === active;
      if (!tab.id) this._set(tab, "id", `iv-tab-${++uid}`);
      this._set(tab, "role", "tab");
      this._set(tab, "aria-controls", panel.id);
      this._set(tab, "aria-selected", isActive ? "true" : "false");
      this._set(tab, "tabindex", isActive ? "0" : "-1");

      this._set(panel, "role", "tabpanel");
      this._set(panel, "aria-labelledby", tab.id);
      this._set(panel, "tabindex", "0");
      if (isActive) this._unset(panel, "hidden");
      else this._set(panel, "hidden", "");

      const heading = panel.querySelector(HEADING_SELECTOR);
      if (heading && !heading.classList.contains(SR_ONLY_CLASS)) {
        heading.classList.add(SR_ONLY_CLASS);
        this._srOnly.push(heading);
      }
    }
    this._active = active;

    this._listen(root, "click", (event) => this._onClick(event));
    this._listen(this._list ?? root, "keydown", (event) =>
      this._onKeydown(event)
    );
  }

  /** @returns {void} */
  _teardown() {
    for (const heading of this._srOnly) {
      heading.classList.remove(SR_ONLY_CLASS);
    }
    this._srOnly = [];
    for (const [el, attributes] of this._saved) {
      for (const [name, value] of attributes) {
        if (value === null) el.removeAttribute(name);
        else el.setAttribute(name, value);
      }
    }
    this._saved.clear();
  }

  /**
   * Tells whether a descendant belongs to this instance and not to nested tabs.
   *
   * @param {Element} el Candidate descendant.
   * @returns {boolean} `true` when the closest `.iv-tabs` is this element.
   */
  _owns(el) {
    return el.closest(ROOT_SELECTOR) === this._element;
  }

  /**
   * Resolves the panel a tab points at through its `href` hash.
   *
   * @param {Element} tab Tab element.
   * @returns {Element|null} The panel, or `null` when it does not exist.
   */
  _panelFor(tab) {
    const href = tab.getAttribute("href") ?? "";
    const id = href.startsWith("#") ? href.slice(1) : "";
    if (!id) return null;
    for (const panel of this._element.querySelectorAll(PANEL_SELECTOR)) {
      if (panel.id === id && this._owns(panel)) return panel;
    }
    return null;
  }

  /**
   * Remembers the current value of an attribute, once per element.
   *
   * @param {Element} el Element to remember.
   * @param {string} name Attribute name.
   * @returns {void}
   */
  _remember(el, name) {
    let attributes = this._saved.get(el);
    if (!attributes) {
      attributes = new Map();
      this._saved.set(el, attributes);
    }
    if (!attributes.has(name)) attributes.set(name, el.getAttribute(name));
  }

  /**
   * Sets a managed attribute, remembering its previous value.
   *
   * @param {Element} el Target element.
   * @param {string} name Attribute name.
   * @param {string} value Attribute value.
   * @returns {void}
   */
  _set(el, name, value) {
    this._remember(el, name);
    el.setAttribute(name, value);
  }

  /**
   * Removes a managed attribute, remembering its previous value.
   *
   * @param {Element} el Target element.
   * @param {string} name Attribute name.
   * @returns {void}
   */
  _unset(el, name) {
    this._remember(el, name);
    el.removeAttribute(name);
  }

  /**
   * Returns the pair a tab belongs to.
   *
   * @param {Element} tab Tab element.
   * @returns {TabPair|null} The pair, or `null`.
   */
  _pairOf(tab) {
    return this._pairs.find((pair) => pair.tab === tab) ?? null;
  }

  /**
   * Resolves a tab from an id (of the tab or of its panel) or an element.
   *
   * @param {string|Element} target Tab id, panel id, tab element or panel element.
   * @returns {HTMLElement|null} The matching tab.
   */
  _resolve(target) {
    if (typeof target === "string") {
      const id = target.startsWith("#") ? target.slice(1) : target;
      const pair = this._pairs.find(
        (candidate) => candidate.tab.id === id || candidate.panel.id === id
      );
      return pair ? pair.tab : null;
    }
    if (!isElement(target)) return null;
    const pair = this._pairs.find(
      (candidate) => candidate.tab === target || candidate.panel === target
    );
    return pair ? pair.tab : null;
  }

  /**
   * Applies the selected state to a tab and its panel.
   *
   * @param {HTMLElement} active Tab to select.
   * @returns {void}
   */
  _activate(active) {
    for (const { tab, panel } of this._pairs) {
      const isActive = tab === active;
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
      if (isActive) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    }
    this._active = active;
  }

  /**
   * Handles clicks on a tab: the anchor never navigates while JavaScript runs.
   *
   * @param {Event} event Click event.
   * @returns {void}
   */
  _onClick(event) {
    const target = event.target;
    if (!isElement(target)) return;
    const tab = target.closest(TAB_SELECTOR);
    if (!tab || !this._pairOf(tab)) return;
    event.preventDefault();
    this.select(tab);
    /** @type {HTMLElement} */ (tab).focus();
  }

  /**
   * Roving focus and activation.
   *
   * @param {Event} event Keydown event.
   * @returns {void}
   */
  _onKeydown(event) {
    const key = /** @type {KeyboardEvent} */ (event).key;
    const target = event.target;
    if (!isElement(target)) return;
    const tab = target.closest(TAB_SELECTOR);
    if (!tab) return;
    const index = this._pairs.findIndex((pair) => pair.tab === tab);
    if (index < 0) return;

    const vertical = this.options.orientation === "vertical";
    const nextKey = vertical ? KEY_ARROW_DOWN : KEY_ARROW_RIGHT;
    const prevKey = vertical ? KEY_ARROW_UP : KEY_ARROW_LEFT;
    const last = this._pairs.length - 1;
    let targetIndex = -1;

    if (key === nextKey) targetIndex = index === last ? 0 : index + 1;
    else if (key === prevKey) targetIndex = index === 0 ? last : index - 1;
    else if (key === KEY_HOME) targetIndex = 0;
    else if (key === KEY_END) targetIndex = last;
    else if (key === KEY_ENTER || key === KEY_SPACE) {
      if (this.options.activation !== "manual") return;
      event.preventDefault();
      this.select(this._pairs[index].tab);
      return;
    } else return;

    event.preventDefault();
    const next = this._pairs[targetIndex].tab;
    if (this.options.activation !== "manual") this.select(next);
    next.focus();
  }

  /**
   * Selects a tab. Emits the cancelable `iv:change` first.
   *
   * @param {string|Element} target Tab id, panel id, tab element or panel element.
   * @returns {void}
   */
  select(target) {
    const tab = this._resolve(target);
    if (!tab || tab === this._active) return;
    const pair = this._pairOf(tab);
    if (!pair) return;
    const previousTab = this._active;
    const allowed = emit(
      this._element,
      "change",
      { instance: this, tab, panel: pair.panel, previousTab },
      { cancelable: true }
    );
    if (!allowed) return;
    this._activate(tab);
    emit(this._element, "changed", {
      instance: this,
      tab,
      panel: pair.panel,
      previousTab,
    });
  }

  /**
   * Selects the next tab, wrapping around.
   *
   * @returns {void}
   */
  next() {
    this._step(1);
  }

  /**
   * Selects the previous tab, wrapping around.
   *
   * @returns {void}
   */
  prev() {
    this._step(-1);
  }

  /**
   * Selects the tab `delta` positions away, wrapping around.
   *
   * @param {number} delta Offset, `1` or `-1`.
   * @returns {void}
   */
  _step(delta) {
    if (this._pairs.length === 0) return;
    const index = this._active
      ? this._pairs.findIndex((pair) => pair.tab === this._active)
      : -1;
    const count = this._pairs.length;
    const next = (((index + delta) % count) + count) % count;
    this.select(this._pairs[next].tab);
  }
}
