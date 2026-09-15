// Drives every stage on the page: the controls, the width of the frame and its height.
// The stage page reports its own height through postMessage (same origin, checked on both ends),
// so a component that grows — an open dialog, a carousel that measures — is never cut off.
import { getTheme, resolveTheme } from "@intervolutions/ivolt/theme";

const WIDTHS = { 390: "390px", 768: "768px", full: "100%" };

/**
 * Tabs over a group of panels (a code block, the home showreel). One panel at a time, arrows
 * move between the tabs, and the selection is applied on mount so the served markup can show
 * every panel: without this script all of them stay readable instead of one being lost.
 */
function mountTabs(tabs, doc = document) {
  const buttons = [...tabs.querySelectorAll('[role="tab"]')];
  if (!buttons.length) return () => {};
  const panels = buttons.map((b) => doc.getElementById(b.getAttribute("aria-controls")));
  const select = (i) => {
    buttons.forEach((b, n) => { b.setAttribute("aria-selected", String(n === i)); b.tabIndex = n === i ? 0 : -1; });
    panels.forEach((p, n) => { if (p) p.hidden = n !== i; });
  };
  select(0);
  const onClick = (e) => { const i = buttons.indexOf(e.target.closest('[role="tab"]')); if (i >= 0) select(i); };
  const onKey = (e) => {
    const i = buttons.indexOf(doc.activeElement);
    if (i < 0) return;
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + buttons.length) % buttons.length;
    select(next); buttons[next].focus();
  };
  tabs.addEventListener("click", onClick);
  tabs.addEventListener("keydown", onKey);
  return () => { tabs.removeEventListener("click", onClick); tabs.removeEventListener("keydown", onKey); };
}

/** The home showreel: one frame, six components, tabs of a gallery over a single stage. */
function mountShowreel(root) {
  const reel = root.querySelector("[data-showreel]");
  return reel ? mountTabs(reel, root.getElementById ? root : document) : () => {};
}

export function mountStage(root = document) {
  const reel = mountShowreel(root);
  const blocks = [...root.querySelectorAll("[data-code-tabs]")].map((t) => mountTabs(t, root.getElementById ? root : document));
  const stopBlocks = () => blocks.forEach((fn) => fn());
  const stages = [...root.querySelectorAll("[data-stage]")];
  if (!stages.length) return () => { reel(); stopBlocks(); };
  const byId = new Map();
  const cleanup = [];

  for (const stage of stages) {
    const frame = stage.querySelector("[data-stage-frame]");
    const screen = stage.querySelector("[data-stage-screen]");
    const controls = stage.querySelector("[data-stage-controls]");
    if (!frame) continue;
    byId.set(stage.id, { stage, frame });

    const state = {
      theme: resolveTheme(),
      dir: "ltr",
      motion: false,
      flat: false,
      width: stage.dataset.stageWidth || "full",
    };

    const post = (patch) => {
      Object.assign(state, patch);
      try { frame.contentWindow?.postMessage({ type: "stage-set", ...state }, location.origin); } catch {}
    };

    const paint = () => {
      if (!controls) return;
      controls.querySelectorAll("[data-stage-theme]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.stageTheme === state.theme)));
      controls.querySelectorAll("[data-stage-dir]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.stageDir === state.dir)));
      controls.querySelectorAll("[data-stage-set-width]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.stageSetWidth === state.width)));
    };

    const setWidth = (w) => {
      state.width = w;
      stage.dataset.stageWidth = w;
      if (screen) screen.style.setProperty("--docs-stage-w", WIDTHS[w] || "100%");
      paint();
    };

    if (controls) {
      controls.hidden = false;
      controls.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.stageTheme) { post({ theme: b.dataset.stageTheme }); paint(); }
        else if (b.dataset.stageDir) { post({ dir: b.dataset.stageDir }); paint(); }
        else if (b.dataset.stageSetWidth) setWidth(b.dataset.stageSetWidth);
      });
      controls.addEventListener("change", (e) => {
        const input = e.target;
        if (input.matches("[data-stage-motion]")) post({ motion: input.checked ? "reduce" : "" });
        else if (input.matches("[data-stage-flat]")) post({ flat: input.checked });
      });
    }
    setWidth(state.width);

    // The frame starts in the theme the site is showing, whatever that is.
    frame.addEventListener("load", () => post({}));

  }

  const onMessage = (e) => {
    if (e.origin !== location.origin || !e.data || e.data.type !== "stage-height") return;
    const entry = byId.get(e.data.id);
    if (!entry) return;
    // A fixture that is a page of its own (a sticky header needs screens of filler) must not add
    // three screens to the article: past the cap the stage scrolls inside its own frame.
    const cap = Number(entry.frame.dataset.stageMax) || 544;
    const reported = Number(e.data.height) || 0;
    const h = Math.max(120, Math.min(cap, reported));
    entry.frame.style.blockSize = `${h}px`;
    entry.frame.closest("[data-stage]")?.toggleAttribute("data-stage-capped", reported > cap + 1);
  };
  addEventListener("message", onMessage);
  cleanup.push(() => removeEventListener("message", onMessage));

  // The site theme changes: every stage follows, without reloading its page.
  const onTheme = () => {
    const theme = resolveTheme();
    for (const { stage, frame } of byId.values()) {
      const pressed = stage.querySelector("[data-stage-theme][aria-pressed=true]");
      if (pressed && pressed.dataset.stageTheme !== theme) continue; // the reader chose; leave it alone
      try { frame.contentWindow?.postMessage({ type: "stage-set", theme }, location.origin); } catch {}
      stage.querySelectorAll("[data-stage-theme]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.stageTheme === theme)));
    }
  };
  document.addEventListener("iv:themechange", onTheme);
  cleanup.push(() => document.removeEventListener("iv:themechange", onTheme));

  // Paint the initial pressed state from the site theme (getTheme may be "system").
  void getTheme;

  cleanup.push(reel, stopBlocks);
  return () => cleanup.forEach((fn) => fn());
}
