// Writes the site for language models, after the Astro build:
//   • a Markdown twin next to every page (/components/button → /components/button.md), the main
//     content of the built HTML without the shell, so an assistant can read a page as text;
//   • /llms.txt, the index the llmstxt.org proposal describes (title, summary, sections of links);
//   • /llms-full.txt, every English page in one file, for tools that take a single document.
//
// The source is the built HTML itself, not a second copy of the content: what a model reads is
// what a visitor reads, and a page edited tomorrow cannot drift from its twin. jsdom is already a
// devDependency of the repository (the unit tests run on it).
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "apps/docs/dist");
if (!existsSync(join(dist, "index.html"))) { console.error("llms: apps/docs/dist/index.html is missing; run the Astro build first"); process.exit(1); }
const SITE = (process.env.SITE_URL || "https://ivolt.intervolutions.com").replace(/\/$/, "");
const { version } = await import(pathToFileURL(join(root, "apps/docs/src/lib/version.js")).href);
const en = await import(pathToFileURL(join(root, "apps/docs/src/i18n/en.js")).href);
const extraNav = existsSync(join(root, "apps/docs/src/lib/site-nav.js")) ? await import(pathToFileURL(join(root, "apps/docs/src/lib/site-nav.js")).href) : null;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) {
      if (["stage", "pagefind", "_astro", "examples", "downloads", "og", "shots", "photos", "fonts"].includes(name) && dir === dist) continue;
      out.push(...walk(file));
    } else if (name.endsWith(".html")) out.push(file);
  }
  return out;
}

