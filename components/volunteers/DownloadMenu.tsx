'use client';

import React, { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/Icon';
import { ButtonSpinner } from '@/components/ui/Portal';
import type { ExportFormat } from '@/lib/volunteerExport';

const OPTIONS: { format: ExportFormat; title: string; desc: string; ext: string }[] = [
  { format: 'xlsx', title: 'Excel sheet', desc: 'Every field, filters & a summary sheet', ext: 'XLSX' },
  { format: 'pdf', title: 'PDF table', desc: 'Summary table + every answer, per person', ext: 'PDF' },
];

/**
 * "Download ▾" button that lets the user pick Excel or PDF.
 * `onPick` does the export; the menu shows a spinner until it resolves.
 */
export default function DownloadMenu({
  label = 'Download',
  count,
  disabled,
  primary,
  onPick,
}: {
  label?: string;
  /** Shown as "(n)" after the label. */
  count?: number;
  disabled?: boolean;
  primary?: boolean;
  onPick: (format: ExportFormat) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const pick = async (format: ExportFormat) => {
    setBusy(format);
    try { await onPick(format); setOpen(false); }
    finally { setBusy(null); }
  };

  return (
    <div className="dl-menu" ref={ref}>
      <button
        type="button"
        className={`btn ${primary ? 'primary' : 'secondary'} sm`}
        disabled={disabled || !!busy}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {busy ? <ButtonSpinner /> : <Icon name="download" size={14} />}
        {label}{count !== undefined ? ` (${count})` : ''}
        <Icon name="chevronDown" size={13} style={{ marginLeft: 2, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
      </button>
      {open && (
        <div className="dl-menu-pop" role="menu">
          {OPTIONS.map((o) => (
            <button key={o.format} role="menuitem" type="button" className="dl-menu-item" disabled={!!busy} onClick={() => pick(o.format)}>
              <span className={`dl-menu-ext ${o.format}`}>{busy === o.format ? <ButtonSpinner /> : o.ext}</span>
              <span style={{ minWidth: 0 }}>
                <span className="dl-menu-title">{o.title}</span>
                <span className="dl-menu-desc">{o.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
