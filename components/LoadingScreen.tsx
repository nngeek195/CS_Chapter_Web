'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Board, SparkEngine, drawBoard, generateBoard } from './boot/circuit';

interface LoadingScreenProps {
  isLoaded?: boolean;
}

/**
 * Boot screen: the chapter logo sits on a "processor" in the middle of a live
 * circuit board. Yellow signals run along the traces into the chip while the
 * site loads; a large, faint seven-segment counter and HUD ring behind the
 * chip show progress. At 100% the chip "powers on" and fires a burst outward.
 */
export default function LoadingScreen({ isLoaded = false }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'boot' | 'online' | 'done'>('boot');
  const [shouldRender, setShouldRender] = useState(true);

  const currentRef = useRef(0);
  const isLoadedRef = useRef(isLoaded);
  const boardCanvas = useRef<HTMLCanvasElement>(null);
  const sparkCanvas = useRef<HTMLCanvasElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SparkEngine | null>(null);

  useEffect(() => {
    isLoadedRef.current = isLoaded;
  }, [isLoaded]);

  // ── Progress (same pacing as before) ──
  useEffect(() => {
    let animFrameId: number;
    let completed = false;
    const startTime = performance.now();
    const timers: ReturnType<typeof setTimeout>[] = [];

    const tick = (now: number) => {
      const elapsed = now - startTime;
      if (!isLoadedRef.current) {
        // Brisk start, then a slow creep toward 93% until the page is ready.
        const simulated = Math.min(93, Math.floor((1 - Math.exp(-elapsed / 700)) * 88 + (elapsed / 4000) * 5));
        currentRef.current = Math.max(currentRef.current, simulated);
      } else {
        const remaining = 100 - currentRef.current;
        currentRef.current = Math.min(100, currentRef.current + Math.max(1, Math.round(remaining * 0.28)));
      }
      setProgress(currentRef.current);

      if (currentRef.current < 100) {
        animFrameId = requestAnimationFrame(tick);
      } else if (!completed) {
        completed = true;
        setPhase('online');
        engineRef.current?.burst();
        timers.push(setTimeout(() => {
          setPhase('done');
          timers.push(setTimeout(() => setShouldRender(false), 800));
        }, 520));
      }
    };
    animFrameId = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(animFrameId); timers.forEach(clearTimeout); };
  }, []);

  // ── Circuit board + sparks ──
  useEffect(() => {
    const bc = boardCanvas.current;
    const sc = sparkCanvas.current;
    const chipEl = chipRef.current;
    if (!bc || !sc || !chipEl) return;
    const bctx = bc.getContext('2d');
    const sctx = sc.getContext('2d');
    if (!bctx || !sctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let board: Board;
    let raf = 0;
    let last = performance.now();

    const setup = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const [c, ctx] of [[bc, bctx], [sc, sctx]] as const) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      const r = chipEl.getBoundingClientRect();
      board = generateBoard(w, h, { x: r.left, y: r.top, w: r.width, h: r.height });
      drawBoard(bctx, board);
      engineRef.current = reduceMotion ? null : new SparkEngine(board);
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      engineRef.current?.step(sctx, dt);
      raf = requestAnimationFrame(loop);
    };

    setup();
    if (!reduceMotion) raf = requestAnimationFrame(loop);

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(setup, 150); };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      engineRef.current = null;
    };
  }, []);

  if (!shouldRender) return null;

  const status =
    phase !== 'boot' ? 'System online'
      : progress < 25 ? 'Powering up circuits'
        : progress < 50 ? 'Routing signals'
          : progress < 75 ? 'Syncing chapter data'
            : 'Compiling experience';

  return (
    <div id="boot" className={`${phase === 'online' ? 'online' : ''} ${phase === 'done' ? 'done' : ''}`} aria-hidden={phase === 'done'}>
      <canvas ref={boardCanvas} className="boot-layer" aria-hidden="true" />
      <canvas ref={sparkCanvas} className="boot-layer" aria-hidden="true" />
      <div className="boot-vignette" aria-hidden="true" />

      {/* Big, faint progress readout behind the chip */}
      <div className="boot-hud" aria-hidden="true">
        <HudRing progress={progress} />
        <SevenSegment value={progress} />
      </div>

      <div className="boot-core" role="progressbar" aria-label="Loading IEEE Computer Society SUSL Chapter" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="boot-chip" ref={chipRef}>
          <span className="boot-chip-corner" />
          <div className="boot-logo">
            {/* Vector version of logo.png (white text + orange Φ symbol) so it
                stays sharp on large / high-DPI screens; ~12 KB gzipped. */}
            <img src="/images/logo-boot.svg" alt="IEEE Computer Society — SUSL Student Branch Chapter" draggable={false} />
          </div>
          <span className="boot-chip-scan" />
        </div>
        <div className="boot-status">
          <span className="boot-status-dot" />
          {status}
          <span className="boot-caret" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HUD ring: 120 ticks that light up with progress + slow-turning rings
// ─────────────────────────────────────────────────────────────
const TICKS = 120;
function HudRing({ progress }: { progress: number }) {
  const lit = Math.round((progress / 100) * TICKS);
  return (
    <svg className="boot-ring" viewBox="0 0 1000 1000">
      <defs>
        <path id="boot-text-path" d="M 500 500 m -472 0 a 472 472 0 1 1 944 0 a 472 472 0 1 1 -944 0" />
      </defs>
      <g className="boot-ring-spin-slow">
        <text className="boot-ring-text">
          <textPath href="#boot-text-path">
            IEEE COMPUTER SOCIETY · SABARAGAMUWA UNIVERSITY OF SRI LANKA · STUDENT BRANCH CHAPTER · EST. SYS BOOT ·
          </textPath>
        </text>
      </g>
      <g>
        {Array.from({ length: TICKS }, (_, i) => {
          const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
          const major = i % 10 === 0;
          const r1 = major ? 400 : 412;
          const r2 = 440;
          // Rounded so server and browser render identical numbers (avoids a hydration mismatch).
          const at = (r: number, f: (x: number) => number) => Math.round((500 + f(a) * r) * 100) / 100;
          return (
            <line
              key={i}
              x1={at(r1, Math.cos)}
              y1={at(r1, Math.sin)}
              x2={at(r2, Math.cos)}
              y2={at(r2, Math.sin)}
              className={i < lit ? 'tick on' : 'tick'}
              strokeWidth={major ? 4 : 2.4}
            />
          );
        })}
      </g>
      <circle cx="500" cy="500" r="386" className="boot-ring-line" />
      <g className="boot-ring-spin">
        <circle cx="500" cy="500" r="455" className="boot-ring-dash" />
      </g>
      <g className="boot-ring-spin-rev">
        <path d="M 500 140 A 360 360 0 0 1 811.8 320" className="boot-ring-arc" />
        <path d="M 500 860 A 360 360 0 0 1 188.2 680" className="boot-ring-arc" />
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Seven-segment digits (lit segments + faint "ghost" segments)
// ─────────────────────────────────────────────────────────────
const W = 100, H = 170, T = 16, S = 3;
const hSeg = (yc: number) => {
  const x1 = T / 2 + S, x2 = W - T / 2 - S;
  return `${x1},${yc} ${x1 + T / 2},${yc - T / 2} ${x2 - T / 2},${yc - T / 2} ${x2},${yc} ${x2 - T / 2},${yc + T / 2} ${x1 + T / 2},${yc + T / 2}`;
};
const vSeg = (xc: number, y1: number, y2: number) =>
  `${xc},${y1} ${xc + T / 2},${y1 + T / 2} ${xc + T / 2},${y2 - T / 2} ${xc},${y2} ${xc - T / 2},${y2 - T / 2} ${xc - T / 2},${y1 + T / 2}`;
const SEGMENTS: Record<string, string> = {
  a: hSeg(T / 2),
  g: hSeg(H / 2),
  d: hSeg(H - T / 2),
  f: vSeg(T / 2, T / 2 + S, H / 2 - S),
  b: vSeg(W - T / 2, T / 2 + S, H / 2 - S),
  e: vSeg(T / 2, H / 2 + S, H - T / 2 - S),
  c: vSeg(W - T / 2, H / 2 + S, H - T / 2 - S),
};
const DIGITS = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'];

function SevenSegment({ value }: { value: number }) {
  const text = String(Math.max(0, Math.min(100, value))).padStart(3, '0');
  const gap = 26;
  const total = text.length * W + (text.length - 1) * gap + 90;
  return (
    <svg className="boot-digits" viewBox={`-10 -10 ${total + 20} ${H + 20}`}>
      <g transform="skewX(-7)">
        {text.split('').map((ch, i) => (
          <g key={i} transform={`translate(${i * (W + gap) + 14}, 0)`}>
            {Object.entries(SEGMENTS).map(([seg, pts]) => (
              <polygon key={seg} points={pts} className={DIGITS[Number(ch)].includes(seg) ? 'seg on' : 'seg'} />
            ))}
          </g>
        ))}
        {/* % sign */}
        <g transform={`translate(${text.length * (W + gap) + 14}, ${H - 70})`}>
          <circle cx="14" cy="12" r="10" className="seg on" />
          <circle cx="58" cy="58" r="10" className="seg on" />
          <polygon points="56,0 68,0 16,70 4,70" className="seg on" />
        </g>
      </g>
    </svg>
  );
}
