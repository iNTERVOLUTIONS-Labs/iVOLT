/**
 * Event dispatch. Every public event is a `CustomEvent` with the `iv:` prefix,
 * `bubbles: true` and `composed: false`.
 *
 * @module core/events
 */

/** Prefix applied to every public event name. */
export const EVENT_PREFIX = "iv:";

/**
 * Dispatches `iv:<name>` on `el`.
 *
 * @param {EventTarget} el Target of the event.
 * @param {string} name Unprefixed event name, e.g. `open`.
 * @param {Record<string, unknown>} [detail] Event detail.
 * @param {{ cancelable?: boolean }} [options] Dispatch options.
 * @returns {boolean} `true` when the event was **not** cancelled.
 */
export function emit(el, name, detail, options) {
  const cancelable = options && options.cancelable === true;
  const event = new CustomEvent(`${EVENT_PREFIX}${name}`, {
    bubbles: true,
    composed: false,
    cancelable,
    detail: detail ?? {},
  });
  return el.dispatchEvent(event);
}
