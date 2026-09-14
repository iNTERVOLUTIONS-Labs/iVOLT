// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Tabs } from "../../packages/ivolt/src/js/components/tabs.js";

const MARKUP = `
  <div id="t" class="iv-tabs" data-iv-component="tabs">
    <div class="iv-tabs__list" aria-label="Plans">
      <a class="iv-tabs__tab" href="#p-monthly" id="t-monthly">Monthly</a>
      <a class="iv-tabs__tab" href="#p-yearly" id="t-yearly">Yearly</a>
      <a class="iv-tabs__tab" href="#p-enterprise" id="t-enterprise">Enterprise</a>
    </div>
    <section class="iv-tabs__panel" id="p-monthly"><h3 class="iv-tabs__heading">Monthly</h3><p>29 € per seat.</p></section>
    <section class="iv-tabs__panel" id="p-yearly"><h3 class="iv-tabs__heading">Yearly</h3><p>24 € per seat.</p></section>
    <section class="iv-tabs__panel" id="p-enterprise"><h3 class="iv-tabs__heading">Enterprise</h3><p>Custom pricing.</p></section>
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
 * @param {Element} target Event target.
 * @param {string} key `KeyboardEvent.key` value.
 * @returns {void}
 */
function press(target, key) {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

/** @returns {Tabs} */
function setup(options) {
  return new Tabs(byId("t"), options);
}

describe("Tabs", () => {
  beforeEach(() => {
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("promotes the served HTML to the tabs pattern", () => {
    const tabs = setup();
    expect(document.querySelector(".iv-tabs__list").getAttribute("role")).toBe("tablist");
    expect(byId("t-monthly").getAttribute("role")).toBe("tab");
    expect(byId("t-monthly").getAttribute("aria-controls")).toBe("p-monthly");
    expect(byId("t-monthly").getAttribute("aria-selected")).toBe("true");
    expect(byId("t-monthly").getAttribute("tabindex")).toBe("0");
    expect(byId("t-yearly").getAttribute("aria-selected")).toBe("false");
    expect(byId("t-yearly").getAttribute("tabindex")).toBe("-1");
    expect(byId("p-monthly").getAttribute("role")).toBe("tabpanel");
    expect(byId("p-monthly").getAttribute("aria-labelledby")).toBe("t-monthly");
    expect(byId("p-monthly").getAttribute("tabindex")).toBe("0");
    expect(byId("p-monthly").hasAttribute("hidden")).toBe(false);
    expect(byId("p-yearly").hasAttribute("hidden")).toBe(true);
    expect(
      byId("p-monthly").querySelector(".iv-tabs__heading").classList.contains("iv-u-sr-only")
    ).toBe(true);
    expect(tabs.activeTab).toBe(byId("t-monthly"));
  });

  it("honours an author supplied aria-selected and aria-orientation", () => {
    byId("t-yearly").setAttribute("aria-selected", "true");
    const tabs = setup({ orientation: "vertical" });
    expect(tabs.activeTab).toBe(byId("t-yearly"));
    expect(byId("p-yearly").hasAttribute("hidden")).toBe(false);
    expect(byId("p-monthly").hasAttribute("hidden")).toBe(true);
    expect(document.querySelector(".iv-tabs__list").getAttribute("aria-orientation")).toBe("vertical");
  });

  it("selects on click and prevents the anchor navigation", () => {
    setup();
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    byId("t-yearly").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(byId("t-yearly").getAttribute("aria-selected")).toBe("true");
    expect(byId("p-yearly").hasAttribute("hidden")).toBe(false);
    expect(byId("p-monthly").hasAttribute("hidden")).toBe(true);
  });

  it("emits iv:change with tab, panel and previousTab, then iv:changed", () => {
    const tabs = setup();
    /** @type {string[]} */
    const seen = [];
    const el = byId("t");
    el.addEventListener("iv:change", (e) => {
      seen.push("change");
      expect(e.detail.tab).toBe(byId("t-yearly"));
      expect(e.detail.panel).toBe(byId("p-yearly"));
      expect(e.detail.previousTab).toBe(byId("t-monthly"));
    });
    el.addEventListener("iv:changed", () => seen.push("changed"));
    tabs.select("t-yearly");
    expect(seen).toEqual(["change", "changed"]);
  });

  it("a cancelled iv:change keeps the current tab", () => {
    const tabs = setup();
    const el = byId("t");
    const changed = vi.fn();
    el.addEventListener("iv:change", (e) => e.preventDefault());
    el.addEventListener("iv:changed", changed);
    tabs.select("t-yearly");
    expect(changed).not.toHaveBeenCalled();
    expect(tabs.activeTab).toBe(byId("t-monthly"));
    expect(byId("p-yearly").hasAttribute("hidden")).toBe(true);
  });

  it("moves and activates with the arrow keys, Home and End", () => {
    const tabs = setup();
    press(byId("t-monthly"), "ArrowRight");
    expect(tabs.activeTab).toBe(byId("t-yearly"));
    expect(document.activeElement).toBe(byId("t-yearly"));
    press(byId("t-yearly"), "ArrowLeft");
    expect(tabs.activeTab).toBe(byId("t-monthly"));
    press(byId("t-monthly"), "ArrowLeft");
    expect(tabs.activeTab).toBe(byId("t-enterprise")); // wraps
    press(byId("t-enterprise"), "Home");
    expect(tabs.activeTab).toBe(byId("t-monthly"));
    press(byId("t-monthly"), "End");
    expect(tabs.activeTab).toBe(byId("t-enterprise"));
  });

  it("uses the vertical arrows when orientation is vertical", () => {
    const tabs = setup({ orientation: "vertical" });
    press(byId("t-monthly"), "ArrowRight");
    expect(tabs.activeTab).toBe(byId("t-monthly"));
    press(byId("t-monthly"), "ArrowDown");
    expect(tabs.activeTab).toBe(byId("t-yearly"));
    press(byId("t-yearly"), "ArrowUp");
    expect(tabs.activeTab).toBe(byId("t-monthly"));
  });

  it("manual activation only moves focus until Enter or Space", () => {
    const tabs = setup({ activation: "manual" });
    press(byId("t-monthly"), "ArrowRight");
    expect(document.activeElement).toBe(byId("t-yearly"));
    expect(tabs.activeTab).toBe(byId("t-monthly"));
    press(byId("t-yearly"), "Enter");
    expect(tabs.activeTab).toBe(byId("t-yearly"));
    press(byId("t-yearly"), "ArrowRight");
    expect(tabs.activeTab).toBe(byId("t-yearly"));
    press(byId("t-enterprise"), " ");
    expect(tabs.activeTab).toBe(byId("t-enterprise"));
  });

  it("next and prev wrap around", () => {
    const tabs = setup();
    tabs.next();
    expect(tabs.activeTab).toBe(byId("t-yearly"));
    tabs.prev();
    expect(tabs.activeTab).toBe(byId("t-monthly"));
    tabs.prev();
    expect(tabs.activeTab).toBe(byId("t-enterprise"));
  });

  it("ignores tabs whose panel does not exist", () => {
    const list = document.querySelector(".iv-tabs__list");
    const orphan = document.createElement("a");
    orphan.className = "iv-tabs__tab";
    orphan.setAttribute("href", "#missing");
    list.append(orphan);
    setup();
    expect(orphan.hasAttribute("role")).toBe(false);
  });

  it("destroy restores the served HTML and releases listeners", () => {
    const before = byId("t").innerHTML;
    const tabs = setup();
    tabs.select("t-yearly");
    tabs.destroy();
    expect(byId("t").innerHTML).toBe(before);
    const spy = vi.fn();
    byId("t").addEventListener("iv:change", spy);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    byId("t-enterprise").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(Tabs.get(byId("t"))).toBeUndefined();
  });

  it("generates an id for a tab without one and removes it on destroy", () => {
    byId("t-monthly").removeAttribute("id");
    const tabs = setup();
    const tab = document.querySelector(".iv-tabs__tab");
    expect(tab.id).toMatch(/^iv-tab-\d+$/);
    expect(byId("p-monthly").getAttribute("aria-labelledby")).toBe(tab.id);
    tabs.destroy();
    expect(tab.hasAttribute("id")).toBe(false);
  });
});

describe("Tabs regressions", () => {
  beforeEach(() => {
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("cancels Space on a tab in automatic activation, so the page does not scroll", () => {
    const tabs = setup();
    const tab = byId("t-monthly");
    const event = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    tab.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(tab.getAttribute("aria-selected")).toBe("true");
    tabs.destroy();
  });

  it("selects with Space in automatic activation when another tab holds focus", () => {
    const tabs = setup();
    const event = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    byId("t-yearly").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(byId("t-yearly").getAttribute("aria-selected")).toBe("true");
    expect(byId("t-monthly").getAttribute("aria-selected")).toBe("false");
    tabs.destroy();
  });
});
