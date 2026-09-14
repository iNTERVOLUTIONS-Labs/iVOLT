/**
 * Datepicker: a calendar dialog on top of a native `<input type="date">`.
 *
 * The served HTML is a labelled date input: without JavaScript the browser
 * shows its own picker, the field submits with the form and the value is
 * always ISO `YYYY-MM-DD`. `init` keeps that input as the single source of
 * truth — typing in it still works — and adds a toggle button plus a
 * non-modal calendar dialog next to it (APG "date picker dialog"). Selecting
 * a day writes the ISO value and dispatches native `input`/`change`, so a
 * consumer listening only to the input keeps working.
 *
 * Coarse pointers keep the native picker (`native: "auto"`): a phone control
 * beats any calendar drawn in CSS. `native: "on"` forces that everywhere and
 * `native: "off"` forces the calendar.
 *
 * Dates are local from end to end: they are built with `new Date(y, m, d)` and
 * serialized by hand. `toISOString` would shift the day by the time zone.
 *
 * Every node is created with `createElement` and `textContent`: no markup is
 * ever parsed from a string. Repainting a month reuses the table and rebuilds
 * only its cells. `destroy` removes what it created and puts the input back
 * exactly where the author wrote it, attribute order included.
 *
 * @module components/datepicker
 */

import { IvComponent, isElement } from "../core/component.js";
import { IvError, getInstance } from "../core/registry.js";
import { emit } from "../core/events.js";
import {
  KEY_ARROW_DOWN,
  KEY_ARROW_LEFT,
  KEY_ARROW_RIGHT,
  KEY_ARROW_UP,
  KEY_END,
  KEY_ENTER,
  KEY_ESCAPE,
  KEY_HOME,
  KEY_SPACE,
} from "../core/keys.js";

/**
 * @typedef {object} DatepickerOptions
 * @property {"auto"|"on"|"off"} native Keep the native picker: `auto` does on coarse pointers.
 * @property {string} locale BCP 47 tag for month and weekday names; empty means the document language.
 * @property {number} firstDay First column of the grid, `0` Sunday to `6` Saturday; `-1` asks the locale.
 * @property {string} openText Accessible name of the toggle button.
 * @property {string} prevText Accessible name of the previous month button.
 * @property {string} nextText Accessible name of the next month button.
 * @property {string} todayText Label of the "today" button.
 * @property {string} clearText Label of the "clear" button.
 * @property {string} dialogText Accessible name of the calendar dialog.
 */

/**
 * Why the calendar opened or closed.
 *
 * @typedef {"trigger"|"escape"|"external"|"api"|"select"} DatepickerReason
 */

/**
 * The shape `Intl.Locale` exposes in browsers that ship week information.
 * Neither member is in the ES2022 type library yet.
 *
 * @typedef {object} WeekInfoCarrier
 * @property {() => { firstDay?: number }} [getWeekInfo] Newer, method form.
 * @property {{ firstDay?: number }} [weekInfo] Older, property form.
 */

const ROOT_ATTRIBUTE = '[data-iv-component="datepicker"]';
const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Smallest popover height the placement logic will settle for, in px. */
const MIN_HEIGHT = 160;
/** `core/keys.js` has no paging constants and is owned by the integrator. */
const KEY_PAGE_UP = "PageUp";
const KEY_PAGE_DOWN = "PageDown";
const DAY_SELECTOR = ".iv-datepicker__day";
const SVG_NS = "http://www.w3.org/2000/svg";
/** A Sunday, used to name the seven weekdays without touching the calendar. */
const WEEK_ANCHOR = new Date(2024, 0, 7);
/** Rows painted every month, so the popover keeps its height across months. */
const WEEKS = 6;

/** Counter behind the generated `iv-dp-<n>-…` ids. */
let uid = 0;

/**
 * Tells whether a descendant belongs to this instance and not to a nested one.
 *
 * @param {Element} root Host element.
 * @param {Element} el Candidate descendant.
 * @returns {boolean} `true` when the element is not owned by a nested datepicker.
 */
function owns(root, el) {
  const owner = el.closest(ROOT_ATTRIBUTE);
  return owner === null || owner === root;
}

/**
 * Finds the date input of a datepicker.
 *
 * @param {Element} root Host element.
 * @returns {HTMLInputElement|null} The input, or `null` when there is none.
 */
function findInput(root) {
  for (const node of root.querySelectorAll('input[type="date"]')) {
    const el = /** @type {HTMLInputElement} */ (node);
    if (owns(root, el)) return el;
  }
  return null;
}

/**
 * Returns an id that is free in the document.
 *
 * @param {Document} doc Owner document.
 * @param {string} base Preferred id.
 * @returns {string} A free id.
 */
