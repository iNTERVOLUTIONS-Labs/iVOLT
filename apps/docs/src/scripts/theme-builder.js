// Theme builder: edits a handful of tokens live on a preview scope and prints the CSS to copy.
// Everything happens in the page; nothing is stored or sent anywhere. The state also lives in the
// URL hash (#theme=dark&primary=ff6600&…), so a theme is a link anyone can open; links made with
// the 1.0 builder use the same keys and still load.
//
// Since 1.1 the package mixes the primary's family in CSS (one-colour theming, ADR-054): the
// preview is a [data-iv-theme] scope, so setting --iv-color-primary on it repaints hover, focus,
// glows and gradients by itself. The builder only writes seeds, plus what CSS cannot derive from
// them (the text on the accent, muted text and borders from the surfaces) and the two gradient
// recipes that carry the accent. The printed CSS shrank from fifteen derived tokens to those.
import { tokens as deriveTokens, fontKeys } from "../data/themes.js";
const FONT_OF = (v) => (/Outfit/.test(v) ? "outfit" : /Georgia|serif/.test(v) && !/sans-serif/.test(v) ? "serif" : /monospace/.test(v) ? "mono" : "system");
const DERIVED = ["--iv-color-on-accent", "--iv-color-text-muted", "--iv-color-border", "--iv-color-border-strong", "--iv-color-hover-surface", "--iv-mix-brand-start", "--iv-mix-brand-end", "--iv-mix-gradient-end"];
const FIELDS = [
  { key: "primary", token: "--iv-color-primary", label: "primary" },
  { key: "on-primary", token: "--iv-color-on-primary", label: "text on primary" },
  { key: "accent", token: "--iv-color-accent", label: "accent" },
  { key: "bg", token: "--iv-color-bg", label: "background" },
  { key: "surface", token: "--iv-color-surface", label: "surface" },
  { key: "surface-raised", token: "--iv-color-surface-raised", label: "raised surface" },
  { key: "text", token: "--iv-color-text", label: "text" },
];

function rgbToHex(value) {
  const m = value.match(/rgba?\(([^)]+)\)/);
  // The built stylesheet is minified, so white arrives as "#fff": <input type="color"> only
  // accepts the six-digit form, so short hex is expanded before it is written into the field.
  if (!m) {
    if (/^#[0-9a-f]{3,4}$/i.test(value)) return "#" + value.slice(1, 4).split("").map((c) => c + c).join("");
    return /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  }
  const parts = m[1].split(/[\s,\/]+/).filter(Boolean).slice(0, 3).map((n) => Math.round(parseFloat(n)));
  return "#" + parts.map((n) => n.toString(16).padStart(2, "0")).join("");
}

