// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Copy } from "../../packages/ivolt/src/js/components/copy.js";

const MARKUP = `
  <div id="root" data-iv-component="copy">
    <figure class="iv-code">
      <figcaption class="iv-code__bar"><button id="own" class="iv-code__copy" type="button" data-iv-copy><span class="iv-code__copy-label">Copy</span></button></figcaption>
      <pre class="iv-code__pre"><code>npm run build</code></pre>
    </figure>
    <button id="named" type="button" data-iv-copy="#target">Copy</button>
    <button id="icon" type="button" data-iv-copy="#target" aria-label="Copy"><svg></svg></button>
    <p id="target">made-up text</p>
  </div>`;

let written;

describe("Copy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    written = [];
    document.body.innerHTML = MARKUP;
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(async (t) => written.push(t)) },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  const root = () => /** @type {HTMLElement} */ (document.getElementById("root"));

  it("marks its root ready and removes the mark on destroy", () => {
    const [inst] = Copy.initAll(document);
    expect(root().hasAttribute("data-iv-copy-ready")).toBe(true);
    inst.destroy();
    expect(root().hasAttribute("data-iv-copy-ready")).toBe(false);
  });

  it("copies the code of its own frame, or the element a selector names", async () => {
    const [inst] = Copy.initAll(document);
    expect(await inst.copy(/** @type {HTMLElement} */ (document.getElementById("own")))).toBe(true);
    expect(await inst.copy(/** @type {HTMLElement} */ (document.getElementById("named")))).toBe(true);
    expect(written).toEqual(["npm run build", "made-up text"]);
    inst.destroy();
  });

  it("emits a cancelable iv:copy and iv:copied with the result", async () => {
    const [inst] = Copy.initAll(document);
    const seen = [];
    root().addEventListener("iv:copy", (e) => seen.push(["copy", /** @type {CustomEvent} */ (e).detail.text]));
    root().addEventListener("iv:copied", (e) => seen.push(["copied", /** @type {CustomEvent} */ (e).detail.ok]));
    await inst.copy(/** @type {HTMLElement} */ (document.getElementById("named")));
    expect(seen).toEqual([["copy", "made-up text"], ["copied", true]]);
    root().addEventListener("iv:copy", (e) => e.preventDefault(), { once: true });
    expect(await inst.copy(/** @type {HTMLElement} */ (document.getElementById("named")))).toBe(false);
    expect(written).toHaveLength(1);
    inst.destroy();
  });

  it("shows the result on the label for `timeout`, keeps icons, and restores on destroy", async () => {
    const [inst] = Copy.initAll(document, {});
    const own = /** @type {HTMLElement} */ (document.getElementById("own"));
    const icon = /** @type {HTMLElement} */ (document.getElementById("icon"));
    await inst.copy(own);
    await inst.copy(icon);
    expect(own.textContent).toBe("Copied");
    expect(own.getAttribute("data-iv-state")).toBe("copied");
    expect(icon.querySelector("svg")).not.toBe(null);
    expect(root().querySelector('[role="status"]')?.textContent).toBe("Copied");
    vi.advanceTimersByTime(2000);
    expect(own.textContent).toBe("Copy");
    expect(own.hasAttribute("data-iv-state")).toBe(false);
    await inst.copy(own);
    inst.destroy();
    expect(own.textContent).toBe("Copy");
    expect(root().querySelector('[role="status"]')).toBe(null);
  });

  it("reports a refused clipboard and selects the text instead", async () => {
    Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: { writeText: vi.fn(async () => { throw new Error("denied"); }) } });
    const [inst] = Copy.initAll(document);
    const named = /** @type {HTMLElement} */ (document.getElementById("named"));
    expect(await inst.copy(named)).toBe(false);
    expect(named.getAttribute("data-iv-state")).toBe("failed");
    expect(named.textContent).toBe("Press Ctrl+C to copy");
    expect(String(window.getSelection())).toBe("made-up text");
    inst.destroy();
  });

  it("reads its texts from data-iv-* attributes", async () => {
    root().setAttribute("data-iv-copied-text", "Copiado");
    const [inst] = Copy.initAll(document);
    const named = /** @type {HTMLElement} */ (document.getElementById("named"));
    await inst.copy(named);
    expect(named.textContent).toBe("Copiado");
    inst.destroy();
  });
});
