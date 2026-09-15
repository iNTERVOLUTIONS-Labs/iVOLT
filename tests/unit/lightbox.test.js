// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Lightbox } from "../../packages/ivolt/src/js/components/lightbox.js";
import { Dialog } from "../../packages/ivolt/src/js/components/dialog.js";

/**
 * jsdom does not implement `showModal()` / `close()` of `<dialog>`; this stub
 * reproduces the observable part of the spec the component relies on. Same
 * shape as the one in `dialog.test.js` and `command.test.js`.
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

const ART = (n) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Crect width='12' height='8' fill='%23${n}${n}${n}'/%3E%3C/svg%3E`;

const MARKUP = `
  <div id="wrap">
    <div class="iv-gallery" data-iv-component="lightbox">
      <a class="iv-gallery__item" href="${ART(1)}" data-iv-caption="First sample artwork for the fixture">
        <img class="iv-gallery__img" src="${ART(1)}" alt="Abstract landscape one" width="12" height="8">
      </a>
      <a class="iv-gallery__item" href="${ART(2)}" data-iv-caption="Second sample artwork for the fixture">
        <img class="iv-gallery__img" src="${ART(2)}" alt="Abstract landscape two" width="12" height="8">
      </a>
      <a class="iv-gallery__item" href="${ART(3)}">
        <img class="iv-gallery__img" src="${ART(3)}" alt="Abstract landscape three" width="12" height="8">
      </a>
    </div>
  </div>
`;

/** @returns {HTMLElement} The gallery root. */
function gallery() {
  return /** @type {HTMLElement} */ (document.querySelector(".iv-gallery"));
}

/** @returns {HTMLDialogElement} The generated viewer. */
function viewer() {
  return /** @type {HTMLDialogElement} */ (document.querySelector(".iv-lightbox"));
}

/**
 * Records the events a gallery emits.
 *
 * @param {Element} el Gallery root.
 * @param {string[]} names Unprefixed event names.
 * @returns {Array<{ type: string, detail: Record<string, unknown> }>} The log.
 */
function record(el, names) {
  /** @type {Array<{ type: string, detail: Record<string, unknown> }>} */
  const log = [];
  for (const name of names) {
    el.addEventListener(`iv:${name}`, (event) => {
      log.push({ type: name, detail: /** @type {CustomEvent} */ (event).detail });
    });
  }
  return log;
}

