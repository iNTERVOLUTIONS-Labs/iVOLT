// The handful of UI strings the client scripts need, read from the JSON block the layout writes
// into each page (#docs-strings) in the page's own language. The script used to import both
// translation tables whole — every visitor downloaded the other language's strings too — and the
// effects module imported only the English one, so its copy buttons spoke English on /es.
let cached = null;
let cachedFrom = null;
export function tr() {
  const el = document.getElementById("docs-strings");
  if (el && el !== cachedFrom) {
    try { cached = JSON.parse(el.textContent || "{}"); } catch { cached = {}; }
    cachedFrom = el;
  }
  return cached || {};
}
