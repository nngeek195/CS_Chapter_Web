/**
 * Procedural circuit board + "spark" signals for the boot screen.
 *
 *  - generateBoard() routes PCB-style traces on a grid (0° / 45° / 90° only,
 *    no overlaps): a fan-out bus from every pin of the central chip, a few
 *    decorative ICs with their own traces, and random background routing.
 *  - drawBoard() paints it once onto a canvas (static layer).
 *  - SparkEngine animates yellow signal pulses along the traces on a second
 *    canvas, and can fire a "power-on" burst out of the chip.
 */

export interface Pt { x: number; y: number }
export interface Trace {
  pts: Pt[];
  /** Cumulative length at each point. */
  cum: number[];
  len: number;
  /** True for traces that start at the central chip. */
  fan: boolean;
}
interface Chip { x: number; y: number; w: number; h: number; label: string }
interface Smd { x: number; y: number; vertical: boolean }
export interface Board {
  w: number;
  h: number;
  g: number;
  chip: { x: number; y: number; w: number; h: number };
  traces: Trace[];
  /** Pin stubs from the chip edge to the first trace point. */
  stubs: [Pt, Pt][];
  ics: Chip[];
  smds: Smd[];
  labels: { x: number; y: number; text: string }[];
}

const DIRS: Pt[] = [
  { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 },
  { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
];

/** Small deterministic PRNG so the board doesn't reshuffle on every render. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function finish(pts: Pt[], fan: boolean): Trace {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, len: cum[cum.length - 1], fan };
}

/** Collapse consecutive collinear points so traces are a few long segments. */
function simplify(pts: Pt[]): Pt[] {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1], b = pts[i], c = pts[i + 1];
    const d1x = Math.sign(b.x - a.x), d1y = Math.sign(b.y - a.y);
    const d2x = Math.sign(c.x - b.x), d2y = Math.sign(c.y - b.y);
    if (d1x !== d2x || d1y !== d2y) out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function generateBoard(w: number, h: number, chipRect: { x: number; y: number; w: number; h: number }): Board {
  const g = w < 640 ? 14 : 18;
  const cols = Math.ceil(w / g) + 1;
  const rows = Math.ceil(h / g) + 1;
  const rand = rng(0xc5c5 ^ (cols * 131 + rows));
  const used = new Uint8Array(cols * rows);
  const key = (cx: number, cy: number) => cy * cols + cx;
  const inside = (cx: number, cy: number) => cx >= 1 && cy >= 1 && cx < cols - 1 && cy < rows - 1;
  const isFree = (cx: number, cy: number) => inside(cx, cy) && !used[key(cx, cy)];
  const mark = (cx: number, cy: number) => { if (inside(cx, cy)) used[key(cx, cy)] = 1; };
  const markRect = (x0: number, y0: number, x1: number, y1: number) => {
    for (let cy = Math.floor(y0 / g); cy <= Math.ceil(y1 / g); cy++)
      for (let cx = Math.floor(x0 / g); cx <= Math.ceil(x1 / g); cx++) mark(cx, cy);
  };

  // Keep-out around the chip (and a ring for the HUD to breathe).
  const pad = g * 0.6;
  const chip = { ...chipRect };
  markRect(chip.x - pad, chip.y - pad, chip.x + chip.w + pad, chip.y + chip.h + pad);

  /** Route one trace from a start cell in a preferred direction. */
  const route = (cx: number, cy: number, dirIdx: number, maxSteps: number, turnChance: number, avoidBack?: Pt): Pt[] | null => {
    if (!isFree(cx, cy)) return null;
    const cells: Pt[] = [{ x: cx, y: cy }];
    mark(cx, cy);
    let d = dirIdx;
    let sinceTurn = 0;
    for (let s = 0; s < maxSteps; s++) {
      if (sinceTurn > 2 && rand() < turnChance) {
        const nd = (d + (rand() < 0.5 ? 1 : 7)) % 8;
        const nv = DIRS[nd];
        // Never turn back toward where the trace came from.
        if (!avoidBack || nv.x * avoidBack.x + nv.y * avoidBack.y >= 0) { d = nd; sinceTurn = 0; }
      }
      let v = DIRS[d];
      let nx = cx + v.x, ny = cy + v.y;
      if (!isFree(nx, ny) || (v.x && v.y && (!isFree(cx + v.x, cy) && !isFree(cx, cy + v.y)))) {
        // Blocked: try bending 45° either way once, else end here.
        const alt = [(d + 1) % 8, (d + 7) % 8].sort(() => rand() - 0.5).find((nd) => {
          const nv = DIRS[nd];
          return isFree(cx + nv.x, cy + nv.y) && (!avoidBack || nv.x * avoidBack.x + nv.y * avoidBack.y >= 0);
        });
        if (alt === undefined) break;
        d = alt; v = DIRS[d]; nx = cx + v.x; ny = cy + v.y; sinceTurn = 0;
      }
      cx = nx; cy = ny;
      mark(cx, cy);
      cells.push({ x: cx, y: cy });
      sinceTurn++;
    }
    return cells.length >= 4 ? cells : null;
  };
  const toPts = (cells: Pt[]) => simplify(cells.map((c) => ({ x: c.x * g, y: c.y * g })));

  const traces: Trace[] = [];
  const stubs: [Pt, Pt][] = [];

  // ── 1. Fan-out bus from the central chip (every other grid line) ──
  const sides: { dir: number; normal: Pt; along: 'x' | 'y'; fixed: number; from: number; to: number; edge: number }[] = [
    { dir: 6, normal: { x: 0, y: -1 }, along: 'x', fixed: Math.floor((chip.y - pad) / g) - 1, from: chip.x, to: chip.x + chip.w, edge: chip.y },
    { dir: 2, normal: { x: 0, y: 1 }, along: 'x', fixed: Math.ceil((chip.y + chip.h + pad) / g) + 1, from: chip.x, to: chip.x + chip.w, edge: chip.y + chip.h },
    { dir: 4, normal: { x: -1, y: 0 }, along: 'y', fixed: Math.floor((chip.x - pad) / g) - 1, from: chip.y, to: chip.y + chip.h, edge: chip.x },
    { dir: 0, normal: { x: 1, y: 0 }, along: 'y', fixed: Math.ceil((chip.x + chip.w + pad) / g) + 1, from: chip.y, to: chip.y + chip.h, edge: chip.x + chip.w },
  ];
  const reach = Math.max(cols, rows);
  for (const s of sides) {
    const start = Math.ceil((s.from + g) / g);
    const end = Math.floor((s.to - g) / g);
    for (let i = start; i <= end; i += 2) {
      const cx = s.along === 'x' ? i : s.fixed;
      const cy = s.along === 'x' ? s.fixed : i;
      const cells = route(cx, cy, s.dir, Math.floor(reach * (0.35 + rand() * 0.6)), 0.09, s.normal);
      if (!cells) continue;
      const pts = toPts(cells);
      // Pin stub: chip edge → first trace point.
      const first = pts[0];
      stubs.push([s.along === 'x' ? { x: first.x, y: s.edge } : { x: s.edge, y: first.y }, first]);
      traces.push(finish([stubs[stubs.length - 1][0], ...pts], true));
    }
  }

  // ── 2. A few decorative ICs with their own short buses ──
  const ics: Chip[] = [];
  const icCount = Math.round((w * h) / 260000) + 2;
  for (let n = 0, tries = 0; n < icCount && tries < 60; tries++) {
    const iw = (3 + Math.floor(rand() * 4)) * g;
    const ih = (2 + Math.floor(rand() * 3)) * g;
    const ix = Math.floor((g * 2 + rand() * (w - iw - g * 4)) / g) * g;
    const iy = Math.floor((g * 2 + rand() * (h - ih - g * 4)) / g) * g;
    let free = true;
    for (let cy = iy / g - 1; cy <= (iy + ih) / g + 1 && free; cy++)
      for (let cx = ix / g - 1; cx <= (ix + iw) / g + 1 && free; cx++) if (!isFree(cx, cy)) free = false;
    if (!free) continue;
    markRect(ix, iy, ix + iw, iy + ih);
    ics.push({ x: ix, y: iy, w: iw, h: ih, label: `U${n + 2}` });
    n++;
    // Traces from the IC's left/right pins
    for (let cy = iy / g; cy <= (iy + ih) / g; cy++) {
      for (const [cx, dir, nx] of [[ix / g - 1, 4, -1], [(ix + iw) / g + 1, 0, 1]] as const) {
        if (rand() < 0.45) continue;
        const cells = route(cx, cy, dir, 6 + Math.floor(rand() * 22), 0.12, { x: nx, y: 0 });
        if (!cells) continue;
        const pts = toPts(cells);
        traces.push(finish([{ x: cx * g - nx * g, y: cy * g }, ...pts], false));
      }
    }
  }

  // ── 3. Background routing ──
  const bg = Math.round((cols * rows) / 34);
  for (let n = 0; n < bg; n++) {
    const cx = 1 + Math.floor(rand() * (cols - 2));
    const cy = 1 + Math.floor(rand() * (rows - 2));
    const cells = route(cx, cy, Math.floor(rand() * 4) * 2, 4 + Math.floor(rand() * 26), 0.14);
    if (cells) traces.push(finish(toPts(cells), false));
  }

  // ── 4. Little SMD parts + silkscreen labels in leftover space ──
  const smds: Smd[] = [];
  const labels: { x: number; y: number; text: string }[] = ics.map((c) => ({ x: c.x, y: c.y - 6, text: c.label }));
  const smdCount = Math.round((cols * rows) / 160);
  for (let n = 0; n < smdCount; n++) {
    const cx = 2 + Math.floor(rand() * (cols - 4));
    const cy = 2 + Math.floor(rand() * (rows - 4));
    const vertical = rand() < 0.5;
    if (!isFree(cx, cy) || !isFree(cx + (vertical ? 0 : 1), cy + (vertical ? 1 : 0))) continue;
    mark(cx, cy); mark(cx + (vertical ? 0 : 1), cy + (vertical ? 1 : 0));
    smds.push({ x: cx * g, y: cy * g, vertical });
    if (rand() < 0.35) labels.push({ x: cx * g + (vertical ? 8 : 0), y: cy * g - 5, text: `${rand() < 0.5 ? 'R' : 'C'}${1 + Math.floor(rand() * 48)}` });
  }

  return { w, h, g, chip, traces, stubs, ics, smds, labels };
}

// ─────────────────────────────────────────────────────────────
// Static layer
// ─────────────────────────────────────────────────────────────
export function drawBoard(ctx: CanvasRenderingContext2D, b: Board) {
  const { w, h, g } = b;
  ctx.clearRect(0, 0, w, h);

  // Substrate
  const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 1.6);
  bgGrad.addColorStop(0, '#0a1f2e');
  bgGrad.addColorStop(0.55, '#06121c');
  bgGrad.addColorStop(1, '#02070b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Fine dot grid
  ctx.fillStyle = 'rgba(120, 180, 220, 0.05)';
  for (let y = 0; y < h; y += g) for (let x = 0; x < w; x += g) ctx.fillRect(x - 0.5, y - 0.5, 1, 1);

  const path = (t: Trace) => {
    ctx.beginPath();
    ctx.moveTo(t.pts[0].x, t.pts[0].y);
    for (let i = 1; i < t.pts.length; i++) ctx.lineTo(t.pts[i].x, t.pts[i].y);
  };
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Trace glow + copper
  for (const t of b.traces) {
    path(t);
    ctx.strokeStyle = t.fan ? 'rgba(40, 140, 200, 0.07)' : 'rgba(40, 140, 200, 0.04)';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = t.fan ? 'rgba(70, 160, 215, 0.34)' : 'rgba(70, 150, 200, 0.2)';
    ctx.lineWidth = t.fan ? 1.6 : 1.3;
    ctx.stroke();
  }

  // Vias at trace ends
  for (const t of b.traces) {
    const end = t.pts[t.pts.length - 1];
    ctx.beginPath();
    ctx.arc(end.x, end.y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#06121c';
    ctx.fill();
    ctx.strokeStyle = t.fan ? 'rgba(90, 175, 225, 0.5)' : 'rgba(90, 165, 210, 0.3)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    if (!t.fan) {
      const st = t.pts[0];
      ctx.beginPath();
      ctx.arc(st.x, st.y, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(90, 165, 210, 0.25)';
      ctx.fill();
    }
  }

  // Chip pin pads
  ctx.fillStyle = 'rgba(150, 200, 230, 0.35)';
  for (const [a, bpt] of b.stubs) {
    const horizontal = a.y === bpt.y;
    if (horizontal) ctx.fillRect(Math.min(a.x, bpt.x + (a.x < bpt.x ? -6 : 0)), a.y - 1.5, 6, 3);
    else ctx.fillRect(a.x - 1.5, Math.min(a.y, bpt.y + (a.y < bpt.y ? -6 : 0)), 3, 6);
  }

  // Decorative ICs
  for (const ic of b.ics) {
    ctx.fillStyle = 'rgba(4, 12, 18, 0.95)';
    ctx.strokeStyle = 'rgba(90, 160, 205, 0.28)';
    ctx.lineWidth = 1;
    roundRect(ctx, ic.x + 0.5, ic.y + 0.5, ic.w, ic.h, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(140, 190, 225, 0.25)';
    for (let y = ic.y + g / 2; y < ic.y + ic.h; y += g / 2) {
      ctx.fillRect(ic.x - 4, y - 1, 4, 2);
      ctx.fillRect(ic.x + ic.w + 1, y - 1, 4, 2);
    }
    ctx.beginPath();
    ctx.arc(ic.x + 6, ic.y + 6, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(140, 190, 225, 0.3)';
    ctx.fill();
  }

  // SMD parts
  for (const s of b.smds) {
    const [pw, ph] = s.vertical ? [5, 4] : [4, 5];
    const dx = s.vertical ? 0 : g, dy = s.vertical ? g : 0;
    ctx.fillStyle = 'rgba(150, 195, 225, 0.22)';
    ctx.fillRect(s.x - pw / 2, s.y - ph / 2, pw, ph);
    ctx.fillRect(s.x + dx - pw / 2, s.y + dy - ph / 2, pw, ph);
    ctx.fillStyle = 'rgba(20, 40, 55, 0.9)';
    if (s.vertical) ctx.fillRect(s.x - 2.5, s.y + 3, 5, g - 6);
    else ctx.fillRect(s.x + 3, s.y - 2.5, g - 6, 5);
  }

  // Silkscreen
  ctx.font = '600 8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.fillStyle = 'rgba(170, 205, 230, 0.16)';
  for (const l of b.labels) ctx.fillText(l.text, l.x, l.y);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ─────────────────────────────────────────────────────────────
// Sparks
// ─────────────────────────────────────────────────────────────
interface Spark { t: Trace; d: number; speed: number; dir: 1 | -1; tail: number; life: number }
interface Flash { x: number; y: number; age: number; max: number }

function pointAt(t: Trace, dist: number): Pt {
  const d = Math.max(0, Math.min(t.len, dist));
  let i = 1;
  while (i < t.cum.length - 1 && t.cum[i] < d) i++;
  const a = t.pts[i - 1], b = t.pts[i];
  const seg = t.cum[i] - t.cum[i - 1] || 1;
  const k = (d - t.cum[i - 1]) / seg;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

export class SparkEngine {
  private sparks: Spark[] = [];
  private flashes: Flash[] = [];
  private fans: Trace[];
  private others: Trace[];
  private target: number;
  private spawnIn = 0;

  constructor(private board: Board) {
    this.fans = board.traces.filter((t) => t.fan && t.len > 60);
    this.others = board.traces.filter((t) => !t.fan && t.len > 50);
    this.target = Math.max(7, Math.min(24, Math.round((board.w * board.h) / 70000)));
    // Start with signals already mid-flight so the board is alive from the first frame.
    for (let i = 0; i < this.target; i++) {
      this.spawn();
      const s = this.sparks[this.sparks.length - 1];
      if (s) s.d = Math.random() * s.t.len;
    }
  }

  private spawn(outward = false, speedBoost = 1) {
    // Most signals flow along the chip's bus (into the chip while booting).
    const useFan = outward || (this.fans.length > 0 && Math.random() < 0.68);
    const pool = useFan ? this.fans : this.others.length ? this.others : this.fans;
    if (!pool.length) return;
    const t = pool[Math.floor(Math.random() * pool.length)];
    const dir: 1 | -1 = useFan ? (outward ? 1 : -1) : Math.random() < 0.5 ? 1 : -1;
    this.sparks.push({
      t,
      dir,
      d: dir === 1 ? 0 : t.len,
      speed: (180 + Math.random() * 260) * speedBoost,
      tail: 50 + Math.random() * 70,
      life: 0,
    });
  }

  /** Power-on: fire a signal out of every chip pin at once. */
  burst() {
    this.fans.forEach((t) => this.sparks.push({ t, dir: 1, d: 0, speed: 620 + Math.random() * 380, tail: 110, life: 0 }));
    const { chip } = this.board;
    this.flashes.push({ x: chip.x + chip.w / 2, y: chip.y + chip.h / 2, age: 0, max: 0.7 });
  }

  step(ctx: CanvasRenderingContext2D, dt: number) {
    const { w, h } = this.board;
    this.spawnIn -= dt;
    if (this.sparks.length < this.target && this.spawnIn <= 0) {
      this.spawn();
      this.spawnIn = 0.05 + Math.random() * 0.18;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.d += s.speed * s.dir * dt;
      s.life += dt;
      const head = Math.max(0, Math.min(s.t.len, s.d));
      const arrived = s.dir === 1 ? s.d >= s.t.len + s.tail : s.d <= -s.tail;

      // Tail: short segments with falling brightness
      const stepLen = 3;
      const n = Math.ceil(s.tail / stepLen);
      // (While a spark drains into its end pad, the head is past the end and only the tail remains.)
      let prev: Pt | null = null;
      for (let k = 0; k <= n; k++) {
        const dist = s.d - s.dir * k * stepLen;
        if (dist < 0 || dist > s.t.len) { prev = null; continue; }
        const p = pointAt(s.t, dist);
        const f = 1 - k / n;
        if (!prev) { prev = p; continue; }
        ctx.strokeStyle = `rgba(255, 196, 40, ${0.75 * f * f})`;
        ctx.lineWidth = 0.8 + 1.8 * f;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        prev = p;
      }

      // Head glow
      if (s.d >= 0 && s.d <= s.t.len) {
        const p = pointAt(s.t, head);
        const r = 9;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        grad.addColorStop(0, 'rgba(255, 250, 215, 1)');
        grad.addColorStop(0.25, 'rgba(255, 214, 70, 0.85)');
        grad.addColorStop(1, 'rgba(255, 170, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (arrived) {
        const end = s.dir === 1 ? s.t.pts[s.t.pts.length - 1] : s.t.pts[0];
        this.flashes.push({ x: end.x, y: end.y, age: 0, max: 0.35 });
        this.sparks.splice(i, 1);
      }
    }

    // Pad / via flashes where a signal lands
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.age += dt;
      const k = f.age / f.max;
      if (k >= 1) { this.flashes.splice(i, 1); continue; }
      const big = f.max > 0.5;
      const r = (big ? 40 : 4) + (big ? 260 : 14) * k;
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      grad.addColorStop(0, `rgba(255, 225, 120, ${(big ? 0.35 : 0.7) * (1 - k)})`);
      grad.addColorStop(1, 'rgba(255, 190, 40, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