describe("Lightbox", () => {
  /** @type {string} */
  let served;

  beforeEach(() => {
    installDialogStub();
    document.body.innerHTML = MARKUP;
    served = /** @type {HTMLElement} */ (document.getElementById("wrap")).innerHTML;
  });

  afterEach(() => {
    const el = gallery();
    const instance = el ? Lightbox.get(el) : undefined;
    if (instance) instance.destroy();
    document.body.innerHTML = "";
  });

  it("builds one viewer right after the gallery, inside the same root", () => {
    const instance = new Lightbox(gallery());
    const dialog = viewer();
    expect(dialog).not.toBeNull();
    expect(gallery().nextElementSibling).toBe(dialog);
    expect(dialog.parentElement).toBe(document.getElementById("wrap"));
    expect(dialog.className).toBe("iv-dialog iv-lightbox");
    expect(dialog.getAttribute("aria-label")).toBe("Image viewer");
    expect(dialog.querySelector(".iv-lightbox__stage").tagName).toBe("FIGURE");
    expect(dialog.querySelector(".iv-lightbox__caption").tagName).toBe("FIGCAPTION");
    expect(dialog.querySelector(".iv-lightbox__counter").getAttribute("aria-live")).toBe("polite");
    for (const [kind, label] of [["close", "Close"], ["prev", "Previous"], ["next", "Next"], ["zoom", "Zoom"]]) {
      const button = dialog.querySelector(`.iv-lightbox__${kind}`);
      expect(button.tagName, kind).toBe("BUTTON");
      expect(button.getAttribute("type"), kind).toBe("button");
      expect(button.getAttribute("aria-label"), kind).toBe(label);
    }
    expect(instance.items).toHaveLength(3);
    expect(instance.isOpen).toBe(false);
    expect(Dialog.get(dialog)).toBeInstanceOf(Dialog);
  });

  it("opens on the item that was clicked and puts it on stage", () => {
    const instance = new Lightbox(gallery());
    const log = record(gallery(), ["open", "opened"]);
    const item = instance.items[1];
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    item.querySelector("img").dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(instance.isOpen).toBe(true);
    expect(instance.index).toBe(1);
    const img = viewer().querySelector(".iv-lightbox__img");
    expect(img.getAttribute("src")).toBe(item.getAttribute("href"));
    expect(img.getAttribute("alt")).toBe("Abstract landscape two");
    const caption = viewer().querySelector(".iv-lightbox__caption");
    expect(caption.textContent).toBe("Second sample artwork for the fixture");
    expect(caption.hidden).toBe(false);
    expect(viewer().querySelector(".iv-lightbox__counter").textContent).toBe("2 / 3");
    expect(log.map((e) => e.type)).toEqual(["open", "opened"]);
    expect(log[1].detail.index).toBe(1);
  });

  it("hides the caption of an item that carries none", () => {
    const instance = new Lightbox(gallery());
    instance.open(2);
    const caption = viewer().querySelector(".iv-lightbox__caption");
    expect(caption.hidden).toBe(true);
    expect(caption.textContent).toBe("");
  });

  it("moves with the API, the buttons and the keyboard, and loops", () => {
    const instance = new Lightbox(gallery());
    instance.open(0);
    const log = record(gallery(), ["change", "changed"]);

    viewer().querySelector(".iv-lightbox__next").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(instance.index).toBe(1);
    instance.prev();
    expect(instance.index).toBe(0);
    // Looping backwards from the first item.
    instance.prev();
    expect(instance.index).toBe(2);
    instance.go(1);
    expect(instance.index).toBe(1);

    viewer().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(instance.index).toBe(2);
    viewer().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(instance.index).toBe(1);
    viewer().dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(instance.index).toBe(0);
    viewer().dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(instance.index).toBe(2);

    expect(log.filter((e) => e.type === "change")).toHaveLength(8);
    expect(log.filter((e) => e.type === "changed")).toHaveLength(8);
    expect(log[0].detail).toMatchObject({ index: 1, previousIndex: 0, reason: "next" });
    expect(log.map((e) => e.detail.reason)).toEqual([
      "next", "next", "prev", "prev", "prev", "prev", "api", "api",
      "keyboard", "keyboard", "keyboard", "keyboard",
      "keyboard", "keyboard", "keyboard", "keyboard",
    ]);
    expect(viewer().querySelector(".iv-lightbox__counter").textContent).toBe("3 / 3");
  });

  it("stops at both ends without loop", () => {
    const el = gallery();
    el.setAttribute("data-iv-loop", "false");
    const instance = new Lightbox(el);
    instance.open(0);
    instance.prev();
    expect(instance.index).toBe(0);
    instance.go(2);
    instance.next();
    expect(instance.index).toBe(2);
  });

  it("lets a listener cancel the change and the opening", () => {
    const instance = new Lightbox(gallery());
    instance.open(0);
    gallery().addEventListener("iv:change", (event) => event.preventDefault(), { once: true });
    instance.next();
    expect(instance.index).toBe(0);

    instance.close();
    gallery().addEventListener("iv:open", (event) => event.preventDefault(), { once: true });
    instance.open(1);
    expect(instance.isOpen).toBe(false);
  });

  it("zooms the stage, reports it and leaves it on a change", () => {
    const instance = new Lightbox(gallery());
    instance.open(0);
    const log = record(gallery(), ["zoom"]);
    const stage = viewer().querySelector(".iv-lightbox__stage");
    const button = viewer().querySelector(".iv-lightbox__zoom");

    viewer().dispatchEvent(new KeyboardEvent("keydown", { key: "z", bubbles: true }));
    expect(stage.hasAttribute("data-iv-zoomed")).toBe(true);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(log[0].detail).toMatchObject({ zoomed: true, index: 0 });

    instance.next();
    expect(stage.hasAttribute("data-iv-zoomed")).toBe(false);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(log[1].detail).toMatchObject({ zoomed: false });

    instance.zoom(true);
    instance.zoom(true);
    expect(log.filter((e) => e.detail.zoomed === true)).toHaveLength(2);
  });

  it("mirrors the dialog close and returns focus to the item that opened it", () => {
    const instance = new Lightbox(gallery());
    const item = instance.items[2];
    item.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    const log = record(gallery(), ["close", "closed"]);
    viewer().querySelector(".iv-lightbox__close").dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(instance.isOpen).toBe(false);
    expect(log.map((e) => e.type)).toEqual(["close", "closed"]);
    expect(log[1].detail.index).toBe(2);
    expect(document.activeElement).toBe(item);
  });

  it("resolves options as defaults < data-iv-* < JavaScript", () => {
    const el = gallery();
    el.setAttribute("data-iv-close-text", "Cerrar");
    el.setAttribute("data-iv-counter", "false");
    el.setAttribute("data-iv-gallery-label", "Muestrario");
    const instance = new Lightbox(el, { closeText: "Dismiss" });
    expect(instance.options.closeText).toBe("Dismiss");
    expect(instance.options.counter).toBe(false);
    expect(instance.options.galleryLabel).toBe("Muestrario");
    expect(instance.options.loop).toBe(true);
    expect(viewer().getAttribute("aria-label")).toBe("Muestrario");
    expect(viewer().querySelector(".iv-lightbox__close").getAttribute("aria-label")).toBe("Dismiss");
    expect(viewer().querySelector(".iv-lightbox__counter")).toBeNull();
  });

  it("leaves the zoom button out when zoom is off", () => {
    const el = gallery();
    el.setAttribute("data-iv-zoom", "false");
    const instance = new Lightbox(el);
    instance.open(0);
    expect(viewer().querySelector(".iv-lightbox__zoom")).toBeNull();
    viewer().dispatchEvent(new KeyboardEvent("keydown", { key: "z", bubbles: true }));
    expect(viewer().querySelector(".iv-lightbox__stage").hasAttribute("data-iv-zoomed")).toBe(false);
  });

  it("is idempotent: initAll twice builds a single viewer", () => {
    const first = Lightbox.initAll(document);
    const second = Lightbox.initAll(document);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
    expect(document.querySelectorAll(".iv-lightbox")).toHaveLength(1);
    expect(Lightbox.getOrCreate(gallery())).toBe(first[0]);
  });

  it("destroy removes the generated viewer and leaves the DOM as served", () => {
    const instance = new Lightbox(gallery());
    instance.open(1);
    instance.zoom(true);
    instance.destroy();
    expect(document.querySelector(".iv-lightbox")).toBeNull();
    expect(Lightbox.get(gallery())).toBeUndefined();
    expect(/** @type {HTMLElement} */ (document.getElementById("wrap")).innerHTML).toBe(served);

    // And it can be built again on the same gallery.
    const again = new Lightbox(gallery());
    expect(document.querySelectorAll(".iv-lightbox")).toHaveLength(1);
    again.destroy();
  });

  it("swipes horizontally over the stage, past the same threshold as the carousel", () => {
    const instance = new Lightbox(gallery());
    instance.open(0);
    const stage = viewer().querySelector(".iv-lightbox__stage");
    /**
     * @param {string} type Event type.
     * @param {number} x Client x.
     * @param {number} y Client y.
     * @returns {void}
     */
    const pointer = (type, x, y) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        pointerId: { value: 1 },
        clientX: { value: x },
        clientY: { value: y },
        button: { value: 0 },
      });
      stage.dispatchEvent(event);
    };

    pointer("pointerdown", 300, 200);
    pointer("pointermove", 200, 205);
    pointer("pointerup", 200, 205);
    expect(instance.index).toBe(1);

    pointer("pointerdown", 200, 200);
    pointer("pointermove", 320, 210);
    pointer("pointerup", 320, 210);
    expect(instance.index).toBe(0);

    // Too short, and vertical: neither is a swipe.
    pointer("pointerdown", 200, 200);
    pointer("pointermove", 220, 200);
    pointer("pointerup", 220, 200);
    expect(instance.index).toBe(0);
    pointer("pointerdown", 200, 200);
    pointer("pointermove", 260, 400);
    pointer("pointerup", 260, 400);
    expect(instance.index).toBe(0);
  });
});

// Configurable strings (API_CONTRACT §5.2b, v0.9).
describe("Lightbox: counterText", () => {
  it("replaces {index} and {total} and formats the digits with the language of the gallery", () => {
    document.body.innerHTML = MARKUP;
    const instance = new Lightbox(gallery());
    instance.open(1);
    expect(viewer().querySelector(".iv-lightbox__counter").textContent).toBe("2 / 3");
    instance.close();
    instance.destroy();

    gallery().setAttribute("data-iv-counter-text", "{index} de {total}");
    gallery().setAttribute("lang", "es");
    const translated = new Lightbox(gallery());
    translated.open(0);
    expect(viewer().querySelector(".iv-lightbox__counter").textContent).toBe("1 de 3");
    translated.close();
    translated.destroy();

    const forced = new Lightbox(gallery(), { counterText: "Imagen {index} de {total}" });
    forced.open(2);
    expect(viewer().querySelector(".iv-lightbox__counter").textContent).toBe("Imagen 3 de 3");
    forced.close();
    forced.destroy();
    expect(document.querySelector(".iv-lightbox")).toBe(null);
  });
});
