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
        <div id="panel-a" class="iv-megamenu__panel">
          <div class="iv-megamenu__inner">
            <section class="iv-megamenu__group">
              <h3 class="iv-megamenu__heading">Genres</h3>
              <ul class="iv-megamenu__links"><li><a id="inner-a" href="#mm-note">Signal puzzles</a></li></ul>
            </section>
            <footer class="iv-megamenu__bottom"><a class="iv-button iv-button--primary" href="#mm-note">Browse everything</a></footer>
          </div>
        </div>
      </li>
      <li id="item-b" class="iv-megamenu__item">
        <a id="link-b" class="iv-megamenu__link" href="#mm-note">Studio</a>
        <button id="toggle-b" class="iv-megamenu__toggle" type="button" aria-expanded="false" aria-controls="panel-b" hidden><span class="iv-u-sr-only">Open Studio</span></button>
        <div id="panel-b" class="iv-megamenu__panel">
          <div class="iv-megamenu__inner">
            <ul class="iv-megamenu__links"><li><a id="inner-b" href="#mm-note">How we work</a></li></ul>
          </div>
        </div>
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
    it("ArrowDown on the toggle opens and focuses the first link", () => {
      const { mm } = setup();
      const event = press(byId("toggle-a"), "ArrowDown");
      expect(event.defaultPrevented).toBe(true);
      expect(mm.openItem).toBe(byId("item-a"));
      expect(document.activeElement).toBe(byId("inner-a"));
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
      vi.advanceTimersByTime(119);
      expect(mm.openItem).toBe(null);
      vi.advanceTimersByTime(1);
      expect(mm.openItem).toBe(byId("item-a"));

      byId("item-a").dispatchEvent(new Event("pointerleave"));
      vi.advanceTimersByTime(199);
      expect(mm.openItem).toBe(byId("item-a"));
      vi.advanceTimersByTime(1);
      expect(mm.openItem).toBe(null);
    });

    it("a pointer that leaves before the delay opens nothing", () => {
      vi.useFakeTimers();
      const { mm } = setup();
      byId("item-a").dispatchEvent(new Event("pointerenter"));
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
      vi.advanceTimersByTime(1000);
      expect(mm.openItem).toBe(null);
    });

    it("does nothing without a fine pointer", () => {
      globalThis.matchMedia = realMatchMedia;
      installMatchMedia({ fine: false });
      vi.useFakeTimers();
      const { mm } = setup();
      byId("item-a").dispatchEvent(new Event("pointerenter"));
      vi.advanceTimersByTime(1000);
      expect(mm.openItem).toBe(null);
    });

    it("destroy clears a pending timer", () => {
      vi.useFakeTimers();
      const { mm } = setup();
      byId("item-a").dispatchEvent(new Event("pointerenter"));
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
      vi.advanceTimersByTime(40);
      expect(mm.openItem).toBe(byId("item-a"));
    });

    it("JavaScript options win over the attributes", () => {
      byId("mm").setAttribute("data-iv-hover", "true");
      const { mm } = setup({ hover: false, openDelay: 10 });
      expect(mm.options.hover).toBe(false);
      vi.useFakeTimers();
      byId("item-a").dispatchEvent(new Event("pointerenter"));
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
});
