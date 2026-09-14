// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Combobox } from "../../packages/ivolt/src/js/components/combobox.js";
import { IvError } from "../../packages/ivolt/src/js/core/registry.js";

const MARKUP = `
  <div class="iv-field">
    <div id="cb" class="iv-combobox" data-iv-component="combobox">
      <label class="iv-label" for="c-city">City</label>
      <input class="iv-input iv-combobox__input" id="c-city" name="city" type="text" list="c-city-options" autocomplete="off">
      <datalist id="c-city-options">
        <option value="Córdoba"></option>
        <option value="León"></option>
        <option value="Madrid"></option>
        <option value="Málaga"></option>
        <option value="Sevilla"></option>
        <option value="Toledo" disabled></option>
      </datalist>
    </div>
    <p class="iv-field__help" id="c-city-help">Pick one.</p>
  </div>
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
 * @returns {{ cb: Combobox, el: HTMLElement, input: HTMLInputElement }} The fixture.
 */
function setup(options) {
  const el = byId("cb");
  const cb = new Combobox(el, options);
  return { cb, el, input: /** @type {HTMLInputElement} */ (byId("c-city")) };
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
 * Types text the way a user does: the value changes, then `input` fires.
 *
 * @param {HTMLInputElement} input The input.
 * @param {string} text New value.
 * @returns {void}
 */
function type(input, text) {
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * @param {Element} target Event target.
 * @param {string} type_ Event type.
 * @returns {Event} The dispatched event.
 */
function pointer(target, type_ = "pointerdown") {
  const event = new Event(type_, { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

/**
 * @param {Combobox} cb The instance.
 * @returns {HTMLElement[]} Visible option rows.
 */
function visible(cb) {
  return cb.optionElements.filter((el) => !el.hidden);
}

/**
 * @param {Combobox} cb The instance.
 * @returns {string[]} Text of the visible rows.
 */
function visibleText(cb) {
  return visible(cb).map((el) => el.textContent ?? "");
}

/**
 * @param {Combobox} cb The instance.
 * @returns {string|null} Text of the highlighted row.
 */
function highlighted(cb) {
  const row = cb.optionElements.find(
    (el) => el.getAttribute("aria-selected") === "true"
  );
  return row ? row.textContent : null;
}

describe("Combobox", () => {
  beforeEach(() => {
    document.body.innerHTML = MARKUP;
  });

  describe("promotion and teardown", () => {
    it("promotes the input and builds the listbox from the datalist", () => {
      const { cb, el, input } = setup();
      const list = /** @type {HTMLElement} */ (el.querySelector(".iv-combobox__list"));

      expect(input.getAttribute("role")).toBe("combobox");
      expect(input.getAttribute("aria-autocomplete")).toBe("list");
      expect(input.getAttribute("aria-expanded")).toBe("false");
      expect(input.getAttribute("aria-controls")).toBe(list.id);
      expect(input.hasAttribute("list")).toBe(false);
      expect(input.nextElementSibling).toBe(list);

      expect(list.getAttribute("role")).toBe("listbox");
      expect(list.hidden).toBe(true);
      expect(list.id).toMatch(/^iv-cb-\d+-list$/);
      expect(cb.optionElements).toHaveLength(6);
      expect(cb.optionElements[0].id).toMatch(/^iv-cb-\d+-opt-1$/);
      expect(cb.optionElements[0].getAttribute("role")).toBe("option");
      expect(cb.optionElements[0].getAttribute("aria-selected")).toBe("false");
      expect(cb.optionElements[0].textContent).toBe("Córdoba");
      expect(cb.optionElements[5].getAttribute("aria-disabled")).toBe("true");

      const empty = /** @type {HTMLElement} */ (el.querySelector(".iv-combobox__empty"));
      expect(empty.getAttribute("role")).toBe("option");
      expect(empty.getAttribute("aria-disabled")).toBe("true");
      expect(empty.textContent).toBe("No matches");
      expect(empty.hidden).toBe(true);
      expect(cb.isOpen).toBe(false);
      expect(cb.value).toBe("");
    });

    it("restores the markup exactly on destroy", () => {
      const before = document.body.innerHTML;
      const { cb, input } = setup();
      type(input, "ma");
      press(input, "ArrowDown");
      cb.destroy();
      input.value = "";
      expect(document.body.innerHTML).toBe(before);
    });

    it("keeps the attributes the author wrote", () => {
      const { cb, input } = setup();
      cb.destroy();
      expect(input.getAttribute("list")).toBe("c-city-options");
      expect(input.getAttribute("autocomplete")).toBe("off");
      expect(input.hasAttribute("role")).toBe(false);
      expect(input.hasAttribute("aria-expanded")).toBe(false);
      expect(input.hasAttribute("aria-activedescendant")).toBe(false);
    });

    it("names the listbox with the label of the input", () => {
      const { el } = setup();
      const list = /** @type {HTMLElement} */ (el.querySelector(".iv-combobox__list"));
      const label = /** @type {HTMLElement} */ (el.querySelector("label"));
      expect(list.getAttribute("aria-labelledby")).toBe(label.id);
      expect(label.id).toBeTruthy();
    });

    it("throws missing-target without a usable datalist", () => {
      byId("c-city").removeAttribute("list");
      expect(() => setup()).toThrow(IvError);
      try {
        setup();
      } catch (error) {
        expect(/** @type {IvError} */ (error).code).toBe("missing-target");
      }

      document.body.innerHTML = MARKUP;
      byId("c-city").setAttribute("list", "nowhere");
      try {
        setup();
        expect.unreachable();
      } catch (error) {
        expect(/** @type {IvError} */ (error).code).toBe("missing-target");
      }
    });
  });

  describe("filtering", () => {
    it("matches anywhere and ignores case and diacritics", () => {
      const { cb, input } = setup();
      type(input, "cor");
      expect(visibleText(cb)).toEqual(["Córdoba"]);
      type(input, "CÓRDOBA");
      expect(visibleText(cb)).toEqual(["Córdoba"]);
      type(input, "dri");
      expect(visibleText(cb)).toEqual(["Madrid"]);
      type(input, "ma");
      expect(visibleText(cb)).toEqual(["Madrid", "Málaga"]);
    });

    it("matches only the start with filter: starts", () => {
      const { cb, input } = setup({ filter: "starts" });
      type(input, "ma");
      expect(visibleText(cb)).toEqual(["Madrid", "Málaga"]);
      type(input, "mal");
      expect(visibleText(cb)).toEqual(["Málaga"]);
      type(input, "dri");
      expect(visibleText(cb)).toEqual([]);
    });

    it("shows the empty row with emptyText when nothing matches", () => {
      const { cb, el, input } = setup({ emptyText: "Nothing here" });
      const empty = /** @type {HTMLElement} */ (el.querySelector(".iv-combobox__empty"));
      expect(empty.textContent).toBe("Nothing here");
      type(input, "zzz");
      expect(empty.hidden).toBe(false);
      expect(cb.isOpen).toBe(true);
      type(input, "ma");
      expect(empty.hidden).toBe(true);
    });

    it("does not open while minChars is not reached, but the arrow does", () => {
      const { cb, input } = setup({ minChars: 2 });
      type(input, "m");
      expect(cb.isOpen).toBe(false);
      type(input, "ma");
      expect(cb.isOpen).toBe(true);
      type(input, "m");
      expect(cb.isOpen).toBe(false);
      press(input, "ArrowDown");
      expect(cb.isOpen).toBe(true);
      expect(highlighted(cb)).toBe("Madrid");
    });
  });

  describe("keyboard", () => {
    it("moves the highlight with the arrows, wrapping around", () => {
      const { cb, input } = setup();
      press(input, "ArrowDown");
      expect(cb.isOpen).toBe(true);
      expect(highlighted(cb)).toBe("Córdoba");
      expect(input.getAttribute("aria-activedescendant")).toBe(cb.optionElements[0].id);
      press(input, "ArrowDown");
      expect(highlighted(cb)).toBe("León");
      press(input, "ArrowUp");
      expect(highlighted(cb)).toBe("Córdoba");
      press(input, "ArrowUp");
      // Wraps to the last navigable row: "Toledo" is disabled.
      expect(highlighted(cb)).toBe("Sevilla");
    });

    it("jumps with Home and End and confirms with Enter", () => {
      const { cb, input } = setup();
      press(input, "ArrowDown");
      press(input, "End");
      expect(highlighted(cb)).toBe("Sevilla");
      press(input, "Home");
      expect(highlighted(cb)).toBe("Córdoba");
      const enter = press(input, "Enter");
      expect(enter.defaultPrevented).toBe(true);
      expect(cb.value).toBe("Córdoba");
      expect(input.value).toBe("Córdoba");
      expect(cb.isOpen).toBe(false);
      expect(input.hasAttribute("aria-activedescendant")).toBe(false);
    });

    it("lets Enter through when nothing is highlighted", () => {
      const { input } = setup();
      type(input, "ma");
      const enter = press(input, "Enter");
      expect(enter.defaultPrevented).toBe(false);
    });

    it("closes with Escape and restores with a second Escape in strict mode", () => {
      const { cb, input } = setup({ strict: true });
      press(input, "ArrowDown");
      press(input, "Enter");
      expect(cb.value).toBe("Córdoba");
      type(input, "zzz");
      expect(cb.isOpen).toBe(true);
      press(input, "Escape");
      expect(cb.isOpen).toBe(false);
      expect(input.value).toBe("zzz");
      press(input, "Escape");
      expect(input.value).toBe("Córdoba");
    });

    it("confirms on Tab only with autoselect", () => {
      const { cb, input } = setup({ autoselect: true });
      type(input, "ma");
      expect(highlighted(cb)).toBe("Madrid");
      const tab = press(input, "Tab");
      expect(tab.defaultPrevented).toBe(false);
      expect(cb.value).toBe("Madrid");
      expect(cb.isOpen).toBe(false);

      document.body.innerHTML = MARKUP;
      const plain = setup();
      type(plain.input, "ma");
      expect(highlighted(plain.cb)).toBe(null);
      press(plain.input, "Tab");
      expect(plain.cb.value).toBe("");
      expect(plain.cb.isOpen).toBe(false);
    });
  });

  describe("confirming", () => {
    it("selects by value and by element, with native and iv events", () => {
      const { cb, el, input } = setup();
      /** @type {string[]} */
      const seen = [];
      const native = vi.fn();
      el.addEventListener("iv:change", (event) => {
        const detail = /** @type {CustomEvent} */ (event).detail;
        seen.push(`change:${detail.value}:${detail.previousValue}`);
        expect(detail.option).toBe(cb.optionElements[2]);
      });
      el.addEventListener("iv:changed", (event) => {
        seen.push(`changed:${/** @type {CustomEvent} */ (event).detail.value}`);
      });
      input.addEventListener("input", native);
      input.addEventListener("change", native);

      cb.select("Madrid");
      expect(seen).toEqual(["change:Madrid:", "changed:Madrid"]);
      expect(input.value).toBe("Madrid");
      expect(cb.value).toBe("Madrid");
      expect(native).toHaveBeenCalledTimes(2);

      cb.select(cb.optionElements[2]);
      expect(seen).toHaveLength(2); // Already the confirmed value: no event.

      cb.select("Toledo"); // Disabled.
      expect(cb.value).toBe("Madrid");
    });

    it("confirms an option with the pointer without blurring the input", () => {
      const { cb, input } = setup();
      type(input, "ma");
      const row = visible(cb)[1];
      const event = pointer(row);
      expect(event.defaultPrevented).toBe(true);
      expect(cb.value).toBe("Málaga");
      expect(input.value).toBe("Málaga");
      expect(cb.isOpen).toBe(false);
    });

    it("clears the value", () => {
      const { cb, input } = setup();
      cb.select("Madrid");
      const native = vi.fn();
      input.addEventListener("change", native);
      cb.clear();
      expect(cb.value).toBe("");
      expect(input.value).toBe("");
      expect(native).toHaveBeenCalledTimes(1);
      expect(visibleText(cb)).toHaveLength(6);
    });

    it("changes nothing when iv:change is cancelled", () => {
      const { cb, el, input } = setup();
      el.addEventListener("iv:change", (event) => event.preventDefault());
      const changed = vi.fn();
      el.addEventListener("iv:changed", changed);
      cb.select("Madrid");
      expect(cb.value).toBe("");
      expect(input.value).toBe("");
      expect(changed).not.toHaveBeenCalled();
    });
  });

  describe("open and close", () => {
    it("emits the cancelable pair with a reason", () => {
      const { cb, el, input } = setup();
      /** @type {string[]} */
      const seen = [];
      for (const name of ["iv:open", "iv:opened", "iv:close", "iv:closed"]) {
        el.addEventListener(name, (event) => {
          seen.push(`${name}:${/** @type {CustomEvent} */ (event).detail.reason}`);
        });
      }
      cb.open();
      cb.close();
      expect(seen).toEqual(["iv:open:api", "iv:opened:api", "iv:close:api", "iv:closed:api"]);
      seen.length = 0;
      type(input, "ma");
      expect(seen).toEqual(["iv:open:trigger", "iv:opened:trigger"]);
      seen.length = 0;
      press(input, "Escape");
      expect(seen).toEqual(["iv:close:escape", "iv:closed:escape"]);
    });

    it("stays closed when iv:open is cancelled", () => {
      const { cb, el, input } = setup();
      el.addEventListener("iv:open", (event) => event.preventDefault());
      press(input, "ArrowDown");
      expect(cb.isOpen).toBe(false);
      expect(input.getAttribute("aria-expanded")).toBe("false");
      expect(highlighted(cb)).toBe(null);
    });

    it("closes on an outside pointer and listens only while open", () => {
      const { cb, el } = setup();
      /** @type {string[]} */
      const seen = [];
      el.addEventListener("iv:closed", (event) => {
        seen.push(/** @type {CustomEvent} */ (event).detail.reason);
      });
      pointer(document.body);
      expect(seen).toEqual([]);
      cb.open();
      pointer(document.body);
      expect(cb.isOpen).toBe(false);
      expect(seen).toEqual(["external"]);
      pointer(document.body);
      expect(seen).toEqual(["external"]);
    });

    it("keeps the list open when focus moves inside the component", () => {
      const { cb, el, input } = setup();
      cb.open();
      input.dispatchEvent(
        new FocusEvent("focusout", { bubbles: true, relatedTarget: el })
      );
      expect(cb.isOpen).toBe(true);
    });
  });

  describe("strict mode", () => {
    /**
     * @param {HTMLInputElement} input The input.
     * @returns {void}
     */
    function blur(input) {
      input.dispatchEvent(
        new FocusEvent("focusout", { bubbles: true, relatedTarget: document.body })
      );
    }

    it("restores the last valid value when the text matches nothing", () => {
      const { cb, input } = setup({ strict: true });
      cb.select("Madrid");
      type(input, "Mad");
      blur(input);
      expect(input.value).toBe("Madrid");
      expect(cb.value).toBe("Madrid");
      expect(cb.isOpen).toBe(false);
    });

    it("empties the input when nothing was ever confirmed", () => {
      const { cb, input } = setup({ strict: true });
      type(input, "zzz");
      blur(input);
      expect(input.value).toBe("");
      expect(cb.value).toBe("");
    });

    it("confirms an exact match typed by hand, ignoring case", () => {
      const { cb, input } = setup({ strict: true });
      type(input, "madrid");
      blur(input);
      expect(input.value).toBe("Madrid");
      expect(cb.value).toBe("Madrid");
    });

    it("leaves the text alone without strict", () => {
      const { cb, input } = setup();
      cb.select("Madrid");
      type(input, "Mad");
      blur(input);
      expect(input.value).toBe("Mad");
      expect(cb.value).toBe("Madrid");
    });
  });
});