function mixHex(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

export function mountThemeBuilder(root) {
  const preview = root.querySelector("[data-tb-preview]");
  // The output block sits outside the builder grid, in the prose that follows it.
  const output = root.ownerDocument.querySelector("[data-tb-output]");
  const form = root.querySelector("[data-tb-form]");
  if (!preview || !output || !form) return () => {};
  const scope = preview;
  const state = {};
  const radius = form.querySelector('[name="radius"]');
  const font = form.querySelector('[name="font"]');
  // The preview theme is a radio group: read the checked one at render time. Reading the first
  // radio once pinned the preview to "light" whatever the reader chose.
  const themeValue = () => form.querySelector('[name="theme"]:checked')?.value || "light";
  const seed = () => {
    const live = getComputedStyle(scope);
    for (const f of FIELDS) {
      const input = form.querySelector(`[name="${f.key}"]`);
      if (input && input.dataset.touched !== "true") input.value = rgbToHex(live.getPropertyValue(f.token).trim() || "#000000");
    }
  };

  const render = () => {
    const lines = [];
    for (const f of FIELDS) {
      const input = form.querySelector(`[name="${f.key}"]`);
      if (!input) continue;
      const touched = input.dataset.touched === "true";
      if (touched) {
        scope.style.setProperty(f.token, input.value);
        state[f.token] = input.value;
      }
    }
    // A touched colour brings what CSS cannot mix by itself (muted text, borders, the ink on the
    // accent) and the gradient recipes; the primary's own family is mixed by the package.
    if (FIELDS.some((f) => form.querySelector(`[name="${f.key}"]`)?.dataset.touched === "true")) {
      const v = (k) => form.querySelector(`[name="${k}"]`)?.value || "#000000";
      const derived = deriveTokens({ mode: themeValue(), primary: v("primary"), onPrimary: v("on-primary"), accent: v("accent"), bg: v("bg"), surface: v("surface"), raised: v("surface-raised"), text: v("text"), muted: mixHex(v("text"), v("bg"), 0.32), radius: 0.875, font: "outfit" });
      for (const k of DERIVED) { scope.style.setProperty(k, derived[k]); state[k] = derived[k]; }
    }
    if (radius && radius.dataset.touched === "true") {
      const md = `${radius.value}rem`;
      scope.style.setProperty("--iv-radius-sm", `${(radius.value / 2).toFixed(3)}rem`);
      scope.style.setProperty("--iv-radius-md", md);
      scope.style.setProperty("--iv-radius-lg", `${(radius.value * 1.5).toFixed(3)}rem`);
      state["--iv-radius-sm"] = `${(radius.value / 2).toFixed(3)}rem`;
      state["--iv-radius-md"] = md;
      state["--iv-radius-lg"] = `${(radius.value * 1.5).toFixed(3)}rem`;
    }
    if (font && font.dataset.touched === "true") {
      scope.style.setProperty("--iv-font-sans", font.value);
      state["--iv-font-sans"] = font.value;
    }
    const theme = themeValue();
    if (scope.getAttribute("data-iv-theme") !== theme) {
      scope.setAttribute("data-iv-theme", theme);
      // Untouched fields follow the theme now shown, so the reader edits what they see.
      seed();
    }
    const selector = theme === "dark" ? '[data-iv-theme="dark"]' : ':root, [data-iv-theme="light"], [data-iv-theme="system"]';
    const body = Object.entries(state).map(([k, v]) => `  ${k}: ${v};`).join("\n");
    writeHash();
    output.textContent = body ? `/* iVOLT theme overrides: load after ivolt.css, or inside @layer iv.overrides */\n${selector} {\n${body}\n}` : "/* Change a control to see the overrides here. */";
  };
  // ---- the URL hash: read once on mount, rewritten on every change ----
  const writeHash = () => {
    const q = new URLSearchParams();
    const touched = [...form.querySelectorAll("[name]")].filter((i) => i.dataset.touched === "true");
    if (!touched.length) { if (/[=&]/.test(location.hash)) history.replaceState(history.state, "", location.pathname + location.search); return; }
    q.set("theme", themeValue());
    for (const f of FIELDS) { const i = form.querySelector(`[name="${f.key}"]`); if (i && i.dataset.touched === "true") q.set(f.key, i.value.replace(/^#/, "")); }
    if (radius && radius.dataset.touched === "true") q.set("radius", radius.value);
    if (font && font.dataset.touched === "true") q.set("font", FONT_OF(font.value));
    history.replaceState(history.state, "", `${location.pathname}${location.search}#${q}`);
  };
  const readHash = () => {
    const raw = location.hash.slice(1);
    if (!/(^|&)(theme|primary|radius|font|bg|accent)=/.test(raw)) return;
    const q = new URLSearchParams(raw);
    const theme = q.get("theme");
    if (theme === "light" || theme === "dark") { const r = form.querySelector(`[name="theme"][value="${theme}"]`); if (r) r.checked = true; scope.setAttribute("data-iv-theme", theme); seed(); }
    for (const f of FIELDS) {
      const val = q.get(f.key); const i = form.querySelector(`[name="${f.key}"]`);
      if (i && val && /^[0-9a-f]{6}$/i.test(val)) { i.value = `#${val.toLowerCase()}`; i.dataset.touched = "true"; }
    }
    const r = Number(q.get("radius"));
    if (radius && q.has("radius") && r >= 0 && r <= 1.5) { radius.value = String(r); radius.dataset.touched = "true"; }
    const fk = q.get("font");
    if (font && fk && fontKeys.includes(fk)) { const opt = [...font.options].find((o) => FONT_OF(o.value) === fk); if (opt) { font.value = opt.value; font.dataset.touched = "true"; } }
  };
  const share = root.ownerDocument.querySelector("[data-tb-share]");
  const onShare = async () => {
    const label = share.textContent;
    try { await navigator.clipboard.writeText(location.href); share.textContent = share.dataset.labelDone || "Copied"; }
    catch { share.textContent = location.href; }
    setTimeout(() => { share.textContent = label; }, 2000);
  };
  if (share) { share.hidden = false; share.addEventListener("click", onShare); }
  const onInput = (e) => {
    if (e.target && e.target.name) e.target.dataset.touched = "true";
    render();
  };
  form.addEventListener("input", onInput);
  form.addEventListener("change", onInput);
  const reset = form.querySelector("[data-tb-reset]");
  const onReset = () => {
    for (const k of Object.keys(state)) { scope.style.removeProperty(k); delete state[k]; }
    for (const input of form.querySelectorAll("[name]")) delete input.dataset.touched;
    for (const f of FIELDS) {
      const input = form.querySelector(`[name="${f.key}"]`);
      if (input) input.value = rgbToHex(getComputedStyle(scope).getPropertyValue(f.token).trim() || "#000000");
    }
    if (radius) radius.value = "0.5";
    render();
  };
  if (reset) reset.addEventListener("click", onReset);
  // Seed every colour field from the theme the preview starts in, so the reader edits what they see.
  scope.setAttribute("data-iv-theme", themeValue());
  seed();
  readHash();
  render();
  return () => { if (share) share.removeEventListener("click", onShare); form.removeEventListener("input", onInput); form.removeEventListener("change", onInput); if (reset) reset.removeEventListener("click", onReset); };
}
