/**
 * Carousel: a cinematic slideshow that is already usable without JavaScript.
 *
 * The served HTML is a list of slides inside a horizontally scrollable track
 * with `scroll-snap`, a `<nav>` of anchors pointing at each slide and buttons
 * that stay `hidden` until JavaScript can drive them. `init` promotes the
 * anchors to the APG "tabbed carousel" pattern (`tablist` / `tab` /
 * `tabpanel`), stops the native scrolling through `data-iv-js` and moves the
 * track by `transform` (`slide`) or by opacity (`fade`, `cinema`); `destroy`
 * puts the served markup back, anchors and attributes included.
 *
 * Nothing is ever parsed from a string: the counter and the progress bar are
 * built with `createElement` and `textContent`. Autoplay never starts when the
 * user asked for reduced motion.
 *
 * @module components/carousel
 */

import { IvComponent, isElement } from "../core/component.js";
import { IvError, getInstance } from "../core/registry.js";
import { emit } from "../core/events.js";
import {
  KEY_ARROW_LEFT,
  KEY_ARROW_RIGHT,
  KEY_END,
  KEY_HOME,
} from "../core/keys.js";

/**
 * @typedef {object} CarouselOptions
 * @property {"slide"|"fade"|"cinema"} effect How a slide replaces the previous one.
 * @property {number} autoplay Milliseconds between slides; `0` disables rotation.
 * @property {boolean} loop Whether the ends wrap around.
 * @property {boolean} pauseOnHover Whether pointing at the carousel holds the rotation.
 * @property {boolean} swipe Whether a pointer drag changes slide.
 * @property {number} duration Transition duration in milliseconds.
 * @property {string} pauseText Label of the toggle while the carousel rotates.
 * @property {string} playText Label of the toggle while the carousel is stopped.
 */

/**
 * An anchor of `__dots` and the button that replaced it.
 *
 * @typedef {object} CarouselTab
 * @property {HTMLAnchorElement} anchor The served anchor, kept for `destroy`.
 * @property {HTMLButtonElement} button The generated tab.
 * @property {ChildNode[]} nodes Child nodes the button borrowed from the anchor.
 * @property {number} index Index of the slide the tab controls.
 */

/**
 * A pointer drag in progress.
 *
 * @typedef {object} PointerDrag
 * @property {number} id Pointer id.
 * @property {number} x Horizontal position where the drag started.
 * @property {number} y Vertical position where the drag started.
 * @property {number} lastX Last horizontal position seen while moving.
 * @property {number} lastY Last vertical position seen while moving.
 * @property {boolean} moved Whether at least one move was recorded.
 */

/** @typedef {"next"|"prev"|"tab"|"swipe"|"autoplay"|"api"|"keyboard"} ChangeReason */

const ROOT_SELECTOR = '[data-iv-component="carousel"]';
const VIEWPORT_SELECTOR = ".iv-carousel__viewport";
const TRACK_SELECTOR = ".iv-carousel__track";
const SLIDE_SELECTOR = ".iv-carousel__slide";
const DOTS_SELECTOR = ".iv-carousel__dots";
const PREV_SELECTOR = ".iv-carousel__prev";
const NEXT_SELECTOR = ".iv-carousel__next";
const TOGGLE_SELECTOR = ".iv-carousel__toggle";
const COUNTER_CLASS = "iv-carousel__counter";
const PROGRESS_CLASS = "iv-carousel__progress";
const STATE_ATTR = "data-iv-state";
const RUNNING_STATE = "running";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const EFFECTS = ["slide", "fade", "cinema"];
/** Minimum horizontal travel, in pixels, that counts as a swipe. */
const SWIPE_THRESHOLD = 40;

/** Incremental suffix for generated ids. */
let uid = 0;

/**
 * Tells whether a descendant belongs to this instance and not to a nested one.
 *
 * @param {Element} root Host element.
 * @param {Element} el Candidate descendant.
 * @returns {boolean} `true` when the element is not owned by a nested carousel.
 */
function owns(root, el) {
  const owner = el.closest(ROOT_SELECTOR);
  return owner === null || owner === root;
}

