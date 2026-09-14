// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Form } from "../../packages/ivolt/src/js/components/form.js";
import { IvError } from "../../packages/ivolt/src/js/core/registry.js";

const MARKUP = `
  <form id="f" class="iv-form" data-iv-component="form" action="#">
    <div class="iv-field" id="field-name">
      <label class="iv-label" for="name">Full name</label>
      <input class="iv-input" id="name" name="name" type="text" required minlength="3" pattern="[A-Za-z ]{3,}"
        data-iv-error-value-missing="Enter the name for the invoice."
        data-iv-error-too-short="Use at least 3 characters."
        data-iv-error-pattern-mismatch="Use at least 3 letters, and letters only.">
    </div>
    <div class="iv-field" id="field-email">
      <label class="iv-label" for="email">Work email</label>
      <input class="iv-input" id="email" name="email" type="email" required aria-describedby="email-help"
        data-iv-error="Check this address.">
      <p class="iv-field__help" id="email-help">We only use it for the demo.</p>
    </div>
    <div class="iv-field" id="field-age">
      <label class="iv-label" for="age">Age</label>
      <input class="iv-input" id="age" name="age" type="number" min="18">
    </div>
    <button type="submit">Send</button>
  </form>
`;

const SERVED_ERROR = `
  <form id="g" class="iv-form" data-iv-component="form">
    <div class="iv-field" id="field-city">
      <label class="iv-label" for="city">City</label>
      <input class="iv-input" id="city" name="city" required aria-describedby="city-error">
      <p class="iv-field__error" id="city-error" hidden></p>
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
 * @returns {HTMLFormElement} The form under test.
 */
function form() {
  return /** @type {HTMLFormElement} */ (byId("f"));
}

/**
 * @param {string} id Control id.
 * @returns {HTMLInputElement} The control.
 */
function input(id) {
  return /** @type {HTMLInputElement} */ (byId(id));
}

/**
 * Dispatches a submit the way a real button does, and reports whether the
 * component stopped it.
 *
 * @param {HTMLFormElement} el The form.
 * @returns {boolean} `true` when the submit was prevented.
 */
function submit(el) {
  const event = new Event("submit", { bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event.defaultPrevented;
}

/** @type {Form[]} */
let instances = [];

/**
 * @param {Element} el Host element.
 * @param {Record<string, unknown>} [options] Options passed in JavaScript.
 * @returns {Form} The instance, registered for cleanup.
 */
function create(el, options) {
  const instance = new Form(el, options);
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

describe("Form: lifecycle", () => {
  it("rejects an element that is not a form", () => {
    const div = document.createElement("div");
    expect(() => new Form(div)).toThrow(IvError);
    try {
      new Form(div);
    } catch (error) {
      expect(/** @type {IvError} */ (error).code).toBe("invalid-element");
    }
  });

  it("adds novalidate and removes it again", () => {
    const instance = create(form());
    expect(form().hasAttribute("novalidate")).toBe(true);
    instance.destroy();
    expect(form().hasAttribute("novalidate")).toBe(false);
  });

  it("restores the served markup after errors and a failed submit", () => {
    const before = form().outerHTML;
    const instance = create(form(), { summary: true });
    submit(form());
    input("name").value = "Dave";
    instance.validateField(input("name"));
    instance.destroy();
    expect(form().outerHTML).toBe(before);
  });

  it("restores a served error element with its text and its hidden state", () => {
    document.body.innerHTML = SERVED_ERROR;
    const el = /** @type {HTMLFormElement} */ (byId("g"));
    const before = el.outerHTML;
    const instance = new Form(el);
    instance.validate();
    const served = byId("city-error");
    expect(served.hasAttribute("hidden")).toBe(false);
    expect(served.textContent).not.toBe("");
    expect(input("city").getAttribute("aria-describedby")).toBe("city-error");
    instance.destroy();
    expect(el.outerHTML).toBe(before);
  });

  it("is idempotent: a second instance on the same element throws", () => {
    create(form());
    expect(() => new Form(form())).toThrow(IvError);
  });
});

describe("Form: messages", () => {
  it("takes the message of the failing validity key", () => {
    const instance = create(form());
    instance.validateField(input("name"));
    expect(byId("field-name").querySelector(".iv-field__error")?.textContent).toBe(
      "Enter the name for the invoice."
    );
    // `minlength` only fires for a value the user edited, so the second key of
    // the same control is exercised through `pattern`.
    input("name").value = "ab";
    instance.validateField(input("name"));
    expect(byId("field-name").querySelector(".iv-field__error")?.textContent).toBe(
      "Use at least 3 letters, and letters only."
    );
  });

  it("falls back to the generic attribute and then to the browser message", () => {
    const instance = create(form());
    instance.validate();
    expect(byId("field-email").querySelector(".iv-field__error")?.textContent).toBe(
      "Check this address."
    );
    input("age").value = "7";
    instance.validateField(input("age"));
    const message = byId("field-age").querySelector(".iv-field__error")?.textContent;
    expect(message).toBe(input("age").validationMessage);
    expect(message).not.toBe("");
  });

  it("lets a listener of iv:validate set or clear the message", () => {
    const instance = create(form());
    const taken = /** @type {EventListener} */ (
      (event) => {
        const detail = /** @type {CustomEvent} */ (event).detail;
        if (detail.control.id === "name") detail.setError("That name is taken.");
      }
    );
    input("name").value = "Dave";
    form().addEventListener("iv:validate", taken);
    expect(instance.validateField(input("name"))).toBe(false);
    expect(byId("field-name").querySelector(".iv-field__error")?.textContent).toBe(
      "That name is taken."
    );
    form().removeEventListener("iv:validate", taken);
    form().addEventListener("iv:validate", /** @type {EventListener} */ (
      (event) => /** @type {CustomEvent} */ (event).detail.setError("")
    ));
    input("name").value = "";
    expect(instance.validateField(input("name"))).toBe(true);
    expect(byId("field-name").classList.contains("iv-field--invalid")).toBe(false);
  });

  it("carries the control and the message in the event detail", () => {
    const instance = create(form());
    /** @type {CustomEvent[]} */
    const seen = [];
    form().addEventListener("iv:validate", /** @type {EventListener} */ (
      (event) => seen.push(/** @type {CustomEvent} */ (event))
    ));
    instance.validateField(input("name"));
    expect(seen).toHaveLength(1);
    expect(seen[0].detail.control).toBe(input("name"));
    expect(seen[0].detail.message).toBe("Enter the name for the invoice.");
    expect(seen[0].detail.instance).toBe(instance);
  });
});

describe("Form: state", () => {
  it("marks the field invalid and links the message once", () => {
    const instance = create(form());
    instance.validate();
    const email = input("email");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(byId("field-email").classList.contains("iv-field--invalid")).toBe(true);
    const described = (email.getAttribute("aria-describedby") ?? "").split(" ");
    expect(described[0]).toBe("email-help");
    expect(described).toHaveLength(2);
    const error = byId("field-email").querySelector(".iv-field__error");
    expect(error?.getAttribute("role")).toBe("alert");
    expect(error?.getAttribute("aria-live")).toBe("polite");
    expect(described[1]).toBe(error?.id);
    instance.validate();
    expect((email.getAttribute("aria-describedby") ?? "").split(" ")).toHaveLength(2);
  });

  it("marks a touched control that holds a valid value", () => {
    const instance = create(form());
    instance.validate();
    input("name").value = "Dave";
    instance.validateField(input("name"));
    expect(byId("field-name").classList.contains("iv-field--invalid")).toBe(false);
    expect(byId("field-name").classList.contains("iv-field--valid")).toBe(true);
    expect(input("name").hasAttribute("aria-invalid")).toBe(false);
    expect(input("name").getAttribute("aria-describedby")).toBe(null);
  });

  it("does not use aria-live when live is off", () => {
    const instance = create(form(), { live: false });
    instance.validate();
    const error = byId("field-name").querySelector(".iv-field__error");
    expect(error?.getAttribute("aria-live")).toBe("off");
  });

  it("clears every state with reset()", () => {
    const instance = create(form(), { summary: true });
    instance.validate();
    expect(instance.errors).toHaveLength(2);
    instance.reset();
    expect(instance.errors).toHaveLength(0);
    expect(byId("field-name").className).toBe("iv-field");
    expect(input("email").getAttribute("aria-describedby")).toBe("email-help");
    expect(byId("f").querySelector(".iv-form__summary")?.hasAttribute("hidden")).toBe(true);
  });

  it("clears every state when the form is reset", () => {
    const instance = create(form());
    instance.validate();
    form().dispatchEvent(new Event("reset", { bubbles: true, cancelable: true }));
    expect(instance.errors).toHaveLength(0);
  });
});

describe("Form: summary", () => {
  it("lists the errors as links and focuses the control", () => {
    const instance = create(form(), { summary: true, summaryTitle: "Fix these" });
    instance.validate();
    const summary = /** @type {HTMLElement} */ (form().querySelector(".iv-form__summary"));
    expect(summary).toBeTruthy();
    expect(summary.getAttribute("role")).toBe("alert");
    expect(summary.getAttribute("tabindex")).toBe("-1");
    expect(summary.hasAttribute("hidden")).toBe(false);
    expect(summary.querySelector(".iv-form__summary-title")?.textContent).toBe("Fix these");
    const links = summary.querySelectorAll("a");
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("#name");
    expect(links[0].textContent).toBe("Full name: Enter the name for the invoice.");
    links[0].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(input("name"));
    input("name").value = "Dave";
    input("email").value = "dave@example.com";
    instance.validate();
    expect(summary.hasAttribute("hidden")).toBe(true);
  });

  it("focuses the summary after a failed submit", () => {
    create(form(), { summary: true });
    expect(submit(form())).toBe(true);
    expect(document.activeElement).toBe(form().querySelector(".iv-form__summary"));
  });
});

describe("Form: submit", () => {
  it("stops a failed submit, shakes the fields and reports the errors", () => {
    vi.useFakeTimers();
    const instance = create(form());
    /** @type {CustomEvent[]} */
    const seen = [];
    form().addEventListener("iv:invalid", /** @type {EventListener} */ (
      (event) => seen.push(/** @type {CustomEvent} */ (event))
    ));
    expect(submit(form())).toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen[0].detail.errors).toHaveLength(2);
    expect(seen[0].detail.errors[0].control).toBe(input("name"));
    expect(seen[0].detail.errors[0].message).toBe("Enter the name for the invoice.");
    expect(document.activeElement).toBe(input("name"));
    expect(byId("field-name").classList.contains("iv-shake")).toBe(true);
    vi.advanceTimersByTime(400);
    expect(byId("field-name").classList.contains("iv-shake")).toBe(false);
    expect(instance.errors).toHaveLength(2);
    vi.useRealTimers();
  });

  it("lets a valid submit through and can be held back by cancelling iv:valid", () => {
    create(form());
    input("name").value = "Dave";
    input("email").value = "dave@example.com";
    /** @type {CustomEvent[]} */
    const seen = [];
    form().addEventListener("iv:valid", /** @type {EventListener} */ (
      (event) => seen.push(/** @type {CustomEvent} */ (event))
    ));
    expect(submit(form())).toBe(false);
    expect(seen).toHaveLength(1);
    expect(seen[0].cancelable).toBe(true);
    form().addEventListener("iv:valid", /** @type {EventListener} */ (
      (event) => event.preventDefault()
    ));
    expect(submit(form())).toBe(true);
  });
});

describe("Form: validateOn", () => {
  it("blur: validates when the control loses the focus, then while typing", () => {
    create(form(), { validateOn: "blur" });
    input("name").dispatchEvent(new Event("input", { bubbles: true }));
    expect(input("name").hasAttribute("aria-invalid")).toBe(false);
    input("name").dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    expect(input("name").getAttribute("aria-invalid")).toBe("true");
    input("name").value = "Dave";
    input("name").dispatchEvent(new Event("input", { bubbles: true }));
    expect(input("name").hasAttribute("aria-invalid")).toBe(false);
  });

  it("input: validates on every entry", () => {
    create(form(), { validateOn: "input" });
    input("name").value = "ab";
    input("name").dispatchEvent(new Event("input", { bubbles: true }));
    expect(byId("field-name").querySelector(".iv-field__error")?.textContent).toBe(
      "Use at least 3 letters, and letters only."
    );
  });

  it("submit: ignores blur and typing", () => {
    create(form(), { validateOn: "submit" });
    input("name").dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    input("name").dispatchEvent(new Event("input", { bubbles: true }));
    expect(input("name").hasAttribute("aria-invalid")).toBe(false);
    expect(submit(form())).toBe(true);
    expect(input("name").getAttribute("aria-invalid")).toBe("true");
  });
});
