// The pages that get their own Open Graph card, and what the card says. Read by
// scripts/build-og.mjs (which draws the PNGs before Astro runs) and by the layout (which links
// a card only when its file exists). The titles come from the same navigation the sidebar uses,
// so a renamed page can never keep a stale card.
import * as en from "../i18n/en.js";
import * as es from "../i18n/es.js";

const taglines = {
  en: {
    Start: "Get going with the CSS framework that needs no build step.",
    Foundations: "Tokens, themes and the rules every iVOLT component follows.",
    Components: "An accessible component of the CSS framework with no build step.",
    Project: "How iVOLT is built, released and kept stable.",
    Explore: "Copy, paste, recolour: iVOLT made to be shared.",
  },
  es: {
    Inicio: "Empieza con el framework CSS que no necesita paso de build.",
    Fundamentos: "Tokens, temas y las reglas que siguen todos los componentes de iVOLT.",
    Componentes: "Un componente accesible del framework CSS sin paso de build.",
    Proyecto: "Cómo se construye, se publica y se mantiene estable iVOLT.",
    Explorar: "Copia, pega, cambia el color: iVOLT hecho para compartirse.",
  },
};

const kindLabel = { en: { css: "CSS only", js: "With JavaScript" }, es: { css: "Solo CSS", js: "Con JavaScript" } };

/** Every page with a card: { path, lang, eyebrow, title, tagline }. `path` is the URL path. */
export function ogPages() {
  const out = [];
  for (const [lang, mod] of [["en", en], ["es", es]]) {
    for (const g of mod.nav) {
      for (const item of g.items) {
        const slug = /\/components\/([^/]+)$/.exec(item.href)?.[1];
        const kind = slug ? en.families[slug] : null;
        out.push({
          path: item.href,
          lang,
          eyebrow: kind ? `${g.group} · ${kindLabel[lang][kind]}` : g.group,
          title: item.label,
          tagline: taglines[lang][g.group] || taglines[lang][Object.keys(taglines[lang])[0]],
        });
      }
    }
  }
  return out;
}

/** File (relative to public/) of the card for a URL path: the homes are PNG (og.png keeps the URL
 *  every share made so far points at), the pages JPEG, e.g. /es/components/button →
 *  og/es/components/button.jpg. */
export function ogFile(path) {
  if (path === "/") return "og.png";
  if (path === "/es") return "og/es.png";
  return `og${path}.jpg`;
}
