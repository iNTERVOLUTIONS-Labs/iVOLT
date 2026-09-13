// Finite utility matrix (API_CONTRACT §4). Anything not declared here does not exist.
export const responsiveBreakpoints = ["sm", "md", "lg", "xl"];
export const spaceSteps = ["0", "1", "2", "3", "4", "5", "6", "8", "10", "12"];
const space = (s) => (s === "0" ? "0" : `var(--iv-space-${s})`);

/** @type {Array<{ name: string, decl: string, responsive?: boolean }>} */
export const utilities = [];
const add = (name, decl, responsive = false) => utilities.push({ name, decl, responsive });

// Display
for (const d of ["block", "inline", "inline-block", "flex", "inline-flex", "grid"]) add(d, `display: ${d}`, true);
add("hidden", "display: none", true);
// Flex
add("flex-row", "flex-direction: row", true);
add("flex-col", "flex-direction: column", true);
add("flex-wrap", "flex-wrap: wrap");
add("flex-nowrap", "flex-wrap: nowrap");
for (const [k, v] of Object.entries({ start: "flex-start", center: "center", end: "flex-end", stretch: "stretch", baseline: "baseline" })) add(`items-${k}`, `align-items: ${v}`);
for (const [k, v] of Object.entries({ start: "flex-start", center: "center", end: "flex-end", between: "space-between", around: "space-around" })) add(`justify-${k}`, `justify-content: ${v}`);
add("grow", "flex-grow: 1");
add("shrink-0", "flex-shrink: 0");
// Grid
for (const n of [1, 2, 3, 4, 5, 6, 12]) add(`grid-cols-${n}`, `grid-template-columns: repeat(${n}, minmax(0, 1fr))`, true);
for (const n of [1, 2, 3, 4, 5, 6, 12]) add(`col-span-${n}`, `grid-column: span ${n} / span ${n}`, true);
add("col-span-full", "grid-column: 1 / -1", true);
// Gap
for (const s of spaceSteps) add(`gap-${s}`, `gap: ${space(s)}`, true);
for (const s of spaceSteps) add(`gap-x-${s}`, `column-gap: ${space(s)}`);
for (const s of spaceSteps) add(`gap-y-${s}`, `row-gap: ${space(s)}`);
// Spacing (logical)
const sides = { "": ["margin", "padding"], t: ["margin-block-start", "padding-block-start"], b: ["margin-block-end", "padding-block-end"], s: ["margin-inline-start", "padding-inline-start"], e: ["margin-inline-end", "padding-inline-end"], x: ["margin-inline", "padding-inline"], y: ["margin-block", "padding-block"] };
for (const [suffix, [mProp, pProp]] of Object.entries(sides)) {
  for (const s of spaceSteps) add(`m${suffix}-${s}`, `${mProp}: ${space(s)}`);
  add(`m${suffix}-auto`, `${mProp}: auto`);
  for (const s of spaceSteps) add(`p${suffix}-${s}`, `${pProp}: ${space(s)}`);
}
// Width
add("w-full", "inline-size: 100%");
add("w-auto", "inline-size: auto");
add("max-w-measure", "max-inline-size: var(--iv-measure)");
add("max-w-content", "max-inline-size: var(--iv-content-max)");
// Text
for (const a of ["start", "center", "end"]) add(`text-${a}`, `text-align: ${a}`, true);
for (const s of ["xs", "sm", "md", "lg", "xl", "2xl"]) add(`text-${s}`, `font-size: var(--iv-text-${s})`);
for (const w of ["normal", "medium", "semibold", "bold"]) add(`font-${w}`, `font-weight: var(--iv-weight-${w})`);
add("text-muted", "color: var(--iv-color-text-muted)");
add("truncate", "overflow: hidden; text-overflow: ellipsis; white-space: nowrap");
