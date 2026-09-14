// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Stepper } from "../../packages/ivolt/src/js/components/stepper.js";
import { Form } from "../../packages/ivolt/src/js/components/form.js";

// The controls are served hidden: without JavaScript they do nothing, and
// `init` is what makes them worth showing.
const MARKUP = `
  <form id="form" class="iv-form" data-iv-component="form" novalidate>
    <div id="s" class="iv-stepper" data-iv-component="stepper">
      <ol class="iv-stepper__list" aria-label="Checkout">
        <li id="step-1" class="iv-stepper__step" data-iv-state="current">
          <a id="trigger-1" class="iv-stepper__trigger" href="#panel-1" aria-current="step">
            <span class="iv-stepper__marker" aria-hidden="true">1</span>
            <span id="label-1" class="iv-stepper__label">Account</span>
          </a>
        </li>
        <li id="step-2" class="iv-stepper__step">
          <a id="trigger-2" class="iv-stepper__trigger" href="#panel-2">
            <span class="iv-stepper__marker" aria-hidden="true">2</span>
            <span class="iv-stepper__label">Payment</span>
          </a>
        </li>
        <li id="step-3" class="iv-stepper__step">
          <a id="trigger-3" class="iv-stepper__trigger" href="#panel-3">
            <span class="iv-stepper__marker" aria-hidden="true">3</span>
            <span class="iv-stepper__label">Review</span>
          </a>
        </li>
      </ol>
      <div class="iv-stepper__panels">
        <section id="panel-1" class="iv-stepper__panel" aria-labelledby="title-1" tabindex="-1">
          <h3 id="title-1">Account</h3>
          <div class="iv-field">
            <label class="iv-label" for="email">Work email</label>
            <input class="iv-input" id="email" name="email" type="email" required>
          </div>
          <div id="controls-1" class="iv-stepper__controls" hidden>
            <button class="iv-button" type="button" data-iv-step="prev" disabled>Back</button>
            <button id="next-1" class="iv-button" type="button" data-iv-step="next">Continue</button>
          </div>
        </section>
        <section id="panel-2" class="iv-stepper__panel" aria-labelledby="title-2" tabindex="-1">
          <h3 id="title-2">Payment</h3>
          <div class="iv-field">
            <label class="iv-label" for="holder">Card holder</label>
            <input class="iv-input" id="holder" name="holder" type="text">
          </div>
          <div class="iv-stepper__controls" hidden>
            <button id="prev-2" class="iv-button" type="button" data-iv-step="prev">Back</button>
            <button id="next-2" class="iv-button" type="button" data-iv-step="next">Continue</button>
          </div>
        </section>
        <section id="panel-3" class="iv-stepper__panel" aria-labelledby="title-3" tabindex="-1">
          <h3 id="title-3">Review</h3>
          <div class="iv-stepper__controls" hidden>
            <button id="prev-3" class="iv-button" type="button" data-iv-step="prev">Back</button>
            <button id="next-3" class="iv-button" type="button" data-iv-step="next">Finish the demo</button>
          </div>
        </section>
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
 * @param {Element} target Event target.
 * @param {string} key `KeyboardEvent.key` value.
 * @returns {void}
 */
function press(target, key) {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

/**
 * @param {Partial<import("../../packages/ivolt/src/js/components/stepper.js").StepperOptions>} [options] Options.
 * @returns {Stepper} The instance.
 */
function setup(options) {
  return new Stepper(byId("s"), options);
}

describe("Stepper", () => {
  beforeEach(() => {
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    window.location.hash = "";
  });

  it("folds the panels, marks the states and shows the controls", () => {
    const stepper = setup();
    expect(stepper.index).toBe(0);
    expect(stepper.steps).toHaveLength(3);
    expect(stepper.isFirst).toBe(true);
    expect(stepper.isLast).toBe(false);
    expect(byId("panel-1").hasAttribute("hidden")).toBe(false);
    expect(byId("panel-2").getAttribute("hidden")).toBe("");
    expect(byId("step-1").getAttribute("data-iv-state")).toBe("current");
    expect(byId("step-2").getAttribute("data-iv-state")).toBe("upcoming");
    expect(byId("trigger-1").getAttribute("aria-current")).toBe("step");
    expect(byId("trigger-2").hasAttribute("aria-current")).toBe(false);
    expect(byId("controls-1").hasAttribute("hidden")).toBe(false);
    expect(byId("s").style.getPropertyValue("--iv-stepper-progress")).toBe("0");
    const status = byId("s").querySelector(".iv-stepper__status");
    expect(status).not.toBeNull();
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toBe("Step 1 of 3: Account");
  });

  it("linear: the steps ahead are not reachable from the index", () => {
    const stepper = setup();
    expect(byId("trigger-2").getAttribute("aria-disabled")).toBe("true");
    expect(byId("trigger-2").getAttribute("tabindex")).toBe("-1");
    byId("trigger-2").click();
    expect(stepper.index).toBe(0);
  });

  it("refuses to advance while the panel has an invalid control", () => {
    const stepper = setup();
    byId("next-1").click();
    expect(stepper.index).toBe(0);
    expect(byId("step-1").getAttribute("data-iv-state")).toBe("error");
    expect(byId("label-1").textContent).toContain("has errors");

    /** @type {HTMLInputElement} */ (byId("email")).value = "ada@example.org";
    byId("next-1").click();
    expect(stepper.index).toBe(1);
    expect(byId("step-1").getAttribute("data-iv-state")).toBe("done");
    expect(byId("label-1").textContent).not.toContain("has errors");
    expect(byId("panel-2").hasAttribute("hidden")).toBe(false);
    expect(byId("s").style.getPropertyValue("--iv-stepper-progress")).toBe("0.5");
    expect(document.activeElement).toBe(byId("panel-2"));
  });

  it("hands the validation to the Form instance when there is one", () => {
    new Form(byId("form"));
    const stepper = setup();
    byId("next-1").click();
    expect(stepper.index).toBe(0);
    expect(byId("email").closest(".iv-field").classList.contains("iv-field--invalid")).toBe(true);
    expect(byId("email").getAttribute("aria-invalid")).toBe("true");
  });

  it("validate: false advances without looking at the fields", () => {
    const stepper = setup({ validate: false });
    byId("next-1").click();
    expect(stepper.index).toBe(1);
  });

  it("emits iv:change and iv:changed, and a cancelled change stays put", () => {
    const stepper = setup({ validate: false });
    /** @type {string[]} */
    const seen = [];
    for (const type of ["change", "changed"]) {
      byId("s").addEventListener(`iv:${type}`, (event) => {
        seen.push(`${type}:${event.detail.reason}:${event.detail.previousIndex}->${event.detail.index}`);
        expect(event.detail.instance).toBe(stepper);
      });
    }
    byId("next-1").click();
    byId("prev-2").click();
    expect(seen).toEqual([
      "change:next:0->1",
      "changed:next:0->1",
      "change:prev:1->0",
      "changed:prev:1->0",
    ]);

    byId("s").addEventListener("iv:change", (event) => event.preventDefault(), { once: true });
    stepper.go(2);
    expect(stepper.index).toBe(0);
  });

  it("prev never validates and the index stays reachable once visited", () => {
    const stepper = setup({ validate: false });
    stepper.next();
    stepper.next();
    expect(stepper.index).toBe(2);
    expect(stepper.isLast).toBe(true);
    stepper.prev();
    expect(stepper.index).toBe(1);
    // Step three was reached, so its trigger stays active while going back.
    expect(byId("trigger-3").hasAttribute("aria-disabled")).toBe(false);
    byId("trigger-3").click();
    expect(stepper.index).toBe(2);
  });

  it("the last step completes instead of advancing", () => {
    const stepper = setup({ validate: false });
    stepper.go(2);
    /** @type {number[]} */
    const done = [];
    byId("s").addEventListener("iv:complete", (event) => done.push(event.detail.index));
    byId("next-3").click();
    expect(stepper.index).toBe(2);
    expect(done).toEqual([2]);
  });

  it("arrow keys, Home and End move the focus along the reachable steps", () => {
    const stepper = setup({ linear: false, validate: false });
    byId("trigger-1").focus();
    press(byId("trigger-1"), "ArrowRight");
    expect(document.activeElement).toBe(byId("trigger-2"));
    press(byId("trigger-2"), "End");
    expect(document.activeElement).toBe(byId("trigger-3"));
    press(byId("trigger-3"), "ArrowRight");
    expect(document.activeElement).toBe(byId("trigger-1"));
    press(byId("trigger-1"), "ArrowLeft");
    expect(document.activeElement).toBe(byId("trigger-3"));
    press(byId("trigger-3"), "Home");
    expect(document.activeElement).toBe(byId("trigger-1"));
    // Space activates the focused step, Enter is already a click on an anchor.
    press(byId("trigger-3"), " ");
    expect(stepper.index).toBe(2);
  });

  it("focus: none leaves the focus where it was", () => {
    const stepper = setup({ validate: false, focus: "none" });
    byId("next-1").click();
    expect(stepper.index).toBe(1);
    expect(document.activeElement).not.toBe(byId("panel-2"));
  });

  it("setState forces a state and reset clears everything", () => {
    const stepper = setup({ validate: false });
    stepper.next();
    stepper.setState(0, "error");
    expect(byId("step-1").getAttribute("data-iv-state")).toBe("error");
    stepper.reset();
    expect(stepper.index).toBe(0);
    expect(byId("step-1").getAttribute("data-iv-state")).toBe("current");
    expect(byId("step-2").getAttribute("data-iv-state")).toBe("upcoming");
    expect(byId("trigger-2").getAttribute("aria-disabled")).toBe("true");
  });

  it("hash: mirrors the panel and follows a hash change", () => {
    const stepper = setup({ validate: false, hash: true });
    stepper.next();
    expect(window.location.hash).toBe("#panel-2");
    window.location.hash = "#panel-1";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(stepper.index).toBe(0);
  });

  it("init is idempotent and destroy leaves the served markup", () => {
    const first = Stepper.initAll(document);
    const again = Stepper.initAll(document);
    expect(first).toHaveLength(1);
    expect(again).toHaveLength(0);
    expect(Stepper.get(byId("s"))).toBe(first[0]);
    expect(Stepper.getOrCreate(byId("s"))).toBe(first[0]);

    const stepper = first[0];
    stepper.setState(1, "error");
    stepper.destroy();
    expect(Stepper.get(byId("s"))).toBeUndefined();
    expect(byId("s").querySelector(".iv-stepper__status")).toBeNull();
    expect(byId("s").querySelectorAll("[hidden]")).toHaveLength(3);
    expect(byId("panel-1").hasAttribute("hidden")).toBe(false);
    expect(byId("panel-2").hasAttribute("hidden")).toBe(false);
    expect(byId("controls-1").getAttribute("hidden")).toBe("");
    expect(byId("step-1").getAttribute("data-iv-state")).toBe("current");
    expect(byId("step-2").hasAttribute("data-iv-state")).toBe(false);
    expect(byId("trigger-2").hasAttribute("aria-disabled")).toBe(false);
    expect(byId("s").style.getPropertyValue("--iv-stepper-progress")).toBe("");
    expect(byId("s").querySelectorAll(".iv-u-sr-only")).toHaveLength(0);
  });
});
