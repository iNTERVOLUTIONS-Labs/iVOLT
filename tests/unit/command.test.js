// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Command } from "../../packages/ivolt/src/js/components/command.js";
import { Dialog } from "../../packages/ivolt/src/js/components/dialog.js";
import { IvError } from "../../packages/ivolt/src/js/core/registry.js";

/**
 * jsdom does not implement `showModal()` / `close()` of `<dialog>`; this stub
 * reproduces the observable part of the spec the component relies on. Same
 * shape as the one in `dialog.test.js`.
 *
 * @returns {void}
 */
function installDialogStub() {
  const proto = globalThis.HTMLDialogElement && globalThis.HTMLDialogElement.prototype;
  if (!proto) return;
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

const MARKUP = `
  <button id="trigger" class="iv-button" data-iv-open="cmd" hidden aria-keyshortcuts="Control+K Meta+K">Open</button>
  <input id="outside" type="text">
  <dialog class="iv-dialog iv-command" id="cmd" data-iv-component="command" aria-label="Command palette">
    <div class="iv-dialog__panel">
      <div class="iv-command__field">
        <label class="iv-u-sr-only" for="cmd-q">Search actions</label>
        <input class="iv-input iv-command__input" id="cmd-q" type="search" autocomplete="off" placeholder="Type a command or search…">
      </div>
      <nav class="iv-command__groups">
        <section class="iv-command__group" data-iv-group="Pages">
          <h3 class="iv-command__heading">Pages</h3>
          <ul class="iv-command__list">
            <li><a class="iv-command__item" href="#cmd-note" data-iv-keywords="install setup"><span class="iv-command__label">Getting started</span><kbd class="iv-command__kbd">G S</kbd></a></li>
            <li><a class="iv-command__item" href="#cmd-note"><span class="iv-command__label">Componentes gráficos</span></a></li>
          </ul>
        </section>
        <section class="iv-command__group" data-iv-group="Actions">
          <h3 class="iv-command__heading">Actions</h3>
          <ul class="iv-command__list">
            <li><button class="iv-command__item" type="button" data-iv-command="toggle-theme" data-iv-keywords="dark light"><span class="iv-command__label">Toggle theme</span></button></li>
          </ul>
        </section>
      </nav>
      <p class="iv-command__empty" hidden>No results</p>
      <footer class="iv-command__hints" aria-hidden="true"><kbd>↑↓</kbd> navigate</footer>
    </div>
  </dialog>
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
 * @returns {{ cmd: Command, el: HTMLElement, input: HTMLInputElement }} The fixture.
 */
function setup(options) {
  const el = byId("cmd");
  const cmd = new Command(el, options);
  return { cmd, el, input: /** @type {HTMLInputElement} */ (byId("cmd-q")) };
}

/**
 * @param {EventTarget} target Event target.
 * @param {string} key `KeyboardEvent.key` value.
 * @param {KeyboardEventInit} [init] Extra event fields.
 * @returns {KeyboardEvent} The dispatched event.
 */
function press(target, key, init) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

/**
 * @param {Command} cmd The palette.
 * @returns {string[]} Labels of the visible rows, in document order.
 */
function visibleLabels(cmd) {
  return [...document.querySelectorAll(".iv-command__item")]
    .filter((el) => !(/** @type {HTMLElement} */ (el).hidden))
    .map((el) => (el.textContent ?? "").trim());
}

/**
 * @returns {HTMLElement|null} The highlighted row.
 */
function activeRow() {
  const id = byId("cmd-q").getAttribute("aria-activedescendant");
  return id ? byId(id) : null;
}

describe("Command", () => {
  beforeEach(() => {
    installDialogStub();
    document.body.innerHTML = MARKUP;
    window.localStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    window.localStorage.clear();
  });

  it("refuses an element that is not a <dialog>", () => {
    const div = document.createElement("div");
    let error = null;
    try {
      new Command(div);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(IvError);
    expect(error.code).toBe("invalid-element");
  });

  it("refuses a <dialog> without an input", () => {
    const dialog = document.createElement("dialog");
    document.body.append(dialog);
    let error = null;
    try {
      new Command(dialog);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(IvError);
    expect(error.code).toBe("invalid-element");
  });

  it("promotes the served HTML into a listbox and restores it on destroy", () => {
    const before = document.body.innerHTML;
    const { cmd, el, input } = setup();

    expect(input.getAttribute("role")).toBe("combobox");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
    const groups = el.querySelector(".iv-command__groups");
    expect(groups?.getAttribute("role")).toBe("listbox");
    expect(input.getAttribute("aria-controls")).toBe(groups?.id);
    expect(el.querySelector(".iv-command__group")?.getAttribute("role")).toBe("group");
    expect(el.querySelector(".iv-command__list")?.getAttribute("role")).toBe("presentation");
    const rows = [...el.querySelectorAll(".iv-command__item")];
    expect(rows.map((row) => row.getAttribute("role"))).toEqual(["option", "option", "option"]);
    expect(rows.every((row) => row.id.startsWith("iv-cmd-"))).toBe(true);
    expect(rows[0].getAttribute("data-iv-id")).toMatch(/^iv-cmd-\d+$/);
    expect(rows[2].getAttribute("data-iv-id")).toBe(null);
    const status = el.querySelector(".iv-command__status");
    expect(status?.getAttribute("aria-live")).toBe("polite");
    expect(status?.getAttribute("role")).toBe("status");
    expect(byId("trigger").hasAttribute("hidden")).toBe(false);

    cmd.destroy();
    expect(document.body.innerHTML).toBe(before);
  });

  it("restores the served HTML when it is destroyed open and with recents", () => {
    window.localStorage.setItem("iv-command-recent", JSON.stringify(["toggle-theme"]));
    const before = document.body.innerHTML;
    const { cmd, el } = setup({ remember: true });
    cmd.open();
    expect(el.querySelectorAll(".iv-command__group").length).toBe(3);
    expect(el.querySelector(".iv-command__heading")?.textContent).toBe("Recent");

    cmd.destroy();
    expect(document.body.innerHTML).toBe(before);
    expect(Dialog.get(el)).toBe(undefined);
  });

  it("opens with Ctrl+K and with Meta+K and focuses the input", () => {
    const { cmd, input } = setup();
    const event = press(document, "k", { ctrlKey: true });
    expect(event.defaultPrevented).toBe(true);
    expect(cmd.isOpen).toBe(true);
    expect(document.activeElement).toBe(input);

    cmd.close();
    expect(cmd.isOpen).toBe(false);
    press(document, "K", { metaKey: true });
    expect(cmd.isOpen).toBe(true);
    cmd.destroy();
  });

  it("opens with / outside an editable field, never inside one", () => {
    const { cmd } = setup();
    press(byId("outside"), "/");
    expect(cmd.isOpen).toBe(false);

    const event = press(document.body, "/");
    expect(event.defaultPrevented).toBe(true);
    expect(cmd.isOpen).toBe(true);
    cmd.destroy();
  });

  it("ignores / with slash: false but still answers Ctrl+K", () => {
    const { cmd } = setup({ slash: false });
    press(document.body, "/");
    expect(cmd.isOpen).toBe(false);
    press(document.body, "k", { ctrlKey: true });
    expect(cmd.isOpen).toBe(true);
    cmd.destroy();
  });

  it("removes the document shortcut on destroy", () => {
    const { cmd } = setup();
    cmd.destroy();
    press(document.body, "k", { ctrlKey: true });
    expect(byId("cmd").hasAttribute("open")).toBe(false);
  });

  it("filters by label and by keywords, ignoring diacritics", () => {
    const { cmd, input } = setup();
    cmd.open();

    input.value = "graficos";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(visibleLabels(cmd)).toEqual(["Componentes gráficos"]);

    input.value = "DARK";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(visibleLabels(cmd)).toEqual(["Toggle theme"]);
    cmd.destroy();
  });

  it("hides the groups left empty, shows __empty and announces the count", () => {
    const { cmd, el, input } = setup();
    cmd.open();
    const [pages, actions] = [...el.querySelectorAll(".iv-command__group")];
    const empty = /** @type {HTMLElement} */ (el.querySelector(".iv-command__empty"));
    const status = /** @type {HTMLElement} */ (el.querySelector(".iv-command__status"));
    expect(status.textContent).toBe("3 results");

    cmd.filter("setup");
    expect(pages.hidden).toBe(false);
    expect(actions.hidden).toBe(true);
    expect(empty.hidden).toBe(true);
    expect(status.textContent).toBe("1 result");

    cmd.filter("zzz");
    expect(pages.hidden).toBe(true);
    expect(actions.hidden).toBe(true);
    expect(empty.hidden).toBe(false);
    expect(status.textContent).toBe("No results");

    cmd.filter("");
    expect(empty.hidden).toBe(true);
    expect(status.textContent).toBe("3 results");
    cmd.destroy();
  });

  it("emits iv:filter with the query and the number of visible rows", () => {
    const { cmd, el, input } = setup();
    cmd.open();
    const seen = [];
    el.addEventListener("iv:filter", (e) => seen.push(e.detail));
    input.value = "toggle";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(seen).toEqual([{ instance: cmd, query: "toggle", visible: 1 }]);
    cmd.destroy();
  });

  it("moves the highlight with the arrows, Home and End, wrapping around", () => {
    const { cmd, input } = setup();
    cmd.open();
    expect(activeRow()).toBe(null);

    press(input, "ArrowDown");
    expect(activeRow()?.textContent).toContain("Getting started");
    press(input, "ArrowDown");
    press(input, "ArrowDown");
    expect(activeRow()?.textContent).toContain("Toggle theme");
    expect(activeRow()?.getAttribute("aria-selected")).toBe("true");

    press(input, "ArrowDown");
    expect(activeRow()?.textContent).toContain("Getting started");
    press(input, "ArrowUp");
    expect(activeRow()?.textContent).toContain("Toggle theme");

    press(input, "Home");
    expect(activeRow()?.textContent).toContain("Getting started");
    press(input, "End");
    expect(activeRow()?.textContent).toContain("Toggle theme");
    expect(document.querySelectorAll('[aria-selected="true"]').length).toBe(1);
    cmd.destroy();
  });

  it("skips the hidden rows while navigating", () => {
    const { cmd, input } = setup();
    cmd.open();
    cmd.filter("o");
    press(input, "Home");
    const first = activeRow();
    press(input, "End");
    expect(activeRow()).not.toBe(first);
    expect(/** @type {HTMLElement} */ (activeRow()).hidden).toBe(false);
    cmd.destroy();
  });

  it("follows the link of the highlighted row after an uncancelled iv:command", () => {
    const { cmd, el, input } = setup();
    cmd.open();
    const link = /** @type {HTMLAnchorElement} */ (el.querySelector(".iv-command__item"));
    const clicks = vi.fn((e) => e.preventDefault());
    link.addEventListener("click", clicks);
    const order = [];
    el.addEventListener("iv:command", (e) => order.push(["command", e.detail.id, e.detail.href]));
    el.addEventListener("iv:commanded", () => order.push(["commanded"]));

    press(input, "ArrowDown");
    press(input, "Enter");
    expect(clicks).toHaveBeenCalledTimes(1);
    expect(order[0][0]).toBe("command");
    expect(order[0][2]).toBe("#cmd-note");
    expect(order[1]).toEqual(["commanded"]);
    expect(cmd.isOpen).toBe(false);
    cmd.destroy();
  });

  it("does not follow the link when iv:command is cancelled", () => {
    const { cmd, el, input } = setup();
    cmd.open();
    const link = /** @type {HTMLAnchorElement} */ (el.querySelector(".iv-command__item"));
    const clicks = vi.fn((e) => e.preventDefault());
    link.addEventListener("click", clicks);
    const commanded = vi.fn();
    el.addEventListener("iv:command", (e) => e.preventDefault());
    el.addEventListener("iv:commanded", commanded);

    press(input, "ArrowDown");
    press(input, "Enter");
    expect(clicks).not.toHaveBeenCalled();
    expect(commanded).not.toHaveBeenCalled();
    expect(cmd.isOpen).toBe(true);
    cmd.destroy();
  });

  it("runs the callback of a row without href between iv:command and iv:commanded", () => {
    const { cmd, el, input } = setup();
    cmd.open();
    const order = [];
    el.addEventListener("iv:command", (e) => order.push(`command:${e.detail.id}`));
    el.addEventListener("iv:commanded", (e) => order.push(`commanded:${e.detail.id}`));
    cmd.add({ id: "say-hi", label: "Say hi", group: "Actions", run: () => order.push("run") });

    cmd.filter("Say hi");
    press(input, "Enter");
    expect(order).toEqual(["command:say-hi", "run", "commanded:say-hi"]);
    expect(cmd.isOpen).toBe(false);
    cmd.destroy();
  });

  it("activates a served button without href and emits both events", () => {
    const { cmd, el, input } = setup();
    cmd.open();
    const seen = [];
    el.addEventListener("iv:command", (e) => seen.push(e.detail.id));
    el.addEventListener("iv:commanded", (e) => seen.push(`done:${e.detail.id}`));
    cmd.filter("toggle");
    press(input, "Enter");
    expect(seen).toEqual(["toggle-theme", "done:toggle-theme"]);
    cmd.destroy();
  });

  it("closes on Tab", () => {
    const { cmd, el, input } = setup();
    cmd.open();
    const reasons = [];
    el.addEventListener("iv:closed", (e) => reasons.push(e.detail.reason));
    const event = press(input, "Tab");
    expect(event.defaultPrevented).toBe(true);
    expect(cmd.isOpen).toBe(false);
    expect(reasons).toEqual(["external"]);
    cmd.destroy();
  });

  it("adds, removes and clears commands", () => {
    const { cmd, el } = setup();
    cmd.open();
    expect(cmd.actions.length).toBe(3);

    const added = cmd.add({ id: "new-doc", label: "New document", group: "Actions", shortcut: "N" });
    expect(added.id).toBe("new-doc");
    expect(cmd.actions.length).toBe(4);
    const row = /** @type {HTMLElement} */ (el.querySelector("#new-doc, [data-iv-id='new-doc']"));
    expect(row.tagName).toBe("BUTTON");
    expect(row.getAttribute("type")).toBe("button");
    expect(row.getAttribute("role")).toBe("option");
    expect(row.querySelector(".iv-command__kbd")?.textContent).toBe("N");
    expect(row.closest(".iv-command__group")?.getAttribute("data-iv-group")).toBe("Actions");

    const link = cmd.add({ id: "docs", label: "Docs", group: "Extras", href: "#cmd-note" });
    expect(link.href).toBe("#cmd-note");
    expect(el.querySelectorAll(".iv-command__group").length).toBe(3);

    expect(cmd.remove("new-doc")).toBe(true);
    expect(cmd.remove("new-doc")).toBe(false);
    expect(cmd.actions.map((a) => a.id)).not.toContain("new-doc");

    cmd.clear();
    expect(cmd.actions).toEqual([]);
    expect(el.querySelectorAll(".iv-command__item").length).toBe(0);
    expect(/** @type {HTMLElement} */ (el.querySelector(".iv-command__empty")).hidden).toBe(false);
    cmd.destroy();
  });

  it("filter() writes the query into the input and returns the count", () => {
    const { cmd, input } = setup();
    cmd.open();
    expect(cmd.filter("toggle")).toBe(1);
    expect(input.value).toBe("toggle");
    expect(cmd.query).toBe("toggle");
    expect(activeRow()?.textContent).toContain("Toggle theme");
    expect(cmd.filter("")).toBe(3);
    expect(activeRow()).toBe(null);
    cmd.destroy();
  });

  it("keeps the last activated commands when remember is on", () => {
    const { cmd, el, input } = setup({ remember: true, maxRecent: 2 });
    cmd.open();
    expect(el.querySelectorAll(".iv-command__group").length).toBe(2);

    cmd.filter("toggle");
    press(input, "Enter");
    expect(JSON.parse(window.localStorage.getItem("iv-command-recent"))).toEqual(["toggle-theme"]);

    cmd.open();
    const groups = [...el.querySelectorAll(".iv-command__group")];
    expect(groups.length).toBe(3);
    expect(groups[0].getAttribute("data-iv-group")).toBe("Recent");
    expect(groups[0].querySelectorAll(".iv-command__item").length).toBe(1);
    expect(groups[0].getAttribute("role")).toBe("group");

    // A query drops the generated group and brings it back when cleared.
    cmd.filter("toggle");
    expect(el.querySelectorAll(".iv-command__group").length).toBe(2);
    cmd.filter("");
    expect(el.querySelectorAll(".iv-command__group").length).toBe(3);

    cmd.close();
    expect(el.querySelectorAll(".iv-command__group").length).toBe(2);
    cmd.destroy();
  });

  it("stores nothing when remember is off", () => {
    const { cmd, input } = setup();
    cmd.open();
    cmd.filter("toggle");
    press(input, "Enter");
    expect(window.localStorage.getItem("iv-command-recent")).toBe(null);
    cmd.destroy();
  });

  it("survives a broken localStorage entry", () => {
    window.localStorage.setItem("iv-command-recent", "{not json");
    const { cmd, el } = setup({ remember: true });
    cmd.open();
    expect(el.querySelectorAll(".iv-command__group").length).toBe(2);
    cmd.destroy();
  });

  it("reads options from attributes and lets JavaScript win", () => {
    const el = byId("cmd");
    el.setAttribute("data-iv-slash", "false");
    el.setAttribute("data-iv-empty-text", "Nothing here");
    el.setAttribute("data-iv-remember", "true");
    const cmd = new Command(el, { remember: false });
    expect(cmd.options.slash).toBe(false);
    expect(cmd.options.emptyText).toBe("Nothing here");
    expect(cmd.options.remember).toBe(false);
    expect(cmd.options.shortcut).toBe(true);

    cmd.open();
    cmd.filter("zzz");
    expect(el.querySelector(".iv-command__status")?.textContent).toBe("Nothing here");
    cmd.destroy();
  });

  it("keeps the dialog instance the consumer created", () => {
    const el = byId("cmd");
    const dialog = new Dialog(el);
    const cmd = new Command(el);
    expect(cmd.isOpen).toBe(false);
    cmd.open();
    expect(dialog.isOpen).toBe(true);
    cmd.destroy();
    expect(Dialog.get(el)).toBe(dialog);
    dialog.destroy();
  });
});
