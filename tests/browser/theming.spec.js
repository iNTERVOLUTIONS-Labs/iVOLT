// One-colour theming (1.1). The states, tints, glows, focus and gradients of the primary
// are mixed from `--iv-color-primary` in CSS. Two promises are checked here:
//  1. Nothing moved: every themed token resolves, in light and in dark, to the colour it had
//     in 1.0 (the literal values kept in tokens.json) within ΔE2000 < 1 and an alpha within 0.01,
//     with the same geometry (gradient angle and stops, shadow offsets).
//  2. The payoff: one variable on a scope repaints buttons (gradient included), focus rings,
//     links, badges, progress, switches and gradient text.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const tokens = JSON.parse(readFileSync(join(process.cwd(), "packages/ivolt/dist/tokens/tokens.json"), "utf8"));
const themed = Object.entries(tokens).filter(([, t]) => typeof t.value === "object" && ["color", "gradient", "shadow"].includes(t.type));

// ---- colour maths (sRGB, OKLab, CIELAB, ΔE2000) ----
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const delin = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function oklabToSrgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((c) => delin(Math.min(1, Math.max(0, c))));
}
function toLab(rgb) {
  const [r, g, b] = rgb.map(lin);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
function deltaE(c1, c2) {
  const [L1, a1, b1] = toLab(c1);
  const [L2, a2, b2] = toLab(c2);
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h1p = (Math.atan2(b1, a1p) / rad + 360) % 360, h2p = (Math.atan2(b2, a2p) / rad + 360) % 360;
  let dh = h2p - h1p;
  if (C1p * C2p === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dLp = L2 - L1, dCp = C2p - C1p, dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad);
  const Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) { if (Math.abs(h1p - h2p) > 180) hbp += 360; hbp /= 2; }
  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad) + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
  const dth = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2), Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dth * rad) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

const COLOUR = /(rgba?|color|oklab|oklch)\(([^()]*)\)/g;
/** Every colour of a computed value as [r, g, b] in 0–1 plus alpha, and the value with each replaced by "C". */
function colours(value) {
  const found = [];
  for (const [, fn, body] of value.matchAll(COLOUR)) {
    const [main, alphaPart] = body.split("/");
    let parts = main.trim().split(/[\s,]+/);
    let alpha = alphaPart !== undefined ? parseFloat(alphaPart) : 1;
    let rgb;
    if (fn.startsWith("rgb")) {
      if (parts.length === 4) alpha = parseFloat(parts.pop());
      rgb = parts.map((p) => parseFloat(p) / 255);
    } else if (fn === "color") {
      expect(parts[0]).toBe("srgb");
      rgb = parts.slice(1).map(parseFloat);
    } else if (fn === "oklab") {
      rgb = oklabToSrgb(parts.map((p, i) => parseFloat(p) / (p.endsWith("%") ? (i === 0 ? 100 : 250) : 1)));
    } else {
      const [L, C, h] = parts.map(parseFloat);
      rgb = oklabToSrgb([L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)]);
    }
    found.push({ rgb, alpha });
  }
  return { found, shape: value.replace(COLOUR, "C") };
}

const PROPERTY = { color: "backgroundColor", gradient: "backgroundImage", shadow: "boxShadow" };

for (const theme of ["light", "dark"]) {
  test(`every themed token keeps its 1.0 value in ${theme}`, async ({ page }) => {
    await page.goto(`/fixture/theme/nested?nojs&theme=${theme}`);
    const pairs = await page.evaluate(
      ({ list, property }) => {
        const host = document.getElementById("fixture");
        return list.map(([name, type, literal]) => {
          const a = document.createElement("div");
          const b = document.createElement("div");
          a.style[property[type]] = `var(${name})`;
          b.style[property[type]] = literal;
          host.append(a, b);
          const out = [name, getComputedStyle(a)[property[type]], getComputedStyle(b)[property[type]]];
          a.remove();
          b.remove();
          return out;
        });
      },
      { list: themed.map(([name, t]) => [name, t.type, t.value[theme]]), property: PROPERTY },
    );
    const off = [];
    for (const [name, now, then] of pairs) {
      const a = colours(now);
      const b = colours(then);
      if (a.shape !== b.shape || a.found.length !== b.found.length) {
        off.push(`${name}: ${now} ≠ ${then}`);
        continue;
      }
      a.found.forEach((c, i) => {
        const d = deltaE(c.rgb, b.found[i].rgb);
        if (d >= 1 || Math.abs(c.alpha - b.found[i].alpha) > 0.01) off.push(`${name}[${i}]: ΔE ${d.toFixed(2)}, alpha ${c.alpha} vs ${b.found[i].alpha}`);
      });
    }
    expect(off).toEqual([]);
    expect(pairs.length).toBeGreaterThan(40);
  });
}

/** Hue in degrees (OKLab) of the first colour of a computed value. */
const hueOf = (value) => {
  const { rgb } = colours(value).found[0];
  const [r, g, b] = rgb.map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return (Math.atan2(B, A) * 180) / Math.PI;
};

for (const theme of ["light", "dark"]) {
  test(`one variable repaints the components of its scope (${theme})`, async ({ page }) => {
    await page.goto(`/fixture/theme/one-colour?theme=${theme}`);
    const read = (card) =>
      page.locator(`[aria-labelledby="${card}"]`).evaluate((root) => {
        const cs = (sel, prop, pseudo) => getComputedStyle(root.querySelector(sel), pseudo)[prop];
        const button = root.querySelector(".iv-button--primary");
        button.focus();
        const ring = getComputedStyle(button).outlineColor;
        button.blur();
        return {
          button: cs(".iv-button--primary", "backgroundImage"),
          ring,
          link: cs("a", "color"),
          badge: cs(".iv-badge--primary", "backgroundColor"),
          solid: cs(".iv-badge--solid", "backgroundColor"),
          progress: cs(".iv-progress", "color"),
          track: cs(".iv-switch__track", "backgroundColor"),
          text: cs(".iv-gradient-text", "backgroundImage"),
        };
      });
    const base = await read("oc-default");
    const rose = await read("oc-custom");
    const green = await read("oc-success");
    // Cobalt sits near 265° in OKLab, the rose near 0°, the success green near 130°
    // (a subtle tint is 7 % of the colour over a near-white, so its hue is allowed some play).
    // The dark focus ring is the accent by design (1.0), so only the light one follows.
    if (theme === "dark") for (const set of [base, rose, green]) delete set.ring;
    for (const [key, value] of Object.entries(rose)) {
      expect(value, key).not.toBe(base[key]);
      const h = hueOf(value);
      expect(Math.abs(h) < 40 || h > 320, `${key} ${value} hue ${h}`).toBe(true);
    }
    for (const [key, value] of Object.entries(green)) {
      expect(value, key).not.toBe(base[key]);
      const h = hueOf(value);
      expect(h > 95 && h < 175, `${key} ${value} hue ${h}`).toBe(true);
    }
  });
}