/**
 * First descendant matching a selector that this instance owns.
 *
 * @param {Element} root Host element.
 * @param {string} selector CSS selector.
 * @returns {HTMLElement|null} The element, or `null` when there is none.
 */
function findOwn(root, selector) {
  for (const node of root.querySelectorAll(selector)) {
    if (owns(root, node)) return /** @type {HTMLElement} */ (node);
  }
  return null;
}

/**
 * Two-digit numeral for the counter.
 *
 * @param {number} value Number to pad.
 * @returns {string} The padded numeral.
 */
function pad(value) {
  return value < 10 ? `0${value}` : String(value);
}

/**
 * Carousel component.
 *
 * @augments IvComponent
 */
export class Carousel extends IvComponent {
  /** @type {string} */
  static componentName = "carousel";

  /** @type {Readonly<CarouselOptions>} */
  static defaults = Object.freeze({
    effect: "slide",
    autoplay: 0,
    loop: true,
    pauseOnHover: true,
    swipe: true,
    duration: 600,
    pauseText: "Pause",
    playText: "Play",
  });

  /**
   * Returns the carousel instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {Carousel|undefined} The instance or `undefined`.
   */
  static get(el) {
    const inst = getInstance(el, "carousel");
    return inst instanceof Carousel ? inst : undefined;
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<CarouselOptions>} [options] Options passed in JavaScript.
   * @returns {Carousel} The instance.
   */
  static getOrCreate(el, options) {
    return this.get(el) ?? new Carousel(el, options);
  }

