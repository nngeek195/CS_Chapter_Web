'use client';

import React from 'react';
import Icon, { IconName } from './Icon';

/** Bottom-right toast with an auto-shrinking timer bar. */
export function Toast({ msg, kind = 'ok', durationMs = 3500 }: { msg: string; kind?: 'ok' | 'error'; durationMs?: number }) {
  return (
    <div
      className={`admin-toast${kind === 'error' ? ' error' : ''}`}
      role={kind === 'error' ? 'alert' : 'status'}
      style={{ ['--toast-ms' as string]: `${durationMs}ms` }}
      key={msg}
    >
      <Icon name={kind === 'error' ? 'alert' : 'checkCircle'} size={18} />
      <span>{msg}</span>
    </div>
  );
}

/** Friendly empty state with a gently floating icon. */
export function EmptyState({ icon, title, children }: { icon: IconName; title: string; children?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <div className="icon-tile"><Icon name={icon} size={22} /></div>
      <h4>{title}</h4>
      {children && <p>{children}</p>}
    </div>
  );
}

/** Shimmering placeholder rows shown while data syncs. */
export function SkeletonList({ rows = 3, height = 72 }: { rows?: number; height?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height }} />
      ))}
    </div>
  );
}

/** Section heading with an icon tile. */
export function SectionHeader({
  icon,
  title,
  subtitle,
  tone,
  actions,
}: {
  icon: IconName;
  title: string;
  subtitle?: React.ReactNode;
  tone?: 'violet' | 'green' | 'amber' | 'red';
  actions?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
      <div className={`icon-tile${tone ? ` ${tone}` : ''}`}><Icon name={icon} size={20} /></div>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <h3 className="section-title">{title}</h3>
        {subtitle && <p className="section-sub">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Spinner sized for use inside buttons. */
export function ButtonSpinner() {
  return <span className="spinner" aria-hidden="true" />;
}

export interface PermissionDef {
  key: string;
  label: string;
  desc: string;
  icon: IconName;
}

/** Every permission that can be granted to a board member (icon-based, no emojis). */
export const PERMISSIONS: PermissionDef[] = [
  { key: 'events', label: 'Manage Events', desc: 'Create, edit and delete events', icon: 'calendar' },
  { key: 'leadership', label: 'Manage Leadership', desc: 'Edit committee members', icon: 'users' },
  { key: 'gallery', label: 'Manage Gallery', desc: 'Upload and delete photos', icon: 'image' },
  { key: 'resources', label: 'Manage Resources', desc: 'Add and edit resources', icon: 'book' },
  { key: 'messages', label: 'View Inquiries', desc: 'Read contact messages', icon: 'mail' },
  { key: 'volunteers', label: 'Manage Volunteer Calls', desc: 'Create recruitment forms and review applicants', icon: 'clipboard' },
  { key: 'board', label: 'Manage Board', desc: 'Invite and manage board members', icon: 'shield' },
];

export const permissionLabel = (key: string) => PERMISSIONS.find((p) => p.key === key)?.label || key;

/** Accessible checkbox grid for choosing permissions. */
export function PermissionPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '10px' }}>
      {PERMISSIONS.map((perm) => {
        const checked = value.includes(perm.key);
        return (
          <label key={perm.key} className={`perm-option${checked ? ' checked' : ''}`} style={{ position: 'relative' }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(e.target.checked ? [...value, perm.key] : value.filter((p) => p !== perm.key))}
            />
            <span className="perm-check"><Icon name="check" size={12} strokeWidth={3} /></span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: checked ? 'var(--blue)' : 'var(--ink)' }}>
                <Icon name={perm.icon} size={14} /> {perm.label}
              </span>
              <span style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', fontWeight: 400, marginTop: '2px' }}>{perm.desc}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** Initials avatar. */
export function Avatar({ name, size = 40, muted = false }: { name: string; size?: number; muted?: boolean }) {
  const initials = (name || '?').split(/\s+/).filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div
      className="portal-avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36), background: muted ? 'linear-gradient(135deg,#94a3b8,#cbd5e1)' : undefined }}
    >
      {initials}
    </div>
  );
}
