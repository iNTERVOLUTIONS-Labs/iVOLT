/**
 * Opt-in auto start: importing this module calls `init(document)` once the DOM
 * is ready. It is the only entry point of the package with side effects.
 *
 * @module auto
 */

import { init } from "./index.js";

export * from "./index.js";

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        init(document);
      },
      { once: true }
    );
  } else {
    init(document);
  }
}