  /**
   * Instantiates every `[data-iv-component="carousel"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {Carousel[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {Carousel[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el A `<section class="iv-carousel">` element.
   * @param {Partial<CarouselOptions>} [options] Options passed in JavaScript.
   * @throws {IvError} `invalid-element` when there is no track or no slide.
   */
  constructor(el, options) {
    if (!isElement(el)) {
      throw new IvError("invalid-element", "Carousel requires an element.");
    }
    const track = findOwn(el, TRACK_SELECTOR);
    if (!track) {
      throw new IvError(
        "invalid-element",
        "Carousel requires an .iv-carousel__track element."
      );
    }
    if (!findOwn(el, SLIDE_SELECTOR)) {
      throw new IvError(
        "invalid-element",
        "Carousel requires at least one .iv-carousel__slide element."
      );
    }
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {HTMLElement} The host element, typed for `style` access. */
    this._root = this._root ?? /** @type {HTMLElement} */ (el);
    /** @type {HTMLElement} The scrollable track. */
    this._track = this._track ?? track;
    /** @type {HTMLElement} The clipping viewport, or the track as a fallback. */
    this._viewport = this._viewport ?? track;
    /** @type {HTMLElement[]} Slides, in document order. */
    this._slides = this._slides ?? [];
    /** @type {CarouselTab[]} Promoted dots, in document order. */
    this._tabs = this._tabs ?? [];
    /** @type {HTMLElement|null} Previous-slide button. */
    this._prev = this._prev ?? null;
    /** @type {HTMLElement|null} Next-slide button. */
    this._next = this._next ?? null;
    /** @type {HTMLElement|null} Play/pause button. */
    this._toggle = this._toggle ?? null;
    /** @type {ChildNode[]|null} Served children of the toggle. */
    this._toggleNodes = this._toggleNodes ?? null;
    /** @type {HTMLElement|null} Generated counter. */
    this._counter = this._counter ?? null;
    /** @type {HTMLElement|null} Generated progress bar. */
    this._progress = this._progress ?? null;
    /** @type {"slide"|"fade"|"cinema"} Resolved effect. */
    this._effect = this._effect ?? "slide";
    /** @type {number} Resolved autoplay interval; `0` when it must not rotate. */
    this._autoplay = this._autoplay ?? 0;
    /** @type {number} Index of the visible slide. */
    this._index = this._index ?? 0;
    /** @type {boolean} Whether the user lets the carousel rotate. */
    this._playing = this._playing ?? false;
    /** @type {boolean} Whether the pointer is over the carousel. */
    this._hover = this._hover ?? false;
    /** @type {boolean} Whether focus is inside the carousel. */
    this._focused = this._focused ?? false;
    /** @type {boolean} Whether the page is hidden. */
    this._hidden = this._hidden ?? false;
    /** @type {ReturnType<typeof setTimeout>|null} Pending autoplay step. */
    this._timer = this._timer ?? null;
    /** @type {PointerDrag|null} Drag in progress. */
    this._drag = this._drag ?? null;
    /** @type {boolean} Whether the click after a swipe must be swallowed. */
    this._swallowClick = this._swallowClick ?? false;
    /** @type {Map<Element, Map<string, string|null>>} Attributes to restore. */
    this._saved = this._saved ?? new Map();
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<CarouselOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<CarouselOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * Index of the visible slide.
   *
   * @returns {number} Zero-based index.
   */
  get index() {
    return this._index;
  }

  /**
   * How many slides the carousel holds.
   *
   * @returns {number} The count.
   */
  get count() {
    return this._slides.length;
  }

  /**
   * Whether the carousel rotates on its own. Pointing at it or moving focus
   * inside holds the rotation without changing this value.
   *
   * @returns {boolean} `true` while autoplay is armed.
   */
  get isPlaying() {
    return this._playing;
  }

  /**
   * The slides, in document order. The array is a copy; the elements are live.
   *
   * @returns {HTMLElement[]} The slides.
   */
  get slides() {
    return this._slides.slice();
  }

  /** @returns {void} */
  _setup() {
    const root = /** @type {HTMLElement} */ (this._element);
    const doc = root.ownerDocument;
    const view = doc.defaultView;
    this._root = root;
    this._saved = new Map();
    this._tabs = [];
    this._slides = [];
    this._toggleNodes = null;
    this._counter = null;
    this._progress = null;
    this._index = 0;
    this._playing = false;
    this._hover = false;
    this._focused = false;
    this._hidden = doc.hidden === true;
    this._timer = null;
    this._drag = null;
    this._swallowClick = false;

    const track = findOwn(root, TRACK_SELECTOR);
    if (!track) return;
    this._track = track;
    this._viewport = findOwn(root, VIEWPORT_SELECTOR) ?? track;

    for (const node of root.querySelectorAll(SLIDE_SELECTOR)) {
      if (owns(root, node)) this._slides.push(/** @type {HTMLElement} */ (node));
    }
    if (this._slides.length === 0) return;

    const raw = String(this.options.effect);
    this._effect = /** @type {"slide"|"fade"|"cinema"} */ (
      EFFECTS.includes(raw) ? raw : "slide"
    );
    const reduced = !!(
      view &&
      typeof view.matchMedia === "function" &&
      view.matchMedia(REDUCED_MOTION).matches
    );
    const wanted = Number(this.options.autoplay);
    this._autoplay =
      reduced || !Number.isFinite(wanted) || wanted <= 0 ? 0 : wanted;

    this._set(root, "data-iv-effect", this._effect);
    this._remember(root, "style");
    root.style.setProperty("--iv-carousel-duration", `${this.options.duration}ms`);
    if (this._autoplay > 0) {
      root.style.setProperty("--iv-carousel-autoplay", `${this._autoplay}ms`);
    }

    this._promoteDots(doc);
    this._describeSlides();

    this._set(this._viewport, "tabindex", "0");

    this._prev = findOwn(root, PREV_SELECTOR);
    this._next = findOwn(root, NEXT_SELECTOR);
    this._toggle = findOwn(root, TOGGLE_SELECTOR);
    if (this._prev) this._unset(this._prev, "hidden");
    if (this._next) this._unset(this._next, "hidden");
    if (this._toggle && this._autoplay > 0) {
      this._unset(this._toggle, "hidden");
      this._toggleNodes = Array.from(this._toggle.childNodes);
    }

    if (this._autoplay > 0) {
      this._counter = doc.createElement("p");
      this._counter.className = COUNTER_CLASS;
      this._counter.setAttribute("aria-hidden", "true");
      this._progress = doc.createElement("div");
      this._progress.className = PROGRESS_CLASS;
      this._viewport.append(this._counter, this._progress);
      this._playing = true;
    }

    this._listen(root, "click", (event) => this._onClick(event));
    const dots = findOwn(root, DOTS_SELECTOR);
    if (dots) this._listen(dots, "keydown", (event) => this._onTabKeydown(event));
    this._listen(this._viewport, "keydown", (event) => this._onKeydown(event));
    if (this.options.pauseOnHover) {
      this._listen(root, "pointerenter", () => this._hold("hover", true));
      this._listen(root, "pointerleave", () => this._hold("hover", false));
    }
    this._listen(root, "focusin", () => this._hold("focus", true));
    this._listen(root, "focusout", (event) => {
      const to = /** @type {FocusEvent} */ (event).relatedTarget;
      this._hold("focus", isElement(to) && root.contains(to));
    });
    this._listen(doc, "visibilitychange", () => {
      this._hold("hidden", doc.hidden === true);
    });
    if (this.options.swipe) {
      // A native drag (images, links) would cancel the pointer sequence before `pointerup`.
      this._listen(this._viewport, "dragstart", (e) => e.preventDefault());
      this._listen(this._viewport, "pointerdown", (e) => this._onPointerDown(e));
      this._listen(this._viewport, "pointermove", (e) => this._onPointerMove(e));
      this._listen(this._viewport, "pointerup", (e) => this._onPointerUp(e));
      this._listen(this._viewport, "pointercancel", () => {
        this._drag = null;
      });
      this._listen(
        this._viewport,
        "click",
        (event) => {
          if (!this._swallowClick) return;
          this._swallowClick = false;
          event.preventDefault();
          event.stopPropagation();
        },
        true
      );
    }

    this._render();
    this._sync();
  }

  /** @returns {void} */
  _teardown() {
    this._clearTimer();
    if (this._counter) this._counter.remove();
    if (this._progress) this._progress.remove();
    this._counter = null;
    this._progress = null;
    if (this._toggle && this._toggleNodes) {
      this._toggle.replaceChildren(...this._toggleNodes);
    }
    this._toggleNodes = null;
    for (const tab of this._tabs) {
      tab.anchor.append(...tab.nodes);
      tab.button.replaceWith(tab.anchor);
    }
    this._tabs = [];
    for (const [el, attributes] of this._saved) {
      for (const [name, value] of attributes) {
        if (value === null) el.removeAttribute(name);
        else el.setAttribute(name, value);
      }
    }
    this._saved.clear();
  }

  /**
   * Replaces every dot anchor pointing at a slide with a real tab button.
   *
   * @param {Document} doc Owner document.
   * @returns {void}
   */
  _promoteDots(doc) {
    const root = this._root;
    const dots = findOwn(root, DOTS_SELECTOR);
    if (!dots) return;
    this._set(dots, "role", "tablist");
    // The slides become tab panels, so the list that holds them stops being a list.
    this._set(this._track, "role", "presentation");
    for (const node of Array.from(dots.querySelectorAll("a[href]"))) {
      const anchor = /** @type {HTMLAnchorElement} */ (node);
      if (!owns(root, anchor)) continue;
      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("#")) continue;
      const index = this._slides.findIndex((slide) => slide.id === href.slice(1));
      if (index < 0) continue;
      const button = doc.createElement("button");
      for (const attribute of Array.from(anchor.attributes)) {
        if (attribute.name === "href") continue;
        button.setAttribute(attribute.name, attribute.value);
      }
      button.type = "button";
      const nodes = Array.from(anchor.childNodes);
      button.append(...nodes);
      if (!button.id) button.id = `iv-carousel-tab-${++uid}`;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", this._slides[index].id);
      anchor.replaceWith(button);
      this._tabs.push({ anchor, button, nodes, index });
    }
  }

