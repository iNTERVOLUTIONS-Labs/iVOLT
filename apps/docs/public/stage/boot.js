/* Stage boot: read the URL, dress the document before the first paint, then keep talking to the
   host page. Served as a static file (not inline) so the site's CSP hash list does not grow:
   the only inline script the site ships is still the theme snippet of the layout.
   It is a classic script in <head>, so it runs before the body is parsed and before first paint. */
(function () {
  var p = new URLSearchParams(location.search);
  var root = document.documentElement;
  var theme = p.get("theme");
  if (theme === "light" || theme === "dark" || theme === "system") root.setAttribute("data-iv-theme", theme);
  var dir = p.get("dir") === "rtl" ? "rtl" : "ltr";
  root.setAttribute("dir", dir);
  if (dir === "rtl") root.setAttribute("lang", "ar");
  if (p.get("motion") === "reduce") root.setAttribute("data-stage-motion", "reduce");
  if (p.get("flat") === "1") root.setAttribute("data-stage-flat", "1");
  // The navbar and any component that folds must fold from the first paint, never after it.
  root.setAttribute("data-iv-js", "");

  function sheet() { return document.getElementById("stage-sheet"); }
  function applyFlat(on) {
    var link = sheet();
    if (!link) return;
    var next = on ? link.dataset.flat : link.dataset.layered;
    if (link.getAttribute("href") !== next) link.setAttribute("href", next);
    root.toggleAttribute("data-stage-flat", !!on);
  }
  applyFlat(p.get("flat") === "1");

  var id = p.get("id") || "";
  function post(msg) {
    msg.id = id;
    try { parent.postMessage(msg, location.origin); } catch (e) {}
  }
  // An open overlay (a modal dialog, a drawer, a lightbox, a command palette, a popover, a
  // calendar) lives in the top layer: it adds nothing to the body, so a stage measured by its body
  // alone stayed at the height of the trigger — 120 px on a phone, with the dialog cut to a strip
  // inside it. What an overlay needs is measured as what it is missing, never as its own size: a
  // drawer is as tall as the frame by design, and "its height plus a margin" grew the frame, which
  // grew the drawer, which grew the frame, for ever. So: the largest amount any part of it
  // overflows by, and how far past the bottom edge an anchored one (a calendar) reaches.
  function openOverlay(el) {
    if (el.tagName === "DIALOG") return el.open;
    if (el.hasAttribute("popover")) { try { return el.matches(":popover-open"); } catch (e) { return false; } }
    // A calendar or a menu drawn in the page (role="dialog" on a div), shown by removing `hidden`.
    return !el.hidden;
  }
  function overlayHeight() {
    var need = 0;
    var vh = innerHeight;
    var list = document.querySelectorAll("dialog[open], [popover], [role='dialog']:not(dialog):not([hidden])");
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (!openOverlay(el)) continue;
      var cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      var short = 0;
      var parts = [el].concat([].slice.call(el.querySelectorAll("*")));
      for (var n = 0; n < parts.length; n++) {
        var p = parts[n];
        if (p.clientHeight > 2) short = Math.max(short, p.scrollHeight - p.clientHeight);
      }
      var r = el.getBoundingClientRect();
      // A modal that fills the frame from edge to edge gets a little air above and below it.
      var air = r.height >= vh - 8 && el.tagName === "DIALOG" && !/drawer|lightbox/.test(el.className) ? 48 : 0;
      // Only an overlay held back by the frame itself is short of room: one that is smaller than
      // the frame and scrolls a list of its own (the command palette caps its results on purpose)
      // would never stop asking — every extra pixel it was given, it asked for again.
      // A calendar placed under its field and capped at the bottom edge is held back too.
      var squeezed = r.height >= vh - 64 || r.bottom >= vh - 24;
      // One drawn in the page (absolute, not in the top layer) also keeps the room it has: WebKit
      // leaves it out of the body's height, so the frame shrank back under it, the calendar was
      // capped again, asked again, and the frame breathed in and out for ever.
      var inPage = cs.position === "absolute";
      need = Math.max(need, squeezed && short > 1 ? vh + short + air : 0, r.bottom > vh + 1 || inPage ? r.bottom + scrollY + 16 : 0);
    }
    return Math.ceil(need);
  }
  function height() {
    var b = document.body;
    if (!b) return 0;
    // The root element is deliberately left out: it always fills the frame, so including it turns
    // the measurement into a ratchet — the frame could grow but never shrink back to its content,
    // and a 60 px row of buttons kept the 16 rem the placeholder had reserved.
    return Math.ceil(Math.max(b.scrollHeight, b.offsetHeight));
  }
  var last = 0;
  // `force` exists because the host can miss the first report: an eager frame may finish loading
  // and announce its height before the page that embeds it has attached its listener. Without a
  // forced repeat the "same height as last time" guard would silence every retry, and the frame
  // would keep the placeholder minimum for ever — a hole under the example.
  function report(force) {
    var body = height();
    var over = overlayHeight();
    var h = Math.max(body, over);
    // `overlay` tells the host the extra room is for something open right now: it is given even
    // past the stage's cap, because a dialog cut in half behind "Show all" is not a demo.
    if (h && (force || Math.abs(h - last) > 1)) { last = h; post({ type: "stage-height", height: h, overlay: over > body }); }
  }

  addEventListener("message", function (e) {
    if (e.origin !== location.origin || !e.data || e.data.type !== "stage-set") return;
    var d = e.data;
    if (d.theme) root.setAttribute("data-iv-theme", d.theme);
    if (d.dir) { root.setAttribute("dir", d.dir); root.setAttribute("lang", d.dir === "rtl" ? "ar" : document.documentElement.dataset.baseLang || "en"); }
    if ("motion" in d) { if (d.motion === "reduce") root.setAttribute("data-stage-motion", "reduce"); else root.removeAttribute("data-stage-motion"); }
    if ("flat" in d) applyFlat(!!d.flat);
    // The host says whether the frame is as tall as this page. Then the page never shows a
    // scrollbar of its own: with classic scrollbars (WebKit and Chromium on Linux, Windows) the
    // bar narrowed the page, the text rewrapped taller, the frame grew, the bar went, the text
    // rewrapped shorter — and the frame breathed between two heights every 400 ms.
    if ("clip" in d) root.style.overflowY = d.clip ? "hidden" : "";
    requestAnimationFrame(function () { report(true); });
  });

  addEventListener("DOMContentLoaded", function () {
    // The page links ivolt.iife.min.js, the published single file, instead of walking the module
    // graph of auto.js: one request instead of 37. auto.js also called init for itself on this
    // very event, so the moment the components come alive has not moved.
    try { if (window.IVOLT && typeof IVOLT.init === "function") IVOLT.init(document); } catch (e) {}
    // Announce: the host answers with the theme, direction, motion and sheet it is showing. Without
    // this, a frame that finished loading before the host script ran would keep its own defaults.
    post({ type: "stage-ready" });
    report(true);
    // Firefox can run this before <body> exists; the root element resizes with it either way.
    var watched = document.body || document.documentElement;
    if (window.ResizeObserver && watched) new ResizeObserver(function () { report(false); }).observe(watched);
    addEventListener("load", function () { report(true); });
    // Opening or closing an overlay changes the room the page needs without resizing the body:
    // report on the way in, once the panel has laid out, and after its entrance has finished; on
    // the way out the frame shrinks back to the trigger.
    function settle() {
      requestAnimationFrame(function () { report(true); });
      setTimeout(function () { report(true); }, 80);
      setTimeout(function () { report(true); }, 400);
    }
    ["iv:opened", "iv:closed", "iv:open", "iv:close", "toggle", "close"].forEach(function (type) {
      document.addEventListener(type, settle, true);
    });
    // Components settle after init (a carousel measures, a navbar folds): report once more.
    setTimeout(function () { report(true); }, 120);
    setTimeout(function () { report(true); }, 600);
  });
})();
