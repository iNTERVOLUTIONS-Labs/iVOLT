/**
 * ScrollMotion: writes scroll progress variables where scroll-driven animations are missing.
 *
 * Registered stub for v0.7 (API_CONTRACT §8.21): the class exists so the
 * entry points build and `init` finds `[data-iv-component="scroll-motion"]`; the
 * behaviour is implemented in this cycle.
 *
 * @module components/scroll-motion
 */

import { IvComponent } from "../core/component.js";

/**
 * @typedef {object} ScrollMotionOptions
 */

export class ScrollMotion extends IvComponent {
  static componentName = "scroll-motion";

  static defaults = Object.freeze({ force: false });
}