  /**
   * Gives every slide its panel semantics.
   *
   * @returns {void}
   */
  _describeSlides() {
    const total = this._slides.length;
    this._slides.forEach((slide, index) => {
      if (!slide.id) this._set(slide, "id", `iv-carousel-slide-${++uid}`);
      this._set(slide, "role", "tabpanel");
      this._set(slide, "aria-roledescription", "slide");
      this._set(slide, "aria-label", `${index + 1} of ${total}`);
      const tab = this._tabs.find((candidate) => candidate.index === index);
    });
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
   * Paints the current index: panels, tabs, counter, controls and live region.
   *
   * @returns {void}
   */
  _render() {
    const root = this._root;
    root.style.setProperty("--iv-carousel-index", String(this._index));
    const stacked = this._effect !== "slide";
    this._slides.forEach((slide, index) => {
      if (!stacked) return;
      if (index === this._index) {
        this._unset(slide, "aria-hidden");
        this._unset(slide, "inert");
      } else {
        this._set(slide, "aria-hidden", "true");
        this._set(slide, "inert", "");
      }
    });
    for (const tab of this._tabs) {
      const active = tab.index === this._index;
      tab.button.setAttribute("aria-selected", active ? "true" : "false");
      tab.button.setAttribute("tabindex", active ? "0" : "-1");
    }
    if (this._counter) {
      this._counter.textContent = `${pad(this._index + 1)} / ${pad(this._slides.length)}`;
    }
    const edge = this._slides.length - 1;
    const loop = this.options.loop === true;
    if (this._prev) this._enable(this._prev, loop || this._index > 0);
    if (this._next) this._enable(this._next, loop || this._index < edge);
    this._set(this._viewport, "aria-live", this._armed() ? "off" : "polite");
    this._renderToggle();
    // The browser may scroll the track or the viewport when focus lands inside
    // a slide that is out of view; the transform is the only source of truth.
    if (this._track.scrollLeft !== 0) this._track.scrollLeft = 0;
    if (this._viewport.scrollLeft !== 0) this._viewport.scrollLeft = 0;
  }

  /**
   * Writes the label and the pressed state of the play/pause button.
   *
   * @returns {void}
   */
  _renderToggle() {
    const toggle = this._toggle;
    if (!toggle || this._autoplay <= 0) return;
    const label = this._playing ? this.options.pauseText : this.options.playText;
    toggle.textContent = String(label);
    // Pressed means "the rotation is held"; the label names the next action.
    this._set(toggle, "aria-pressed", this._playing ? "false" : "true");
  }

  /**
   * Enables or disables a control, remembering what the author served.
   *
   * @param {HTMLElement} button Control to update.
   * @param {boolean} enabled Whether the control can be used.
   * @returns {void}
   */
  _enable(button, enabled) {
    if (enabled) this._unset(button, "disabled");
    else this._set(button, "disabled", "");
  }

  /**
   * Whether autoplay is configured and the user has not stopped it.
   *
   * @returns {boolean} `true` when the carousel wants to rotate.
   */
  _armed() {
    return this._playing && this._autoplay > 0;
  }

  /**
   * Whether something transient (pointer, focus, hidden page) holds it back.
   *
   * @returns {boolean} `true` while the rotation is held.
   */
  _held() {
    return this._hover || this._focused || this._hidden;
  }

  /**
   * Records a transient hold and re-synchronises the timer.
   *
   * @param {"hover"|"focus"|"hidden"} kind Source of the hold.
   * @param {boolean} on Whether the hold applies.
   * @returns {void}
   */
  _hold(kind, on) {
    if (kind === "hover") this._hover = on;
    else if (kind === "focus") this._focused = on;
    else this._hidden = on;
    this._sync();
  }

  /**
   * Aligns the autoplay timer and the progress animation with the state.
   *
   * @returns {void}
   */
  _sync() {
    this._clearTimer();
    const rotating = this._armed() && !this._held();
    // Only carousels that rotate own the play state: a `cinema` carousel
    // without autoplay must keep its Ken Burns pan running.
    if (this._autoplay > 0) {
      this._root.style.setProperty(
        "--iv-carousel-play",
        rotating ? "running" : "paused"
      );
    }
    if (this._progress) {
      if (rotating) {
        this._progress.removeAttribute(STATE_ATTR);
        // Reading a layout property restarts the animation from zero.
        void this._progress.offsetWidth;
        this._progress.setAttribute(STATE_ATTR, RUNNING_STATE);
      } else if (!this._playing) {
        this._progress.removeAttribute(STATE_ATTR);
      }
    }
    if (!rotating) return;
    this._timer = setTimeout(() => {
      this._timer = null;
      this._step(1, "autoplay");
    }, this._autoplay);
  }

  /**
   * Drops the pending autoplay step.
   *
   * @returns {void}
   */
  _clearTimer() {
    if (this._timer === null) return;
    clearTimeout(this._timer);
    this._timer = null;
  }

  /**
   * An explicit interaction stops the rotation for good: it only comes back
   * when the reader presses the toggle.
   *
   * @returns {void}
   */
  _interaction() {
    if (this._playing) this.pause("interaction");
  }

  /**
   * Moves `delta` slides away, wrapping when `loop` allows it.
   *
   * @param {number} delta Offset, usually `1` or `-1`.
   * @param {ChangeReason} reason Why the carousel moves.
   * @returns {void}
   */
  _step(delta, reason) {
    const count = this._slides.length;
    if (count === 0) return;
    let target = this._index + delta;
    if (this.options.loop === true) target = ((target % count) + count) % count;
    this.goTo(target, reason);
  }

  /**
   * Handles clicks on the controls and on the tabs.
   *
   * @param {Event} event Click event.
   * @returns {void}
   */
  _onClick(event) {
    const target = event.target;
    if (!isElement(target)) return;
    if (this._prev && this._prev.contains(target)) {
      event.preventDefault();
      this._interaction();
      this._step(-1, "prev");
      return;
    }
    if (this._next && this._next.contains(target)) {
      event.preventDefault();
      this._interaction();
      this._step(1, "next");
      return;
    }
    if (this._toggle && this._toggle.contains(target)) {
      event.preventDefault();
      if (this._playing) this.pause("trigger");
      else this.play("trigger");
      return;
    }
    const button = target.closest("button");
    const tab = button
      ? this._tabs.find((candidate) => candidate.button === button)
      : undefined;
    if (!tab) return;
    event.preventDefault();
    this._interaction();
    this.goTo(tab.index, "tab");
  }

  /**
   * Roving focus inside the tablist. Enter and Space are the native activation
   * of the buttons, so they need no code here.
   *
   * @param {Event} event Keydown event.
   * @returns {void}
   */
  _onTabKeydown(event) {
    const target = event.target;
    if (!isElement(target)) return;
    const button = target.closest("button");
    const current = this._tabs.findIndex(
      (candidate) => candidate.button === button
    );
    if (current < 0) return;
    const last = this._tabs.length - 1;
    const key = /** @type {KeyboardEvent} */ (event).key;
    let next = -1;
    if (key === KEY_ARROW_RIGHT) next = current === last ? 0 : current + 1;
    else if (key === KEY_ARROW_LEFT) next = current === 0 ? last : current - 1;
    else if (key === KEY_HOME) next = 0;
    else if (key === KEY_END) next = last;
    else return;
    event.preventDefault();
    this._interaction();
    const tab = this._tabs[next];
    this.goTo(tab.index, "keyboard");
    tab.button.focus();
  }

  /**
   * Arrow keys on the viewport, which is focusable.
   *
   * @param {Event} event Keydown event.
   * @returns {void}
   */
  _onKeydown(event) {
    const target = event.target;
    if (target !== this._viewport) return;
    const key = /** @type {KeyboardEvent} */ (event).key;
    if (key === KEY_ARROW_RIGHT) this._after(event, () => this._step(1, "keyboard"));
    else if (key === KEY_ARROW_LEFT) this._after(event, () => this._step(-1, "keyboard"));
    else if (key === KEY_HOME) this._after(event, () => this.goTo(0, "keyboard"));
    else if (key === KEY_END) {
      this._after(event, () => this.goTo(this._slides.length - 1, "keyboard"));
    }
  }

  /**
   * Cancels the default of a key and runs an explicit interaction.
   *
   * @param {Event} event Event to cancel.
   * @param {() => void} action What the key does.
   * @returns {void}
   */
  _after(event, action) {
    event.preventDefault();
    this._interaction();
    action();
  }

  /**
   * Starts tracking a drag.
   *
   * @param {Event} event Pointer event.
   * @returns {void}
   */
  _onPointerDown(event) {
    const pointer = /** @type {PointerEvent} */ (event);
    if (typeof pointer.button === "number" && pointer.button > 0) return;
    this._swallowClick = false;
    this._drag = {
      id: pointer.pointerId,
      x: pointer.clientX,
      y: pointer.clientY,
      lastX: pointer.clientX,
      lastY: pointer.clientY,
      moved: false,
    };
    const viewport = /** @type {Element} */ (this._viewport);
    if (typeof viewport.setPointerCapture !== "function") return;
    try {
      viewport.setPointerCapture(pointer.pointerId);
    } catch {
      // Pointer capture is an optimisation; the gesture works without it.
    }
  }

  /**
   * Remembers where the pointer travelled.
   *
   * @param {Event} event Pointer event.
   * @returns {void}
   */
  _onPointerMove(event) {
    const drag = this._drag;
    if (!drag) return;
    const pointer = /** @type {PointerEvent} */ (event);
    drag.lastX = pointer.clientX;
    drag.lastY = pointer.clientY;
    drag.moved = true;
  }

  /**
   * Turns a horizontal drag longer than the threshold into a slide change.
   *
   * @param {Event} event Pointer event.
   * @returns {void}
   */
  _onPointerUp(event) {
    const drag = this._drag;
    if (!drag) return;
    this._drag = null;
    const pointer = /** @type {PointerEvent} */ (event);
    const viewport = /** @type {Element} */ (this._viewport);
    if (typeof viewport.releasePointerCapture === "function") {
      try {
        viewport.releasePointerCapture(drag.id);
      } catch {
        // The capture was never taken; nothing to release.
      }
    }
    const x = drag.moved ? drag.lastX : pointer.clientX;
    const y = drag.moved ? drag.lastY : pointer.clientY;
    const dx = x - drag.x;
    const dy = y - drag.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
    this._swallowClick = true;
    this._interaction();
    this._step(dx < 0 ? 1 : -1, "swipe");
  }

  /**
   * Shows a slide. Emits the cancelable `iv:change` first and `iv:changed`
   * afterwards.
   *
   * @param {number} index Zero-based index; wrapped when `loop` is on.
   * @param {ChangeReason} [reason] Why the carousel moves.
   * @returns {void}
   */
  goTo(index, reason = "api") {
    const count = this._slides.length;
    if (count === 0) return;
    let target = Math.trunc(Number(index));
    if (!Number.isFinite(target)) return;
    if (this.options.loop === true) target = ((target % count) + count) % count;
    else target = Math.min(Math.max(target, 0), count - 1);
    if (target === this._index) return;
    const previousIndex = this._index;
    const detail = { instance: this, index: target, previousIndex, reason };
    if (!emit(this._root, "change", detail, { cancelable: true })) return;
    this._index = target;
    this._render();
    this._sync();
    emit(this._root, "changed", {
      instance: this,
      index: target,
      previousIndex,
      reason,
    });
  }

  /**
   * Shows the next slide.
   *
   * @returns {void}
   */
  next() {
    this._step(1, "next");
  }

  /**
   * Shows the previous slide.
   *
   * @returns {void}
   */
  prev() {
    this._step(-1, "prev");
  }

  /**
   * Starts the rotation. Does nothing when there is no autoplay interval or
   * when the reader asked for reduced motion.
   *
   * @param {string} [reason] Why the rotation starts.
   * @returns {void}
   */
  play(reason = "api") {
    if (this._autoplay <= 0 || this._playing) return;
    this._playing = true;
    this._renderToggle();
    this._set(this._viewport, "aria-live", "off");
    this._sync();
    emit(this._root, "play", { instance: this, reason });
  }

  /**
   * Stops the rotation until the reader asks for it again.
   *
   * @param {string} [reason] Why the rotation stops.
   * @returns {void}
   */
  pause(reason = "api") {
    if (!this._playing) return;
    this._playing = false;
    this._renderToggle();
    this._set(this._viewport, "aria-live", "polite");
    this._sync();
    emit(this._root, "pause", { instance: this, reason });
  }
}
