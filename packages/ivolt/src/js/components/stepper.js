/**
 * Stepper: step-by-step assistant with validation before advancing.
 *
 * Registered stub for v0.6 (API_CONTRACT §8.1x): the class exists so the
 * entry points build and `init` finds `[data-iv-component="stepper"]`; the
 * behaviour is implemented in this cycle.
 *
 * @module components/stepper
 */

import { IvComponent } from "../core/component.js";

/**
 * @typedef {object} StepperOptions
 */

export class Stepper extends IvComponent {
  static componentName = "stepper";

  static defaults = Object.freeze({ linear: true, validate: true, hash: false, focus: "panel", statusText: "Step {index} of {total}: {label}" });
}
