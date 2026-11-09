# tokens.json format

- Groups are plain objects. A group may declare `"$type"` for all its leaves (`color`, `dimension`, `number`, `fontFamily`, `shadow`, `duration`, `cubicBezier`, `gradient`, `mix`).
- A leaf is a string value, or a `{ "light": …, "dark": … }` object for themed values, or `{ "$type", "$value" }` for a single token at group level (`measure`).
- Aliases use `{path.to.token}` and are resolved by `scripts/build-tokens.mjs`; nothing is duplicated by hand.
- `palette.*` emits `--iv-palette-<hue>-<step>`; every other group emits `--iv-<group>-<name>` (`--iv-space-4`, `--iv-color-primary`).
- `breakpoint.*` is not emitted as custom properties: it becomes `@custom-media --iv-<name>` and `src/js/core/breakpoints.js`.
- A themed leaf may carry `"$css"` (1.1): a formula over other tokens, written with `var(--iv-…)`. Its `light`/`dark` values stay in the file as what the formula resolves to by default (tools read them; `tests/browser/theming.spec.js` checks the formula against them within ΔE2000 < 1). The sheet emits the formula once, on `:root, [data-iv-theme], [data-iv-palette]`, instead of the two literals.
- `mix.*` (`$type: "mix"`) are the recipes of those formulas: `<colour> <percentage>` handed to `color-mix(in oklab, var(--iv-color-primary), …)`, a shadow shape (`focus-halo-shape`) or a stop position (`gradient-mid`). They are themed like colours, so a nested theme or palette scope mixes with its own recipe.