// ---- HTML → Markdown, for the elements the documentation uses -------------------------------
const SKIP = "script, style, svg, iframe, button, dialog, nav, [data-pagefind-ignore], [aria-hidden='true'], .docs-stage__controls, .docs-stage__bar, .docs-anchor, .iv-u-sr-only, form, input, select, textarea, template";
function inline(node) {
  let s = "";
  for (const n of node.childNodes) {
    if (n.nodeType === 3) { s += n.textContent.replace(/\s+/g, " "); continue; }
    if (n.nodeType !== 1 || n.matches(SKIP)) continue;
    const tag = n.tagName.toLowerCase();
    const inner = inline(n);
    if (tag === "code" || tag === "kbd") s += "`" + n.textContent.replace(/`/g, "\\`") + "`";
    else if (tag === "strong" || tag === "b") s += inner.trim() ? `**${inner.trim()}**` : "";
    else if (tag === "em" || tag === "i") s += inner.trim() ? `*${inner.trim()}*` : "";
    else if (tag === "a") {
      const href = n.getAttribute("href") || "";
      const url = href.startsWith("/") ? SITE + href : href;
      s += href && !href.startsWith("#") && inner.trim() ? `[${inner.trim()}](${url})` : inner;
    } else if (tag === "br") s += "\n";
    else s += inner;
  }
  return s;
}
function block(node, depth = 0) {
  const out = [];
  for (const n of node.childNodes) {
    if (n.nodeType === 3) { const t = n.textContent.trim(); if (t) out.push(t); continue; }
    if (n.nodeType !== 1 || n.matches(SKIP)) continue;
    const tag = n.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) out.push(`${"#".repeat(Number(tag[1]))} ${inline(n).trim()}`);
    else if (tag === "p" || tag === "figcaption" || tag === "dt") { const t = inline(n).trim(); if (t) out.push(t); }
    else if (tag === "dd") { const t = inline(n).trim(); if (t) out.push(`: ${t}`); }
    else if (tag === "pre") out.push("```" + (n.closest("[data-code-panel]")?.getAttribute("data-code-panel") || "") + "\n" + n.textContent.replace(/\n+$/, "") + "\n```");
    else if (tag === "ul" || tag === "ol") {
      let i = 1;
      const items = [];
      for (const li of n.children) {
        if (li.tagName !== "LI") continue;
        const sub = [...li.children].filter((c) => /^(UL|OL|PRE|P|DIV)$/.test(c.tagName));
        const text = sub.length ? block(li, depth + 1).split("\n\n").join("\n  ") : inline(li).trim();
        if (text) items.push(`${"  ".repeat(depth)}${tag === "ol" ? `${i++}.` : "-"} ${text}`.replace(/\n(?!$)/g, "\n  "));
      }
      if (items.length) out.push(items.join("\n"));
    } else if (tag === "table") {
      const rows = [...n.querySelectorAll("tr")].map((tr) => [...tr.children].map((c) => inline(c).trim().replace(/\|/g, "\\|")));
      if (rows.length) {
        const w = Math.max(...rows.map((r) => r.length));
        const pad = (r) => [...r, ...Array(w - r.length).fill("")];
        out.push([`| ${pad(rows[0]).join(" | ")} |`, `|${" --- |".repeat(w)}`, ...rows.slice(1).map((r) => `| ${pad(r).join(" | ")} |`)].join("\n"));
      }
    } else if (tag === "blockquote") out.push(block(n, depth).split("\n").map((l) => `> ${l}`).join("\n"));
    else if (tag === "img") { const alt = n.getAttribute("alt"); if (alt) out.push(`![${alt}](${SITE}${n.getAttribute("src") || ""})`); }
    else if (tag === "a" || tag === "code" || tag === "strong") { const t = inline({ childNodes: [n] }).trim(); if (t) out.push(t); }
    else if (tag === "details") out.push(block(n, depth));
    else if (tag === "summary") out.push(`**${inline(n).trim()}**`);
    else out.push(block(n, depth));
  }
  return out.filter((x) => x !== undefined).join("\n\n").replace(/\n{3,}/g, "\n\n");
}

const pages = [];
for (const file of walk(dist)) {
  const rel = "/" + relative(dist, file).replace(/\\/g, "/").replace(/\.html$/, "");
  if (/^\/(es\/)?404$/.test(rel)) continue;
  const html = readFileSync(file, "utf8");
  if (/<meta name="robots" content="noindex">/.test(html)) continue;
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const main = doc.querySelector("main");
  if (!main) continue;
  const path = rel === "/index" ? "/" : rel === "/es/index" ? "/es" : rel;
  const title = doc.querySelector("title")?.textContent.trim() || path;
  const description = doc.querySelector('meta[name="description"]')?.getAttribute("content") || "";
  const lang = doc.documentElement.getAttribute("lang") || "en";
  const body = block(main).trim();
  const md = `# ${title.replace(/ · iVOLT$/, "")}\n\n> ${description}\n\nSource: ${SITE}${path} · iVOLT ${version} · ${lang === "es" ? "Español" : "English"}\n\n${body.replace(/^# .*\n+/, "")}\n`;
  const mdFile = path === "/" ? join(dist, "index.md") : path === "/es" ? join(dist, "es.md") : join(dist, `${path.slice(1)}.md`);
  writeFileSync(mdFile, md);
  pages.push({ path, title, description, lang, md, mdUrl: SITE + "/" + relative(dist, mdFile).replace(/\\/g, "/") });
}

// ---- llms.txt ---------------------------------------------------------------------------------
const byPath = new Map(pages.map((p) => [p.path, p]));
const link = (href) => { const p = byPath.get(href); return p ? `- [${p.title.replace(/ · iVOLT$/, "")}](${p.mdUrl}): ${p.description}` : null; };
const groups = [...en.nav, ...(extraNav?.extraGroups?.en || [])];
const listed = new Set();
const sections = groups.map((g) => {
  const lines = g.items.map((i) => { listed.add(i.href); return link(i.href); }).filter(Boolean);
  return lines.length ? `## ${g.group}\n\n${lines.join("\n")}` : "";
}).filter(Boolean);
const rest = pages.filter((p) => p.lang === "en" && !listed.has(p.path) && p.path !== "/").map((p) => link(p.path)).filter(Boolean);
const spanish = pages.filter((p) => p.lang === "es").length;
const llms = `# iVOLT

> iVOLT is an open-source (MIT) CSS framework and design system by iNTERVOLUTIONS: accessible UI components in plain CSS with optional vanilla JavaScript, design tokens, light and dark themes, and no build step or runtime dependencies. Version ${version}.

Use it by linking one stylesheet (\`dist/css/ivolt.min.css\`) on an \`<html class="iv-root">\` page, plus \`dist/js/auto.js\` (ES module) or \`dist/js/ivolt.iife.min.js\` (global \`IVOLT\`) for the interactive components. npm package: \`@intervolutions/ivolt\`.

Rules an assistant should follow when writing iVOLT markup:
- Every class starts with \`iv-\`, every custom property with \`--iv-\`, every attribute with \`data-iv-\`, every event with \`iv:\`. Do not invent classes: the full list is in the reference.
- Utilities are a fixed matrix (no arbitrary values, no JIT). Retheme by overriding \`--iv-*\` tokens on any scope; \`data-iv-theme="light|dark|system"\` works on any element.
- Interactive components are declared with \`data-iv-component="<name>"\` and work as plain HTML before JavaScript runs.

Every page below has a Markdown twin (the \`.md\` links). The whole English documentation in one file: ${SITE}/llms-full.txt. The site also exists in Spanish (${spanish} pages under ${SITE}/es).

## Home

${link("/") || ""}

${sections.join("\n\n")}
${rest.length ? `\n## Optional\n\n${rest.join("\n")}\n` : ""}`;
writeFileSync(join(dist, "llms.txt"), llms.replace(/\n{3,}/g, "\n\n"));

// ---- llms-full.txt ----------------------------------------------------------------------------
const order = [...listed];
const enPages = pages.filter((p) => p.lang === "en").sort((a, b) => {
  const ia = a.path === "/" ? -1 : order.indexOf(a.path) === -1 ? 1e6 : order.indexOf(a.path);
  const ib = b.path === "/" ? -1 : order.indexOf(b.path) === -1 ? 1e6 : order.indexOf(b.path);
  return ia - ib || a.path.localeCompare(b.path);
});
writeFileSync(join(dist, "llms-full.txt"), `# iVOLT ${version} — full documentation\n\nGenerated from ${SITE} at build time. ${enPages.length} pages.\n\n` + enPages.map((p) => p.md.replace(/^# /, "# ")).join("\n\n---\n\n"));
console.log(`llms: ${pages.length} Markdown twins, llms.txt (${groups.reduce((n, g) => n + g.items.length, 0)} links), llms-full.txt (${enPages.length} pages, ${(Buffer.byteLength(readFileSync(join(dist, "llms-full.txt"))) / 1024).toFixed(0)} KiB)`);
