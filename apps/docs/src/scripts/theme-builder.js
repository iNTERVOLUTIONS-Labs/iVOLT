// Theme builder: edits a handful of tokens live on a preview scope and prints the CSS to copy.
// Everything happens in the page; nothing is stored or sent anywhere.
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
    output.textContent = body ? `/* iVOLT theme overrides: load after ivolt.css, or inside @layer iv.overrides */\n${selector} {\n${body}\n}` : "/* Change a control to see the overrides here. */";
  };
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
  render();
  return () => { form.removeEventListener("input", onInput); form.removeEventListener("change", onInput); if (reset) reset.removeEventListener("click", onReset); };
}
