// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Navbar } from "../../packages/ivolt/src/js/components/navbar.js";

const realMatchMedia = globalThis.matchMedia;
const realRaf = globalThis.requestAnimationFrame;

/**
 * Installs a `matchMedia` stub for the collapse breakpoint. `wide` is the
 * answer of `(min-width: 64em)`: `true` means the bar fits in line, `false`
 * means the panel folds.
 *
 * @param {{ wide?: boolean }} [state] Initial answer.
 * @returns {{ emitWide: (next: boolean) => void, listenerCount: () => number }} Controls.
 */
function installMatchMedia(state) {
  const wide = state && state.wide === false ? false : true;
  /** @type {Map<string, { matches: boolean, listeners: Set<Function> }>} */
  const lists = new Map();
  const get = (media) => {
    let entry = lists.get(media);
    if (!entry) {
      entry = { matches: wide, listeners: new Set() };
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
        entry.matches = next;
        for (const handler of [...entry.listeners]) handler({ matches: next, media });
      }
    },
    listenerCount() {
      let n = 0;
      for (const entry of lists.values()) n += entry.listeners.size;
      return n;
    },
  };
}

/**
 * Runs the scroll handler synchronously: the component coalesces scroll events
 * into one animation frame, and the test must not wait for a real one.
 *
 * @param {number} y Scroll offset to report.
 * @returns {void}
 */
function scrollTo(y) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true, writable: true });
  window.dispatchEvent(new Event("scroll"));
}

// The `hidden` attribute of the toggle is deliberately not the last one:
// `destroy` must put it back where the author wrote it.
const MARKUP = `
  <header id="nav" class="iv-navbar" data-iv-component="navbar">
    <div class="iv-navbar__inner">
      <a id="brand" class="iv-navbar__brand" href="#nav-note">Vantage</a>
      <button id="toggle" class="iv-navbar__toggle" type="button" hidden aria-expanded="false" aria-controls="site-nav"><span class="iv-u-sr-only">Menu</span><span class="iv-navbar__burger" aria-hidden="true"></span></button>
      <div id="panel" class="iv-navbar__panel">
        <nav class="iv-navbar__nav" aria-label="Main">
          <ul class="iv-navbar__links">
            <li><a id="link-a" class="iv-navbar__link" href="#nav-note" aria-current="page">Product</a></li>
            <li><a id="link-b" class="iv-navbar__link" href="#nav-note">Docs</a></li>
          </ul>
        </nav>
        <div class="iv-navbar__actions"><a id="cta" class="iv-button iv-button--primary" href="#nav-note">Get started</a></div>
      </div>
    </div>
  </header>
  <p id="nav-note">Sample header, made up for this test.</p>
`;

/**
 * @param {string} id Element id.
 * @returns {HTMLElement} The element.
 */
function byId(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}

/**
 * @param {Partial<import("../../packages/ivolt/src/js/components/navbar.js").NavbarOptions>} [options] Options.
 * @returns {Navbar} The instance.
 */
function setup(options) {
  return new Navbar(byId("nav"), options);
}

