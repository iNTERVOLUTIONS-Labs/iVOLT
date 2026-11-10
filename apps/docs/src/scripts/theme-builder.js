// Theme builder: edits a handful of tokens live on a preview scope and prints the CSS to copy.
// Everything happens in the page; nothing is stored or sent anywhere. The state also lives in the
// URL hash, so a theme is a link anyone can open.
//
// Since 1.1 the package mixes the primary's family in CSS (one-colour theming, ADR-054): the
// preview is a [data-iv-theme] scope, so setting --iv-color-primary on it repaints hover, focus,
// glows and gradients by itself. The builder only writes seeds, plus what CSS cannot derive from
// them (the text on the accent, muted text and borders from the surfaces) and the two gradient
// recipes that carry the accent.
//
// Both modes (2026-11 round): the builder used to print one block for the mode on screen, so a
// brand made in dark had no light version and a site's light/dark switch stopped switching. Now
// the light and the dark seeds live side by side; the radio picks which one is edited and shown,
// and the output carries a block per mode plus the dark one for data-iv-theme="system" in a dark
// OS. The hash carries both (light-primary=…&dark-primary=…); links from the one-mode builder
// (primary=…&theme=dark) still open, into the mode they name.
import { tokens as deriveTokens, fontKeys, modeBlocks, bestInk, contrast, derived } from "../data/themes.js";

const FONT_OF = (v) => (/Outfit/.test(v) ? "outfit" : /Georgia|serif/.test(v) && !/sans-serif/.test(v) ? "serif" : /monospace/.test(v) ? "mono" : "system");
const DERIVED = ["--iv-color-on-accent", "--iv-color-text-muted", "--iv-color-border", "--iv-color-border-strong", "--iv-color-hover-surface", "--iv-mix-brand-start", "--iv-mix-brand-end", "--iv-mix-gradient-end"];
const FIELDS = [
  { key: "primary", token: "--iv-color-primary" },
  { key: "on-primary", token: "--iv-color-on-primary" },
  { key: "accent", token: "--iv-color-accent" },
  { key: "bg", token: "--iv-color-bg" },
  { key: "surface", token: "--iv-color-surface" },
  { key: "surface-raised", token: "--iv-color-surface-raised" },
  { key: "text", token: "--iv-color-text" },
];
const MODES = ["light", "dark"];

function rgbToHex(value) {
  const m = value.match(/rgba?\(([^)]+)\)/);
  // The built stylesheet is minified, so white arrives as "#fff": <input type="color"> only
  // accepts the six-digit form, so short hex is expanded before it is written into the field.
  if (!m) {
    if (/^#[0-9a-f]{3,4}$/i.test(value)) return "#" + value.slice(1, 4).split("").map((c) => c + c).join("");
    return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : "#000000";
  }
  const parts = m[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3).map((n) => Math.round(parseFloat(n)));
  return "#" + parts.map((n) => n.toString(16).padStart(2, "0")).join("");
}

