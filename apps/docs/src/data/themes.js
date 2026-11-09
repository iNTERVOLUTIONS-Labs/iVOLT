// The theme gallery: twelve presets, each a handful of seed colours, with the contrast of the
// pairs that matter measured here (WCAG 2 formula) and shown on the page. Pure functions: the
// gallery, the downloadable theme.css files, the theme builder and the specs all use this module,
// so a preset can never look one way and download another.
//
// Since 1.1 the package derives the primary's family in CSS (one-colour theming, ADR-054): hover,
// active, subtle, border, focus, halo, glows and both gradients are color-mix() of
// --iv-color-primary with a per-theme recipe (--iv-mix-*). So a preset only writes its seeds —
// primary, the ink on it, accent, surfaces and text — and the system mixes the rest. 1.0 wrote
// out fifteen derived tokens per preset; a download is now the seeds plus two gradient recipes.
//
// The recipes below are the package's (dist/tokens/tokens.json, group "mix"); a spec checks they
// still match, and checks that the hover this module computes is the one the browser paints.

const FONTS = {
  outfit: '"Outfit", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};
export const fontKeys = Object.keys(FONTS);

// mode, primary, on-primary, accent, bg, surface, raised, text, muted, radius (rem, md), font
export const presets = [
  { slug: "cobalt", name: "Cobalt", es: "Cobalto", note: { en: "The default dark theme of iVOLT, written out.", es: "El tema oscuro por defecto de iVOLT, escrito entero." }, mode: "dark", primary: "#66B1FF", onPrimary: "#06122B", accent: "#73DFFF", bg: "#04070F", surface: "#070D1C", raised: "#0C1330", text: "#EEF2FB", muted: "#A8B3CC", radius: 0.875, font: "outfit", native: true },
  { slug: "material-ish", name: "Material-ish", es: "Casi Material", note: { en: "Purple primary, soft surfaces, generous rounding, system type.", es: "Primario violeta, superficies suaves, curvas generosas y tipografía del sistema." }, mode: "light", primary: "#6750A4", onPrimary: "#FFFFFF", accent: "#7D5260", bg: "#FFFBFE", surface: "#F3EDF7", raised: "#FFFFFF", text: "#1C1B1F", muted: "#49454F", radius: 1.25, font: "system" },
  { slug: "bootstrap-classic", name: "Bootstrap classic", es: "Bootstrap clásico", note: { en: "The familiar blue, white surfaces and small radii.", es: "El azul de siempre, superficies blancas y radios pequeños." }, mode: "light", primary: "#0D6EFD", onPrimary: "#FFFFFF", accent: "#6C757D", bg: "#FFFFFF", surface: "#F8F9FA", raised: "#FFFFFF", text: "#212529", muted: "#5C636A", radius: 0.375, font: "system" },
  { slug: "pico-ish", name: "Pico-ish", es: "Casi Pico", note: { en: "Calm azure on slate, made for documents and forms.", es: "Azur tranquilo sobre pizarra, pensado para documentos y formularios." }, mode: "dark", primary: "#01AAFF", onPrimary: "#0A1220", accent: "#8891A4", bg: "#13171F", surface: "#181C25", raised: "#1E2330", text: "#E1E6EB", muted: "#A3ACBB", radius: 0.25, font: "system" },
  { slug: "graphite", name: "Graphite", es: "Grafito", note: { en: "Monochrome: the action is white, nothing else shouts.", es: "Monocromo: la acción es blanca y nada más grita." }, mode: "dark", primary: "#F4F4F5", onPrimary: "#18181B", accent: "#A1A1AA", bg: "#09090B", surface: "#111113", raised: "#18181B", text: "#FAFAFA", muted: "#A1A1AA", radius: 0.5, font: "outfit" },
  { slug: "forest", name: "Forest", es: "Bosque", note: { en: "Deep green surfaces with a fresh, readable lime.", es: "Superficies verde profundo con una lima fresca y legible." }, mode: "dark", primary: "#7BE495", onPrimary: "#05210F", accent: "#C6F68D", bg: "#06120C", surface: "#0B1A12", raised: "#10241A", text: "#E8F5EC", muted: "#A6C2B0", radius: 0.75, font: "outfit" },
  { slug: "sunset", name: "Sunset", es: "Atardecer", note: { en: "Warm coral on cream, for editorial and hospitality.", es: "Coral cálido sobre crema, para editoriales y hostelería." }, mode: "light", primary: "#C2410C", onPrimary: "#FFFFFF", accent: "#9D174D", bg: "#FFFAF5", surface: "#FFF1E6", raised: "#FFFFFF", text: "#2A1A12", muted: "#6B4F40", radius: 1, font: "serif" },
  { slug: "ocean", name: "Ocean", es: "Océano", note: { en: "Teal on deep navy, cool and technical.", es: "Turquesa sobre azul marino profundo, fresco y técnico." }, mode: "dark", primary: "#2DD4BF", onPrimary: "#042F2E", accent: "#38BDF8", bg: "#03111A", surface: "#071C28", raised: "#0B2636", text: "#E6F6FA", muted: "#9DBBC6", radius: 0.875, font: "outfit" },
  { slug: "grape", name: "Grape", es: "Uva", note: { en: "Electric violet for launches and product pages.", es: "Violeta eléctrico para lanzamientos y páginas de producto." }, mode: "dark", primary: "#B794FF", onPrimary: "#1A0B3D", accent: "#FF7AD9", bg: "#0B0716", surface: "#120C22", raised: "#1A1230", text: "#F1EDFB", muted: "#B5ABCC", radius: 1.125, font: "outfit" },
  { slug: "rose", name: "Rose", es: "Rosa", note: { en: "A confident pink on white, rounded and friendly.", es: "Un rosa seguro sobre blanco, redondeado y cercano." }, mode: "light", primary: "#BE185D", onPrimary: "#FFFFFF", accent: "#7C3AED", bg: "#FFFFFF", surface: "#FDF2F8", raised: "#FFFFFF", text: "#1F1020", muted: "#6B4A5E", radius: 1.5, font: "outfit" },
  { slug: "sand", name: "Sand", es: "Arena", note: { en: "Paper tones and ink, set in a serif.", es: "Tonos de papel y tinta, con tipografía serif." }, mode: "light", primary: "#3F3A2E", onPrimary: "#FFFDF7", accent: "#8A5A00", bg: "#FBF8F1", surface: "#F3EEE2", raised: "#FFFDF7", text: "#24211A", muted: "#5F5848", radius: 0.25, font: "serif" },
  { slug: "terminal", name: "Terminal", es: "Terminal", note: { en: "Phosphor green, square corners, monospace everything.", es: "Verde fósforo, esquinas rectas y todo en monoespaciada." }, mode: "dark", primary: "#4ADE80", onPrimary: "#03140A", accent: "#FACC15", bg: "#020604", surface: "#06100A", raised: "#0A1810", text: "#D9F7E3", muted: "#93B8A0", radius: 0, font: "mono" },
];

// ---- the package's recipes (tokens.json, group "mix"): [colour as oklab or null for transparent, weight] ----
export const RECIPES = {
  light: {
    "primary-hover": [[0.0308, 0.0244, -0.0642], 0.13],
    "primary-active": [[0.0545, 0.0176, -0.0069], 0.32],
  },
  dark: {
    "primary-hover": [[0.9857, -0.0058, 0.0019], 0.27],
    "primary-active": [[0.5901, -0.045, -0.218], 0.5],
  },
};

// ---- colour maths -----------------------------------------------------------------------------
const hex2rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgb2hex = (r) => "#" + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
/** Mix a towards b by t (0..1), in sRGB. */
export const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map((v, i) => v + (y[i] - v) * t)); };
const rgba = (h, a) => { const [r, g, b] = hex2rgb(h); return `rgb(${r} ${g} ${b} / ${a})`; };
function lum(h) { return hex2rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); }
/** WCAG 2 contrast ratio of two hex colours. */
export function contrast(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }

const toLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const toGam = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
/** sRGB hex → OKLab [L, a, b] (Björn Ottosson's matrices, as CSS Color 4 uses them). */
export function hexToOklab(h) {
  const [r, g, b] = hex2rgb(h).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
/** OKLab → sRGB hex, clipped to the gamut. */
export function oklabToHex([L, A, B]) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return rgb2hex([4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(toGam));
}
/** color-mix(in oklab, a, b w) for two opaque colours; `b` may be a hex or an OKLab triple. */
export function mixOklab(a, b, w) {
  const x = hexToOklab(a), y = typeof b === "string" ? hexToOklab(b) : b;
  return oklabToHex(x.map((v, i) => v * (1 - w) + y[i] * w));
}
/** What the package mixes for a derived token of `primary` in `mode` ("primary-hover", "primary-active"). */
export function derived(primary, mode, name) {
  const [colour, w] = RECIPES[mode === "dark" ? "dark" : "light"][name];
  return mixOklab(primary, colour, w);
}

/**
 * The tokens a preset writes: its seeds, and two gradient recipes that keep the preset's own
 * accent in its gradients (the default recipes are tuned for cobalt and cyan). Everything else
 * of the primary's family is mixed by the package.
 */
export function tokens(p) {
  const dark = p.mode === "dark";
  const on = (c) => (contrast(c, "#FFFFFF") >= contrast(c, "#0B1230") ? "#FFFFFF" : "#0B1230");
  const r = p.radius;
  return {
    "--iv-color-primary": p.primary,
    "--iv-color-on-primary": p.onPrimary,
    "--iv-color-accent": p.accent,
    "--iv-color-on-accent": on(p.accent),
    "--iv-color-bg": p.bg,
    "--iv-color-surface": p.surface,
    "--iv-color-surface-raised": p.raised,
    "--iv-color-text": p.text,
    "--iv-color-text-muted": p.muted,
    "--iv-color-border": mix(p.surface, p.text, dark ? 0.2 : 0.14),
    "--iv-color-border-strong": mix(p.surface, p.text, 0.42),
    "--iv-color-hover-surface": rgba(p.text, dark ? 0.05 : 0.04),
    // Gradients: from the primary itself to a third of the way to the accent, as in 1.0.
    "--iv-mix-brand-start": "transparent 0%",
    "--iv-mix-brand-end": "var(--iv-color-accent) 35%",
    "--iv-mix-gradient-end": "var(--iv-color-accent) 35%",
    "--iv-radius-sm": `${+(r * 0.43).toFixed(3)}rem`,
    "--iv-radius-md": `${r}rem`,
    "--iv-radius-lg": `${+(r * 1.57).toFixed(3)}rem`,
    "--iv-font-sans": FONTS[p.font],
  };
}

/** The pairs a reader cares about, with their ratios. The hover is the one the package mixes. */
export function checks(p) {
  const hover = derived(p.primary, p.mode, "primary-hover");
  return [
    { key: "text", ratio: contrast(p.text, p.bg) },
    { key: "muted", ratio: contrast(p.muted, p.surface) },
    { key: "button", ratio: Math.min(contrast(p.onPrimary, p.primary), contrast(p.onPrimary, hover)) },
    { key: "link", ratio: contrast(p.primary, p.bg) },
  ];
}

/** theme.css for a preset: one block, scoped so it can live on :root or on any element. */
export function css(p, site = "https://ivolt.intervolutions.com") {
  const t = tokens(p);
  const body = Object.entries(t).map(([k, v]) => `  ${k}: ${v};`).join("\n");
  return `/* iVOLT theme: ${p.name} (${p.mode}) — ${site}/themes#${p.slug}
   Needs iVOLT 1.1 or later: hover, focus, glows and gradients are mixed from these seeds.
   Load after ivolt.css (or inside @layer iv.overrides) and set data-iv-theme="${p.mode}" on
   <html>, so the ${p.mode} recipes do the mixing. To theme one part only, change the selector to
   that element and give it data-iv-theme="${p.mode}" too. */
:root {
  color-scheme: ${p.mode};
}
:root, [data-iv-theme] {
${body}
}
`;
}

/** Theme builder state for a preset, as the URL hash the builder reads. */
export function builderHash(p) {
  const q = new URLSearchParams({ theme: p.mode, primary: p.primary.slice(1), "on-primary": p.onPrimary.slice(1), accent: p.accent.slice(1), bg: p.bg.slice(1), surface: p.surface.slice(1), "surface-raised": p.raised.slice(1), text: p.text.slice(1), radius: String(p.radius), font: p.font });
  return `#${q.toString()}`;
}

// ---- the one-colour demo (tokens and themes page): one primary per swatch -------------------
// The ink on each colour is chosen per theme by measuring, not by eye: light pages put white on
// a deep tone, dark pages put the page's navy on a light one.
export const swatches = [
  { slug: "cobalt", en: "Cobalt", es: "Cobalto", light: "#1D4FC4", dark: "#66B1FF" },
  { slug: "rose", en: "Rose", es: "Rosa", light: "#BE123C", dark: "#FB7185" },
  { slug: "violet", en: "Violet", es: "Violeta", light: "#6D28D9", dark: "#B79BFF" },
  { slug: "emerald", en: "Emerald", es: "Esmeralda", light: "#047857", dark: "#34D399" },
  { slug: "amber", en: "Amber", es: "Ámbar", light: "#B45309", dark: "#FBBF24" },
  { slug: "graphite", en: "Graphite", es: "Grafito", light: "#27272A", dark: "#E4E4E7" },
];
export const PAGE = { light: { bg: "#FFFFFF", text: "#0B1230", on: "#FFFFFF" }, dark: { bg: "#04070F", text: "#EEF2FB", on: "#06122B" } };
/** Worst WCAG ratio of a swatch in a theme: ink on the button at rest and on hover, and the colour as a link. */
export function swatchRatio(s, mode) {
  const c = s[mode], page = PAGE[mode];
  return Math.min(contrast(page.on, c), contrast(page.on, derived(c, mode, "primary-hover")), contrast(c, page.bg));
}
