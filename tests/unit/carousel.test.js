// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Carousel } from "../../packages/ivolt/src/js/components/carousel.js";
import { IvError } from "../../packages/ivolt/src/js/core/registry.js";

/**
 * Builds the served markup of a carousel.
 *
 * @param {string} [attributes] Extra attributes for the root element.
 * @returns {string} The markup.
 */
function markup(attributes = "") {
  return `
  <section id="c1" class="iv-carousel" data-iv-component="carousel" aria-roledescription="carousel" aria-label="Sample slides, made up for the tests"${attributes}>
    <div class="iv-carousel__viewport">
      <ul class="iv-carousel__track">
        <li class="iv-carousel__slide" id="s1"><figure class="iv-carousel__media"></figure><span class="iv-carousel__scrim" aria-hidden="true"></span><div class="iv-carousel__caption"><h3>One</h3></div></li>
        <li class="iv-carousel__slide" id="s2"><figure class="iv-carousel__media"></figure><span class="iv-carousel__scrim" aria-hidden="true"></span><div class="iv-carousel__caption"><h3>Two</h3></div></li>
        <li class="iv-carousel__slide" id="s3"><figure class="iv-carousel__media"></figure><span class="iv-carousel__scrim" aria-hidden="true"></span><div class="iv-carousel__caption"><h3>Three</h3></div></li>
      </ul>
    </div>
    <nav class="iv-carousel__dots" aria-label="Slides">
      <a href="#s1"><span class="iv-u-sr-only">Slide 1: One</span></a>
      <a href="#s2"><span class="iv-u-sr-only">Slide 2: Two</span></a>
      <a href="#s3"><span class="iv-u-sr-only">Slide 3: Three</span></a>
    </nav>
    <div class="iv-carousel__controls">
      <button class="iv-button iv-carousel__prev" type="button" aria-label="Previous slide" hidden>P</button>
      <button class="iv-button iv-carousel__next" type="button" aria-label="Next slide" hidden>N</button>
      <button class="iv-button iv-carousel__toggle" type="button" hidden>Pause</button>
    </div>
  </section>
`;
}

/**
 * Puts a carousel in the document.
 *
 * @param {string} [attributes] Extra attributes for the root element.
 * @returns {HTMLElement} The root element.
 */
function mount(attributes = "") {
  document.body.innerHTML = markup(attributes);
  return /** @type {HTMLElement} */ (document.getElementById("c1"));
}

/**
 * Tab buttons of a carousel, in document order.
 *
 * @param {HTMLElement} root Host element.
 * @returns {HTMLElement[]} The buttons.
 */
function tabs(root) {
  return /** @type {HTMLElement[]} */ ([
    ...root.querySelectorAll('[role="tab"]'),
  ]);
}

/**
 * Dispatches a keydown.
 *
 * @param {Element} target Element that receives the key.
 * @param {string} key `KeyboardEvent.key` value.
 * @returns {KeyboardEvent} The dispatched event.
 */
function press(target, key) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

/**
 * Dispatches a pointer gesture made of three events.
 *
 * @param {Element} target Element that receives the gesture.
 * @param {number} from Horizontal start, in pixels.
 * @param {number} to Horizontal end, in pixels.
 * @param {number} [dy] Vertical travel, in pixels.
 * @returns {void}
 */