function mixHex(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

export function mountThemeBuilder(root) {
  const doc = root.ownerDocument;
  const preview = root.querySelector("[data-tb-preview]");
  // The output block sits outside the builder grid, in the prose that follows it.
  const output = doc.querySelector("[data-tb-output]");
  const form = root.querySelector("[data-tb-form]");
  if (!preview || !output || !form) return () => {};
  const scope = preview;
  const radius = form.querySelector('[name="radius"]');
  const font = form.querySelector('[name="font"]');
  const ratio = root.querySelector("[data-tb-ratio]");
  const field = (key) => form.querySelector(`[name="${key}"]`);
  const modeNow = () => form.querySelector('[name="theme"]:checked')?.value || "light";

  // Per mode: the value of every colour, and which of them the reader (or a link) set. A field
  // the reader never touched shows what the package paints in that mode, and is not written out.
  const seeds = { light: {}, dark: {} };
  const touched = { light: new Set(), dark: new Set() };
  // The ink on the primary is picked for the reader until they pick it themselves.
  const autoInk = { light: false, dark: false };
  const shared = { radius: false, font: false };

  // What the package paints in a mode, read from a hidden probe scope so the preview's own
  // overrides never leak into the defaults.
  const probe = doc.createElement("div");
  probe.hidden = true;
  root.append(probe);
  const defaults = (mode) => {
    probe.setAttribute("data-iv-theme", mode);
    const live = getComputedStyle(probe);
    return Object.fromEntries(FIELDS.map((f) => [f.key, rgbToHex(live.getPropertyValue(f.token).trim() || "#000000")]));
  };
  const base = { light: defaults("light"), dark: defaults("dark") };
  const value = (mode, key) => seeds[mode][key] || base[mode][key];

  const tokensFor = (mode) => {
    if (!touched[mode].size) return {};
    const out = {};
    for (const f of FIELDS) if (touched[mode].has(f.key)) out[f.token] = value(mode, f.key);
    const v = (k) => value(mode, k);
    const all = deriveTokens({ mode, primary: v("primary"), onPrimary: v("on-primary"), accent: v("accent"), bg: v("bg"), surface: v("surface"), raised: v("surface-raised"), text: v("text"), muted: mixHex(v("text"), v("bg"), 0.32), radius: 0.875, font: "outfit" });
    for (const k of DERIVED) out[k] = all[k];
    return out;
  };
  const sharedTokens = () => {
    const out = {};
    if (shared.radius && radius) {
      out["--iv-radius-sm"] = `${(radius.value / 2).toFixed(3)}rem`;
      out["--iv-radius-md"] = `${radius.value}rem`;
      out["--iv-radius-lg"] = `${(radius.value * 1.5).toFixed(3)}rem`;
    }
    if (shared.font && font) out["--iv-font-sans"] = font.value;
    return out;
  };

  let painted = [];
  const paintPreview = () => {
    const mode = modeNow();
    painted.forEach((k) => scope.style.removeProperty(k));
    if (scope.getAttribute("data-iv-theme") !== mode) scope.setAttribute("data-iv-theme", mode);
    const all = { ...sharedTokens(), ...tokensFor(mode) };
    for (const [k, v] of Object.entries(all)) scope.style.setProperty(k, v);
    painted = Object.keys(all);
  };

  const fillFields = () => {
    const mode = modeNow();
    for (const f of FIELDS) { const i = field(f.key); if (i) i.value = value(mode, f.key); }
  };

  // The ratio of the ink on the primary, at rest and under the pointer (the hover the package
  // mixes), shown beside the field; under 4.5:1 it says so.
  const paintRatio = () => {
    if (!ratio) return;
    const mode = modeNow();
    const primary = value(mode, "primary"), ink = value(mode, "on-primary");
    const r = Math.min(contrast(ink, primary), contrast(ink, derived(primary, mode, "primary-hover")));
    const n = (Math.floor(r * 10) / 10).toFixed(1);
    const low = r < 4.5;
    ratio.textContent = (low ? ratio.dataset.labelLow : ratio.dataset.labelOk).replace("{ratio}", ratio.dataset.decimal === "," ? n.replace(".", ",") : n);
    ratio.classList.toggle("is-low", low);
  };

  const render = () => {
    paintPreview();
    paintRatio();
    writeHash();
    const light = tokensFor("light"), dark = tokensFor("dark"), common = sharedTokens();
    const any = Object.keys(light).length || Object.keys(dark).length || Object.keys(common).length;
    const head = output.dataset.head || '/* iVOLT theme overrides: load after ivolt.css, or inside @layer iv.overrides.\n   It follows data-iv-theme: "light", "dark" or "system". */';
    output.textContent = any ? `${head}\n${modeBlocks({ light, dark, shared: common })}` : output.dataset.empty || "/* Change a control to see the overrides here. */";
    if (download) download.hidden = !any;
  };

  // ---- the URL hash: read once on mount, rewritten on every change ----
  const writeHash = () => {
    const q = new URLSearchParams();
    const anything = MODES.some((m) => touched[m].size) || shared.radius || shared.font;
    if (!anything) { if (/[=&]/.test(location.hash)) history.replaceState(history.state, "", location.pathname + location.search); return; }
    q.set("theme", modeNow());
    for (const m of MODES) for (const f of FIELDS) if (touched[m].has(f.key)) q.set(`${m}-${f.key}`, value(m, f.key).replace(/^#/, ""));
    if (shared.radius && radius) q.set("radius", radius.value);
    if (shared.font && font) q.set("font", FONT_OF(font.value));
    history.replaceState(history.state, "", `${location.pathname}${location.search}#${q}`);
  };
  const readHash = () => {
    const raw = location.hash.slice(1);
    if (!/(^|&)(theme|(light-|dark-)?primary|radius|font|(light-|dark-)?bg|(light-|dark-)?accent)=/.test(raw)) return;
    const q = new URLSearchParams(raw);
    const theme = q.get("theme") === "light" ? "light" : "dark";
    const r = form.querySelector(`[name="theme"][value="${theme}"]`);
    if (r) r.checked = true;
    const take = (mode, key, val) => { if (val && /^[0-9a-f]{6}$/i.test(val)) { seeds[mode][key] = `#${val.toLowerCase()}`; touched[mode].add(key); } };
    for (const f of FIELDS) {
      for (const m of MODES) take(m, f.key, q.get(`${m}-${f.key}`));
      // A link from the one-mode builder: its keys belong to the mode its `theme` names.
      if (!q.has(`${theme}-${f.key}`)) take(theme, f.key, q.get(f.key));
    }
    const rad = Number(q.get("radius"));
    if (radius && q.has("radius") && rad >= 0 && rad <= 1.5) { radius.value = String(rad); shared.radius = true; }
    const fk = q.get("font");
    if (font && fk && fontKeys.includes(fk)) { const opt = [...font.options].find((o) => FONT_OF(o.value) === fk); if (opt) { font.value = opt.value; shared.font = true; } }
  };

  const share = doc.querySelector("[data-tb-share]");
  const onShare = async () => {
    const label = share.textContent;
    try { await navigator.clipboard.writeText(location.href); share.textContent = share.dataset.labelDone || "Copied"; }
    catch { share.textContent = location.href; }
    setTimeout(() => { share.textContent = label; }, 2000);
  };
  if (share) { share.hidden = false; share.addEventListener("click", onShare); }

  // "Download theme.css": the same text as the block, as a file. A blob made on click, nothing sent.
  const download = doc.querySelector("[data-tb-download]");
  const onDownload = () => {
    const url = URL.createObjectURL(new Blob([output.textContent + "\n"], { type: "text/css" }));
    const a = doc.createElement("a");
    a.href = url;
    a.download = "theme.css";
    doc.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (download) download.addEventListener("click", onDownload);

  const onInput = (e) => {
    const t = e.target;
    if (!t || !t.name) return;
    const mode = modeNow();
    if (t.name === "theme") { fillFields(); render(); return; }
    if (t.name === "radius") shared.radius = true;
    else if (t.name === "font") shared.font = true;
    else if (FIELDS.some((f) => f.key === t.name)) {
      seeds[mode][t.name] = t.value;
      touched[mode].add(t.name);
      if (t.name === "on-primary") autoInk[mode] = false;
      // A new primary brings the ink that reads better on it, until the reader picks one.
      if (t.name === "primary" && (!touched[mode].has("on-primary") || autoInk[mode])) {
        seeds[mode]["on-primary"] = bestInk(t.value).toLowerCase();
        touched[mode].add("on-primary");
        autoInk[mode] = true;
        const ink = field("on-primary");
        if (ink) ink.value = seeds[mode]["on-primary"];
      }
    }
    render();
  };
  form.addEventListener("input", onInput);
  form.addEventListener("change", onInput);

  const reset = form.querySelector("[data-tb-reset]");
  const onReset = () => {
    for (const m of MODES) { seeds[m] = {}; touched[m].clear(); autoInk[m] = false; }
    shared.radius = shared.font = false;
    if (radius) radius.value = "0.5";
    if (font) font.selectedIndex = 0;
    fillFields();
    render();
  };
  if (reset) reset.addEventListener("click", onReset);

  readHash();
  fillFields();
  render();
  return () => {
    if (share) share.removeEventListener("click", onShare);
    if (download) download.removeEventListener("click", onDownload);
    form.removeEventListener("input", onInput);
    form.removeEventListener("change", onInput);
    if (reset) reset.removeEventListener("click", onReset);
    probe.remove();
  };
}
