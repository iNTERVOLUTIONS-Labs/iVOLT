// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Megamenu } from "../../packages/ivolt/src/js/components/megamenu.js";
import { IvError } from "../../packages/ivolt/src/js/core/registry.js";

const realMatchMedia = globalThis.matchMedia;

/**
 * Installs a `matchMedia` stub keyed by query: the component asks for the
 * `staticFrom` breakpoint and for the fine-pointer query, and the two answers
 * must differ.
 *
 * @param {{ wide?: boolean, fine?: boolean }} [state] Initial answers.
 * @returns {{ emitWide: (next: boolean) => void, listenerCount: () => number }} Controls.
 */
function installMatchMedia(state) {
  const wide = state && state.wide === false ? false : true;
  const fine = state && state.fine === false ? false : true;
  /** @type {Map<string, { matches: boolean, listeners: Set<Function> }>} */
  const lists = new Map();
  const get = (media) => {
    let entry = lists.get(media);
    if (!entry) {
      entry = {
        matches: media.includes("hover") ? fine : wide,
        listeners: new Set(),
      };
      lists.set(media, entry);
    }
    return entry;
  };
  globalThis.matchMedia = vi.fn((media) => {
    const entry = get(media);
    return {
      get matches() {
        return entry.matches;
      },
      media,
      addEventListener(type, handler) {
        if (type === "change") entry.listeners.add(handler);
      },
      removeEventListener(type, handler) {
        if (type === "change") entry.listeners.delete(handler);
      },
    };
  });
  return {
    emitWide(next) {
      for (const [media, entry] of lists) {
        if (media.includes("hover")) continue;
        entry.matches = next;
        for (const handler of [...entry.listeners]) handler({ matches: next, media });
      }
    },
    listenerCount() {
      let n = 0;
      for (const [media, entry] of lists) {
        if (!media.includes("hover")) n += entry.listeners.size;
      }
      return n;
    },
  };
}

// The `hidden` attribute of the first toggle is deliberately not the last one:
// `destroy` must put it back where the author wrote it.
const MARKUP = `
  <nav id="mm" class="iv-megamenu" data-iv-component="megamenu" aria-label="Sample navigation, made up for this test">
    <ul class="iv-megamenu__list">
      <li id="item-a" class="iv-megamenu__item">
        <a id="link-a" class="iv-megamenu__link" href="#mm-note">Games</a>
        <button id="toggle-a" class="iv-megamenu__toggle" type="button" hidden aria-expanded="false" aria-controls="panel-a"><span class="iv-u-sr-only">Open Games</span></button>
        <section id="panel-a" class="iv-megamenu__panel" aria-labelledby="title-a">
          <header class="iv-megamenu__head">
            <p class="iv-megamenu__overline">Explore the archive</p>
            <h2 id="title-a" class="iv-megamenu__title">Games <span class="iv-megamenu__count">959</span></h2>
            <button id="close-a" class="iv-megamenu__close" type="button" hidden></button>
          </header>
          <div id="filter-a" class="iv-megamenu__filter" hidden>
            <label class="iv-u-sr-only" for="q-a">Filter Games</label>
            <input id="q-a" class="iv-input iv-megamenu__filter-input" type="search">
          </div>
          <div class="iv-megamenu__body">
            <aside class="iv-megamenu__directory">
              <h3 class="iv-megamenu__heading">Genres</h3>
              <ul class="iv-megamenu__dirlist">
                <li id="dir-a"><a id="inner-a" href="#mm-note"><span>Signal puzzles</span><small>12</small></a></li>
                <li id="dir-b"><a href="#mm-note"><span>Slow strategy</span><small>8</small></a></li>
              </ul>
            </aside>
            <div class="iv-megamenu__discover">
              <div class="iv-megamenu__tabs" role="tablist" aria-label="Selections">
                <a id="tab-a0" class="iv-megamenu__tab" role="tab" href="#set-a0" aria-selected="true">Most popular</a>
                <a id="tab-a1" class="iv-megamenu__tab" role="tab" href="#set-a1" aria-selected="false">Best rated</a>
              </div>
              <div id="set-a0" class="iv-megamenu__set" role="tabpanel" aria-labelledby="tab-a0">
                <ul class="iv-megamenu__cards">
                  <li id="card-a0"><a class="iv-megamenu__card" href="#mm-note" data-iv-keywords="rpg 1997"><span class="iv-megamenu__name">Orbit Signal</span></a></li>
                  <li id="card-a1"><a class="iv-megamenu__card" href="#mm-note"><span class="iv-megamenu__name">Quiet Harbour</span></a></li>
                </ul>
              </div>
              <div id="set-a1" class="iv-megamenu__set" role="tabpanel" aria-labelledby="tab-a1" hidden>
                <ul class="iv-megamenu__cards">
                  <li id="card-a2"><a class="iv-megamenu__card" href="#mm-note"><span class="iv-megamenu__name">Paper Summit</span></a></li>
                </ul>
              </div>
            </div>
              <section id="cloud-a" class="iv-megamenu__cloud">
                <h3 class="iv-megamenu__heading">Studios</h3>
                <a id="chip-a" href="#mm-note">LucasArts <small>24</small></a>
                <a id="chip-b" href="#mm-note">Sierra <small>9</small></a>
              </section>
            </div>
          </div>
          <footer class="iv-megamenu__foot">
            <span class="iv-megamenu__crumb">Archive <b aria-hidden="true">/</b> Games</span>
            <a class="iv-megamenu__foot-link" href="#mm-note">Suggest a classic</a>
          </footer>
        </section>
      </li>
      <li id="item-b" class="iv-megamenu__item">
        <a id="link-b" class="iv-megamenu__link" href="#mm-note">Studio</a>
        <button id="toggle-b" class="iv-megamenu__toggle" type="button" aria-expanded="false" aria-controls="panel-b" hidden><span class="iv-u-sr-only">Open Studio</span></button>
        <section id="panel-b" class="iv-megamenu__panel">
          <div class="iv-megamenu__body">
            <aside class="iv-megamenu__directory">
              <ul class="iv-megamenu__dirlist"><li><a id="inner-b" href="#mm-note">How we work</a></li></ul>
            </aside>
          </div>
        </section>
      </li>
      <li id="item-c" class="iv-megamenu__item">
        <a id="link-c" class="iv-megamenu__link" href="#mm-note">Support</a>
      </li>
    </ul>
  </nav>
  <p id="mm-note">Sample navigation: every link points to this note.</p>
  <a id="outside" href="#mm-note">Outside link</a>
`;

