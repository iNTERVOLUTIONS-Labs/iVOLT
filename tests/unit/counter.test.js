// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Counter } from "../../packages/ivolt/src/js/components/counter.js";
import { IvError } from "../../packages/ivolt/src/js/core/registry.js";

const MARKUP = `
  <div class="iv-field" id="bio-field" data-iv-component="counter" data-iv-mode="chars">
    <label class="iv-label" for="bio">Bio</label>
    <textarea class="iv-textarea" id="bio" name="bio" maxlength="20" aria-describedby="bio-help"></textarea>
    <p class="iv-field__help" id="bio-help">Keep it short.</p>
  </div>
  <div class="iv-field" id="pitch-field" data-iv-component="counter" data-iv-mode="words" data-iv-max="4">
    <label class="iv-label" for="pitch">Pitch</label>
    <textarea class="iv-textarea" id="pitch" name="pitch"></textarea>
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
 * @param {string} id Control id.
 * @returns {HTMLTextAreaElement} The control.
 */
function area(id) {
  return /** @type {HTMLTextAreaElement} */ (byId(id));
}

/**
 * Types into a control the way a user does, event included.
 *
 * @param {string} id Control id.
 * @param {string} value New value.
 * @returns {void}
 */
function type(id, value) {
  area(id).value = value;
  area(id).dispatchEvent(new Event("input", { bubbles: true }));
}

/** @type {Counter[]} */
let instances = [];

/**
 * @param {Element} el Host element.
 * @param {Record<string, unknown>} [options] Options passed in JavaScript.
 * @returns {Counter} The instance, registered for cleanup.
 */
function create(el, options) {
  const instance = new Counter(el, options);
  instances.push(instance);
  return instance;
}

beforeEach(() => {
  document.body.innerHTML = MARKUP;
  instances = [];
});

afterEach(() => {
  for (const instance of instances) instance.destroy();
  instances = [];
  document.body.innerHTML = "";
});

describe("Counter: lifecycle", () => {
  it("rejects a container without a text control", () => {
    const div = document.createElement("div");
    expect(() => new Counter(div)).toThrow(IvError);
    try {
      new Counter(div);
    } catch (error) {
      expect(/** @type {IvError} */ (error).code).toBe("invalid-element");
    }
  });

  it("restores the served markup, the describedby and the validity", () => {
    const before = byId("pitch-field").outerHTML;
    const instance = create(byId("pitch-field"));
    type("pitch", "one two three four five six");
    expect(area("pitch").validity.customError).toBe(true);
    instance.destroy();
    expect(byId("pitch-field").outerHTML).toBe(before);
    expect(area("pitch").validity.customError).toBe(false);
  });

  it("appends the counter at the end of the field and links it", () => {
    create(byId("bio-field"));
    const field = byId("bio-field");
    const counter = /** @type {HTMLElement} */ (field.querySelector(".iv-counter"));
    expect(field.lastElementChild).toBe(counter);
    expect(counter.getAttribute("aria-live")).toBe("polite");
    const described = (area("bio").getAttribute("aria-describedby") ?? "").split(" ");
    expect(described).toEqual(["bio-help", counter.id]);
  });
});

describe("Counter: counting", () => {
  it("counts characters against the maxlength of the control", () => {
    const instance = create(byId("bio-field"));
    const counter = /** @type {HTMLElement} */ (byId("bio-field").querySelector(".iv-counter"));
    expect(instance.max).toBe(20);
    expect(counter.textContent).toBe("0 / 20");
    type("bio", "Hello");
    expect(instance.count).toBe(5);
    expect(counter.querySelector(".iv-counter__value")?.textContent).toBe("5");
    expect(counter.querySelector(".iv-counter__max")?.textContent).toBe("20");
  });

  it("counts words", () => {
    const instance = create(byId("pitch-field"));
    type("pitch", "  two   words  ");
    expect(instance.count).toBe(2);
    expect(instance.max).toBe(4);
  });

  it("replaces the three markers of the template", () => {
    create(byId("pitch-field"), { template: "{count} of {max}, {remaining} left" });
    const counter = /** @type {HTMLElement} */ (byId("pitch-field").querySelector(".iv-counter"));
    type("pitch", "one two");
    expect(counter.textContent).toBe("2 of 4, 2 left");
  });

  it("shows only the count when there is no limit", () => {
    const field = byId("pitch-field");
    field.removeAttribute("data-iv-max");
    create(field);
    const counter = /** @type {HTMLElement} */ (field.querySelector(".iv-counter"));
    type("pitch", "one two three");
    expect(counter.textContent).toBe("3");
  });
});

describe("Counter: states", () => {
  it("warns from warnAt of the limit", () => {
    create(byId("bio-field"), { warnAt: 0.5 });
    const counter = /** @type {HTMLElement} */ (byId("bio-field").querySelector(".iv-counter"));
    type("bio", "123456789");
    expect(counter.classList.contains("iv-counter--warn")).toBe(false);
    type("bio", "1234567890");
    expect(counter.classList.contains("iv-counter--warn")).toBe(true);
  });

  it("a hard limit only shows: no custom validity", () => {
    create(byId("bio-field"));
    const counter = /** @type {HTMLElement} */ (byId("bio-field").querySelector(".iv-counter"));
    // `maxlength` stops the user; a value set from a script can still go past it.
    type("bio", "123456789012345678901234567890");
    expect(counter.classList.contains("iv-counter--over")).toBe(true);
    expect(area("bio").validity.customError).toBe(false);
    expect(area("bio").hasAttribute("aria-invalid")).toBe(false);
  });

  it("a soft limit marks the control invalid and lets it recover", () => {
    create(byId("pitch-field"), { overText: "Trim it to 4 words." });
    const counter = /** @type {HTMLElement} */ (byId("pitch-field").querySelector(".iv-counter"));
    type("pitch", "one two three four five");
    expect(counter.classList.contains("iv-counter--over")).toBe(true);
    expect(counter.classList.contains("iv-counter--warn")).toBe(false);
    expect(area("pitch").validity.customError).toBe(true);
    expect(area("pitch").validationMessage).toBe("Trim it to 4 words.");
    expect(area("pitch").getAttribute("aria-invalid")).toBe("true");
    type("pitch", "one two three");
    expect(counter.classList.contains("iv-counter--over")).toBe(false);
    expect(area("pitch").validity.customError).toBe(false);
    expect(area("pitch").hasAttribute("aria-invalid")).toBe(false);
  });
});

describe("Counter: events", () => {
  it("emits iv:count on every update", () => {
    create(byId("pitch-field"));
    /** @type {CustomEvent[]} */
    const seen = [];
    byId("pitch-field").addEventListener("iv:count", /** @type {EventListener} */ (
      (event) => seen.push(/** @type {CustomEvent} */ (event))
    ));
    type("pitch", "one two three four five");
    expect(seen).toHaveLength(1);
    expect(seen[0].detail.count).toBe(5);
    expect(seen[0].detail.max).toBe(4);
    expect(seen[0].detail.remaining).toBe(-1);
    expect(seen[0].detail.over).toBe(true);
    type("pitch", "one");
    expect(seen[1].detail.over).toBe(false);
    expect(seen[1].detail.remaining).toBe(3);
  });
});
