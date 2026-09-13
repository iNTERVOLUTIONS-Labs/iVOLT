// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  resolveOptions,
  kebab,
  camel,
  resetWarnings,
} from "../../packages/ivolt/src/js/core/options.js";

const defaults = {
  closeOnBackdrop: true,
  max: 3,
  placement: "bottom-end",
  initialFocus: null,
};

/**
 * @param {string} html
 * @returns {Element}
 */
function el(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  const first = host.firstElementChild;
  if (!first) throw new Error("no element");
  return first;
}

describe("kebab/camel", () => {
  it("round-trips option names", () => {
    expect(kebab("closeOnBackdrop")).toBe("close-on-backdrop");
    expect(camel("close-on-backdrop")).toBe("closeOnBackdrop");
    expect(camel(kebab("initialFocus"))).toBe("initialFocus");
  });
});

describe("resolveOptions", () => {
  beforeEach(() => {
    resetWarnings();
  });

  it("returns the defaults when there is nothing else", () => {
    const opts = resolveOptions(el("<div></div>"), defaults);
    expect(opts).toEqual(defaults);
  });

  it("freezes the result", () => {
    const opts = resolveOptions(el("<div></div>"), defaults);
    expect(Object.isFrozen(opts)).toBe(true);
  });

  it("applies precedence defaults < data-iv-* < js", () => {
    const node = el(
      '<div data-iv-close-on-backdrop="false" data-iv-max="7" data-iv-placement="top"></div>'
    );
    const opts = resolveOptions(node, defaults, { placement: "left" });
    expect(opts.closeOnBackdrop).toBe(false);
    expect(opts.max).toBe(7);
    expect(opts.placement).toBe("left");
  });

  it("coerces booleans, numbers and strings", () => {
    const node = el(
      '<div data-iv-close-on-backdrop="true" data-iv-max="-2.5" data-iv-initial-focus="#name"></div>'
    );
    const opts = resolveOptions(node, defaults);
    expect(opts.closeOnBackdrop).toBe(true);
    expect(opts.max).toBe(-2.5);
    expect(opts.initialFocus).toBe("#name");
  });

  it("does not let an undefined js value override", () => {
    const node = el('<div data-iv-max="7"></div>');
    const opts = resolveOptions(node, defaults, { max: undefined });
    expect(opts.max).toBe(7);
  });

  it("ignores unknown keys from attributes and from js", () => {
    const node = el('<div data-iv-unknown-thing="1"></div>');
    const opts = resolveOptions(node, defaults, {
      /** @type {never} */ nope: true,
    });
    expect(Object.keys(opts).sort()).toEqual(Object.keys(defaults).sort());
  });

  it("warns once per component and option on a type mismatch", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const a = el('<div data-iv-component="dialog" data-iv-max="soon"></div>');
    const b = el('<div data-iv-component="dialog" data-iv-max="later"></div>');
    expect(resolveOptions(a, defaults).max).toBe(3);
    expect(resolveOptions(b, defaults).max).toBe(3);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("accepts a string for a null default", () => {
    const node = el('<div data-iv-initial-focus="input"></div>');
    expect(resolveOptions(node, defaults).initialFocus).toBe("input");
  });

  afterEach(() => {
    resetWarnings();
  });
});
