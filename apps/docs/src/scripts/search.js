// Local search on top of the Pagefind index built with the site. Loaded the first time the search
// dialog opens, not with every page: most visits never search.
import { tr } from "./strings.js";

export function mountSearch(doc = document) {
  const input = doc.getElementById("docs-search-input");
  const results = doc.getElementById("docs-search-results");
  const status = doc.getElementById("docs-search-status");
  if (!input || !results || !status || input.dataset.docsSearch) return () => {};
  input.dataset.docsSearch = "1";
  let timer = 0;
  async function ensureIndex() {
    if (window.__pagefind || window.__pagefindFailed) return window.__pagefind;
    try { const url = new URL("/pagefind/pagefind.js", location.origin).href; window.__pagefind = await import(/* @vite-ignore */ url); await window.__pagefind.init(); }
    catch { window.__pagefindFailed = true; status.textContent = tr().searchUnavailable; }
    return window.__pagefind;
  }
  function renderExcerpt(li, html) {
    const p = doc.createElement("p"); p.className = "docs-search__excerpt";
    const decode = (s) => new DOMParser().parseFromString(s.replace(/<[^>]+>/g, ""), "text/html").documentElement.textContent || "";
    html.split(/(<mark>.*?<\/mark>)/g).forEach((part) => {
      const m = part.match(/^<mark>(.*?)<\/mark>$/);
      if (m) { const mark = doc.createElement("mark"); mark.textContent = decode(m[1]); p.append(mark); }
      else if (part) p.append(doc.createTextNode(decode(part)));
    });
    li.append(p);
  }
  async function runSearch() {
    const q = input.value.trim();
    results.replaceChildren();
    if (!q) { status.textContent = tr().searchHint; return; }
    const pf = await ensureIndex();
    if (!pf) return;
    const res = await pf.search(q);
    const top = await Promise.all(res.results.slice(0, 8).map((r) => r.data()));
    status.textContent = top.length ? (top.length === 1 ? tr().searchResultsOne : tr().searchResultsMany.replace("{n}", top.length)) : tr().searchNone;
    for (const d of top) {
      const li = doc.createElement("li");
      const a = doc.createElement("a"); a.href = d.url.replace(/\.html$/, ""); a.className = "docs-search__link";
      a.setAttribute("data-astro-reload", ""); // full navigation: the result lives inside a modal dialog, skip the view transition
      const strong = doc.createElement("strong"); strong.textContent = d.meta?.title || d.url; a.append(strong);
      li.append(a); renderExcerpt(li, d.excerpt || ""); results.append(li);
    }
  }
  const onInput = () => { clearTimeout(timer); timer = setTimeout(runSearch, 150); };
  const onResultsKey = (e) => {
    const links = [...results.querySelectorAll("a")]; const i = links.indexOf(doc.activeElement);
    if (e.key === "ArrowDown" && i < links.length - 1) { e.preventDefault(); links[i + 1].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); (i > 0 ? links[i - 1] : input).focus(); }
  };
  const onInputKey = (e) => { if (e.key === "ArrowDown") { e.preventDefault(); results.querySelector("a")?.focus(); } };
  input.addEventListener("input", onInput);
  results.addEventListener("keydown", onResultsKey);
  input.addEventListener("keydown", onInputKey);
  ensureIndex();
  if (input.value.trim()) runSearch();
  return () => {
    clearTimeout(timer);
    input.removeEventListener("input", onInput);
    results.removeEventListener("keydown", onResultsKey);
    input.removeEventListener("keydown", onInputKey);
    delete input.dataset.docsSearch;
  };
}
