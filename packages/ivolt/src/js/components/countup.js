/**
 * Countup: a served figure that counts up from zero when it enters the viewport.
 *
 * Registered stub for v0.7 (API_CONTRACT §8.22): the class exists so the
 * entry points build and `init` finds `[data-iv-component="countup"]`; the
 * behaviour is implemented in this cycle.
 *
 * @module components/countup
 */

import { IvComponent } from "../core/component.js";

/**
 * @typedef {object} CountupOptions
 */

export class Countup extends IvComponent {
  static componentName = "countup";

  static defaults = Object.freeze({ from: 0, duration: 900, decimals: -1, grouping: true, once: true, autostart: false });
}
