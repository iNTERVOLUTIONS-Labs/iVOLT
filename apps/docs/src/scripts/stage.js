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

  // A stage taller than its cap scrolls inside its own frame and says so — but a reader who wants
  // the whole thing gets it: "Show all" lifts the cap for that stage only.
  // Below `sm` a fixed 544 px cap cut every example in half — on a 390 phone the frame showed a
  // third of the navbar and two thirds of nothing. There the cap follows the screen instead, and
  // "Show all" is still the way to the rest.
  const capOf = (frame) => {
    const declared = Number(frame.dataset.stageMax) || 544;
    if (innerWidth >= 640) return declared;
    return Math.round(Math.min(innerHeight * 0.8, 720));
  };

  const applyHeight = (entry) => {
    if (!entry.reported) return;
    const cap = capOf(entry.frame);
    const capped = entry.reported > cap + 1;
    const h = Math.max(120, entry.expanded ? entry.reported : Math.min(cap, entry.reported));
    entry.frame.style.blockSize = `${h}px`;
    // The reserved minimum existed only to keep the layout from jumping while the frame loaded.
    // Once the page inside has measured itself, a 16rem floor is just a hole under the example.
    entry.frame.style.minBlockSize = "0px";
    entry.stage.toggleAttribute("data-stage-capped", capped && !entry.expanded);
    const button = entry.stage.querySelector("[data-stage-all]");
    if (!button) return;
    button.hidden = !capped;
    button.setAttribute("aria-pressed", String(entry.expanded));
    button.textContent = entry.expanded ? button.dataset.labelLess : button.dataset.labelAll;
  };

  for (const stage of stages) {
    const frame = stage.querySelector("[data-stage-frame]");
    const screen = stage.querySelector("[data-stage-screen]");
    const controls = stage.querySelector("[data-stage-controls]");
    if (!frame) continue;

    const state = {
      theme: resolveTheme(),
      dir: "ltr",
      motion: false,
      flat: false,
      width: stage.dataset.stageWidth || "full",
    };
    // `chosen` is the difference between "this stage shows the site theme" and "the reader picked
    // a theme here": only the first follows the switch in the header.
    const entry = { stage, frame, state, reported: 0, expanded: false, chosen: false };
    byId.set(stage.id, entry);

    const post = (patch) => {
      Object.assign(state, patch);
      try { frame.contentWindow?.postMessage({ type: "stage-set", ...state }, location.origin); } catch {}
    };
    entry.post = post;

    const paint = () => {
      if (!controls) return;
      controls.querySelectorAll("[data-stage-theme]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.stageTheme === state.theme)));
      controls.querySelectorAll("[data-stage-dir]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.stageDir === state.dir)));
      controls.querySelectorAll("[data-stage-set-width]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.stageSetWidth === state.width)));
      controls.querySelectorAll("button[data-stage-motion]").forEach((b) => b.setAttribute("aria-pressed", String(state.motion === "reduce")));
      controls.querySelectorAll("button[data-stage-flat]").forEach((b) => b.setAttribute("aria-pressed", String(!!state.flat)));
    };
    entry.paint = paint;

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
        if (b.dataset.stageTheme) { entry.chosen = true; post({ theme: b.dataset.stageTheme }); paint(); }
        else if (b.dataset.stageDir) { post({ dir: b.dataset.stageDir }); paint(); }
        else if (b.dataset.stageSetWidth) setWidth(b.dataset.stageSetWidth);
        else if ("stageMotion" in b.dataset) { post({ motion: state.motion === "reduce" ? "" : "reduce" }); paint(); }
        else if ("stageFlat" in b.dataset) { post({ flat: !state.flat }); paint(); }
        else if ("stageAll" in b.dataset) { entry.expanded = !entry.expanded; applyHeight(entry); }
      });
    }
    setWidth(state.width);

    // The frame starts in the theme the site is showing, whatever that is. Three ways in, because
    // an eager frame can finish loading before this module runs: the page announces itself when it
    // boots (stage-ready), the load event covers a frame that arrives later, and this first call
    // covers a frame that was already complete and had announced itself before anyone listened.
    frame.addEventListener("load", () => post({}));
    post({});
  }

  // A lazy frame that only loads when it is already on screen leaves a hole where the example
  // should be: it is asked for well before the reader arrives, and stays lazy while its panel is
  // hidden (a hidden tab has no box, so it never intersects).
  const lazy = stages.map((s) => s.querySelector('[data-stage-frame][loading="lazy"]')).filter(Boolean);
  if (lazy.length && typeof IntersectionObserver === "function") {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.loading = "eager"; io.unobserve(e.target); }
    }, { rootMargin: "1200px 0px 1200px 0px" });
    lazy.forEach((f) => io.observe(f));
    cleanup.push(() => io.disconnect());
  }

  // The cap is a function of the viewport now, so a rotation or a resized window re-applies it.
  let resizeTick = false;
  const onResize = () => {
    if (resizeTick) return;
    resizeTick = true;
    requestAnimationFrame(() => { resizeTick = false; byId.forEach((entry) => applyHeight(entry)); });
  };
  addEventListener("resize", onResize, { passive: true });
  cleanup.push(() => removeEventListener("resize", onResize));

  const onMessage = (e) => {
    if (e.origin !== location.origin || !e.data) return;
    const entry = byId.get(e.data.id);
    if (!entry) return;
    if (e.data.type === "stage-ready") { entry.post({}); return; }
    if (e.data.type !== "stage-height") return;
    entry.reported = Number(e.data.height) || 0;
    applyHeight(entry);
  };
  addEventListener("message", onMessage);
  cleanup.push(() => removeEventListener("message", onMessage));

  // The site theme changes: every stage follows, without reloading its page. A stage whose theme
  // the reader picked by hand keeps that choice — that is the only exception.
  const onTheme = () => {
    const theme = resolveTheme();
    for (const entry of byId.values()) {
      if (entry.chosen) continue;
      entry.post({ theme });
      entry.paint();
    }
  };
  document.addEventListener("iv:themechange", onTheme);
  cleanup.push(() => document.removeEventListener("iv:themechange", onTheme));

  // Paint the initial pressed state from the site theme (getTheme may be "system").
  void getTheme;

  cleanup.push(reel, stopBlocks);
  return () => cleanup.forEach((fn) => fn());
}
