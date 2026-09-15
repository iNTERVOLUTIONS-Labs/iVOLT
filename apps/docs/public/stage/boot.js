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
    var h = height();
    if (h && (force || Math.abs(h - last) > 1)) { last = h; post({ type: "stage-height", height: h }); }
  }

  addEventListener("message", function (e) {
    if (e.origin !== location.origin || !e.data || e.data.type !== "stage-set") return;
    var d = e.data;
    if (d.theme) root.setAttribute("data-iv-theme", d.theme);
    if (d.dir) { root.setAttribute("dir", d.dir); root.setAttribute("lang", d.dir === "rtl" ? "ar" : document.documentElement.dataset.baseLang || "en"); }
    if ("motion" in d) { if (d.motion === "reduce") root.setAttribute("data-stage-motion", "reduce"); else root.removeAttribute("data-stage-motion"); }
    if ("flat" in d) applyFlat(!!d.flat);
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
    if (window.ResizeObserver) new ResizeObserver(function () { report(false); }).observe(document.body);
    addEventListener("load", function () { report(true); });
    // Components settle after init (a carousel measures, a navbar folds): report once more.
    setTimeout(function () { report(true); }, 120);
    setTimeout(function () { report(true); }, 600);
  });
})();
