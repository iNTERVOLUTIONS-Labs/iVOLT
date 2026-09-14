/**
 * Lightbox: a gallery of images that opens a full-screen viewer composed on Dialog.
 *
 * Registered stub for v0.7 (API_CONTRACT §8.20): the class exists so the
 * entry points build and `init` finds `[data-iv-component="lightbox"]`; the
 * behaviour is implemented in this cycle.
 *
 * @module components/lightbox
 */

import { IvComponent } from "../core/component.js";

/**
 * @typedef {object} LightboxOptions
 */

export class Lightbox extends IvComponent {
  static componentName = "lightbox";

  static defaults = Object.freeze({ loop: true, zoom: true, swipe: true, preload: 1, counter: true, captions: true, closeText: "Close", prevText: "Previous", nextText: "Next", zoomText: "Zoom", galleryLabel: "Image viewer" });
}
