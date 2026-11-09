// The repository's star count, fetched once at build time (never by the visitor's browser).
// Offline, rate-limited or slow (3 s) builds get null and the button simply has no number.
// IVOLT_NO_NETWORK=1 skips the request entirely (reproducible builds, CI without egress).
export const REPO = "iNTERVOLUTIONS-Labs/iVOLT";
export const REPO_URL = `https://github.com/${REPO}`;
let cached;
export async function stars() {
  if (cached !== undefined) return cached;
  cached = null;
  if (process.env.IVOLT_NO_NETWORK) return cached;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`https://api.github.com/repos/${REPO}`, { signal: ctrl.signal, headers: { accept: "application/vnd.github+json", "user-agent": "ivolt-docs-build" } });
    clearTimeout(timer);
    if (res.ok) { const n = (await res.json()).stargazers_count; if (Number.isInteger(n)) cached = n; }
  } catch { /* offline: no number */ }
  return cached;
}
/** A count worth printing: a small number on a button reads as a warning, so below 25 it is left out. */
export const shown = (n) => (Number.isInteger(n) && n >= 25 ? (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n)) : null);