function uniqueId(doc, base) {
  if (!doc.getElementById(base)) return base;
  let n = 2;
  while (doc.getElementById(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Puts the attributes of an element back into their original order.
 *
 * Removing an attribute and setting it again appends it at the end of the
 * attribute list, so restoring one alone would change how the element
 * serializes. Only runs when the order actually changed.
 *
 * @param {Element} el Element to normalize.
 * @param {string[]} names Attribute names in their original order.
 * @returns {void}
 */
function restoreAttributeOrder(el, names) {
  const current = Array.from(el.attributes).map((attribute) => attribute.name);
  const expected = names.filter((name) => current.includes(name));
  const actual = current.filter((name) => names.includes(name));
  if (
    expected.length === actual.length &&
    expected.every((name, index) => name === actual[index])
  ) {
    return;
  }
  /** @type {Map<string, string>} */
  const values = new Map();
  for (const name of expected) values.set(name, el.getAttribute(name) ?? "");
  for (const name of expected) el.removeAttribute(name);
  for (const name of expected) el.setAttribute(name, values.get(name) ?? "");
}

/**
 * Parses an ISO `YYYY-MM-DD` string into a local midnight date.
 *
 * Anything else — a partial date, `31/02`, a time zone suffix — is `null`, so
 * an invalid `value`, `min` or `max` is simply ignored.
 *
 * @param {string|null|undefined} value Candidate value.
 * @returns {Date|null} The local date, or `null` when the value is not a date.
 */
function parseIso(value) {
  const match = ISO_PATTERN.exec(value ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  // Two digit years would land in the twentieth century without this.
  date.setFullYear(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Serializes a local date as ISO `YYYY-MM-DD`, by hand.
 *
 * @param {Date} date Local date.
 * @returns {string} The ISO value.
 */
function formatIso(date) {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Today at local midnight.
 *
 * @returns {Date} Today.
 */
function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Adds days to a date, staying at local midnight.
 *
 * @param {Date} date Starting date.
 * @param {number} count Days to add, possibly negative.
 * @returns {Date} The new date.
 */
function addDays(date, count) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

/**
 * Adds months to a date, clamping the day to the length of the target month.
 *
 * @param {Date} date Starting date.
 * @param {number} count Months to add, possibly negative.
 * @returns {Date} The new date.
 */
function addMonths(date, count) {
  const first = new Date(date.getFullYear(), date.getMonth() + count, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(
    first.getFullYear(),
    first.getMonth(),
    Math.min(date.getDate(), last)
  );
}

/**
 * Tells whether two dates fall on the same day.
 *
 * @param {Date|null} a First date.
 * @param {Date|null} b Second date.
 * @returns {boolean} `true` when both exist and share the day.
 */
function sameDay(a, b) {
  return (
    a !== null &&
    b !== null &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Builds an `Intl.DateTimeFormat`, falling back to the runtime locale when the
 * tag is not usable.
 *
 * @param {string|undefined} locale Requested locale.
 * @param {Intl.DateTimeFormatOptions} options Formatter options.
 * @returns {Intl.DateTimeFormat} A usable formatter.
 */
function formatter(locale, options) {
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch {
    return new Intl.DateTimeFormat(undefined, options);
  }
}

/**
 * First day of the week for a locale: `Intl.Locale` when the runtime exposes
 * week information, Monday otherwise. `weekInfo` counts 1 (Monday) to 7
 * (Sunday); `Date.getDay` counts 0 (Sunday) to 6.
 *
 * @param {string|undefined} locale Requested locale.
 * @returns {number} Day index between 0 and 6.
 */
function localeFirstDay(locale) {
  try {
    const tag = formatter(locale, {}).resolvedOptions().locale;
    const resolved = /** @type {WeekInfoCarrier} */ (
      /** @type {unknown} */ (new Intl.Locale(tag))
    );
    const info =
      typeof resolved.getWeekInfo === "function"
        ? resolved.getWeekInfo()
        : resolved.weekInfo;
    const first = info ? info.firstDay : undefined;
    if (typeof first === "number" && first >= 1 && first <= 7) {
      return first === 7 ? 0 : first;
    }
  } catch {
    // The runtime has no week information; Monday is the documented fallback.
  }
  return 1;
}

/**
 * Datepicker component.
 *
 * @augments IvComponent
 */
export class Datepicker extends IvComponent {
  /** @type {string} */
  static componentName = "datepicker";

  /** @type {Readonly<DatepickerOptions>} */
  static defaults = Object.freeze(
    /** @type {DatepickerOptions} */ ({
      native: "auto",
      locale: "",
      firstDay: -1,
      openText: "Open calendar",
      prevText: "Previous month",
      nextText: "Next month",
      todayText: "Today",
      clearText: "Clear",
      dialogText: "Choose a date",
    })
  );

  /**
   * Returns the datepicker instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Datepicker|undefined} The instance or `undefined`.
   */
  static get(el) {
    const inst = getInstance(el, "datepicker");
    return inst instanceof Datepicker ? inst : undefined;
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<DatepickerOptions>} [options] Options passed in JavaScript.
   * @returns {Datepicker} The instance.
   */
  static getOrCreate(el, options) {
    return this.get(el) ?? new Datepicker(el, options);
  }

  /**
   * Instantiates every `[data-iv-component="datepicker"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Datepicker[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Datepicker[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el A `<div class="iv-datepicker">` element.
   * @param {Partial<DatepickerOptions>} [options] Options passed in JavaScript.
   * @throws {IvError} `invalid-element` when there is no date input to enrich.
   */
  constructor(el, options) {
    if (!isElement(el)) {
      throw new IvError("invalid-element", "Datepicker requires an element.");
    }
    const input = findInput(el);
    if (!input) {
      throw new IvError(
        "invalid-element",
        'Datepicker requires an <input type="date"> element.'
      );
    }
    super(el, options);
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    const doc = el.ownerDocument;
    /** @type {HTMLInputElement} The native input, kept as the source of truth. */
    this._input = this._input ?? input;
    /** @type {HTMLElement} The box holding the input, the toggle and the popover. */
    this._control = this._control ?? doc.createElement("div");
    /** @type {HTMLButtonElement} The generated toggle. */
    this._toggle = this._toggle ?? doc.createElement("button");
    /** @type {HTMLElement} The calendar dialog. */
    this._popover = this._popover ?? doc.createElement("div");
    /** @type {HTMLElement} The month and year heading. */
    this._title = this._title ?? doc.createElement("h2");
    /** @type {HTMLButtonElement} The previous month button. */
    this._prev = this._prev ?? doc.createElement("button");
    /** @type {HTMLButtonElement} The next month button. */
    this._next = this._next ?? doc.createElement("button");
    /** @type {HTMLElement} The calendar grid. */
    this._grid = this._grid ?? doc.createElement("table");
    /** @type {HTMLElement} The body of the grid, rebuilt on every repaint. */
    this._body = this._body ?? doc.createElement("tbody");
    /** @type {HTMLButtonElement} The "today" button. */
    this._todayButton = this._todayButton ?? doc.createElement("button");
    /** @type {HTMLButtonElement} The "clear" button. */
    this._clearButton = this._clearButton ?? doc.createElement("button");
    /** @type {Map<Element, Map<string, string|null>>} Attributes to restore. */
    this._saved = this._saved ?? new Map();
    /** @type {string[]} Attribute names of the input, in their original order. */
    this._inputAttributes = this._inputAttributes ?? [];
    /** @type {boolean} Whether the calendar replaced the native picker. */
    this._enhanced = this._enhanced ?? false;
    /** @type {boolean} Whether the calendar is open. */
    this._open = this._open ?? false;
    /** @type {Date} First day of the painted month. */
    this._view = this._view ?? startOfToday();
    /** @type {Date} The day that owns the single tab stop of the grid. */
    this._cursor = this._cursor ?? startOfToday();
    /** @type {number} Resolved first column of the grid. */
    this._firstDay = this._firstDay ?? 1;
    /** @type {string|undefined} Resolved locale. */
    this._locale = this._locale ?? undefined;
    /** @type {boolean} Guard against the synthetic `input`/`change` events. */
    this._silent = this._silent ?? false;
    /** @type {EventListener|null} Outside pointer listener while open. */
    this._outside = this._outside ?? null;
    /** @type {EventListener|null} Viewport resize listener while open. */
    this._resize = this._resize ?? null;
    /** @type {Intl.DateTimeFormat} Month and year, for the heading. */
    this._monthFormat = this._monthFormat ?? formatter(undefined, {});
    /** @type {Intl.DateTimeFormat} Full date, for the label of a day. */
    this._dayFormat = this._dayFormat ?? formatter(undefined, {});
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<DatepickerOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<DatepickerOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * Whether the calendar is open. Always `false` while the native picker is in
   * charge.
   *
   * @returns {boolean} `true` when the popover is visible.
   */
  get isOpen() {
    return this._open;
  }

  /**
   * The ISO value of the input, or an empty string when it holds no date.
   *
   * @returns {string} `YYYY-MM-DD` or `""`.
   */
  get value() {
    return parseIso(this._input.value) ? this._input.value : "";
  }

  /**
   * The value as a local `Date` at midnight.
   *
   * @returns {Date|null} The date, or `null` when the field is empty.
   */
  get date() {
    return parseIso(this._input.value);
  }

  /** @returns {void} */
  _setup() {
    const root = this._element;
    const doc = root.ownerDocument;
    const input = findInput(root);
    // The constructor already rejected this case; it keeps the types simple.
    if (!input) return;

    this._input = input;
    this._saved = new Map();
    this._open = false;
    this._silent = false;
    this._outside = null;
    this._resize = null;
    this._inputAttributes = Array.from(input.attributes).map(
      (attribute) => attribute.name
    );
    this._enhanced = this._useCalendar();
    if (!this._enhanced) return;

    const locale = String(this.options.locale || "").trim();
    this._locale =
      locale || doc.documentElement.getAttribute("lang") || undefined;
    const first = Number(this.options.firstDay);
    this._firstDay =
      Number.isInteger(first) && first >= 0 && first <= 6
        ? first
        : localeFirstDay(this._locale);
    this._monthFormat = formatter(this._locale, {
      month: "long",
      year: "numeric",
    });
    this._dayFormat = formatter(this._locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const n = ++uid;
    const popoverId = uniqueId(doc, `iv-dp-${n}-calendar`);
    const titleId = uniqueId(doc, `iv-dp-${n}-title`);

    const control = doc.createElement("div");
    control.className = "iv-datepicker__control";

    const toggle = doc.createElement("button");
    toggle.type = "button";
    toggle.className = "iv-datepicker__toggle";
    toggle.setAttribute("aria-haspopup", "dialog");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", popoverId);
    toggle.setAttribute("aria-label", String(this.options.openText));
    toggle.append(this._icon(doc));

    const popover = doc.createElement("div");
    popover.className = "iv-datepicker__popover";
    popover.id = popoverId;
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-modal", "false");
    popover.setAttribute("aria-label", String(this.options.dialogText));
    popover.setAttribute("data-iv-placement", "bottom");
    popover.hidden = true;

    const header = doc.createElement("div");
    header.className = "iv-datepicker__header";
    const prev = this._navButton(doc, -1, String(this.options.prevText));
    const next = this._navButton(doc, 1, String(this.options.nextText));
    const title = doc.createElement("h2");
    title.className = "iv-datepicker__title";
    title.id = titleId;
    title.setAttribute("aria-live", "polite");
    header.append(prev, title, next);

    const grid = doc.createElement("table");
    grid.className = "iv-datepicker__grid";
    grid.setAttribute("role", "grid");
    grid.setAttribute("aria-labelledby", titleId);
    const head = doc.createElement("thead");
    const headRow = doc.createElement("tr");
    const shortDays = formatter(this._locale, { weekday: "short" });
    const longDays = formatter(this._locale, { weekday: "long" });
    for (let i = 0; i < 7; i += 1) {
      const day = addDays(WEEK_ANCHOR, (this._firstDay + i) % 7);
      const th = doc.createElement("th");
      th.className = "iv-datepicker__weekday";
      th.scope = "col";
      th.setAttribute("abbr", longDays.format(day));
      th.textContent = shortDays.format(day);
      headRow.append(th);
    }
    head.append(headRow);
    const body = doc.createElement("tbody");
    grid.append(head, body);

    const footer = doc.createElement("div");
    footer.className = "iv-datepicker__footer";
    const todayButton = doc.createElement("button");
    todayButton.type = "button";
    todayButton.className =
      "iv-button iv-button--ghost iv-button--sm iv-datepicker__today";
    todayButton.textContent = String(this.options.todayText);
    const clearButton = doc.createElement("button");
    clearButton.type = "button";
    clearButton.className =
      "iv-button iv-button--ghost iv-button--sm iv-datepicker__clear";
    clearButton.textContent = String(this.options.clearText);
    footer.append(todayButton, clearButton);

    popover.append(header, grid, footer);

    this._control = control;
    this._toggle = toggle;
    this._popover = popover;
    this._title = title;
    this._prev = prev;
    this._next = next;
    this._grid = grid;
    this._body = body;
    this._todayButton = todayButton;
    this._clearButton = clearButton;

    input.replaceWith(control);
    control.append(input, toggle, popover);
    this._set(root, "data-iv-enhanced", "");
    this._syncFromInput();

    this._listen(toggle, "click", () => this._toggleOpen());
    this._listen(toggle, "keydown", (event) => this._onToggleKeydown(event));
    this._listen(input, "keydown", (event) => this._onInputKeydown(event));
    this._listen(input, "change", () => this._onInputChange());
    this._listen(prev, "click", () => this._shiftView(-1));
    this._listen(next, "click", () => this._shiftView(1));
    this._listen(body, "click", (event) => this._onGridClick(event));
    this._listen(popover, "keydown", (event) => this._onPopoverKeydown(event));
    this._listen(todayButton, "click", () => this._onToday());
    this._listen(clearButton, "click", () => this._commit("", "select"));
  }

  /** @returns {void} */
  _teardown() {
    if (this._enhanced) {
      this._toggle.remove();
      this._popover.remove();
      if (this._control.parentNode) this._control.replaceWith(this._input);
    }
    this._open = false;
    this._outside = null;
    this._resize = null;
    for (const [el, attributes] of this._saved) {
      for (const [name, value] of attributes) {
        if (value === null) el.removeAttribute(name);
        else el.setAttribute(name, value);
      }
    }
    this._saved.clear();
    restoreAttributeOrder(this._input, this._inputAttributes);
  }

  /**
   * Whether this instance draws its own calendar. `auto` steps aside on coarse
   * pointers, where the platform control is better than anything drawn here.
   *
   * @returns {boolean} `true` when the calendar replaces the native picker.
   */
  _useCalendar() {
    const setting = this.options.native;
    if (setting === "off") return true;
    if (setting === "on") return false;
    const view = this._element.ownerDocument.defaultView;
    if (view && typeof view.matchMedia === "function") {
      try {
        if (view.matchMedia("(pointer: coarse)").matches) return false;
      } catch {
        // A runtime without media query support keeps the calendar.
      }
    }
    return true;
  }

  /**
   * The calendar icon of the toggle, as inline SVG.
   *
   * @param {Document} doc Owner document.
   * @returns {SVGElement} The icon.
   */
  _icon(doc) {
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "iv-datepicker__icon");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.5");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("aria-hidden", "true");
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute(
      "d",
      "M3.75 3.25h8.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5h-8.5a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5ZM2.25 6.75h11.5M5.5 1.75v2.5M10.5 1.75v2.5"
    );
    svg.append(path);
    return svg;
  }

  /**
   * Builds one of the two month navigation buttons.
   *
   * @param {Document} doc Owner document.
   * @param {number} dir `-1` for the previous month, `1` for the next one.
   * @param {string} label Accessible name.
   * @returns {HTMLButtonElement} The button.
   */
  _navButton(doc, dir, label) {
    const button = doc.createElement("button");
    button.type = "button";
    button.className = "iv-datepicker__nav";
    button.setAttribute("data-iv-dir", String(dir));
    button.setAttribute("aria-label", label);
    const arrow = doc.createElementNS(SVG_NS, "svg");
    arrow.setAttribute("class", "iv-datepicker__icon");
    arrow.setAttribute("viewBox", "0 0 16 16");
    arrow.setAttribute("width", "16");
    arrow.setAttribute("height", "16");
    arrow.setAttribute("fill", "none");
    arrow.setAttribute("stroke", "currentColor");
    arrow.setAttribute("stroke-width", "1.75");
    arrow.setAttribute("stroke-linecap", "round");
    arrow.setAttribute("stroke-linejoin", "round");
    arrow.setAttribute("aria-hidden", "true");
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", dir < 0 ? "m9.75 3.5-4 4.5 4 4.5" : "m6.25 3.5 4 4.5-4 4.5");
    arrow.append(path);
    button.append(arrow);
    return button;
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
   * Removes a listener registered with `_listen` before `destroy` runs.
   *
   * @param {EventTarget} target Event target.
   * @param {string} type Event type.
   * @param {EventListener} handler Listener.
   * @returns {void}
   */
  _unlisten(target, type, handler) {
    target.removeEventListener(type, handler);
    this._listeners = this._listeners.filter(
      (entry) =>
        entry.target !== target ||
        entry.type !== type ||
        entry.handler !== handler
    );
  }

  /**
   * Lower bound of the field, when `min` holds a real date.
   *
   * @returns {Date|null} The first selectable day.
   */
  get _min() {
    return parseIso(this._input.getAttribute("min"));
  }

  /**
   * Upper bound of the field, when `max` holds a real date.
   *
   * @returns {Date|null} The last selectable day.
   */
  get _max() {
    return parseIso(this._input.getAttribute("max"));
  }

  /**
   * Whether a day may be selected: inside `min` and `max`, and on the grid
   * that `step` draws. For a date input the step counts days from `min`, or
   * from 1970-01-01 when there is no lower bound.
   *
   * @param {Date} date Candidate day.
   * @returns {boolean} `true` when the day is selectable.
   */
  _allowed(date) {
    const min = this._min;
    const max = this._max;
    if (min && date.getTime() < min.getTime()) return false;
    if (max && date.getTime() > max.getTime()) return false;
    const step = Number(this._input.getAttribute("step"));
    if (Number.isFinite(step) && step > 1) {
      const base = min ?? new Date(1970, 0, 1);
      // Rounded: a daylight saving change makes a day 23 or 25 hours long.
      const days = Math.round((date.getTime() - base.getTime()) / 86400000);
      if (days % step !== 0) return false;
    }
    return true;
  }

  /**
   * Pulls a date inside `min` and `max`.
   *
   * @param {Date} date Candidate day.
   * @returns {Date} The nearest selectable day.
   */
  _clamp(date) {
    const min = this._min;
    const max = this._max;
    if (min && date.getTime() < min.getTime()) return min;
    if (max && date.getTime() > max.getTime()) return max;
    return date;
  }

  /**
   * Reads the input and points the calendar at the month it names: the value
   * when it holds one, today otherwise. Typing a date by hand and opening the
   * calendar therefore lands on that month.
   *
   * @returns {void}
   */
  _syncFromInput() {
    const value = parseIso(this._input.value);
    this._cursor = this._clamp(value ?? startOfToday());
    this._view = new Date(this._cursor.getFullYear(), this._cursor.getMonth(), 1);
    this._render();
  }

  /**
   * Repaints the heading, the navigation state and every cell of the grid.
   * The table itself is reused; only the rows are rebuilt.
   *
   * @returns {void}
   */
  _render() {
    const doc = this._element.ownerDocument;
    const selected = parseIso(this._input.value);
    const today = startOfToday();
    this._title.textContent = this._monthFormat.format(this._view);

    const min = this._min;
    const max = this._max;
    const lastOfPrev = new Date(this._view.getFullYear(), this._view.getMonth(), 0);
    const firstOfNext = new Date(
      this._view.getFullYear(),
      this._view.getMonth() + 1,
      1
    );
    this._prev.disabled = min !== null && lastOfPrev.getTime() < min.getTime();
    this._next.disabled = max !== null && firstOfNext.getTime() > max.getTime();
    this._todayButton.disabled = !this._allowed(today);

    const offset = (this._view.getDay() - this._firstDay + 7) % 7;
    const start = addDays(this._view, -offset);
    while (this._body.firstChild) this._body.removeChild(this._body.firstChild);
    for (let week = 0; week < WEEKS; week += 1) {
      const row = doc.createElement("tr");
      for (let column = 0; column < 7; column += 1) {
        const date = addDays(start, week * 7 + column);
        const cell = doc.createElement("td");
        const day = doc.createElement("button");
        day.type = "button";
        let className = "iv-datepicker__day";
        if (date.getMonth() !== this._view.getMonth()) {
          className += " iv-datepicker__day--outside";
        }
        if (sameDay(date, today)) {
          className += " iv-datepicker__day--today";
          day.setAttribute("aria-current", "date");
        }
        day.className = className;
        day.setAttribute("data-iv-date", formatIso(date));
        day.setAttribute("aria-label", this._dayFormat.format(date));
        // `aria-selected` belongs to the grid cell, not to the button (axe: aria-allowed-attr).
        cell.setAttribute("aria-selected", sameDay(date, selected) ? "true" : "false");
        day.tabIndex = sameDay(date, this._cursor) ? 0 : -1;
        if (!this._allowed(date)) day.disabled = true;
        day.textContent = String(date.getDate());
        cell.append(day);
        row.append(cell);
      }
      this._body.append(row);
    }
    // The cursor always sits inside the painted month, but a disabled bound or
    // an empty month would leave the grid without a tab stop.
    if (!this._body.querySelector(`${DAY_SELECTOR}[tabindex="0"]`)) {
      const fallback = this._body.querySelector(`${DAY_SELECTOR}:not([disabled])`);
      if (fallback) /** @type {HTMLElement} */ (fallback).tabIndex = 0;
    }
  }

  /**
   * The button painted for a given day, when the grid shows it.
   *
   * @param {Date} date The day.
   * @returns {HTMLButtonElement|null} Its button, or `null`.
   */
  _dayButton(date) {
    return this._body.querySelector(
      `${DAY_SELECTOR}[data-iv-date="${formatIso(date)}"]`
    );
  }

  /**
   * Moves the single tab stop of the grid, repaints when the month changes and
   * optionally takes the focus with it. Dates outside `min` and `max` are
   * pulled back in, so the keyboard never walks out of the allowed range.
   *
   * @param {Date} date Requested day.
   * @param {boolean} [moveFocus] Whether focus follows the cursor.
   * @returns {void}
   */
  _setCursor(date, moveFocus = true) {
    const next = this._clamp(date);
    this._cursor = next;
    if (
      next.getFullYear() !== this._view.getFullYear() ||
      next.getMonth() !== this._view.getMonth()
    ) {
      this._view = new Date(next.getFullYear(), next.getMonth(), 1);
    }
    this._render();
    if (!moveFocus) return;
    const button = this._dayButton(next);
    if (button && !button.disabled) button.focus();
  }

  /**
   * Steps the painted month without moving the focus out of the header.
   *
   * @param {number} dir `-1` or `1`.
   * @returns {void}
   */
  _shiftView(dir) {
    const doc = this._element.ownerDocument;
    const active = doc.activeElement;
    const cursor = addMonths(this._cursor, dir);
    this._setCursor(cursor, this._grid.contains(active));
    // A button that disables itself under the pointer would drop the focus.
    if (active === this._prev && this._prev.disabled) this._next.focus();
    else if (active === this._next && this._next.disabled) this._prev.focus();
  }

  /**
   * Places the popover below the control, or above it when it does not fit
   * below and does fit above. When neither side has room it stays below and
   * the height is capped, so the calendar is always reachable.
   *
   * @returns {void}
   */
  _place() {
    const view = this._element.ownerDocument.defaultView;
    const height = view ? view.innerHeight : 0;
    const rect = this._control.getBoundingClientRect();
    const gap = 8;
    const below = height - rect.bottom - gap;
    const above = rect.top - gap;
    const needed = this._popover.offsetHeight || 0;
    const top = needed > below && above >= needed;
    this._popover.setAttribute("data-iv-placement", top ? "top" : "bottom");
    const room = top ? above : below;
    if (height > 0 && needed > room) {
      this._popover.style.setProperty(
        "--iv-datepicker-max-height",
        `${Math.max(MIN_HEIGHT, Math.floor(room))}px`
      );
    } else {
      this._popover.style.removeProperty("--iv-datepicker-max-height");
    }
  }

  /**
   * Opens the calendar. Emits the cancelable `iv:open` first.
   *
   * @param {DatepickerReason} reason Why the calendar is opening.
   * @returns {void}
   */
  _openPopover(reason) {
    if (this._open || !this._enhanced) return;
    const allowed = emit(
      this._element,
      "open",
      { instance: this, trigger: this._toggle, reason },
      { cancelable: true }
    );
    if (!allowed) return;
    this._open = true;
    this._syncFromInput();
    this._popover.hidden = false;
    this._toggle.setAttribute("aria-expanded", "true");
    this._place();
    const button = this._dayButton(this._cursor);
    if (button && !button.disabled) button.focus();
    else {
      const fallback = this._body.querySelector(`${DAY_SELECTOR}[tabindex="0"]`);
      if (fallback) /** @type {HTMLElement} */ (fallback).focus();
    }
    /** @type {EventListener} */
    const outside = (event) => this._onDocumentPointer(event);
    this._outside = outside;
    this._listen(this._element.ownerDocument, "pointerdown", outside);
    const view = this._element.ownerDocument.defaultView;
    if (view) {
      /** @type {EventListener} */
      const onResize = () => this._place();
      this._resize = onResize;
      this._listen(view, "resize", onResize);
    }
    emit(this._element, "opened", {
      instance: this,
      trigger: this._toggle,
      reason,
    });
  }

  /**
   * Closes the calendar. Emits the cancelable `iv:close` first.
   *
   * @param {DatepickerReason} reason Why the calendar is closing.
   * @returns {void}
   */
  _closePopover(reason) {
    if (!this._open) return;
    const allowed = emit(
      this._element,
      "close",
      { instance: this, trigger: this._toggle, reason },
      { cancelable: true }
    );
    if (!allowed) return;
    const doc = this._element.ownerDocument;
    // Focus must leave the popover before it is hidden, or it falls to <body>.
    // A selection repaints the grid, so the focused day may already be gone: focus on <body> counts as inside.
    const inside = this._popover.contains(doc.activeElement) || doc.activeElement === doc.body;
    this._open = false;
    if (inside && reason !== "external") this._toggle.focus();
    this._popover.hidden = true;
    this._popover.style.removeProperty("--iv-datepicker-max-height");
    this._toggle.setAttribute("aria-expanded", "false");
    if (this._outside) {
      this._unlisten(doc, "pointerdown", this._outside);
      this._outside = null;
    }
    if (this._resize && doc.defaultView) {
      this._unlisten(doc.defaultView, "resize", this._resize);
      this._resize = null;
    }
    emit(this._element, "closed", {
      instance: this,
      trigger: this._toggle,
      reason,
    });
  }

  /**
   * Writes a value: `iv:change` (cancelable) → `input.value` → native
   * `input`/`change` → repaint → `iv:changed`. A selection also closes.
   *
   * @param {string} iso New ISO value, or `""` to empty the field.
   * @param {DatepickerReason} reason Why the value changed.
   * @returns {boolean} `true` when the value was written.
   */
  _commit(iso, reason) {
    const previous = this.value;
    if (iso === previous) {
      if (reason === "select") this._closePopover("select");
      return false;
    }
    const date = parseIso(iso);
    if (iso !== "" && (!date || !this._allowed(date))) return false;
    const allowed = emit(
      this._element,
      "change",
      { instance: this, value: iso, previousValue: previous, date },
      { cancelable: true }
    );
    if (!allowed) return false;
    this._silent = true;
    try {
      this._input.value = iso;
      this._input.dispatchEvent(new Event("input", { bubbles: true }));
      this._input.dispatchEvent(new Event("change", { bubbles: true }));
    } finally {
      this._silent = false;
    }
    if (this._enhanced) {
      if (date) this._cursor = date;
      this._view = new Date(this._cursor.getFullYear(), this._cursor.getMonth(), 1);
      this._render();
    }
    emit(this._element, "changed", {
      instance: this,
      value: iso,
      previousValue: previous,
      date,
    });
    if (reason === "select") this._closePopover("select");
    return true;
  }

  /**
   * Toggle click: opens or closes with the `trigger` reason.
   *
   * @returns {void}
   */
  _toggleOpen() {
    if (this._open) this._closePopover("trigger");
    else this._openPopover("trigger");
  }

  /**
   * Down arrow on the toggle opens the calendar, the way a combobox does.
   *
   * @param {Event} event The keydown event.
   * @returns {void}
   */
  _onToggleKeydown(event) {
    const key = /** @type {KeyboardEvent} */ (event).key;
    if (key !== KEY_ARROW_DOWN) return;
    event.preventDefault();
    this._openPopover("trigger");
  }

  /**
   * Alt + down arrow opens the calendar from the input. A bare arrow is left
   * to the browser, which steps the date segment under the caret.
   *
   * @param {Event} event The keydown event.
   * @returns {void}
   */
  _onInputKeydown(event) {
    const keyboard = /** @type {KeyboardEvent} */ (event);
    if (keyboard.key !== KEY_ARROW_DOWN || !keyboard.altKey) return;
    event.preventDefault();
    this._openPopover("trigger");
  }

  /**
   * An external change — typing, autofill, a script — repaints the calendar.
   *
   * @returns {void}
   */
  _onInputChange() {
    if (this._silent || !this._enhanced) return;
    this._syncFromInput();
  }

  /**
   * Selects the day under the pointer.
   *
   * @param {Event} event The click event.
   * @returns {void}
   */
  _onGridClick(event) {
    const target = /** @type {Element|null} */ (event.target);
    const day = target ? target.closest(DAY_SELECTOR) : null;
    if (!day || !this._body.contains(day)) return;
    const date = parseIso(day.getAttribute("data-iv-date"));
    if (!date || !this._allowed(date)) return;
    this._commit(formatIso(date), "select");
  }

  /**
   * The "today" button: selects today, which the footer only offers while
   * today is inside `min` and `max`.
   *
   * @returns {void}
   */
  _onToday() {
    const date = startOfToday();
    if (!this._allowed(date)) return;
    this._commit(formatIso(date), "select");
  }

  /**
   * Keyboard of the dialog: the grid moves the cursor, Escape closes from
   * anywhere inside.
   *
   * @param {Event} event The keydown event.
   * @returns {void}
   */
  _onPopoverKeydown(event) {
    const keyboard = /** @type {KeyboardEvent} */ (event);
    if (keyboard.key === KEY_ESCAPE) {
      event.preventDefault();
      const doc = this._element.ownerDocument;
      const inside = this._popover.contains(doc.activeElement);
      this._closePopover("escape");
      if (!inside) this._toggle.focus();
      return;
    }
    const target = /** @type {Element|null} */ (keyboard.target);
    if (!target || !target.closest(DAY_SELECTOR)) return;
    const cursor = this._cursor;
    switch (keyboard.key) {
      case KEY_ARROW_LEFT:
        this._move(event, addDays(cursor, -1));
        break;
      case KEY_ARROW_RIGHT:
        this._move(event, addDays(cursor, 1));
        break;
      case KEY_ARROW_UP:
        this._move(event, addDays(cursor, -7));
        break;
      case KEY_ARROW_DOWN:
        this._move(event, addDays(cursor, 7));
        break;
      case KEY_HOME:
        this._move(
          event,
          addDays(cursor, -((cursor.getDay() - this._firstDay + 7) % 7))
        );
        break;
      case KEY_END:
        this._move(
          event,
          addDays(cursor, 6 - ((cursor.getDay() - this._firstDay + 7) % 7))
        );
        break;
      case KEY_PAGE_UP:
        this._move(event, addMonths(cursor, keyboard.shiftKey ? -12 : -1));
        break;
      case KEY_PAGE_DOWN:
        this._move(event, addMonths(cursor, keyboard.shiftKey ? 12 : 1));
        break;
      case KEY_ENTER:
      case KEY_SPACE: {
        event.preventDefault();
        if (this._allowed(cursor)) this._commit(formatIso(cursor), "select");
        break;
      }
      default:
        break;
    }
  }

  /**
   * Moves the cursor from a key, keeping the browser out of it.
   *
   * @param {Event} event The keydown event.
   * @param {Date} date Requested day.
   * @returns {void}
   */
  _move(event, date) {
    event.preventDefault();
    this._setCursor(date, true);
  }

  /**
   * A pointer outside the component closes the calendar.
   *
   * @param {Event} event The pointer event.
   * @returns {void}
   */
  _onDocumentPointer(event) {
    const target = /** @type {Node|null} */ (event.target);
    if (target && this._element.contains(target)) return;
    this._closePopover("external");
  }

  /**
   * Opens the calendar.
   *
   * @returns {void}
   */
  open() {
    this._openPopover("api");
  }

  /**
   * Closes the calendar.
   *
   * @param {DatepickerReason} [reason] Why it is closing.
   * @returns {void}
   */
  close(reason = "api") {
    this._closePopover(reason);
  }

  /**
   * Writes a date. Values that are not ISO dates, and dates outside `min` and
   * `max`, are ignored; `""` empties the field.
   *
   * @param {string} iso ISO `YYYY-MM-DD` value, or `""`.
   * @returns {void}
   */
  setValue(iso) {
    this._commit(typeof iso === "string" ? iso : "", "api");
  }

  /**
   * Empties the field.
   *
   * @returns {void}
   */
  clear() {
    this._commit("", "api");
  }
}
