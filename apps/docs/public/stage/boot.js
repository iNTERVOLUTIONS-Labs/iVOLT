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
    return Math.ceil(Math.max(b.scrollHeight, b.offsetHeight, document.documentElement.scrollHeight));
  }
  var last = 0;
  function report() {
    var h = height();
    if (h && Math.abs(h - last) > 1) { last = h; post({ type: "stage-height", height: h }); }
  }

  addEventListener("message", function (e) {
    if (e.origin !== location.origin || !e.data || e.data.type !== "stage-set") return;
    var d = e.data;
    if (d.theme) root.setAttribute("data-iv-theme", d.theme);
    if (d.dir) { root.setAttribute("dir", d.dir); root.setAttribute("lang", d.dir === "rtl" ? "ar" : document.documentElement.dataset.baseLang || "en"); }
    if ("motion" in d) { if (d.motion === "reduce") root.setAttribute("data-stage-motion", "reduce"); else root.removeAttribute("data-stage-motion"); }
    if ("flat" in d) applyFlat(!!d.flat);
    requestAnimationFrame(report);
  });

  addEventListener("DOMContentLoaded", function () {
    report();
    if (window.ResizeObserver) new ResizeObserver(report).observe(document.body);
    addEventListener("load", report);
    // Components settle after init (a carousel measures, a navbar folds): report once more.
    setTimeout(report, 120);
    setTimeout(report, 600);
  });
})();
