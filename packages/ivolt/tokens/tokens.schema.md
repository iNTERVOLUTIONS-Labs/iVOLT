# tokens.json format

- Groups are plain objects. A group may declare `"$type"` for all its leaves (`color`, `dimension`, `number`, `fontFamily`, `shadow`, `duration`, `cubicBezier`).
- A leaf is a string value, or a `{ "light": …, "dark": … }` object for themed values, or `{ "$type", "$value" }` for a single token at group level (`measure`).
- Aliases use `{path.to.token}` and are resolved by `scripts/build-tokens.mjs`; nothing is duplicated by hand.
- `palette.*` emits `--iv-palette-<hue>-<step>`; every other group emits `--iv-<group>-<name>` (`--iv-space-4`, `--iv-color-primary`).
- `breakpoint.*` is not emitted as custom properties: it becomes `@custom-media --iv-<name>` and `src/js/core/breakpoints.js`.