describe("Navbar", () => {
  beforeEach(() => {
    document.body.innerHTML = MARKUP;
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });
    globalThis.requestAnimationFrame = (cb) => {
      cb(0);
      return 1;
    };
    globalThis.cancelAnimationFrame = () => {};
  });

  afterEach(() => {
    document.body.innerHTML = "";
    globalThis.matchMedia = realMatchMedia;
    globalThis.requestAnimationFrame = realRaf;
    document.documentElement.removeAttribute("style");
  });

  it("shows the toggle and folds the panel below the breakpoint", () => {
    installMatchMedia({ wide: false });
    const navbar = setup();
    expect(byId("toggle").hasAttribute("hidden")).toBe(false);
    expect(byId("toggle").getAttribute("aria-expanded")).toBe("false");
    expect(byId("toggle").getAttribute("aria-controls")).toBe("panel");
    expect(byId("nav").hasAttribute("data-iv-collapsible")).toBe(true);
    expect(byId("nav").hasAttribute("data-iv-open")).toBe(false);
    expect(navbar.isOpen).toBe(false);
  });

  it("does not mark the header collapsible above the breakpoint", () => {
    installMatchMedia({ wide: true });
    const navbar = setup();
    expect(byId("nav").hasAttribute("data-iv-collapsible")).toBe(false);
    navbar.open();
    expect(navbar.isOpen).toBe(false);
    expect(byId("nav").hasAttribute("data-iv-open")).toBe(false);
  });

  it("opens and closes from the toggle, with events and reasons", () => {
    installMatchMedia({ wide: false });
    const navbar = setup();
    /** @type {string[]} */
    const seen = [];
    for (const type of ["open", "opened", "close", "closed"]) {
      byId("nav").addEventListener(`iv:${type}`, (event) => {
        seen.push(`${type}:${event.detail.reason}`);
        expect(event.detail.instance).toBe(navbar);
      });
    }
    byId("toggle").click();
    expect(navbar.isOpen).toBe(true);
    expect(byId("nav").getAttribute("data-iv-open")).toBe("");
    expect(byId("toggle").getAttribute("aria-expanded")).toBe("true");
    byId("toggle").click();
    expect(navbar.isOpen).toBe(false);
    expect(byId("nav").hasAttribute("data-iv-open")).toBe(false);
    expect(seen).toEqual([
      "open:trigger",
      "opened:trigger",
      "close:trigger",
      "closed:trigger",
    ]);
  });

  it("a cancelled iv:open leaves the panel folded", () => {
    installMatchMedia({ wide: false });
    const navbar = setup();
    byId("nav").addEventListener("iv:open", (event) => event.preventDefault());
    navbar.open();
    expect(navbar.isOpen).toBe(false);
    expect(byId("toggle").getAttribute("aria-expanded")).toBe("false");
  });

  it("Escape closes and returns the focus to the toggle", () => {
    installMatchMedia({ wide: false });
    const navbar = setup();
    navbar.open();
    byId("link-a").focus();
    /** @type {string[]} */
    const reasons = [];
    byId("nav").addEventListener("iv:closed", (event) => reasons.push(event.detail.reason));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(navbar.isOpen).toBe(false);
    expect(document.activeElement).toBe(byId("toggle"));
    expect(reasons).toEqual(["escape"]);
  });

  it("a click outside closes, unless closeOnOutside is false", () => {
    installMatchMedia({ wide: false });
    const navbar = setup();
    navbar.open();
    byId("nav-note").click();
    expect(navbar.isOpen).toBe(false);

    navbar.destroy();
    const kept = setup({ closeOnOutside: false });
    kept.open();
    byId("nav-note").click();
    expect(kept.isOpen).toBe(true);
    // A click inside never closes.
    byId("link-a").click();
    expect(kept.isOpen).toBe(true);
  });

  it("crossing the breakpoint closes the panel and hands the layout back", () => {
    const media = installMatchMedia({ wide: false });
    const navbar = setup();
    navbar.open();
    /** @type {string[]} */
    const reasons = [];
    byId("nav").addEventListener("iv:closed", (event) => reasons.push(event.detail.reason));
    media.emitWide(true);
    expect(navbar.isOpen).toBe(false);
    expect(reasons).toEqual(["viewport"]);
    expect(byId("nav").hasAttribute("data-iv-collapsible")).toBe(false);
    media.emitWide(false);
    expect(byId("nav").getAttribute("data-iv-collapsible")).toBe("");
  });

  it("condenses past the offset and announces it once per change", () => {
    installMatchMedia({ wide: true });
    const navbar = setup({ sticky: true, condenseAt: 24 });
    /** @type {boolean[]} */
    const seen = [];
    byId("nav").addEventListener("iv:condense", (event) => seen.push(event.detail.condensed));
    expect(navbar.isCondensed).toBe(false);
    expect(byId("nav").getAttribute("data-iv-sticky")).toBe("true");
    scrollTo(10);
    expect(navbar.isCondensed).toBe(false);
    scrollTo(80);
    expect(navbar.isCondensed).toBe(true);
    expect(byId("nav").getAttribute("data-iv-condensed")).toBe("");
    scrollTo(120);
    scrollTo(0);
    expect(navbar.isCondensed).toBe(false);
    expect(byId("nav").hasAttribute("data-iv-condensed")).toBe(false);
    expect(seen).toEqual([true, false]);
    expect(document.documentElement.style.getPropertyValue("scroll-padding-block-start")).toBe(
      "var(--iv-navbar-height, 4rem)"
    );
  });

  it("hides on the way down, comes back on the way up and never while open", () => {
    installMatchMedia({ wide: false });
    const navbar = setup({ sticky: true, hideOnScroll: true, condenseAt: 24 });
    scrollTo(200);
    expect(byId("nav").getAttribute("data-iv-hidden")).toBe("");
    scrollTo(120);
    expect(byId("nav").hasAttribute("data-iv-hidden")).toBe(false);
    scrollTo(400);
    expect(byId("nav").getAttribute("data-iv-hidden")).toBe("");
    // Opening the panel brings the header back and pins it there.
    navbar.open();
    expect(byId("nav").hasAttribute("data-iv-hidden")).toBe(false);
    scrollTo(600);
    expect(byId("nav").hasAttribute("data-iv-hidden")).toBe(false);
  });

  it("resolves options as defaults < data-iv-* < JavaScript", () => {
    installMatchMedia({ wide: true });
    byId("nav").setAttribute("data-iv-condense-at", "60");
    byId("nav").setAttribute("data-iv-sticky", "true");
    const navbar = setup({ condenseAt: 90 });
    expect(navbar.options.sticky).toBe(true);
    expect(navbar.options.condenseAt).toBe(90);
    expect(navbar.options.collapseBelow).toBe("lg");
  });

  it("init is idempotent and destroy leaves the served markup", () => {
    const media = installMatchMedia({ wide: false });
    const first = Navbar.initAll(document);
    const again = Navbar.initAll(document);
    expect(first).toHaveLength(1);
    expect(again).toHaveLength(0);
    expect(Navbar.get(byId("nav"))).toBe(first[0]);
    expect(Navbar.getOrCreate(byId("nav"))).toBe(first[0]);

    const navbar = first[0];
    navbar.open();
    const before = byId("nav").outerHTML;
    navbar.destroy();
    expect(Navbar.get(byId("nav"))).toBeUndefined();
    expect(byId("nav").outerHTML).not.toBe(before);
    expect(byId("toggle").hasAttribute("hidden")).toBe(true);
    expect(byId("toggle").getAttribute("aria-expanded")).toBe("false");
    expect(byId("nav").hasAttribute("data-iv-open")).toBe(false);
    expect(byId("nav").hasAttribute("data-iv-collapsible")).toBe(false);
    expect(media.listenerCount()).toBe(0);
    // The attribute order of the served toggle survives the round trip.
    expect(Array.from(byId("toggle").attributes).map((a) => a.name)).toEqual([
      "id",
      "class",
      "type",
      "hidden",
      "aria-expanded",
      "aria-controls",
    ]);
  });

  it("destroy puts the scroll padding back", () => {
    installMatchMedia({ wide: true });
    document.documentElement.style.setProperty("scroll-padding-block-start", "2rem");
    const navbar = setup({ sticky: true });
    expect(document.documentElement.style.getPropertyValue("scroll-padding-block-start")).toBe(
      "var(--iv-navbar-height, 4rem)"
    );
    navbar.destroy();
    expect(document.documentElement.style.getPropertyValue("scroll-padding-block-start")).toBe("2rem");
    expect(byId("nav").hasAttribute("data-iv-sticky")).toBe(false);
  });
});
