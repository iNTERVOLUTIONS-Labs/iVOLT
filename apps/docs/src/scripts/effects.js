/* Docs effects that need measurement: scroll progress, the sticky cabinet fallback, counting
   facts, magnetic buttons, the theme cut and the sidebar indicator.
   Everything is opt-in per element, every listener is returned for teardown, and nothing here
   runs under prefers-reduced-motion except the parts that are plain state (the cut, the meter). */
import { t } from "../i18n/en.js";

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = () => matchMedia("(hover: hover) and (pointer: fine)").matches;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

export function mountEffects(doc = document) {
  const off = [];
  const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); off.push(() => el.removeEventListener(ev, fn, opt)); };
  const root = doc.documentElement;

  /* ---- scroll progress: one variable feeds the voltage meter and the table of contents ---- */
  const cabinet = doc.querySelector(".docs-cabinet__pin");
  // Native only counts when an animation with a view timeline is actually driving the track;
  // support alone is not enough (a build step can still break the declaration).
  const track = doc.querySelector(".docs-cabinet__track");
  const nativeTimeline = !!(track && track.getAnimations && track.getAnimations().some((a) => a.timeline && typeof ViewTimeline !== "undefined" && a.timeline instanceof ViewTimeline));
  let ticking = false;
  const measure = () => {
    ticking = false;
    const max = root.scrollHeight - root.clientHeight;
    root.style.setProperty("--docs-scroll", max > 0 ? String(clamp(root.scrollTop / max, 0, 1)) : "0");
    if (cabinet && !nativeTimeline && matchMedia("(min-width: 64em)").matches) {
      const r = cabinet.getBoundingClientRect();
      const travel = r.height - root.clientHeight;
      cabinet.style.setProperty("--docs-cab", travel > 0 ? String(clamp(-r.top / travel, 0, 1)) : "0");
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(measure); } };
  on(window, "scroll", onScroll, { passive: true });
  on(window, "resize", onScroll, { passive: true });
  measure();

  /* ---- facts that count up when they arrive ---- */
  const counters = [...doc.querySelectorAll("[data-count]")];
  if (counters.length) {
    if (reduced() || !("IntersectionObserver" in window)) counters.forEach((el) => el.removeAttribute("data-count"));
    else {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          const el = e.target;
          const final = el.textContent;
          const m = final.match(/^([\d.]+)(.*)$/);
          if (!m) continue;
          const target = parseFloat(m[1]), decimals = (m[1].split(".")[1] || "").length, suffix = m[2];
          const start = performance.now(), dur = 900;
          const step = (now) => {
            const p = clamp((now - start) / dur, 0, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = (target * eased).toFixed(decimals) + suffix;
            if (p < 1) requestAnimationFrame(step); else el.textContent = final;
          };
          requestAnimationFrame(step);
        }
      }, { threshold: 0.6 });
      counters.forEach((el) => io.observe(el));
      off.push(() => io.disconnect());
    }
  }

  /* ---- magnetic buttons: up to 6px toward the pointer inside an 80px radius ---- */
  if (fine() && !reduced()) {
    const zones = new Set([...doc.querySelectorAll(".docs-magnetic")].map((b) => b.parentElement).filter(Boolean));
    for (const zone of zones) {
      const targets = [...zone.querySelectorAll(".docs-magnetic")];
      on(zone, "pointermove", (e) => {
        for (const b of targets) {
          const r = b.getBoundingClientRect();
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const dx = e.clientX - cx, dy = e.clientY - cy;
          const d = Math.hypot(dx, dy);
          const reach = Math.max(r.width, r.height) / 2 + 80;
          if (d < reach) {
            const pull = (1 - d / reach) * 6;
            b.classList.add("is-pulled");
            b.style.setProperty("--mx", `${((dx / (d || 1)) * pull).toFixed(2)}px`);
            b.style.setProperty("--my", `${((dy / (d || 1)) * pull).toFixed(2)}px`);
          } else { b.classList.remove("is-pulled"); b.style.removeProperty("--mx"); b.style.removeProperty("--my"); }
        }
      }, { passive: true });
      on(zone, "pointerleave", () => targets.forEach((b) => { b.classList.remove("is-pulled"); b.style.removeProperty("--mx"); b.style.removeProperty("--my"); }));
    }
  }

  /* ---- the theme cut: pointer drives it, the range owns it for keyboard and touch ---- */
  const cut = doc.querySelector(".docs-cut");
  const range = doc.querySelector("#docs-cut-range");
  if (cut && range) {
    const apply = (pct) => cut.style.setProperty("--docs-cut", `${clamp(pct, 0, 100).toFixed(1)}%`);
    on(range, "input", () => apply(Number(range.value)));
    apply(Number(range.value));
    if (fine()) {
      on(cut, "pointermove", (e) => {
        const r = cut.getBoundingClientRect();
        const pct = ((e.clientX - r.left) / r.width) * 100;
        apply(pct); range.value = String(Math.round(clamp(pct, 0, 100)));
      }, { passive: true });
    }
  }

  /* ---- sidebar: a single indicator slides to the current, hovered or focused item ---- */
  const side = doc.querySelector(".docs-sidebar nav");
  if (side) {
    const current = side.querySelector('a[aria-current="page"]');
    const place = (el) => {
      if (!el) { side.style.setProperty("--o", "0"); return; }
      side.style.setProperty("--y", `${el.offsetTop}px`);
      side.style.setProperty("--h", `${el.offsetHeight}px`);
      side.style.setProperty("--o", "1");
    };
    place(current);
    on(side, "pointerover", (e) => { const a = e.target.closest("a"); if (a) place(a); });
    on(side, "focusin", (e) => { const a = e.target.closest("a"); if (a) place(a); });
    on(side, "pointerleave", () => place(current));
    on(side, "focusout", () => place(current));
  }

  /* ---- wide tables get their own scroll region, reachable from the keyboard ---- */
  doc.querySelectorAll(".docs-prose > table").forEach((table) => {
    const box = doc.createElement("div");
    box.className = "docs-scroller";
    box.tabIndex = 0;
    table.replaceWith(box);
    box.append(table);
  });

  /* ---- copy buttons on prose code blocks, built here so the markup stays plain ---- */
  doc.querySelectorAll(".docs-prose > pre").forEach((pre, i) => {
    if (pre.parentElement.classList.contains("docs-pre")) return;
    const code = pre.querySelector("code");
    if (!code) return;
    pre.tabIndex = 0; // a scrollable region must be reachable without a pointer
    const wrap = doc.createElement("div");
    wrap.className = "docs-pre";
    pre.replaceWith(wrap);
    wrap.append(pre);
    const status = doc.createElement("span");
    status.className = "iv-u-sr-only"; status.id = `docs-pre-status-${i}`; status.setAttribute("role", "status");
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "iv-button iv-button--secondary iv-button--sm docs-copy-inline";
    btn.textContent = t.copyCode;
    btn.setAttribute("aria-describedby", status.id);
    btn.addEventListener("click", async () => {
      try {
        if (!navigator.clipboard) throw new Error("no clipboard");
        await navigator.clipboard.writeText(code.textContent);
        btn.textContent = t.copied; status.textContent = t.copiedStatus;
      } catch {
        const r = doc.createRange(); r.selectNodeContents(code);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        btn.textContent = t.selected; status.textContent = t.selectedStatus;
      }
      setTimeout(() => { btn.textContent = t.copyCode; status.textContent = ""; }, 2000);
    });
    wrap.append(btn, status);
  });

  return () => { off.forEach((fn) => fn()); off.length = 0; };
}