function swipe(target, from, to, dy = 0) {
  for (const [type, x, y] of [
    ["pointerdown", from, 0],
    ["pointermove", to, dy],
    ["pointerup", to, dy],
  ]) {
    target.dispatchEvent(
      new MouseEvent(/** @type {string} */ (type), {
        clientX: /** @type {number} */ (x),
        clientY: /** @type {number} */ (y),
        bubbles: true,
        cancelable: true,
      })
    );
  }
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("Carousel: progressive enhancement", () => {
  it("promotes the dot anchors to tabs and describes every slide", () => {
    const root = mount();
    const carousel = new Carousel(root);
    const dots = /** @type {HTMLElement} */ (
      root.querySelector(".iv-carousel__dots")
    );
    expect(dots.getAttribute("role")).toBe("tablist");
    expect(dots.querySelectorAll("a")).toHaveLength(0);
    const buttons = tabs(root);
    expect(buttons).toHaveLength(3);
    expect(buttons[0].getAttribute("aria-controls")).toBe("s1");
    expect(buttons[0].getAttribute("aria-selected")).toBe("true");
    expect(buttons[0].getAttribute("tabindex")).toBe("0");
    expect(buttons[1].getAttribute("aria-selected")).toBe("false");
    expect(buttons[1].getAttribute("tabindex")).toBe("-1");
    expect(buttons[0].textContent).toBe("Slide 1: One");

    const slides = carousel.slides;
    expect(slides).toHaveLength(3);
    expect(slides[1].getAttribute("role")).toBe("tabpanel");
    expect(slides[1].getAttribute("aria-roledescription")).toBe("slide");
    expect(slides[1].getAttribute("aria-label")).toBe("2 of 3");
    expect(slides[1].getAttribute("aria-labelledby")).toBeNull(); // the "n of N" label is the accessible name
    expect(root.getAttribute("data-iv-effect")).toBe("slide");
    expect(root.style.getPropertyValue("--iv-carousel-index")).toBe("0");
    carousel.destroy();
  });

  it("shows the controls only when they do something", () => {
    const root = mount();
    const carousel = new Carousel(root);
    expect(root.querySelector(".iv-carousel__prev")?.hasAttribute("hidden")).toBe(false);
    expect(root.querySelector(".iv-carousel__next")?.hasAttribute("hidden")).toBe(false);
    // No autoplay: a play/pause button would have nothing to toggle.
    expect(root.querySelector(".iv-carousel__toggle")?.hasAttribute("hidden")).toBe(true);
    expect(root.querySelector(".iv-carousel__counter")).toBe(null);
    expect(root.querySelector(".iv-carousel__progress")).toBe(null);
    carousel.destroy();
  });

  it("restores the served markup exactly, after navigating", () => {
    const root = mount();
    const before = root.innerHTML;
    const carousel = new Carousel(root);
    carousel.next();
    carousel.goTo(2);
    carousel.prev();
    carousel.destroy();
    expect(root.innerHTML).toBe(before);
    expect(root.hasAttribute("data-iv-effect")).toBe(false);
    expect(root.hasAttribute("style")).toBe(false);
  });

  it("restores the served markup exactly with autoplay running", () => {
    vi.useFakeTimers();
    const root = mount(' data-iv-autoplay="3000"');
    const before = root.innerHTML;
    const carousel = new Carousel(root);
    vi.advanceTimersByTime(3100);
    expect(carousel.index).toBe(1);
    carousel.destroy();
    expect(root.innerHTML).toBe(before);
    vi.advanceTimersByTime(9000);
    expect(carousel.index).toBe(1);
  });

  it("rejects a carousel without a track or without slides", () => {
    document.body.innerHTML = `<section id="bad" class="iv-carousel" data-iv-component="carousel"><p>Nothing</p></section>`;
    const bare = /** @type {HTMLElement} */ (document.getElementById("bad"));
    expect(() => new Carousel(bare)).toThrow(IvError);
    try {
      new Carousel(bare);
    } catch (error) {
      expect(/** @type {IvError} */ (error).code).toBe("invalid-element");
    }
    document.body.innerHTML = `<section id="empty" class="iv-carousel" data-iv-component="carousel"><div class="iv-carousel__viewport"><ul class="iv-carousel__track"></ul></div></section>`;
    const empty = /** @type {HTMLElement} */ (document.getElementById("empty"));
    expect(() => new Carousel(empty)).toThrow(IvError);
  });
});

describe("Carousel: navigation", () => {
  it("moves with goTo, next, prev and wraps when loop is on", () => {
    const root = mount();
    const carousel = new Carousel(root);
    expect(carousel.count).toBe(3);
    carousel.next();
    expect(carousel.index).toBe(1);
    carousel.goTo(2);
    expect(carousel.index).toBe(2);
    carousel.next();
    expect(carousel.index).toBe(0);
    carousel.prev();
    expect(carousel.index).toBe(2);
    expect(tabs(root)[2].getAttribute("aria-selected")).toBe("true");
    expect(root.style.getPropertyValue("--iv-carousel-index")).toBe("2");
    carousel.destroy();
  });

  it("clamps and disables the controls when loop is off", () => {
    const root = mount(' data-iv-loop="false"');
    const carousel = new Carousel(root);
    const prev = /** @type {HTMLElement} */ (root.querySelector(".iv-carousel__prev"));
    const next = /** @type {HTMLElement} */ (root.querySelector(".iv-carousel__next"));
    expect(prev.hasAttribute("disabled")).toBe(true);
    expect(next.hasAttribute("disabled")).toBe(false);
    carousel.prev();
    expect(carousel.index).toBe(0);
    carousel.goTo(9);
    expect(carousel.index).toBe(2);
    expect(next.hasAttribute("disabled")).toBe(true);
    carousel.destroy();
    expect(prev.hasAttribute("disabled")).toBe(false);
  });

  it("emits a cancelable iv:change followed by iv:changed", () => {
    const root = mount();
    const carousel = new Carousel(root);
    /** @type {string[]} */
    const seen = [];
    root.addEventListener("iv:change", (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      seen.push(`change:${detail.previousIndex}->${detail.index}:${detail.reason}`);
    });
    root.addEventListener("iv:changed", (event) => {
      seen.push(`changed:${/** @type {CustomEvent} */ (event).detail.index}`);
    });
    carousel.next();
    expect(seen).toEqual(["change:0->1:next", "changed:1"]);

    root.addEventListener("iv:change", (event) => event.preventDefault(), { once: true });
    seen.length = 0;
    carousel.next();
    expect(carousel.index).toBe(1);
    expect(seen).toEqual(["change:1->2:next"]);
    carousel.destroy();
  });

  it("navigates from the controls and from the tabs", () => {
    const root = mount();
    const carousel = new Carousel(root);
    /** @type {string[]} */
    const reasons = [];
    root.addEventListener("iv:changed", (event) => {
      reasons.push(/** @type {CustomEvent} */ (event).detail.reason);
    });
    /** @type {HTMLElement} */ (root.querySelector(".iv-carousel__next")).click();
    expect(carousel.index).toBe(1);
    /** @type {HTMLElement} */ (root.querySelector(".iv-carousel__prev")).click();
    expect(carousel.index).toBe(0);
    tabs(root)[2].click();
    expect(carousel.index).toBe(2);
    expect(reasons).toEqual(["next", "prev", "tab"]);
    carousel.destroy();
  });

  it("answers the arrow keys in the tablist and in the viewport", () => {
    const root = mount();
    const carousel = new Carousel(root);
    const buttons = tabs(root);
    const event = press(buttons[0], "ArrowRight");
    expect(event.defaultPrevented).toBe(true);
    expect(carousel.index).toBe(1);
    expect(document.activeElement).toBe(buttons[1]);
    press(buttons[1], "ArrowLeft");
    expect(carousel.index).toBe(0);
    press(buttons[0], "ArrowLeft");
    expect(carousel.index).toBe(2);
    press(buttons[2], "Home");
    expect(carousel.index).toBe(0);
    press(buttons[0], "End");
    expect(carousel.index).toBe(2);

    const viewport = /** @type {HTMLElement} */ (
      root.querySelector(".iv-carousel__viewport")
    );
    expect(viewport.getAttribute("tabindex")).toBe("0");
    press(viewport, "Home");
    expect(carousel.index).toBe(0);
    press(viewport, "ArrowRight");
    expect(carousel.index).toBe(1);
    press(viewport, "ArrowLeft");
    expect(carousel.index).toBe(0);
    press(viewport, "End");
    expect(carousel.index).toBe(2);
    expect(press(viewport, "PageDown").defaultPrevented).toBe(false);
    carousel.destroy();
  });

  it("changes slide on a long horizontal drag and swallows the click", () => {
    const root = mount();
    const carousel = new Carousel(root);
    const viewport = /** @type {HTMLElement} */ (
      root.querySelector(".iv-carousel__viewport")
    );
    /** @type {string[]} */
    const reasons = [];
    root.addEventListener("iv:changed", (event) => {
      reasons.push(/** @type {CustomEvent} */ (event).detail.reason);
    });
    swipe(viewport, 300, 200);
    expect(carousel.index).toBe(1);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    viewport.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    swipe(viewport, 200, 300);
    expect(carousel.index).toBe(0);
    swipe(viewport, 200, 175);
    expect(carousel.index).toBe(0);
    swipe(viewport, 300, 200, 140);
    expect(carousel.index).toBe(0);
    expect(reasons).toEqual(["swipe", "swipe"]);
    carousel.destroy();
  });

  it("ignores the gesture when swipe is off", () => {
    const root = mount(' data-iv-swipe="false"');
    const carousel = new Carousel(root);
    swipe(
      /** @type {HTMLElement} */ (root.querySelector(".iv-carousel__viewport")),
      300,
      200
    );
    expect(carousel.index).toBe(0);
    carousel.destroy();
  });
});

describe("Carousel: autoplay", () => {
  it("rotates on its own and drives the counter and the progress bar", () => {
    vi.useFakeTimers();
    const root = mount(' data-iv-autoplay="4000"');
    const carousel = new Carousel(root);
    const counter = /** @type {HTMLElement} */ (
      root.querySelector(".iv-carousel__counter")
    );
    const progress = /** @type {HTMLElement} */ (
      root.querySelector(".iv-carousel__progress")
    );
    expect(counter.getAttribute("aria-hidden")).toBe("true");
    expect(counter.textContent).toBe("01 / 03");
    expect(progress.getAttribute("data-iv-state")).toBe("running");
    expect(root.style.getPropertyValue("--iv-carousel-autoplay")).toBe("4000ms");
    const viewport = /** @type {HTMLElement} */ (
      root.querySelector(".iv-carousel__viewport")
    );
    expect(viewport.getAttribute("aria-live")).toBe("off");
    expect(carousel.isPlaying).toBe(true);

    /** @type {string[]} */
    const reasons = [];
    root.addEventListener("iv:changed", (event) => {
      reasons.push(/** @type {CustomEvent} */ (event).detail.reason);
    });
    vi.advanceTimersByTime(4000);
    expect(carousel.index).toBe(1);
    expect(counter.textContent).toBe("02 / 03");
    vi.advanceTimersByTime(8000);
    expect(carousel.index).toBe(0);
    expect(reasons).toEqual(["autoplay", "autoplay", "autoplay"]);
    carousel.destroy();
  });

  it("pauses from the toggle, reflects aria-pressed and emits iv:play and iv:pause", () => {
    vi.useFakeTimers();
    const root = mount(' data-iv-autoplay="4000"');
    const carousel = new Carousel(root);
    const toggle = /** @type {HTMLElement} */ (
      root.querySelector(".iv-carousel__toggle")
    );
    const viewport = /** @type {HTMLElement} */ (
      root.querySelector(".iv-carousel__viewport")
    );
    /** @type {string[]} */
    const events = [];
    for (const type of ["iv:play", "iv:pause"]) {
      root.addEventListener(type, (event) => {
        events.push(`${type}:${/** @type {CustomEvent} */ (event).detail.reason}`);
      });
    }
    expect(toggle.hasAttribute("hidden")).toBe(false);
    expect(toggle.textContent).toBe("Pause");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    toggle.click();
    expect(carousel.isPlaying).toBe(false);
    expect(toggle.textContent).toBe("Play");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(viewport.getAttribute("aria-live")).toBe("polite");
    expect(
      root.querySelector(".iv-carousel__progress")?.hasAttribute("data-iv-state")
    ).toBe(false);
    vi.advanceTimersByTime(20000);
    expect(carousel.index).toBe(0);

    toggle.click();
    expect(carousel.isPlaying).toBe(true);
    expect(toggle.textContent).toBe("Pause");
    vi.advanceTimersByTime(4000);
    expect(carousel.index).toBe(1);
    expect(events).toEqual(["iv:pause:trigger", "iv:play:trigger"]);
    carousel.destroy();
  });

  it("stops for good after an explicit interaction", () => {
    vi.useFakeTimers();
    const root = mount(' data-iv-autoplay="4000"');
    const carousel = new Carousel(root);
    /** @type {HTMLElement} */ (root.querySelector(".iv-carousel__next")).click();
    expect(carousel.index).toBe(1);
    expect(carousel.isPlaying).toBe(false);
    vi.advanceTimersByTime(20000);
    expect(carousel.index).toBe(1);
    carousel.destroy();
  });

  it("holds while the pointer is over it, while focus is inside and while the page is hidden", () => {
    vi.useFakeTimers();
    const root = mount(' data-iv-autoplay="4000"');
    const carousel = new Carousel(root);

    root.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(12000);
    expect(carousel.index).toBe(0);
    expect(carousel.isPlaying).toBe(true);
    root.dispatchEvent(new Event("pointerleave"));
    vi.advanceTimersByTime(4000);
    expect(carousel.index).toBe(1);

    root.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    vi.advanceTimersByTime(12000);
    expect(carousel.index).toBe(1);
    root.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    vi.advanceTimersByTime(4000);
    expect(carousel.index).toBe(2);

    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(12000);
    expect(carousel.index).toBe(2);
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(4000);
    expect(carousel.index).toBe(0);
    carousel.destroy();
  });

  it("never rotates when the reader asked for reduced motion", () => {
    vi.useFakeTimers();
    const original = window.matchMedia;
    // @ts-expect-error jsdom does not implement matchMedia; the component guards for it.
    window.matchMedia = (query) => ({ matches: query.includes("reduced-motion") });
    const root = mount(' data-iv-autoplay="4000"');
    const carousel = new Carousel(root);
    expect(carousel.isPlaying).toBe(false);
    expect(root.querySelector(".iv-carousel__progress")).toBe(null);
    expect(root.querySelector(".iv-carousel__counter")).toBe(null);
    expect(root.querySelector(".iv-carousel__toggle")?.hasAttribute("hidden")).toBe(true);
    carousel.play();
    vi.advanceTimersByTime(20000);
    expect(carousel.index).toBe(0);
    carousel.destroy();
    // @ts-expect-error restoring the jsdom default, which is undefined.
    window.matchMedia = original;
  });
});

describe("Carousel: options and effects", () => {
  it("hides the slides that are not on screen with fade", () => {
    const root = mount(' data-iv-effect="fade"');
    const carousel = new Carousel(root);
    const slides = carousel.slides;
    expect(slides[0].hasAttribute("aria-hidden")).toBe(false);
    expect(slides[0].hasAttribute("inert")).toBe(false);
    expect(slides[1].getAttribute("aria-hidden")).toBe("true");
    expect(slides[1].hasAttribute("inert")).toBe(true);
    carousel.goTo(1);
    expect(slides[0].getAttribute("aria-hidden")).toBe("true");
    expect(slides[1].hasAttribute("aria-hidden")).toBe(false);
    carousel.destroy();
    expect(slides[1].hasAttribute("inert")).toBe(false);
    expect(slides[1].hasAttribute("aria-hidden")).toBe(false);
  });

  it("keeps only the visible slide reachable with slide, the default effect (ADR-034)", () => {
    const root = mount();
    const carousel = new Carousel(root);
    expect(carousel.slides[0].hasAttribute("inert")).toBe(false);
    expect(carousel.slides.slice(1).every((slide) => slide.hasAttribute("inert"))).toBe(true);
    carousel.goTo(2);
    expect(carousel.slides[2].hasAttribute("inert")).toBe(false);
    expect(carousel.slides[0].getAttribute("aria-hidden")).toBe("true");
    carousel.destroy();
    expect(carousel.slides.some((slide) => slide.hasAttribute("inert") || slide.hasAttribute("aria-hidden"))).toBe(false);
  });

  it("resolves options as defaults, then attributes, then JavaScript", () => {
    const root = mount(' data-iv-effect="fade" data-iv-duration="300" data-iv-pause-text="Hold"');
    const carousel = new Carousel(root, { effect: "cinema" });
    expect(carousel.options.effect).toBe("cinema");
    expect(carousel.options.duration).toBe(300);
    expect(carousel.options.pauseText).toBe("Hold");
    expect(carousel.options.loop).toBe(true);
    expect(root.getAttribute("data-iv-effect")).toBe("cinema");
    expect(root.style.getPropertyValue("--iv-carousel-duration")).toBe("300ms");
    carousel.destroy();
    expect(root.getAttribute("data-iv-effect")).toBe("fade");
  });

  it("falls back to slide when the effect is not one of the three", () => {
    const root = mount(' data-iv-effect="zoom"');
    const carousel = new Carousel(root);
    expect(root.getAttribute("data-iv-effect")).toBe("slide");
    expect(carousel.slides[1].hasAttribute("inert")).toBe(true);
    carousel.destroy();
  });

  it("is idempotent through initAll and get", () => {
    const root = mount();
    const created = Carousel.initAll(document);
    expect(created).toHaveLength(1);
    expect(Carousel.initAll(document)).toHaveLength(0);
    expect(Carousel.get(root)).toBe(created[0]);
    expect(Carousel.getOrCreate(root)).toBe(created[0]);
    created[0].destroy();
    expect(Carousel.get(root)).toBe(undefined);
  });

  it("prevents native drags inside the viewport so swipes complete", () => {
    const root = mount();
    new Carousel(root);
    const viewport = root.querySelector(".iv-carousel__viewport");
    const drag = new Event("dragstart", { bubbles: true, cancelable: true });
    viewport.querySelector(".iv-carousel__slide").dispatchEvent(drag);
    expect(drag.defaultPrevented).toBe(true);
  });

  it("gives the track a presentation role while the slides are panels, and restores it", () => {
    const root = mount();
    const c = new Carousel(root);
    const track = root.querySelector(".iv-carousel__track");
    expect(track.getAttribute("role")).toBe("presentation");
    c.destroy();
    expect(track.getAttribute("role")).toBeNull();
  });
});

// Configurable strings (API_CONTRACT §5.2b, v0.9).
describe("Carousel: slideText and counterText", () => {
  it("labels every slide with {index} and {total}, from the default and from the attribute", () => {
    const root = mount();
    const carousel = new Carousel(root);
    const labels = () =>
      [...root.querySelectorAll(".iv-carousel__slide")].map((s) => s.getAttribute("aria-label"));
    expect(labels()).toEqual(["1 of 3", "2 of 3", "3 of 3"]);
    carousel.destroy();
    expect(labels()).toEqual([null, null, null]);

    root.setAttribute("data-iv-slide-text", "{index} de {total}");
    const translated = new Carousel(root);
    expect(labels()).toEqual(["1 de 3", "2 de 3", "3 de 3"]);
    translated.destroy();

    const forced = new Carousel(root, { slideText: "Slide {index}/{total}" });
    expect(labels()).toEqual(["Slide 1/3", "Slide 2/3", "Slide 3/3"]);
    forced.destroy();
  });

  it("writes the counter with the digits of the language of the element", () => {
    vi.useFakeTimers();
    const root = mount(' data-iv-autoplay="4000" lang="es"');
    const carousel = new Carousel(root);
    const counter = /** @type {HTMLElement} */ (root.querySelector(".iv-carousel__counter"));
    expect(counter.textContent).toBe("01 / 03");
    carousel.next();
    expect(counter.textContent).toBe("02 / 03");
    carousel.destroy();

    root.setAttribute("data-iv-counter-text", "{index} de {total}");
    const translated = new Carousel(root);
    expect(root.querySelector(".iv-carousel__counter").textContent).toBe("01 de 03");
    translated.destroy();
    vi.useRealTimers();
  });
});
