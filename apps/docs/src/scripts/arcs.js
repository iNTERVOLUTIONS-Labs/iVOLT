/* The hero arc field: branching discharges drawn on a 2D canvas.
   One canvas, home only. devicePixelRatio is capped at 1.5, the loop runs only while the hero is
   on screen and the tab is visible, and every frame is a handful of short polylines (~1 ms).
   Mounted only for fine pointers without prefers-reduced-motion; otherwise the static SVG shows. */

const CAP = 1.5;
const rand = (a, b) => a + Math.random() * (b - a);

/** Midpoint displacement between two points: the classic lightning polyline.
 *  The amplitude is absolute pixels and halves on every pass, which is what makes the kinks
 *  sharp at every scale instead of a smooth wandering curve. */
function bolt(x1, y1, x2, y2, k = 0.13) {
  let pts = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
  let amp = Math.max(10, Math.hypot(x2 - x1, y2 - y1) * k);
  for (let step = 0; step < 6; step++) {
    const next = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const off = rand(-amp, amp);
      next.push({ x: mx - (dy / len) * off, y: my + (dx / len) * off }, b);
    }
    pts = next;
    amp *= 0.55;
  }
  return pts;
}

export function mountArcs(host) {
  const canvas = host.querySelector("canvas");
  if (!canvas) return () => {};
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return () => {};

  let w = 0, h = 0, dpr = 1, raf = 0, visible = false, last = 0, nextSpawn = 0;
  let pointer = null, pointerAt = 0;
  const flashes = [];
  const anchors = [];
  let veins = [];
  let veinsAt = 0;

  const colours = () => {
    const cs = getComputedStyle(host);
    return {
      core: cs.getPropertyValue("--docs-arc-core").trim() || "#ffffff",
      halo: cs.getPropertyValue("--docs-arc-halo").trim() || "#29f59a",
      // additive light reads as light on carbon; on paper the same blend washes out, so ink is drawn normally
      blend: cs.getPropertyValue("--docs-arc-blend").trim() === "ink" ? "source-over" : "lighter",
      gain: cs.getPropertyValue("--docs-arc-blend").trim() === "ink" ? 1.6 : 1,
    };
  };
  let paint = colours();

  function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, CAP);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    anchors.length = 0;
    veinsAt = 0;
    for (let i = 0; i < 5; i++) anchors.push({ x: w * rand(0.55, 1.02), y: h * (i / 4) * rand(0.85, 1.1) });
    for (let i = 0; i < 3; i++) anchors.push({ x: w * (0.25 + i * 0.3), y: h * rand(-0.04, 0.08) });
    paint = colours();
  }

  /** Standing veins: the field always conducts a little, so the hero is never a blank canvas. */
  function reweave(now) {
    veinsAt = now;
    veins = [];
    for (let i = 0; i < 3; i++) {
      const a = anchors[(i * 3) % anchors.length] || anchors[0];
      const b = anchors[(i * 2 + 1) % anchors.length] || anchors[1];
      if (a && b) veins.push({ path: bolt(a.x, a.y, b.x, b.y, 0.11), seed: Math.random() * 6 });
    }
  }

  function spawn(power = 1) {
    const from = anchors[(Math.random() * anchors.length) | 0];
    const fresh = pointer && performance.now() - pointerAt < 2500;
    const to = fresh && Math.random() < 0.7 ? pointer : anchors[(Math.random() * anchors.length) | 0];
    if (!from || !to || (from.x === to.x && from.y === to.y)) return;
    const main = bolt(from.x, from.y, to.x, to.y, 0.14 * power);
    const paths = [main];
    const branches = 1 + ((Math.random() * 2) | 0);
    for (let b = 0; b < branches; b++) {
      const i = 6 + ((Math.random() * (main.length - 12)) | 0);
      const p = main[i];
      if (!p) continue;
      paths.push(bolt(p.x, p.y, p.x + rand(-160, 160), p.y + rand(-140, 140), 0.2));
    }
    flashes.push({ paths, born: performance.now(), life: rand(240, 420) * power, power });
    if (flashes.length > 8) flashes.shift();
  }

  function stroke(pts, width, colour, alpha) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(now - last, 64);
    last = now;

    // residual trail: erase a little of what is already there instead of clearing
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = Math.min(0.22 * (dt / 16.7), 1);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = paint.blend;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (now - veinsAt > 1600) reweave(now);
    for (const v of veins) {
      const age = (now - veinsAt) / 1600;
      const flick = 0.35 + 0.25 * Math.sin(now / 260 + v.seed) + 0.15 * Math.sin(now / 70 + v.seed * 3);
      const env = Math.min(1, age * 6) * (1 - age * 0.55);
      stroke(v.path, 7, paint.halo, 0.06 * flick * env * paint.gain);
      stroke(v.path, 2, paint.halo, 0.2 * flick * env * paint.gain);
      stroke(v.path, 0.9, paint.core, 0.34 * flick * env * paint.gain);
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      const t = (now - f.born) / f.life;
      if (t >= 1) { flashes.splice(i, 1); continue; }
      const fade = (1 - t) * (0.6 + 0.4 * Math.sin(now / 22 + i));
      for (const p of f.paths) {
        stroke(p, 7 * f.power, paint.halo, 0.16 * fade * paint.gain);
        stroke(p, 2.4 * f.power, paint.halo, 0.4 * fade * paint.gain);
        stroke(p, 1.1, paint.core, 0.85 * fade);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    if (now > nextSpawn) { spawn(1); nextSpawn = now + rand(420, 1500); }
    raf = requestAnimationFrame(frame);
  }

  function play() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; visible ? play() : stop(); }, { threshold: 0 });
  io.observe(host);
  const ro = new ResizeObserver(() => resize());
  ro.observe(host);

  const section = host.closest(".docs-hero") || host;
  const onMove = (e) => { const r = host.getBoundingClientRect(); pointer = { x: e.clientX - r.left, y: e.clientY - r.top }; pointerAt = performance.now(); };
  const onDown = () => { for (let i = 0; i < 3; i++) spawn(1.6); nextSpawn = performance.now() + 700; };
  const onVis = () => (document.hidden ? stop() : play());
  section.addEventListener("pointermove", onMove, { passive: true });
  section.addEventListener("pointerdown", onDown, { passive: true });
  document.addEventListener("visibilitychange", onVis);

  resize();
  host.classList.add("is-live");
  play();

  return () => {
    stop();
    io.disconnect();
    ro.disconnect();
    section.removeEventListener("pointermove", onMove);
    section.removeEventListener("pointerdown", onDown);
    document.removeEventListener("visibilitychange", onVis);
    host.classList.remove("is-live");
    ctx.clearRect(0, 0, w, h);
  };
}
