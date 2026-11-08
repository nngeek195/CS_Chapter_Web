'use client';

/**
 * Lightweight SVG/HTML charts for the volunteer dashboards (no chart library).
 * Mark specs: bars ≤ 24px with a 4px rounded data-end, 2px surface gaps,
 * hairline recessive grid, values in text ink (never the series colour),
 * a hover tooltip on every mark, and a legend whenever there are ≥ 2 series.
 */
import React, { useEffect, useRef, useState } from 'react';

export const SERIES_BLUE = '#00629B';
/** Validated categorical order (adjacent CVD ΔE ≥ 9.1). Two slots are < 3:1 on white → always labelled. */
export const STATUS_COLORS: Record<string, string> = {
  pending: '#2a78d6',
  shortlisted: '#eb6834',
  selected: '#1baf7a',
  rejected: '#eda100',
};
const GRID = '#e8e7e1';
const AXIS = '#c3c2b7';
const MUTED = '#898781';

// ── Tooltip ─────────────────────────────────────────────────────────
interface Tip { x: number; y: number; title: string; value: string; color?: string }

function Tooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return (
    <div className="viz-tooltip" style={{ left: tip.x, top: tip.y }} role="status">
      <div className="viz-tooltip-value">{tip.value}</div>
      <div className="viz-tooltip-label">
        {tip.color && <span className="viz-key" style={{ background: tip.color }} />}
        {tip.title}
      </div>
    </div>
  );
}

