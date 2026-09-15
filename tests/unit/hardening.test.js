// @vitest-environment jsdom
/**
 * Adversarial hardening sweep over every shipped fixture: `init` must be
 * idempotent and `destroy` must hand the DOM back exactly as it was served.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { init, destroy } from "../../packages/ivolt/src/js/index.js";

// `import.meta.url` is the jsdom document URL in this environment; vitest runs from the repo root.
const FIXTURE_ROOT = join(process.cwd(), "packages", "ivolt", "fixtures");

/** @returns {{ dir: string, name: string, html: string }[]} Every shipped fixture. */
function allFixtures() {
  /** @type {{ dir: string, name: string, html: string }[]} */
  const out = [];
  for (const dir of readdirSync(FIXTURE_ROOT, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const file of readdirSync(join(FIXTURE_ROOT, dir.name))) {
      if (!file.endsWith(".html")) continue;
      out.push({
        dir: dir.name,
        name: file,
        html: readFileSync(join(FIXTURE_ROOT, dir.name, file), "utf8"),
      });
    }
  }
  return out;
}

/**
 * Installs the browser APIs jsdom lacks and the components rely on.
 *
 * @returns {void}
 */
function installBrowserStubs() {
  const proto =
    globalThis.HTMLDialogElement && globalThis.HTMLDialogElement.prototype;
  if (proto) {
    proto.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    proto.show = function show() {
      this.setAttribute("open", "");
    };
    proto.close = function close(value) {
      if (!this.hasAttribute("open")) return;
      this.returnValue = value ?? this.returnValue ?? "";
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
  if (typeof globalThis.matchMedia !== "function") {
    globalThis.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    });
    globalThis.window.matchMedia = globalThis.matchMedia;
  }
  if (typeof globalThis.IntersectionObserver !== "function") {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    };
    globalThis.window.IntersectionObserver = globalThis.IntersectionObserver;
  }
  if (typeof globalThis.ResizeObserver !== "function") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    globalThis.window.ResizeObserver = globalThis.ResizeObserver;
  }
  if (typeof Element.prototype.animate !== "function") {
    Element.prototype.animate = () => ({
      cancel() {},
      finish() {},
      addEventListener() {},
      removeEventListener() {},
      finished: Promise.resolve(),
    });
  }
  if (typeof globalThis.requestAnimationFrame !== "function") {
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  }
  if (typeof Element.prototype.scrollTo !== "function") {
    Element.prototype.scrollTo = () => {};
  }
  if (typeof Element.prototype.scrollIntoView !== "function") {
    Element.prototype.scrollIntoView = () => {};
  }
}

const fixtures = allFixtures();

describe("hardening sweep over the shipped fixtures", () => {
  beforeEach(() => {
    installBrowserStubs();
  });

  afterEach(() => {
    destroy(document);
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("finds the fixtures", () => {
    expect(fixtures.length).toBeGreaterThan(50);
  });

  for (const fixture of fixtures) {
    const id = `${fixture.dir}/${fixture.name}`;

    it(`${id}: init never throws and is idempotent`, () => {
      document.body.innerHTML = fixture.html;
      init(document.body);
      const afterFirst = document.body.innerHTML;
      const second = init(document.body);
      expect(second).toEqual([]);
      expect(document.body.innerHTML).toBe(afterFirst);
    });

    it(`${id}: destroy restores the served DOM`, () => {
      document.body.innerHTML = fixture.html;
      const served = document.body.innerHTML;
      init(document.body);
      destroy(document.body);
      expect(document.body.innerHTML).toBe(served);
    });

    it(`${id}: a second destroy is a no-op`, () => {
      document.body.innerHTML = fixture.html;
      init(document.body);
      destroy(document.body);
      const afterFirst = document.body.innerHTML;
      expect(() => destroy(document.body)).not.toThrow();
      expect(document.body.innerHTML).toBe(afterFirst);
    });
  }
});
