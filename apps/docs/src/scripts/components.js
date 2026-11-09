// Brings the page's iVOLT components to life, loading only the ones it has.
//
// The layout used to import the package's auto-init entry, which pulls every component module:
// 48 KB of script on every page, ~40 KB of it unused on a typical visit (Lighthouse,
// 2026-11-09). The shell itself needs two components, the dialog (navigation and search) and the
// megamenu; everything else is fetched as its own chunk only when the page carries it.
//
// Declarative triggers (data-iv-open / -toggle / -close) are wired by the package's init, which
// imports every component. The shell's own triggers are answered here instead; a page whose
// content carries triggers, or tooltips (which attach to the body), takes the full init, and from
// then on the package's delegated handler answers everything, so the shell's handler steps aside.
import { Dialog } from "@intervolutions/ivolt/dialog";
import { Megamenu } from "@intervolutions/ivolt/megamenu";

const SHELL = new Set(["dialog", "megamenu"]);
const loaders = {
  carousel: () => import("@intervolutions/ivolt/carousel"),
  combobox: () => import("@intervolutions/ivolt/combobox"),
  command: () => import("@intervolutions/ivolt/command"),
  counter: () => import("@intervolutions/ivolt/counter"),
  countup: () => import("@intervolutions/ivolt/countup"),
  datatable: () => import("@intervolutions/ivolt/datatable"),
  datepicker: () => import("@intervolutions/ivolt/datepicker"),
  disclosure: () => import("@intervolutions/ivolt/disclosure"),
  drawer: () => import("@intervolutions/ivolt/drawer"),
  dropdown: () => import("@intervolutions/ivolt/dropdown"),
  form: () => import("@intervolutions/ivolt/form"),
  lightbox: () => import("@intervolutions/ivolt/lightbox"),
  navbar: () => import("@intervolutions/ivolt/navbar"),
  picker: () => import("@intervolutions/ivolt/picker"),
  popover: () => import("@intervolutions/ivolt/popover"),
  proximity: () => import("@intervolutions/ivolt/proximity"),
  reveal: () => import("@intervolutions/ivolt/reveal"),
  "scroll-motion": () => import("@intervolutions/ivolt/scroll-motion"),
  stepper: () => import("@intervolutions/ivolt/stepper"),
  tabs: () => import("@intervolutions/ivolt/tabs"),
  toast: () => import("@intervolutions/ivolt/toast"),
  tooltip: () => import("@intervolutions/ivolt/tooltip"),
};

const SHELL_TRIGGERS = "#docs-nav, #docs-search, .docs-header";
let full = false;

/** Wires the shell's own open/close triggers until the package's full init takes over. */
function shellTriggers() {
  if (window.__docsShellTriggers) return;
  window.__docsShellTriggers = true;
  document.addEventListener("click", (e) => {
    if (full) return;
    const trigger = e.target instanceof Element ? e.target.closest("[data-iv-open], [data-iv-close]") : null;
    if (!trigger || !trigger.closest(SHELL_TRIGGERS)) return;
    const openId = trigger.getAttribute("data-iv-open");
    if (openId) {
      const el = document.getElementById(openId);
      if (el && el.matches('[data-iv-component="dialog"]')) Dialog.getOrCreate(el).open({ trigger });
      return;
    }
    if (trigger.hasAttribute("data-iv-close")) {
      const host = trigger.closest('[data-iv-component="dialog"]');
      if (host) Dialog.getOrCreate(host).close("trigger");
    }
  });
}

/** Initialises the page; resolves when every component it carries is running. */
export async function initPage(doc = document, isCurrent = () => true) {
  shellTriggers();
  Dialog.initAll(doc);
  Megamenu.initAll(doc);
  const names = new Set([...doc.querySelectorAll("[data-iv-component]")].map((el) => el.getAttribute("data-iv-component")).filter((n) => !SHELL.has(n)));
  const contentTriggers = [...doc.querySelectorAll("[data-iv-open], [data-iv-toggle], [data-iv-close]")].some((el) => !el.closest(SHELL_TRIGGERS) && (el.getAttribute("data-iv-open") || el.getAttribute("data-iv-toggle") || el.hasAttribute("data-iv-close")));
  const unknown = [...names].some((n) => !loaders[n]);
  if (full || contentTriggers || unknown || doc.querySelector("[data-iv-tooltip]")) {
    const m = await import("@intervolutions/ivolt");
    if (!isCurrent()) return;
    full = true;
    m.init(doc);
    return;
  }
  const mods = await Promise.all([...names].map((n) => loaders[n]().catch(() => null)));
  if (!isCurrent()) return;
  for (const mod of mods) {
    if (!mod) continue;
    for (const C of Object.values(mod)) if (C && typeof C.initAll === "function" && C.componentName) C.initAll(doc);
  }
}