function useTooltip() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const show = (e: React.PointerEvent | React.FocusEvent, t: Omit<Tip, 'x' | 'y'>) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    let x: number, y: number;
    if ('clientX' in e) { x = e.clientX - box.left; y = e.clientY - box.top; }
    else {
      const r = (e.target as Element).getBoundingClientRect();
      x = r.left - box.left + r.width / 2; y = r.top - box.top;
    }
    setTip({ ...t, x: Math.min(Math.max(x, 60), box.width - 60), y });
  };
  return { ref, tip, show, hide: () => setTip(null) };
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(200, entry.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

const niceMax = (v: number) => {
  if (v <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
};

const fmtDay = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// ── Column chart: one series over time ──────────────────────────────
export function DailyColumns({ data, height = 200, label = 'Applications' }: { data: { date: string; value: number }[]; height?: number; label?: string }) {
  const { ref: wrapRef, w } = useWidth<HTMLDivElement>();
  const { ref, tip, show, hide } = useTooltip();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 32, padR = 8, padT = 12, padB = 26;
  const innerW = w - padL - padR, innerH = height - padT - padB;
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const band = innerW / Math.max(data.length, 1);
  const barW = Math.min(24, Math.max(3, band - 2));
  const ticks = [0, max / 2, max];
  const labelIdx = data.length > 1 ? [0, Math.floor((data.length - 1) / 2), data.length - 1] : [0];
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div ref={wrapRef}>
        <svg width={w} height={height} role="img" aria-label={`${label} per day, ${total} in total over ${data.length} days`}>
          {ticks.map((t) => {
            const y = padT + innerH - (t / max) * innerH;
            return (
              <g key={t}>
                <line x1={padL} x2={w - padR} y1={y} y2={y} stroke={t === 0 ? AXIS : GRID} strokeWidth={1} />
                <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fill={MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(t)}</text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const h = (d.value / max) * innerH;
            const x = padL + i * band + (band - barW) / 2;
            const y = padT + innerH - h;
            const r = Math.min(4, barW / 2, h);
            return (
              <g key={d.date}>
                {h > 0 && (
                  <path
                    d={`M${x},${padT + innerH} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${padT + innerH} Z`}
                    fill={SERIES_BLUE}
                    opacity={hover === null || hover === i ? 1 : 0.45}
                    style={{ transition: 'opacity 0.15s' }}
                  />
                )}
                <rect
                  x={padL + i * band} y={padT} width={band} height={innerH}
                  fill="transparent" tabIndex={0}
                  aria-label={`${fmtDay(d.date)}: ${d.value}`}
                  onPointerMove={(e) => { setHover(i); show(e, { title: fmtDay(d.date), value: `${d.value} ${d.value === 1 ? 'application' : 'applications'}` }); }}
                  onFocus={(e) => { setHover(i); show(e, { title: fmtDay(d.date), value: `${d.value} ${d.value === 1 ? 'application' : 'applications'}` }); }}
                  onPointerLeave={() => { setHover(null); hide(); }}
                  onBlur={() => { setHover(null); hide(); }}
                  style={{ outline: 'none', cursor: 'default' }}
                />
                {hover === i && <line x1={padL + i * band + band / 2} x2={padL + i * band + band / 2} y1={padT} y2={padT + innerH} stroke={AXIS} strokeWidth={1} pointerEvents="none" />}
              </g>
            );
          })}
          {labelIdx.map((i) => (
            <text key={i} x={padL + i * band + band / 2} y={height - 8} fontSize="11" fill={MUTED}
              textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>
              {fmtDay(data[i].date)}
            </text>
          ))}
        </svg>
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}

// ── Horizontal bar list: magnitude by category (single series) ──────
export function BarList({
  data,
  total,
  emptyText = 'No data yet',
  max: maxRows = 8,
  color = SERIES_BLUE,
}: {
  data: { label: string; value: number; sub?: string }[];
  total?: number;
  emptyText?: string;
  max?: number;
  color?: string;
}) {
  const { ref, tip, show, hide } = useTooltip();
  const [expanded, setExpanded] = useState(false);
  if (data.length === 0) return <div style={{ fontSize: '13px', color: 'var(--muted)', padding: '16px 0' }}>{emptyText}</div>;
  const rows = expanded ? data : data.slice(0, maxRows);
  const max = Math.max(...data.map((d) => d.value), 1);
  const denom = total ?? data.reduce((s, d) => s + d.value, 0);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {rows.map((d) => {
          const pct = denom ? Math.round((d.value / denom) * 100) : 0;
          const tipData = { title: d.label, value: `${d.value} (${pct}%)` };
          return (
            <div
              key={d.label}
              className="viz-barrow"
              tabIndex={0}
              onPointerMove={(e) => show(e, tipData)}
              onFocus={(e) => show(e, tipData)}
              onPointerLeave={hide}
              onBlur={hide}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '13px', marginBottom: '5px' }}>
                <span style={{ color: 'var(--ink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.label}{d.sub && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {d.sub}</span>}
                </span>
                <span style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  <strong style={{ color: 'var(--ink)' }}>{d.value}</strong> · {pct}%
                </span>
              </div>
              <div style={{ height: '10px', borderRadius: '0 4px 4px 0', background: 'rgba(16,24,32,0.05)', overflow: 'hidden' }}>
                <div className="viz-bar" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
      {data.length > maxRows && (
        <button type="button" className="btn secondary sm" style={{ marginTop: '12px' }} onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show less' : `Show all ${data.length}`}
        </button>
      )}
      <Tooltip tip={tip} />
    </div>
  );
}

// ── Stacked status bar with legend (≥ 2 series → legend with counts) ─
export function StatusBar({ segments }: { segments: { key: string; label: string; value: number }[] }) {
  const { ref, tip, show, hide } = useTooltip();
  const total = segments.reduce((s, x) => s + x.value, 0);
  const visible = segments.filter((s) => s.value > 0);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '2px', height: '14px', borderRadius: '4px', overflow: 'hidden', background: total ? undefined : 'rgba(16,24,32,0.06)' }}>
        {visible.map((s) => {
          const pct = Math.round((s.value / total) * 100);
          const t = { title: s.label, value: `${s.value} (${pct}%)`, color: STATUS_COLORS[s.key] };
          return (
            <div
              key={s.key}
              className="viz-seg"
              tabIndex={0}
              aria-label={`${s.label}: ${s.value}`}
              style={{ flex: s.value, background: STATUS_COLORS[s.key] }}
              onPointerMove={(e) => show(e, t)}
              onFocus={(e) => show(e, t)}
              onPointerLeave={hide}
              onBlur={hide}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', marginTop: '12px' }}>
        {segments.map((s) => (
          <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--muted)' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: STATUS_COLORS[s.key] }} />
            {s.label}
            <strong style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{s.value}</strong>
          </span>
        ))}
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}

// ── Progress toward a target (e.g. selected vs. slots) ──────────────
export function SlotMeter({ filled, target }: { filled: number; target: number }) {
  const pct = target ? Math.min(100, Math.round((filled / target) * 100)) : 0;
  return (
    <div title={`${filled} of ${target} filled`}>
      <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(16,24,32,0.07)', overflow: 'hidden' }}>
        <div className="viz-bar" style={{ width: `${pct}%`, background: filled >= target ? '#1baf7a' : SERIES_BLUE, height: '100%' }} />
      </div>
      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
        {filled} / {target} selected
      </div>
    </div>
  );
}

// ── KPI tile ────────────────────────────────────────────────────────
export function Kpi({ label, value, hint, icon }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="stat-card anim-in" style={{ alignItems: 'flex-start' }}>
      {icon}
      <div style={{ minWidth: 0 }}>
        <div className="stat-label" style={{ marginTop: 0, marginBottom: '6px', fontWeight: 600 }}>{label}</div>
        <div className="stat-value">{value}</div>
        {hint && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>{hint}</div>}
      </div>
    </div>
  );
}

/** Card wrapper for a chart with a title + optional subtitle. */
export function ChartCard({ title, subtitle, children, action }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="admin-panel anim-in" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '15px', fontFamily: 'Montserrat, sans-serif', color: 'var(--ink)' }}>{title}</h4>
          {subtitle && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
