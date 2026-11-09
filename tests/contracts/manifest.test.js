// The generated tool artefacts of 1.1 (API_CONTRACT §9.5) describe the package that was built:
// every class of the built sheet, every component and option, every event, every token.
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const pkg = resolve(__dirname, "../../packages/ivolt");
const dist = join(pkg, "dist");
let manifest;
let htmlData;

beforeAll(() => {
  execFileSync(process.execPath, [join(pkg, "scripts/build-manifest.mjs")], { stdio: "pipe" });
  manifest = JSON.parse(readFileSync(join(dist, "ivolt.manifest.json"), "utf8"));
  htmlData = JSON.parse(readFileSync(join(dist, "vscode.html-data.json"), "utf8"));
});

describe("ivolt.manifest.json", () => {
  it("carries the package identity", () => {
    const meta = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8"));
    expect(manifest.name).toBe(meta.name);
    expect(manifest.version).toBe(meta.version);
  });

  it("lists every class of the built full sheet", () => {
    const built = readFileSync(join(dist, "css/ivolt.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const inSheet = new Set((built.match(/\.iv-[a-zA-Z0-9_-]+/g) || []).map((c) => c.slice(1)));
    const listed = new Set(manifest.classes.flatMap((s) => s.classes));
    expect([...inSheet].filter((c) => !listed.has(c))).toEqual([]);
    for (const c of ["iv-kbd", "iv-segmented", "iv-code__copy", "iv-shell__side", "iv-card--link"]) expect(listed.has(c)).toBe(true);
  });

  it("knows which JavaScript ships outside the default bundle", () => {
    const copy = manifest.components.find((c) => c.name === "copy");
    expect(copy.defaultBundle).toBe(false);
    expect(copy.options.map((o) => o.attribute)).toEqual(["data-iv-copied-text", "data-iv-failed-text", "data-iv-timeout"]);
    expect(copy.events).toEqual(["iv:copied", "iv:copy"]);
    expect(manifest.components.find((c) => c.name === "dialog").defaultBundle).toBe(true);
  });

  it("lists attribute values, events and every token with both themes", () => {
    const palette = manifest.attributes.find((a) => a.name === "data-iv-palette");
    expect(palette.values).toContain("success");
    expect(manifest.events).toContain("iv:open");
    const tokens = JSON.parse(readFileSync(join(dist, "tokens/tokens.json"), "utf8"));
    expect(manifest.tokens).toHaveLength(Object.keys(tokens).length);
    const hover = manifest.tokens.find((t) => t.name === "--iv-color-primary-hover");
    expect(hover.light).toBe("#1A3FA8");
    expect(hover.css).toMatch(/color-mix/);
  });
});

describe("vscode.html-data.json", () => {
  it("is VS Code custom data with every attribute of the manifest", () => {
    expect(htmlData.version).toBe(1.1);
    expect(htmlData.globalAttributes.map((a) => a.name)).toEqual(manifest.attributes.map((a) => a.name));
    const theme = htmlData.globalAttributes.find((a) => a.name === "data-iv-theme");
    expect(theme.values.map((v) => v.name)).toEqual(["dark", "light", "system"]);
  });
});

describe("generated declarations", () => {
  it("types the events and the IIFE global, and the entries reference them", () => {
    const events = readFileSync(join(dist, "types/events.d.ts"), "utf8");
    for (const e of manifest.events) expect(events).toContain(JSON.stringify(e));
    expect(events).toMatch(/interface HTMLElementEventMap extends IvEventMap/);
    expect(existsSync(join(dist, "types/global.d.ts"))).toBe(true);
    expect(readFileSync(join(dist, "types/index.d.ts"), "utf8")).toMatch(/reference path="\.\/events\.d\.ts"/);
    expect(readFileSync(join(dist, "types/iife.d.ts"), "utf8")).toMatch(/reference path="\.\/global\.d\.ts"/);
  });
});
