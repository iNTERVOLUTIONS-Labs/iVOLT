// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Picker } from "../../packages/ivolt/src/js/components/picker.js";
import { IvError } from "../../packages/ivolt/src/js/core/registry.js";

const SINGLE = `
  <form id="form">
    <div class="iv-field">
      <label class="iv-label" for="p-city">City</label>
      <div id="pk" class="iv-picker" data-iv-component="picker">
        <select class="iv-select" id="p-city" name="city">
          <option value="">Select a city</option>
          <option value="bcn">Barcelona</option>
          <option value="cor">Córdoba</option>
          <option value="grx">Granada</option>
          <option value="mad">Madrid</option>
          <option value="agp">Málaga</option>
          <option value="svq">Seville</option>
          <option value="vlc">Valencia</option>
          <option value="zaz" disabled>Zaragoza</option>
        </select>
      </div>
    </div>
  </form>
`;

const MULTIPLE = `
  <form id="form">
    <div class="iv-field">
      <label class="iv-label" for="p-langs">Languages</label>
      <div id="pk" class="iv-picker" data-iv-component="picker">
        <select class="iv-select" id="p-langs" name="langs" multiple>
          <optgroup label="Romance">
            <option value="es" selected>Spanish</option>
            <option value="fr">French</option>
            <option value="it">Italian</option>
          </optgroup>
          <optgroup label="Germanic">
            <option value="en">English</option>
            <option value="de" disabled>German</option>
          </optgroup>
        </select>
      </div>
    </div>
  </form>
`;

/**
 * @param {string} id Element id.
 * @returns {HTMLElement} The element.
 */
function byId(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}

/**
 * @param {string} markup Fixture markup.
 * @returns {void}
 */
function mount(markup) {
  document.body.innerHTML = markup;
}

/**
 * @param {Partial<Record<string, unknown>>} [options] Options passed in JavaScript.
 * @returns {{ pk: Picker, el: HTMLElement, select: HTMLSelectElement }} The fixture.
 */
function setup(options) {
  const el = byId("pk");
  const pk = new Picker(el, options);
  return {
    pk,
    el,
    select: /** @type {HTMLSelectElement} */ (el.querySelector("select")),
  };
}

/**
 * @param {Picker} pk The instance.
 * @returns {HTMLButtonElement} The generated control.
 */
function control(pk) {
  return /** @type {HTMLButtonElement} */ (
    pk.element.querySelector(".iv-picker__control")
  );
}

/**
 * @param {Picker} pk The instance.
 * @returns {HTMLInputElement|null} The search field, when there is one.
 */
function search(pk) {
  return /** @type {HTMLInputElement|null} */ (
    pk.element.querySelector(".iv-picker__search")
  );
}

/**
 * @param {Picker} pk The instance.
 * @returns {HTMLElement} The visual box around the chips and the control.
 */
function field(pk) {
  return /** @type {HTMLElement} */ (
    pk.element.querySelector(".iv-picker__field")
  );
}

/**
 * @param {Picker} pk The instance.
 * @returns {string} Text of the control.
 */
function label(pk) {
  return (control(pk).textContent ?? "").trim();
}

/**
 * @param {Picker} pk The instance.
 * @returns {HTMLElement[]} Rows carrying the highlight modifier.
 */
function active(pk) {
  return pk.optionElements.filter((el) =>
    el.classList.contains("iv-picker__option--active")
  );
}

/**
 * @param {Picker} pk The instance.
 * @returns {string[]} Text of the chips.
 */
function chips(pk) {
  return Array.from(pk.element.querySelectorAll(".iv-picker__chip-label")).map(
    (el) => el.textContent ?? ""
  );
}

/**
 * @param {Picker} pk The instance.
 * @returns {string[]} Text of the visible rows.
 */
function visibleText(pk) {
  return pk.optionElements
    .filter((el) => !el.hidden)
    .map((el) => el.textContent ?? "");
}

/**
 * @param {Element} target Event target.
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
 * @param {Element} target Event target.
 * @param {string} type Event type.
 * @returns {Event} The dispatched event.
 */
function fire(target, type) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

/**
 * @param {Picker} pk The instance.
 * @param {string} value Value of the row to click.
 * @returns {void}
 */