/**
 * @param {string} id Element id.
 * @returns {HTMLElement} The element.
 */
function byId(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}

/**
 * @param {Partial<Record<string, unknown>>} [options] Options passed in JavaScript.
 * @returns {{ mm: Megamenu, root: HTMLElement }} The fixture.
 */
function setup(options) {
  const root = byId("mm");
  return { mm: new Megamenu(root, options), root };
}

/**
 * @param {Element} target Event target.
 * @param {string} key `KeyboardEvent.key` value.
 * @returns {KeyboardEvent} The dispatched event.
 */
function press(target, key) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

/**
 * @param {Element} target Element to click.
 * @returns {void}
 */
function click(target) {
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

/**
 * @param {Element} target Element losing focus.
 * @param {Element|null} next Element receiving it.
 * @returns {void}
 */
function focusout(target, next) {
  target.dispatchEvent(
    new FocusEvent("focusout", { bubbles: true, relatedTarget: next })
  );
}

/** @returns {HTMLElement|null} The overlay the component added. */
function overlay() {
  return /** @type {HTMLElement|null} */ (
    document.querySelector(".iv-megamenu__overlay")
  );
}

describe("Megamenu", () => {
  beforeEach(() => {
    installMatchMedia();
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    globalThis.matchMedia = realMatchMedia;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("refuses an element without a list with IvError invalid-element", () => {
    const div = document.createElement("div");
    div.className = "iv-megamenu";
    let error = null;
    try {
      new Megamenu(div);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(IvError);
    expect(/** @type {IvError} */ (error).code).toBe("invalid-element");
  });

  describe("promotion and restoration", () => {
    it("shows the toggles, names the panels and marks the closed ones inert", () => {
      const { mm } = setup();
      expect(byId("toggle-a").hasAttribute("hidden")).toBe(false);
      expect(byId("toggle-b").hasAttribute("hidden")).toBe(false);
      expect(byId("toggle-a").getAttribute("aria-expanded")).toBe("false");
      expect(byId("toggle-a").getAttribute("aria-controls")).toBe("panel-a");
      expect(byId("panel-a").hasAttribute("inert")).toBe(true);
      expect(byId("panel-b").hasAttribute("inert")).toBe(true);
      expect(mm.openItem).toBe(null);
    });

    it("generates a panel id when the author wrote none", () => {
      byId("panel-a").removeAttribute("id");
      setup();
      const panel = byId("item-a").querySelector(".iv-megamenu__panel");
      expect(panel?.id).toBe("iv-mm-1-panel");
      expect(byId("toggle-a").getAttribute("aria-controls")).toBe("iv-mm-1-panel");
    });

    it("adds the overlay at the end of the root, hidden", () => {
      const { root } = setup();
      const el = overlay();
      expect(el).not.toBe(null);
      expect(el?.parentElement).toBe(root);
      expect(root.lastElementChild).toBe(el);
      expect(el?.hidden).toBe(true);
    });

    it("adds no overlay with overlay: false", () => {
      setup({ overlay: false });
      expect(overlay()).toBe(null);
    });

    it("destroy restores the markup exactly, attribute order included", () => {
      const before = document.body.innerHTML;
      const { mm } = setup();
      mm.open(0);
      mm.close();
      mm.open(byId("item-b"));
      mm.destroy();
      expect(document.body.innerHTML).toBe(before);
    });

    it("destroy keeps an author attribute this instance did not add", () => {
      byId("panel-a").setAttribute("inert", "");
      const before = document.body.innerHTML;
      const { mm } = setup();
      mm.open(0);
      expect(byId("panel-a").hasAttribute("inert")).toBe(false);
      mm.destroy();
      expect(document.body.innerHTML).toBe(before);
    });
  });

  describe("opening and closing", () => {
    it("opens and closes from the toggle", () => {
      setup();
      click(byId("toggle-a"));
      expect(byId("item-a").hasAttribute("data-iv-open")).toBe(true);
      expect(byId("toggle-a").getAttribute("aria-expanded")).toBe("true");
      expect(byId("panel-a").hasAttribute("inert")).toBe(false);
      expect(overlay()?.hidden).toBe(false);
      click(byId("toggle-a"));
      expect(byId("item-a").hasAttribute("data-iv-open")).toBe(false);
      expect(byId("panel-a").hasAttribute("inert")).toBe(true);
      expect(overlay()?.hidden).toBe(true);
    });

    it("closes the open item when another one opens, with reason sibling", () => {
      const { mm, root } = setup();
      /** @type {string[]} */
      const reasons = [];
      root.addEventListener("iv:closed", (event) => {
        reasons.push(/** @type {CustomEvent} */ (event).detail.reason);
      });
      click(byId("toggle-a"));
      click(byId("toggle-b"));
      expect(byId("item-a").hasAttribute("data-iv-open")).toBe(false);
      expect(byId("item-b").hasAttribute("data-iv-open")).toBe(true);
      expect(reasons).toEqual(["sibling"]);
      expect(mm.openItem).toBe(byId("item-b"));
    });

    it("keeps both open with closeOthers: false", () => {
      const { mm } = setup({ closeOthers: false });
      click(byId("toggle-a"));
      click(byId("toggle-b"));
      expect(byId("item-a").hasAttribute("data-iv-open")).toBe(true);
      expect(byId("item-b").hasAttribute("data-iv-open")).toBe(true);
      expect(mm.openItem).toBe(byId("item-b"));
      mm.close();
      expect(document.querySelectorAll("[data-iv-open]").length).toBe(0);
    });

    it("toggle() and open() ignore an item without a panel", () => {
      const { mm } = setup();
      mm.open(byId("item-c"));
      mm.toggle(2);
      expect(mm.openItem).toBe(null);
      expect(overlay()?.hidden).toBe(true);
    });

    it("closes on a click outside and on the overlay", () => {
      const { mm } = setup();
      mm.open(0);
      click(byId("outside"));
      expect(mm.openItem).toBe(null);
      mm.open(0);
      const el = overlay();
      if (el) click(el);
      expect(mm.openItem).toBe(null);
    });

    it("closes when focus leaves the open item", () => {
      const { mm } = setup();
      mm.open(0);
      byId("inner-a").focus();
      focusout(byId("inner-a"), byId("link-b"));
      expect(mm.openItem).toBe(null);
    });

    it("stays open while focus moves inside the item", () => {
      const { mm } = setup();
      mm.open(0);
      focusout(byId("toggle-a"), byId("inner-a"));
      expect(mm.openItem).toBe(byId("item-a"));
      focusout(byId("inner-a"), null);
      expect(mm.openItem).toBe(byId("item-a"));
    });
  });

  describe("keyboard", () => {
    it("ArrowDown on the toggle opens and focuses the first control of the panel", () => {
      const { mm } = setup();
      const event = press(byId("toggle-a"), "ArrowDown");
      expect(event.defaultPrevented).toBe(true);
      expect(mm.openItem).toBe(byId("item-a"));
      expect(document.activeElement).toBe(byId("close-a"));
    });

    it("Escape closes and returns focus to the toggle", () => {
      const { mm } = setup();
      press(byId("toggle-a"), "ArrowDown");
      const event = press(byId("inner-a"), "Escape");
      expect(event.defaultPrevented).toBe(true);
      expect(mm.openItem).toBe(null);
      expect(document.activeElement).toBe(byId("toggle-a"));
    });

    it("Escape closes a panel opened by hover, wherever focus is", () => {
      const { mm } = setup();
      mm.open(0);
      press(document.body, "Escape");
      expect(mm.openItem).toBe(null);
      expect(document.activeElement).toBe(byId("toggle-a"));
    });

    it("ArrowRight, ArrowLeft, Home and End move along the bar", () => {
      setup();
      byId("link-a").focus();
      press(byId("link-a"), "ArrowRight");
      expect(document.activeElement).toBe(byId("link-b"));
      press(byId("link-b"), "ArrowLeft");
      expect(document.activeElement).toBe(byId("link-a"));
      press(byId("link-a"), "End");
      expect(document.activeElement).toBe(byId("link-c"));
      press(byId("link-c"), "Home");
      expect(document.activeElement).toBe(byId("link-a"));
      // Wraps around, and from a toggle it lands on the next toggle.
      press(byId("link-a"), "ArrowLeft");
      expect(document.activeElement).toBe(byId("link-c"));
      press(byId("toggle-a"), "ArrowRight");
      expect(document.activeElement).toBe(byId("toggle-b"));
    });

    it("leaves other keys alone", () => {
      setup();
      const event = press(byId("link-a"), "ArrowUp");
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe("intentional hover", () => {
    it("opens after openDelay and closes after closeDelay", () => {
      vi.useFakeTimers();
      const { mm } = setup();
      byId("item-a").dispatchEvent(new Event("pointerenter"));
      byId("item-a").dispatchEvent(new Event("pointermove"));
      vi.advanceTimersByTime(119);
      expect(mm.openItem).toBe(null);
      vi.advanceTimersByTime(1);
      expect(mm.openItem).toBe(byId("item-a"));

      byId("item-a").dispatchEvent(new Event("pointerleave"));
      vi.advanceTimersByTime(319);
      expect(mm.openItem).toBe(byId("item-a"));
      vi.advanceTimersByTime(1);
      expect(mm.openItem).toBe(null);
    });

    it("a pointer that leaves before the delay opens nothing", () => {
      vi.useFakeTimers();
      const { mm } = setup();
      byId("item-a").dispatchEvent(new Event("pointerenter"));
      byId("item-a").dispatchEvent(new Event("pointermove"));
      vi.advanceTimersByTime(60);
      byId("item-a").dispatchEvent(new Event("pointerleave"));
      vi.advanceTimersByTime(400);
      expect(mm.openItem).toBe(null);
    });

    it("hovering the panel keeps it open", () => {
      vi.useFakeTimers();
      const { mm } = setup();
      mm.open(0);
      byId("item-a").dispatchEvent(new Event("pointerleave"));
      vi.advanceTimersByTime(100);
      byId("panel-a").dispatchEvent(new Event("pointerenter"));
      vi.advanceTimersByTime(400);
      expect(mm.openItem).toBe(byId("item-a"));
    });

    it("never closes a panel the keyboard is inside", () => {
      vi.useFakeTimers();
      const { mm } = setup();
      mm.open(0);
      byId("inner-a").focus();
      byId("item-a").dispatchEvent(new Event("pointerleave"));
      vi.advanceTimersByTime(400);
      expect(mm.openItem).toBe(byId("item-a"));
    });

    it("does nothing with hover: false", () => {
      vi.useFakeTimers();
      const { mm } = setup({ hover: false });
      byId("item-a").dispatchEvent(new Event("pointerenter"));
      byId("item-a").dispatchEvent(new Event("pointermove"));
      vi.advanceTimersByTime(1000);
      expect(mm.openItem).toBe(null);
    });

    it("does nothing without a fine pointer", () => {
      globalThis.matchMedia = realMatchMedia;
      installMatchMedia({ fine: false });
      vi.useFakeTimers();
      const { mm } = setup();
      byId("item-a").dispatchEvent(new Event("pointerenter"));
      byId("item-a").dispatchEvent(new Event("pointermove"));
      vi.advanceTimersByTime(1000);
      expect(mm.openItem).toBe(null);
    });

    it("destroy clears a pending timer", () => {
      vi.useFakeTimers();
      const { mm } = setup();
      byId("item-a").dispatchEvent(new Event("pointerenter"));
      byId("item-a").dispatchEvent(new Event("pointermove"));
      mm.destroy();
      vi.advanceTimersByTime(1000);
      expect(byId("item-a").hasAttribute("data-iv-open")).toBe(false);
    });
  });

  describe("accordion below staticFrom", () => {
    it("opens inline, without overlay and without inert", () => {
      globalThis.matchMedia = realMatchMedia;
      installMatchMedia({ wide: false });
      const { mm } = setup();
      expect(byId("panel-a").hasAttribute("inert")).toBe(false);
      expect(byId("panel-b").hasAttribute("inert")).toBe(false);
      click(byId("toggle-a"));
      expect(mm.openItem).toBe(byId("item-a"));
      expect(byId("toggle-a").getAttribute("aria-expanded")).toBe("true");
      expect(overlay()?.hidden).toBe(true);
      expect(byId("panel-b").hasAttribute("inert")).toBe(false);
    });

    it("hover opens nothing while the panels are an accordion", () => {
      globalThis.matchMedia = realMatchMedia;
      installMatchMedia({ wide: false });
      vi.useFakeTimers();
      const { mm } = setup();
      byId("item-a").dispatchEvent(new Event("pointerenter"));
      byId("item-a").dispatchEvent(new Event("pointermove"));
      vi.advanceTimersByTime(1000);
      expect(mm.openItem).toBe(null);
    });

    it("crossing the breakpoint closes what was open and re-applies inert", () => {
      const media = installMatchMedia({ wide: true });
      const { mm } = setup();
      mm.open(0);
      media.emitWide(false);
      expect(mm.openItem).toBe(null);
      expect(byId("panel-a").hasAttribute("inert")).toBe(false);
      expect(overlay()?.hidden).toBe(true);
      media.emitWide(true);
      expect(byId("panel-a").hasAttribute("inert")).toBe(true);
    });

    it("destroy drops the media query listener", () => {
      const media = installMatchMedia({ wide: true });
      const { mm } = setup();
      expect(media.listenerCount()).toBe(1);
      mm.destroy();
      expect(media.listenerCount()).toBe(0);
    });
  });

  describe("events", () => {
    it("emits open, opened, close and closed with item and reason", () => {
      const { mm, root } = setup();
      /** @type {string[]} */
      const seen = [];
      /** @type {unknown[]} */
      const items = [];
      for (const name of ["iv:open", "iv:opened", "iv:close", "iv:closed"]) {
        root.addEventListener(name, (event) => {
          const detail = /** @type {CustomEvent} */ (event).detail;
          seen.push(`${name}:${detail.reason}`);
          items.push(detail.item);
          expect(detail.instance).toBe(mm);
        });
      }
      click(byId("toggle-a"));
      click(byId("toggle-a"));
      expect(seen).toEqual([
        "iv:open:trigger",
        "iv:opened:trigger",
        "iv:close:trigger",
        "iv:closed:trigger",
      ]);
      expect(items.every((item) => item === byId("item-a"))).toBe(true);
    });

    it("a cancelled iv:open opens nothing and emits no iv:opened", () => {
      const { mm, root } = setup();
      let opened = 0;
      root.addEventListener("iv:open", (event) => event.preventDefault());
      root.addEventListener("iv:opened", () => {
        opened += 1;
      });
      click(byId("toggle-a"));
      expect(mm.openItem).toBe(null);
      expect(byId("panel-a").hasAttribute("inert")).toBe(true);
      expect(opened).toBe(0);
    });

    it("a cancelled iv:close keeps the panel open", () => {
      const { mm, root } = setup();
      mm.open(0);
      root.addEventListener("iv:close", (event) => event.preventDefault());
      click(byId("toggle-a"));
      expect(mm.openItem).toBe(byId("item-a"));
      expect(byId("toggle-a").getAttribute("aria-expanded")).toBe("true");
    });
  });

  describe("options", () => {
    it("reads them from data-iv-* attributes", () => {
      const root = byId("mm");
      root.setAttribute("data-iv-open-delay", "40");
      root.setAttribute("data-iv-close-delay", "50");
      root.setAttribute("data-iv-overlay", "false");
      root.setAttribute("data-iv-close-others", "false");
      root.setAttribute("data-iv-static-from", "md");
      const { mm } = setup();
      expect(mm.options.openDelay).toBe(40);
      expect(mm.options.closeDelay).toBe(50);
      expect(mm.options.overlay).toBe(false);
      expect(mm.options.closeOthers).toBe(false);
      expect(mm.options.staticFrom).toBe("md");
      expect(overlay()).toBe(null);
      vi.useFakeTimers();
      byId("item-a").dispatchEvent(new Event("pointerenter"));
      byId("item-a").dispatchEvent(new Event("pointermove"));
      vi.advanceTimersByTime(40);
      expect(mm.openItem).toBe(byId("item-a"));
    });

    it("JavaScript options win over the attributes", () => {
      byId("mm").setAttribute("data-iv-hover", "true");
      const { mm } = setup({ hover: false, openDelay: 10 });
      expect(mm.options.hover).toBe(false);
      vi.useFakeTimers();
      byId("item-a").dispatchEvent(new Event("pointerenter"));
      byId("item-a").dispatchEvent(new Event("pointermove"));
      vi.advanceTimersByTime(1000);
      expect(mm.openItem).toBe(null);
    });

    it("an unknown staticFrom warns once and leaves the panels floating", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { mm } = setup({ staticFrom: "huge" });
      expect(warn).toHaveBeenCalledTimes(1);
      click(byId("toggle-a"));
      expect(mm.openItem).toBe(byId("item-a"));
      expect(byId("panel-b").hasAttribute("inert")).toBe(true);
    });
  });

  describe("panel head, tabs and filter (v2)", () => {
    it("shows the close button and closes from it, back to the toggle", () => {
      const { mm } = setup();
      expect(byId("close-a").hidden).toBe(false);
      mm.open(0);
      byId("toggle-a").focus();
      click(byId("close-a"));
      expect(byId("toggle-a").getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(byId("toggle-a"));
    });

    it("names a close button that has none with closeText", () => {
      setup({ closeText: "Dismiss" });
      expect(byId("close-a").getAttribute("aria-label")).toBe("Dismiss");
    });

    it("runs the APG tab pattern: roving tabindex, one visible set", () => {
      setup();
      expect(byId("tab-a0").getAttribute("tabindex")).toBe("0");
      expect(byId("tab-a1").getAttribute("tabindex")).toBe("-1");
      expect(byId("set-a0").hidden).toBe(false);
      expect(byId("set-a1").hidden).toBe(true);
    });

    it("clicking a tab shows its set and emits iv:change then iv:changed", () => {
      const { mm, root } = setup();
      /** @type {string[]} */
      const seen = [];
      /** @type {unknown[]} */
      const details = [];
      root.addEventListener("iv:change", (e) => {
        seen.push("change");
        details.push(/** @type {CustomEvent} */ (e).detail);
      });
      root.addEventListener("iv:changed", () => seen.push("changed"));
      click(byId("tab-a1"));
      expect(seen).toEqual(["change", "changed"]);
      const detail = /** @type {{ item: Element, tab: Element, set: Element, previousTab: Element }} */ (details[0]);
      expect(detail.item).toBe(byId("item-a"));
      expect(detail.tab).toBe(byId("tab-a1"));
      expect(detail.set).toBe(byId("set-a1"));
      expect(detail.previousTab).toBe(byId("tab-a0"));
      expect(byId("set-a1").hidden).toBe(false);
      expect(byId("set-a0").hidden).toBe(true);
      expect(mm.openItem).toBe(null);
    });

    it("a cancelled iv:change leaves the tabs alone", () => {
      const { root } = setup();
      root.addEventListener("iv:change", (e) => e.preventDefault());
      click(byId("tab-a1"));
      expect(byId("tab-a1").getAttribute("aria-selected")).toBe("false");
      expect(byId("set-a1").hidden).toBe(true);
    });

    it("ArrowRight, Home and End move and select along the tab strip", () => {
      setup();
      press(byId("tab-a0"), "ArrowRight");
      expect(byId("tab-a1").getAttribute("aria-selected")).toBe("true");
      press(byId("tab-a1"), "Home");
      expect(byId("tab-a0").getAttribute("aria-selected")).toBe("true");
      press(byId("tab-a0"), "End");
      expect(byId("tab-a1").getAttribute("aria-selected")).toBe("true");
    });

    it("data-iv-tab-default picks the first visible set", () => {
      byId("tab-a1").setAttribute("data-iv-tab-default", "");
      setup();
      expect(byId("set-a1").hidden).toBe(false);
      expect(byId("set-a0").hidden).toBe(true);
    });

    it("selectTab is a no-op on an item without tabs", () => {
      const { mm } = setup();
      expect(() => mm.selectTab(1, 0)).not.toThrow();
    });

    it("shows the filter and hides what does not match, groups included", () => {
      const { mm } = setup();
      expect(byId("filter-a").hidden).toBe(false);
      mm.filter(0, "harbour");
      expect(byId("card-a0").hidden).toBe(true);
      expect(byId("card-a1").hidden).toBe(false);
      expect(byId("dir-a").hidden).toBe(true);
      expect(byId("q-a").value).toBe("harbour");
    });

    it("matches data-iv-keywords and folds diacritics", () => {
      const { mm } = setup();
      mm.filter(0, "RPG");
      expect(byId("card-a0").hidden).toBe(false);
      mm.filter(0, "");
      const card = byId("card-a1").querySelector(".iv-megamenu__name");
      /** @type {HTMLElement} */ (card).textContent = "Bahía";
      mm.filter(0, "bahia");
      expect(byId("card-a1").hidden).toBe(false);
    });

    it("announces the count and shows the empty message with no matches", () => {
      const { mm, root } = setup({ emptyText: "Nothing", countText: "{count} hits" });
      mm.filter(0, "orbit");
      const status = root.querySelector(".iv-megamenu__status.iv-u-sr-only");
      expect(/** @type {HTMLElement} */ (status).textContent).toBe("1 hits");
      const empty = root.querySelector(".iv-megamenu__empty");
      expect(/** @type {HTMLElement} */ (empty).hidden).toBe(true);
      mm.filter(0, "zzzz");
      expect(/** @type {HTMLElement} */ (empty).hidden).toBe(false);
      expect(/** @type {HTMLElement} */ (empty).textContent).toBe("Nothing");
      expect(/** @type {HTMLElement} */ (status).textContent).toBe("0 hits");
    });

    it("emits iv:filter with the item, the query and the count", () => {
      const { mm, root } = setup();
      /** @type {unknown[]} */
      const seen = [];
      root.addEventListener("iv:filter", (e) => seen.push(/** @type {CustomEvent} */ (e).detail));
      mm.filter(0, "orbit");
      expect(seen).toHaveLength(1);
      const detail = /** @type {{ item: Element, query: string, visible: number }} */ (seen[0]);
      expect(detail.item).toBe(byId("item-a"));
      expect(detail.query).toBe("orbit");
      expect(detail.visible).toBe(1);
    });

    it("Escape empties a filter that still holds text before it closes", () => {
      const { mm } = setup();
      mm.open(0);
      byId("q-a").value = "orbit";
      byId("q-a").focus();
      press(byId("q-a"), "Escape");
      expect(byId("q-a").value).toBe("");
      expect(byId("toggle-a").getAttribute("aria-expanded")).toBe("true");
      press(byId("q-a"), "Escape");
      expect(byId("toggle-a").getAttribute("aria-expanded")).toBe("false");
    });

    it("adds no filter with filter: false", () => {
      const { root } = setup({ filter: false });
      expect(byId("filter-a").hidden).toBe(true);
      expect(root.querySelector(".iv-megamenu__empty")).toBe(null);
    });

    it("destroy removes the generated message and live region", () => {
      const { mm, root } = setup();
      expect(root.querySelector(".iv-megamenu__empty")).not.toBe(null);
      mm.destroy();
      expect(root.querySelector(".iv-megamenu__empty")).toBe(null);
      expect(root.querySelector(".iv-megamenu__status.iv-u-sr-only")).toBe(null);
      expect(byId("filter-a").hidden).toBe(true);
      expect(byId("close-a").hidden).toBe(true);
      expect(byId("set-a1").hidden).toBe(true);
      expect(root.getAttribute("style")).toBe(null);
    });

    // The chips of a `__cloud` are bare links: `closest("li")` climbed out of
    // the panel and hid the `__item` of the bar, taking the whole entry with it.
    it("hides the chip of a cloud and never the bar item around it", () => {
      const { mm } = setup();
      mm.filter(0, "lucas");
      expect(byId("chip-a").hidden).toBe(false);
      expect(byId("chip-b").hidden).toBe(true);
      expect(byId("item-a").hidden).toBe(false);
      expect(byId("cloud-a").hidden).toBe(false);
      mm.filter(0, "zzzz");
      expect(byId("item-a").hidden).toBe(false);
      expect(byId("cloud-a").hidden).toBe(true);
    });

    // A card of a tab that is not on screen is filtered all the same, but it is
    // not part of the count: announcing a match the reader cannot see left the
    // panel empty with no message.
    it("counts only what the visible set shows", () => {
      const { mm, root } = setup();
      /** @type {unknown[]} */
      const seen = [];
      root.addEventListener("iv:filter", (e) => seen.push(/** @type {CustomEvent} */ (e).detail));
      mm.filter(0, "summit");
      expect(byId("card-a2").hidden).toBe(false);
      expect(/** @type {{ visible: number }} */ (seen[0]).visible).toBe(0);
      const empty = root.querySelector(".iv-megamenu__empty");
      expect(/** @type {HTMLElement} */ (empty).hidden).toBe(false);
      const status = root.querySelector(".iv-megamenu__status.iv-u-sr-only");
      expect(/** @type {HTMLElement} */ (status).textContent).toBe("0 results");
      // Switching to the tab that holds the match re-runs the filter and counts it.
      click(byId("tab-a1"));
      expect(/** @type {{ visible: number }} */ (seen[seen.length - 1]).visible).toBe(1);
      expect(/** @type {HTMLElement} */ (empty).hidden).toBe(true);
    });

    it("destroy puts back the rows the filter hid and the query it typed", () => {
      const before = byId("panel-a").outerHTML;
      const { mm } = setup();
      mm.filter(0, "orbit");
      expect(byId("card-a1").hidden).toBe(true);
      mm.destroy();
      expect(byId("panel-a").outerHTML).toBe(before);
      expect(byId("q-a").value).toBe("");
    });

    it("opening points the caret at the toggle and destroy drops it", () => {
      // jsdom lays nothing out: the offsets the caret reads are stubbed.
      const box = (el, left, width) => {
        Object.defineProperty(el, "offsetParent", { value: byId("mm") });
        Object.defineProperty(el, "offsetLeft", { value: left });
        Object.defineProperty(el, "offsetWidth", { value: width });
      };
      box(byId("panel-a"), 0, 800);
      box(byId("toggle-a"), 80, 40);
      const { mm, root } = setup();
      mm.open(0);
      expect(root.style.getPropertyValue("--iv-megamenu-caret-x")).toBe("100px");
      expect(root.style.getPropertyValue("--iv-megamenu-caret-x")).not.toBe("");
      mm.destroy();
      expect(root.getAttribute("style")).toBe(null);
    });
  });

  it("claims Escape only while focus is inside; a panel opened by hover still closes without preventDefault", () => {
    installMatchMedia({ wide: true });
    const { mm } = setup();
    mm.open(0);
    document.body.focus();
    const outside = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    document.dispatchEvent(outside);
    expect(outside.defaultPrevented).toBe(false);
    expect(mm.openItem).toBe(null);
    mm.open(0);
    byId("toggle-a").focus();
    const inside = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    document.dispatchEvent(inside);
    expect(inside.defaultPrevented).toBe(true);
    expect(mm.openItem).toBe(null);
    mm.destroy();
  });

});
