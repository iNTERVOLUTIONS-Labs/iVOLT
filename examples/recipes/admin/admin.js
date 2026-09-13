/**
 * Admin recipe: the drawer sidebar, the demo form and the toasts.
 *
 * `auto.js` (linked from the page) initialises the dialog; the drawer and the
 * toast region are created here from their own modules, so this page works
 * whether or not they are part of the default component list of `init`.
 *
 * Nothing in this file sends, saves or deletes anything.
 */

import { Toast, Drawer } from "../ivolt/js/index.js";

const region = document.querySelector('[data-iv-component="toast"]');
const toasts = region ? Toast.getOrCreate(region) : null;

const drawerElement = document.getElementById("admin-nav");
const drawer = drawerElement ? Drawer.getOrCreate(drawerElement) : null;

// On narrow screens the drawer is a modal: following one of its links should
// close it, so the reader lands on the section instead of behind the panel.
if (drawer && drawerElement) {
  drawerElement.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("a[href^='#']") : null;
    if (link && drawer.isOpen) drawer.close("trigger");
  });
}

const form = document.getElementById("customer-form");
if (form) {
  form.addEventListener("submit", (event) => {
    // Demo page: the submission is stopped here and only a toast is shown.
    event.preventDefault();
    if (toasts) {
      toasts.show({
        title: "Customer saved",
        message: "Demo: nothing was sent.",
        variant: "success",
      });
    }
  });
}

const confirmDialog = document.getElementById("confirm-delete");
if (confirmDialog) {
  confirmDialog.addEventListener("iv:closed", (event) => {
    const detail = /** @type {CustomEvent} */ (event).detail;
    if (!detail || detail.returnValue !== "confirm") return;
    if (toasts) {
      toasts.show({
        title: "Nothing was deleted",
        message: "Demo: nothing was deleted. Order NW-1038 is still in the table.",
        variant: "danger",
      });
    }
  });
}
