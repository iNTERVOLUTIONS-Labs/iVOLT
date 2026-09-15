// The changelog of the package is the changelog of the site: this reads
// packages/ivolt/CHANGELOG.md at build time and turns it into the page, so the file that ships
// inside the tarball and the page a visitor reads can never say different things.
// A deliberately small Markdown subset — headings, lists, paragraphs, code, bold, links — because
// that is all the file uses and a dependency for six regular expressions would be a bad trade.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { repoRoot } from "./fixtures.js";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
}

export function mdToHtml(md) {
  const out = [];
  let list = null;
  let para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<ul>${list.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`); list = null; } };
  for (const raw of md.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line) { flushPara(); flushList(); continue; }
    if (/^###\s+/.test(line)) { flushPara(); flushList(); out.push(`<h3>${inline(line.replace(/^###\s+/, ""))}</h3>`); continue; }
    if (/^[-*]\s+/.test(line)) { flushPara(); (list || (list = [])).push(line.replace(/^[-*]\s+/, "")); continue; }
    if (list && /^\s/.test(line)) { list[list.length - 1] += ` ${line.trim()}`; continue; }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return out.join("\n");
}

/** { intro, releases: [{ title, id, html }] } straight from the package changelog. */
export function readChangelog() {
  const file = resolve(repoRoot(), "packages/ivolt/CHANGELOG.md");
  if (!existsSync(file)) return { intro: "", releases: [] };
  const intro = [];
  const releases = [];
  let cur = null;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (/^#\s/.test(line)) continue;
    if (/^##\s/.test(line)) { cur = { title: line.replace(/^##\s+/, "").trim(), lines: [] }; releases.push(cur); continue; }
    (cur ? cur.lines : intro).push(line);
  }
  return {
    intro: mdToHtml(intro.join("\n")),
    releases: releases.map((r) => ({
      title: r.title.replace(/`/g, ""),
      id: r.title.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, ""),
      html: mdToHtml(r.lines.join("\n")),
    })),
  };
}
