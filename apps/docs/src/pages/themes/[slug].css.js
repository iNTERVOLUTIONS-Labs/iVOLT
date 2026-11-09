// /themes/<slug>.css — the downloadable stylesheet of each preset in the theme gallery, written at
// build time from the same module the gallery renders, so the download is exactly what was shown.
import { presets, css } from "../../data/themes.js";

export function getStaticPaths() {
  return presets.map((p) => ({ params: { slug: p.slug }, props: { p } }));
}

export function GET({ props, site }) {
  return new Response(css(props.p, site ? site.href.replace(/\/$/, "") : undefined), { headers: { "Content-Type": "text/css; charset=utf-8" } });
}
