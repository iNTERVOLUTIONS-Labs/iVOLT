/**
 * Navbar: site header with a collapsible panel, sticky and condensed states.
 *
 * Registered stub for v0.6 (API_CONTRACT §8.1x): the class exists so the
 * entry points build and `init` finds `[data-iv-component="navbar"]`; the
 * behaviour is implemented in this cycle.
 *
 * @module components/navbar
 */

import { IvComponent } from "../core/component.js";

/**
 * @typedef {object} NavbarOptions
 */

export class Navbar extends IvComponent {
  static componentName = "navbar";

  static defaults = Object.freeze({ collapseBelow: "lg", sticky: false, condenseAt: 24, hideOnScroll: false, closeOnOutside: true });
}
