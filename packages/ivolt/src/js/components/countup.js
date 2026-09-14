/**
 * Countup: the served figure counts up when it reaches the viewport (§8.22).
 *
 * The served text is the whole truth: `<strong class="iv-count">€ 1,240.50</strong>`
 * already shows the final figure, prefix and suffix included, so a page without
 * JavaScript, with `prefers-reduced-motion: reduce` or without an
 * `IntersectionObserver` is complete as served. `init` only reads that text: it
 * splits prefix, number and suffix, deduces how many decimals it carries and
 * which separators the locale of the element uses, and animates between `from`
 * and that number with `Intl.NumberFormat`, so a Spanish figure counts through
 * `1.240,50` and an English one through `1,240.50`. The last frame writes the
 * served text back, character for character.
 *
 * @module components/countup
 */

import { IvComponent } from "../core/component.js";
import { emit } from "../core/events.js";

/**
 * @typedef {object} CountupOptions
 * @property {number} from Where the count starts.
 * @property {number} duration Length of the count in milliseconds.
 * @property {number} decimals Decimal places; `-1` takes them from the figure.
 * @property {boolean} grouping Whether thousands are grouped while counting.
 * @property {boolean} once Whether the count runs only the first time.
 * @property {boolean} autostart Whether it counts at `init` instead of in view.
 */

/** Fraction of the element that must be visible before it counts. */
const THRESHOLD = 0.6;

/**
 * Escapes a separator for use inside a regular expression.
 *
 * @param {string} value Raw separator.
 * @returns {string} Escaped separator.
 */
function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Reads the language that applies to an element.
 *
 * @param {Element} el Element to inspect.
 * @returns {string|undefined} A BCP 47 tag, or `undefined` for the default.
 */
function langOf(el) {
  const owner = el.closest("[lang]");
  const tag = owner ? owner.getAttribute("lang") : null;
  const fallback = el.ownerDocument.documentElement.getAttribute("lang");
  const value = (tag || fallback || "").trim();
  return value === "" ? undefined : value;
}

/**
 * The separators a locale uses for grouping and for decimals.
 *
 * @param {string|undefined} locale Locale tag.
 * @returns {{ group: string, decimal: string }} Both separators.
 */
function separatorsOf(locale) {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  let group = "";
  let decimal = ".";
  for (const part of parts) {
    if (part.type === "group") group = part.value;
    if (part.type === "decimal") decimal = part.value;
  }
  return { group, decimal };
}

/**
 * Splits a served figure into prefix, number and suffix.
 *
 * @param {string} text Served text.
 * @param {{ group: string, decimal: string }} separators Locale separators.
 * @returns {{ prefix: string, suffix: string, value: number, decimals: number }|null}
 *   The parts, or `null` when the text carries no number.
 */
function parseFigure(text, separators) {
  const group = separators.group === "" ? "" : escapeForRegExp(separators.group);
  const decimal = escapeForRegExp(separators.decimal);
  // Greedy on purpose: `1240` must match whole, `1,240.50` must keep its groups.
  const digits = group === "" ? "\\d+" : `\\d+(?:${group}\\d{3})*`;
  const re = new RegExp(`${digits}(?:${decimal}\\d+)?`);
  const match = re.exec(text);
  if (!match) return null;
  const raw = match[0];
  const plain = separators.group === ""
    ? raw
    : raw.split(separators.group).join("");
  const normalised = plain.split(separators.decimal).join(".");
  const value = Number(normalised);
  if (!Number.isFinite(value)) return null;
  const dot = normalised.indexOf(".");
  return {
    prefix: text.slice(0, match.index),
    suffix: text.slice(match.index + raw.length),
    value,
    decimals: dot < 0 ? 0 : normalised.length - dot - 1,
  };
}

/**
 * Animated figure.
 *
 * @augments IvComponent
 */
export class Countup extends IvComponent {
  /** @type {string} */
  static componentName = "countup";