function clickRow(pk, value) {
  const row = pk.optionElements.find(
    (el) => (el.textContent ?? "").length > 0 && rowValue(pk, el) === value
  );
  if (!row) throw new Error(`No row for "${value}"`);
  fire(row, "pointerdown");
  fire(row, "click");
}

/**
 * @param {Picker} pk The instance.
 * @param {HTMLElement} row A row element.
 * @returns {string} The value the row stands for.
 */
function rowValue(pk, row) {
  const index = pk.optionElements.indexOf(row);
  const options = Array.from(pk.native.options).filter(
    (option) => option.value !== "" || pk.native.options.item(0) !== option
  );
  return options[index] ? options[index].value : "";
}

/** @returns {Promise<void>} Resolves after the next macrotask. */
function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("Picker", () => {
  beforeEach(() => {
    mount(SINGLE);
  });

  describe("promotion and teardown", () => {
    it("keeps the native select and builds the control and the popover", () => {
      const { pk, el, select } = setup();
      expect(select.parentElement).toBe(el);
      expect(select.classList.contains("iv-picker__native")).toBe(true);
      expect(select.getAttribute("tabindex")).toBe("-1");
      expect(select.getAttribute("aria-hidden")).toBe("true");
      const button = control(pk);
      expect(button.type).toBe("button");
      expect(button.getAttribute("aria-haspopup")).toBe("listbox");
      expect(button.getAttribute("aria-expanded")).toBe("false");
      const labelEl = /** @type {HTMLElement} */ (document.querySelector("label"));
      const value = /** @type {HTMLElement} */ (
        el.querySelector(".iv-picker__value")
      );
      expect(button.getAttribute("aria-labelledby")).toBe(
        `${labelEl.id} ${value.id}`
      );
      expect(labelEl.getAttribute("for")).toBe(button.id);
      const list = /** @type {HTMLElement} */ (el.querySelector(".iv-picker__list"));
      expect(list.getAttribute("role")).toBe("listbox");
      expect(list.hasAttribute("aria-multiselectable")).toBe(false);
      // The empty `<option value="">` becomes the placeholder, not a row.
      expect(pk.optionElements.length).toBe(8);
      expect(pk.optionElements[0].getAttribute("role")).toBe("option");
      expect(pk.optionElements[0].getAttribute("aria-selected")).toBe("false");
      expect(pk.optionElements[0].id).toBeTruthy();
    });

    it("restores the markup exactly on destroy, with a selection and after opening", () => {
      const field = /** @type {HTMLElement} */ (
        document.querySelector(".iv-field")
      );
      const before = field.innerHTML;
      const { pk } = setup();
      pk.select("mad");
      pk.open();
      pk.close();
      pk.destroy();
      expect(field.innerHTML).toBe(before);
      expect(pk.native.value).toBe("mad");
    });

    it("restores a multiple picker too, chips and all", () => {
      mount(MULTIPLE);
      const wrapper = /** @type {HTMLElement} */ (
        document.querySelector(".iv-field")
      );
      const before = wrapper.innerHTML;
      const { pk } = setup();
      pk.select("fr");
      pk.open();
      pk.close();
      pk.destroy();
      expect(wrapper.innerHTML).toBe(before);
      expect(pk.native.selectedOptions.length).toBe(2);
    });

    it("throws invalid-element without a select", () => {
      document.body.innerHTML = '<div id="empty" class="iv-picker"></div>';
      let error = null;
      try {
        new Picker(byId("empty"));
      } catch (err) {
        error = err;
      }
      expect(error).toBeInstanceOf(IvError);
      expect(/** @type {IvError} */ (error).code).toBe("invalid-element");
    });
  });

  describe("value and placeholder", () => {
    it("shows the text of the empty option as the placeholder", () => {
      const { pk, el } = setup();
      expect(
        /** @type {HTMLElement} */ (
          el.querySelector(".iv-picker__placeholder")
        ).textContent
      ).toBe("Select a city");
      expect(pk.value).toBe("");
    });

    it("takes options from attributes and lets JavaScript win", () => {
      const el = byId("pk");
      el.setAttribute("data-iv-placeholder", "Pick one");
      el.setAttribute("data-iv-empty-text", "Nothing here");
      const pk = new Picker(el, { emptyText: "None at all" });
      expect(
        /** @type {HTMLElement} */ (
          el.querySelector(".iv-picker__placeholder")
        ).textContent
      ).toBe("Pick one");
      expect(
        /** @type {HTMLElement} */ (el.querySelector(".iv-picker__empty"))
          .textContent
      ).toBe("None at all");
      expect(pk.options.placeholder).toBe("Pick one");
    });

    it("paints the selected label and clears back to the placeholder", () => {
      const { pk } = setup();
      pk.select("mad");
      expect(label(pk)).toBe("Madrid");
      expect(pk.value).toBe("mad");
      pk.clear();
      expect(label(pk)).toBe("Select a city");
      expect(pk.native.value).toBe("");
    });

    it("shows the clear button only with a selection, and not at all without clearable", () => {
      const { pk, el } = setup();
      const clear = /** @type {HTMLButtonElement} */ (
        el.querySelector(".iv-picker__clear")
      );
      expect(clear.hidden).toBe(true);
      pk.select("mad");
      expect(clear.hidden).toBe(false);
      expect(field(pk).hasAttribute("data-iv-has-clear")).toBe(true);
      clear.click();
      expect(pk.value).toBe("");
      pk.destroy();
      const plain = new Picker(el, { clearable: false });
      expect(el.querySelector(".iv-picker__clear")).toBeNull();
      plain.destroy();
    });
  });

  describe("search", () => {
    it("turns the field on above seven options and off when asked", () => {
      const { pk, el } = setup();
      expect(search(pk)).not.toBeNull();
      pk.destroy();
      const off = new Picker(el, { search: "off" });
      expect(search(off)).toBeNull();
      off.destroy();
    });

    it("stays off below the threshold unless it is forced", () => {
      mount(MULTIPLE);
      const { pk, el } = setup();
      expect(search(pk)).toBeNull();
      pk.destroy();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      el.setAttribute("data-iv-search", "on");
      const forced = new Picker(el);
      // `search` is a string in the contract, so the option grammar of §5.2
      // accepts the attribute without a single warning.
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
      expect(search(forced)).not.toBeNull();
      expect(
        /** @type {HTMLInputElement} */ (search(forced)).getAttribute(
          "aria-controls"
        )
      ).toBe(/** @type {HTMLElement} */ (el.querySelector(".iv-picker__list")).id);
      forced.destroy();
    });

    it("filters ignoring case and diacritics and shows the empty row", () => {
      const { pk } = setup();
      const field = /** @type {HTMLInputElement} */ (search(pk));
      pk.open();
      field.value = "cordoba";
      fire(field, "input");
      expect(visibleText(pk)).toEqual(["Córdoba"]);
      const empty = /** @type {HTMLElement} */ (
        pk.element.querySelector(".iv-picker__empty")
      );
      expect(empty.hidden).toBe(true);
      field.value = "zzz";
      fire(field, "input");
      expect(visibleText(pk)).toEqual([]);
      expect(empty.hidden).toBe(false);
      pk.close();
      expect(visibleText(pk).length).toBe(8);
    });

    it("hides a group once every row inside it is filtered out", () => {
      mount(MULTIPLE);
      const { pk, el } = setup({ search: "on" });
      const field = /** @type {HTMLInputElement} */ (search(pk));
      pk.open();
      field.value = "english";
      fire(field, "input");
      const groups = Array.from(el.querySelectorAll(".iv-picker__group"));
      expect(groups.length).toBe(2);
      expect(/** @type {HTMLElement} */ (groups[0]).hidden).toBe(true);
      expect(/** @type {HTMLElement} */ (groups[1]).hidden).toBe(false);
      expect(groups[0].getAttribute("role")).toBe("group");
      const caption = /** @type {HTMLElement} */ (
        groups[0].querySelector(".iv-picker__group-label")
      );
      expect(groups[0].getAttribute("aria-labelledby")).toBe(caption.id);
      expect(caption.textContent).toBe("Romance");
    });
  });

  describe("keyboard", () => {
    it("opens with ArrowDown, highlights the selection and announces it", () => {
      const { pk } = setup({ search: "off" });
      pk.select("mad");
      const button = control(pk);
      press(button, "ArrowDown");
      expect(pk.isOpen).toBe(true);
      const active = pk.optionElements.find((el) =>
        el.classList.contains("iv-picker__option--active")
      );
      expect(active?.textContent).toBe("Madrid");
      expect(button.getAttribute("aria-activedescendant")).toBe(active?.id);
      press(button, "ArrowDown");
      expect(button.getAttribute("aria-activedescendant")).toBe(
        pk.optionElements[4].id
      );
    });

    it("wraps with the arrows, skipping disabled rows, and jumps with Home and End", () => {
      const { pk } = setup({ search: "off" });
      const button = control(pk);
      press(button, "ArrowUp");
      // Zaragoza is disabled, so the last navigable row is Valencia.
      expect(
        pk.optionElements.find((el) => el.classList.contains("iv-picker__option--active"))
          ?.textContent
      ).toBe("Valencia");
      press(button, "ArrowDown");
      expect(
        pk.optionElements.find((el) => el.classList.contains("iv-picker__option--active"))
          ?.textContent
      ).toBe("Barcelona");
      press(button, "End");
      expect(
        pk.optionElements.find((el) => el.classList.contains("iv-picker__option--active"))
          ?.textContent
      ).toBe("Valencia");
      press(button, "Home");
      expect(
        pk.optionElements.find((el) => el.classList.contains("iv-picker__option--active"))
          ?.textContent
      ).toBe("Barcelona");
    });

    it("selects with Enter and with Space from the control", () => {
      const { pk } = setup({ search: "off" });
      const button = control(pk);
      press(button, " ");
      expect(pk.isOpen).toBe(true);
      press(button, "Enter");
      expect(pk.value).toBe("bcn");
      expect(pk.isOpen).toBe(false);
    });

    it("closes with Escape returning focus, and with Tab", () => {
      const { pk } = setup({ search: "off" });
      const button = control(pk);
      button.focus();
      press(button, "ArrowDown");
      const escape = press(button, "Escape");
      expect(pk.isOpen).toBe(false);
      expect(escape.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(button);
      // Closed, Escape is never cancelled: a parent dialog still gets it.
      expect(press(button, "Escape").defaultPrevented).toBe(false);
      press(button, "ArrowDown");
      const tab = press(button, "Tab");
      expect(pk.isOpen).toBe(false);
      expect(tab.defaultPrevented).toBe(false);
    });

    it("types from the control into the search field", () => {
      const { pk } = setup();
      const button = control(pk);
      const event = press(button, "g");
      expect(event.defaultPrevented).toBe(true);
      expect(pk.isOpen).toBe(true);
      const field = /** @type {HTMLInputElement} */ (search(pk));
      expect(field.value).toBe("g");
      expect(document.activeElement).toBe(field);
      expect(visibleText(pk)).toEqual(["Granada", "Málaga", "Zaragoza"]);
      // The highlight follows the filter and is announced on the search field.
      expect(field.getAttribute("aria-activedescendant")).toBe(
        pk.optionElements.find((el) => !el.hidden)?.id
      );
      expect(button.hasAttribute("aria-activedescendant")).toBe(false);
      press(field, "Enter");
      expect(pk.value).toBe("grx");
    });

    it("removes the last chip with Backspace in a multiple picker", () => {
      mount(MULTIPLE);
      const { pk } = setup();
      pk.select("en");
      expect(chips(pk)).toEqual(["Spanish", "English"]);
      const event = press(control(pk), "Backspace");
      expect(event.defaultPrevented).toBe(true);
      expect(chips(pk)).toEqual(["Spanish"]);
      expect(pk.value).toEqual(["es"]);
      press(control(pk), "Backspace");
      expect(pk.value).toEqual([]);
      expect(press(control(pk), "Backspace").defaultPrevented).toBe(false);
    });
  });

  describe("selection", () => {
    it("writes into the native select and dispatches input and change", () => {
      const { pk, select } = setup();
      /** @type {string[]} */
      const seen = [];
      select.addEventListener("input", () => seen.push("input"));
      select.addEventListener("change", () => seen.push("change"));
      /** @type {unknown[]} */
      const details = [];
      pk.element.addEventListener("iv:change", (event) =>
        details.push(/** @type {CustomEvent} */ (event).detail)
      );
      pk.element.addEventListener("iv:changed", () => details.push("changed"));
      pk.open();
      clickRow(pk, "mad");
      expect(select.value).toBe("mad");
      expect(
        Array.from(select.options).find((option) => option.value === "mad")
          ?.selected
      ).toBe(true);
      expect(seen).toEqual(["input", "change"]);
      expect(details[0]).toMatchObject({
        value: "mad",
        added: ["mad"],
        removed: [],
      });
      expect(details[1]).toBe("changed");
      expect(pk.isOpen).toBe(false); // closeOnSelect defaults to true here.
    });

    it("changes nothing when iv:change is cancelled", () => {
      const { pk, select } = setup();
      pk.element.addEventListener("iv:change", (event) => event.preventDefault());
      /** @type {string[]} */
      const after = [];
      pk.element.addEventListener("iv:changed", () => after.push("changed"));
      pk.select("mad");
      expect(select.value).toBe("");
      expect(pk.value).toBe("");
      expect(after).toEqual([]);
      expect(label(pk)).toBe("Select a city");
    });

    it("toggles without closing in a multiple picker and reports added and removed", () => {
      mount(MULTIPLE);
      const { pk, select } = setup();
      expect(pk.options.closeOnSelect).toBe(false);
      expect(
        /** @type {HTMLElement} */ (
          pk.element.querySelector(".iv-picker__list")
        ).getAttribute("aria-multiselectable")
      ).toBe("true");
      /** @type {any[]} */
      const details = [];
      pk.element.addEventListener("iv:change", (event) =>
        details.push(/** @type {CustomEvent} */ (event).detail)
      );
      pk.open();
      clickRow(pk, "fr");
      expect(pk.isOpen).toBe(true);
      expect(pk.value).toEqual(["es", "fr"]);
      expect(details[0].added).toEqual(["fr"]);
      clickRow(pk, "es");
      expect(pk.value).toEqual(["fr"]);
      expect(details[1].removed).toEqual(["es"]);
      expect(select.selectedOptions.length).toBe(1);
    });

    it("ignores disabled rows and honours maxItems", () => {
      mount(MULTIPLE);
      const el = byId("pk");
      el.setAttribute("data-iv-max-items", "2");
      const pk = new Picker(el);
      const disabled = pk.optionElements.find(
        (row) => row.textContent === "German"
      );
      expect(disabled?.getAttribute("aria-disabled")).toBe("true");
      pk.open();
      clickRow(pk, "de");
      expect(pk.value).toEqual(["es"]);
      pk.select("fr");
      expect(pk.value).toEqual(["es", "fr"]);
      const blocked = pk.optionElements.find(
        (row) => row.textContent === "Italian"
      );
      expect(blocked?.getAttribute("aria-disabled")).toBe("true");
      clickRow(pk, "it");
      expect(pk.value).toEqual(["es", "fr"]);
      pk.deselect("fr");
      expect(blocked?.getAttribute("aria-disabled")).toBeNull();
    });

    it("closes on select when the attribute says so", () => {
      mount(MULTIPLE);
      const el = byId("pk");
      el.setAttribute("data-iv-close-on-select", "true");
      const pk = new Picker(el);
      pk.open();
      clickRow(pk, "fr");
      expect(pk.isOpen).toBe(false);
    });
  });

  describe("native synchronisation", () => {
    it("repaints after a change made on the select itself", () => {
      const { pk, select } = setup();
      const option = Array.from(select.options).find(
        (entry) => entry.value === "svq"
      );
      if (option) option.selected = true;
      fire(select, "change");
      expect(label(pk)).toBe("Seville");
      expect(
        pk.optionElements.find((row) => row.textContent === "Seville")
          ?.getAttribute("aria-selected")
      ).toBe("true");
    });

    it("repaints after the form is reset", async () => {
      const { pk } = setup();
      pk.select("mad");
      expect(label(pk)).toBe("Madrid");
      /** @type {HTMLFormElement} */ (byId("form")).reset();
      await tick();
      expect(label(pk)).toBe("Select a city");
      expect(pk.value).toBe("");
    });
  });

  describe("open and close", () => {
    it("emits the cancelable pairs and stays closed when iv:open is cancelled", () => {
      const { pk } = setup();
      /** @type {string[]} */
      const seen = [];
      for (const name of ["open", "opened", "close", "closed"]) {
        pk.element.addEventListener(`iv:${name}`, () => seen.push(name));
      }
      pk.open();
      expect(seen).toEqual(["open", "opened"]);
      expect(control(pk).getAttribute("aria-expanded")).toBe("true");
      pk.close();
      expect(seen).toEqual(["open", "opened", "close", "closed"]);
      expect(control(pk).getAttribute("aria-expanded")).toBe("false");
      pk.element.addEventListener("iv:open", (event) => event.preventDefault());
      pk.open();
      expect(pk.isOpen).toBe(false);
    });

    it("toggles with a click on the control and closes on an outside pointer", () => {
      const { pk } = setup();
      control(pk).click();
      expect(pk.isOpen).toBe(true);
      fire(document.body, "pointerdown");
      expect(pk.isOpen).toBe(false);
      control(pk).click();
      expect(pk.isOpen).toBe(true);
      fire(
        /** @type {HTMLElement} */ (pk.element.querySelector(".iv-picker__list")),
        "pointerdown"
      );
      expect(pk.isOpen).toBe(true);
      control(pk).click();
      expect(pk.isOpen).toBe(false);
      // The outside listener only exists while the popover is open.
      fire(document.body, "pointerdown");
      expect(pk.isOpen).toBe(false);
    });

    it("flips above the control when there is no room below", () => {
      const { pk } = setup();
      const box = field(pk);
      box.getBoundingClientRect = () =>
        /** @type {DOMRect} */ ({ top: 700, bottom: 740, height: 40 });
      Object.defineProperty(pk.element.querySelector(".iv-picker__popover"), "offsetHeight", {
        configurable: true,
        value: 300,
      });
      pk.open();
      expect(
        /** @type {HTMLElement} */ (
          pk.element.querySelector(".iv-picker__popover")
        ).getAttribute("data-iv-placement")
      ).toBe("top");
    });
  });

  describe("chips", () => {
    it("removes one chip with its button and names it for assistive tech", () => {
      mount(MULTIPLE);
      const { pk } = setup();
      pk.select("en");
      const remove = /** @type {HTMLButtonElement} */ (
        pk.element.querySelectorAll(".iv-picker__chip-remove")[1]
      );
      expect(remove.getAttribute("aria-label")).toBe("Remove English");
      remove.click();
      expect(chips(pk)).toEqual(["Spanish"]);
      // Removing a chip never opens the popover.
      expect(pk.isOpen).toBe(false);
    });

    it("keeps the chips beside the control, never inside it", () => {
      mount(MULTIPLE);
      const { pk } = setup();
      const box = field(pk);
      const list = /** @type {HTMLElement} */ (
        pk.element.querySelector(".iv-picker__chips")
      );
      expect(list.tagName).toBe("UL");
      expect(list.parentElement).toBe(box);
      expect(control(pk).parentElement).toBe(box);
      expect(control(pk).querySelector(".iv-picker__chip")).toBeNull();
      expect(control(pk).querySelector("button")).toBeNull();
      const chip = /** @type {HTMLElement} */ (list.firstElementChild);
      expect(chip.tagName).toBe("LI");
      expect(chip.querySelector(".iv-picker__chip-remove")).not.toBeNull();
      expect(box.contains(/** @type {Node} */ (
        pk.element.querySelector(".iv-picker__clear")
      ))).toBe(true);
    });

    it("names the selection by counting it, with countText", () => {
      mount(MULTIPLE);
      const el = byId("pk");
      el.setAttribute("data-iv-count-text", "{count} languages");
      const pk = new Picker(el);
      expect(label(pk)).toBe("1 languages");
      pk.select("fr");
      expect(label(pk)).toBe("2 languages");
      expect(chips(pk)).toEqual(["Spanish", "French"]);
      pk.clear();
      expect(label(pk)).toBe("Select…");
      expect(
        /** @type {HTMLElement} */ (
          pk.element.querySelector(".iv-picker__chips")
        ).hidden
      ).toBe(true);
      pk.destroy();
    });

    it("uses the default count text and hides the chips when empty", () => {
      mount(MULTIPLE);
      const { pk } = setup();
      expect(label(pk)).toBe("1 selected");
      pk.select("fr");
      expect(label(pk)).toBe("2 selected");
    });
  });
});