  /** @type {Readonly<CountupOptions>} */
  static defaults = Object.freeze({
    from: 0,
    duration: 900,
    decimals: -1,
    grouping: true,
    once: true,
    autostart: false,
  });

  /**
   * Returns the instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Countup|undefined} The instance or `undefined`.
   */
  static get(el) {
    return /** @type {Countup|undefined} */ (super.get(el));
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<CountupOptions>} [options] Options passed in JavaScript.
   * @returns {Countup} The instance.
   */
  static getOrCreate(el, options) {
    return /** @type {Countup} */ (
      super.getOrCreate(el, /** @type {Record<string, unknown>} */ (options))
    );
  }

  /**
   * Instantiates every `[data-iv-component="countup"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Countup[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Countup[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el Element holding the figure.
   * @param {Partial<CountupOptions>} [options] Options passed in JavaScript.
   */
  constructor(el, options) {
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {string} The served text, the figure to reach. */
    this._text = this._text ?? "";
    /** @type {ChildNode[]} The served nodes, put back on every end. */
    this._served = this._served ?? [];
    /** @type {string} Text before the number. */
    this._prefix = this._prefix ?? "";
    /** @type {string} Text after the number. */
    this._suffix = this._suffix ?? "";
    /** @type {number} The figure as served. */
    this._to = this._to ?? 0;
    /** @type {number} Decimal places in use. */
    this._decimals = this._decimals ?? 0;
    /** @type {number} The number currently rendered. */
    this._value = this._value ?? 0;
    /** @type {boolean} Whether a count has finished. */
    this._done = this._done ?? false;
    /** @type {boolean} Whether the served text carries a number at all. */
    this._parsed = this._parsed ?? false;
    /** @type {Intl.NumberFormat|null} Formatter for the frames. */
    this._format = this._format ?? null;
    /** @type {IntersectionObserver|null} The observer, when there is one. */
    this._observer = this._observer ?? null;
    /** @type {number} Pending animation frame. */
    this._frame = this._frame ?? 0;
    /** @type {number} Timestamp of the first frame; `-1` before it arrives. */
    this._start = this._start ?? -1;
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<CountupOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<CountupOptions>} */ (
      /** @type {unknown} */ (super.options)
    );
  }

  /**
   * The number currently rendered.
   *
   * @returns {number} The value on screen.
   */
  get value() {
    return this._value;
  }

  /**
   * Whether the count has finished. A figure that never counts (reduced
   * motion, no observer, no number in the text) is done from the start: what
   * it shows is already the final value.
   *
   * @returns {boolean} `true` when nothing is left to count.
   */
  get done() {
    return this._done;
  }

  /**
   * The figure as served.
   *
   * @returns {number} The target value.
   */
  get to() {
    return this._to;
  }

  /** @returns {void} */
  _setup() {
    const el = this._element;
    this._text = el.textContent ?? "";
    // The served children are kept, never re-parsed: a frame replaces them with
    // a text node and every restore puts the very same nodes back.
    this._served = [...el.childNodes];
    this._frame = 0;
    this._start = -1;
    this._observer = null;

    const locale = langOf(el);
    const parts = parseFigure(this._text, separatorsOf(locale));
    if (!parts) {
      // Nothing to count: the text stays exactly as served.
      this._parsed = false;
      this._done = true;
      this._value = 0;
      this._format = null;
      return;
    }
    this._parsed = true;
    this._prefix = parts.prefix;
    this._suffix = parts.suffix;
    this._to = parts.value;
    this._value = parts.value;
    const asked = Math.trunc(Number(this.options.decimals));
    this._decimals = Number.isFinite(asked) && asked >= 0 ? asked : parts.decimals;
    this._format = new Intl.NumberFormat(locale, {
      minimumFractionDigits: this._decimals,
      maximumFractionDigits: this._decimals,
      useGrouping: this.options.grouping === true,
    });

    if (this._still()) {
      this._done = true;
      return;
    }
    this._done = false;
    if (this.options.autostart) {
      this.start();
      return;
    }
    const view = el.ownerDocument.defaultView;
    const Observer = view ? view.IntersectionObserver : undefined;
    if (typeof Observer !== "function") {
      // No observer: the served figure is already the answer.
      this._done = true;
      return;
    }
    const observer = new Observer((entries) => this._onIntersect(entries), {
      threshold: THRESHOLD,
    });
    this._observer = observer;
    observer.observe(el);
  }

  /** @returns {void} */
  _teardown() {
    this._cancel();
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    this._restore();
    this._value = this._to;
  }

  /**
   * Whether this figure must stay still: reduced motion is a request, not a
   * preference to negotiate.
   *
   * @returns {boolean} `true` when nothing may animate.
   */
  _still() {
    const view = this._element.ownerDocument.defaultView;
    if (!view || typeof view.matchMedia !== "function") return true;
    if (typeof view.requestAnimationFrame !== "function") return true;
    return view.matchMedia("(prefers-reduced-motion: reduce)").matches === true;
  }

  /**
   * Reacts to the observer.
   *
   * @param {IntersectionObserverEntry[]} entries Reported entries.
   * @returns {void}
   */
  _onIntersect(entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      this.start();
      if (this.options.once && this._observer) {
        this._observer.disconnect();
        this._observer = null;
      }
    }
  }

  /**
   * Counts from `from` to the served figure.
   *
   * @returns {void}
   */
  start() {
    if (!this._parsed || this._still()) return;
    const view = this._element.ownerDocument.defaultView;
    if (!view) return;
    this._cancel();
    const from = Number(this.options.from);
    const to = this._to;
    const duration = Math.max(0, Number(this.options.duration));
    emit(this._element, "count", { instance: this, from, to });
    if (duration === 0 || from === to) {
      this._finish();
      return;
    }
    this._done = false;
    this._start = -1;
    this._render(from);
    const step = (/** @type {number} */ now) => {
      if (this._start < 0) this._start = now;
      const elapsed = now - this._start;
      const t = Math.min(1, elapsed / duration);
      if (t >= 1) {
        this._frame = 0;
        this._finish();
        return;
      }
      // Cubic ease-out: fast at first, settling into the final figure.
      const eased = 1 - (1 - t) ** 3;
      this._render(from + (to - from) * eased);
      this._frame = view.requestAnimationFrame(step);
    };
    this._frame = view.requestAnimationFrame(step);
  }

  /**
   * Puts the served figure back so it can count again.
   *
   * @returns {void}
   */
  reset() {
    this._cancel();
    this._restore();
    this._value = this._to;
    this._done = false;
  }

  /**
   * Puts the served nodes back, exactly the ones the page shipped.
   *
   * @returns {void}
   */
  _restore() {
    const el = this._element;
    if (typeof el.replaceChildren === "function") el.replaceChildren(...this._served);
    else el.textContent = this._text;
  }

  /**
   * Writes one frame.
   *
   * @param {number} value Number to render.
   * @returns {void}
   */
  _render(value) {
    this._value = value;
    const format = this._format;
    const shown = format ? format.format(value) : String(value);
    this._element.textContent = `${this._prefix}${shown}${this._suffix}`;
  }

  /**
   * Ends the count on the served text, exactly as it was written.
   *
   * @returns {void}
   */
  _finish() {
    this._restore();
    this._value = this._to;
    this._done = true;
    emit(this._element, "counted", {
      instance: this,
      from: Number(this.options.from),
      to: this._to,
    });
  }

  /**
   * Stops a running count without touching the text.
   *
   * @returns {void}
   */
  _cancel() {
    if (!this._frame) return;
    const view = this._element.ownerDocument.defaultView;
    if (view && typeof view.cancelAnimationFrame === "function") {
      view.cancelAnimationFrame(this._frame);
    }
    this._frame = 0;
    this._start = -1;
  }
}
