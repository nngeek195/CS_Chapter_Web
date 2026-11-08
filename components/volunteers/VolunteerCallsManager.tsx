'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/Portal';
import { BarList, ChartCard, DailyColumns, Kpi } from './Charts';
import CallEditor from './CallEditor';
import CallDetail, { CallStatusBadge } from './CallDetail';
import DownloadMenu from './DownloadMenu';
import { exportApplications } from '@/lib/volunteerExport';
import {
  Viewer,
  VolunteerApplication,
  VolunteerCall,
  deleteCall,
  perDay,
  subscribeManagedApplications,
  subscribeManagedCalls,
} from '@/lib/volunteers';

interface Props {
  viewer: Viewer;
  showToast: (msg: string, kind?: 'ok' | 'error') => void;
  describeError: (err: unknown) => Promise<string>;
}

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; id: string } | { kind: 'detail'; id: string };

/**
 * Volunteer calls workspace, shared by the admin portal (viewer.isAdmin → all calls)
 * and the member portal (only calls the member created). Data is live.
 */
export default function VolunteerCallsManager({ viewer, showToast, describeError }: Props) {
  const [calls, setCalls] = useState<VolunteerCall[] | null>(null);
  const [apps, setApps] = useState<VolunteerApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'draft' | 'closed'>('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const u1 = subscribeManagedCalls(viewer, (c) => { setCalls(c); setError(null); }, (e) => setError(e.message));
    const u2 = subscribeManagedApplications(viewer, null, setApps, (e) => setError(e.message));
    return () => { u1(); u2(); };
  }, [viewer.uid, viewer.isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const appsByCall = useMemo(() => {
    const m: Record<string, VolunteerApplication[]> = {};
    (apps || []).forEach((a) => { (m[a.callId] ||= []).push(a); });
    return m;
  }, [apps]);
  const callsById = useMemo(() => Object.fromEntries((calls || []).map((c) => [c.id, c])), [calls]);

  const owners = useMemo(() => {
    const m = new Map<string, string>();
    (calls || []).forEach((c) => m.set(c.createdBy, c.createdByName || c.createdByEmail || 'Unknown'));
    return Array.from(m.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [calls]);

  // If the selected call disappears (deleted elsewhere), go back to the list.
  useEffect(() => {
    if ((mode.kind === 'detail' || mode.kind === 'edit') && calls && !callsById[mode.id]) setMode({ kind: 'list' });
  }, [calls, callsById, mode]);

  if (error && !calls) {
    return (
      <div className="alert-box danger">
        <Icon name="alert" size={18} />
        <div><div className="alert-title">Volunteer calls could not be loaded</div>{error}</div>
      </div>
    );
  }

  if (mode.kind === 'create' || mode.kind === 'edit') {
    const call = mode.kind === 'edit' ? callsById[mode.id] : null;
    return (
      <CallEditor
        viewer={viewer}
        call={call}
        applicationCount={call ? (appsByCall[call.id] || []).length : 0}
        onCancel={() => setMode(call ? { kind: 'detail', id: call.id } : { kind: 'list' })}
        onSaved={(id) => setMode({ kind: 'detail', id })}
        showToast={showToast}
        describeError={describeError}
      />
    );
  }

  if (mode.kind === 'detail' && callsById[mode.id]) {
    const call = callsById[mode.id];
    return (
      <CallDetail
        viewer={viewer}
        call={call}
        apps={appsByCall[call.id] || []}
        appsLoading={apps === null}
        onBack={() => setMode({ kind: 'list' })}
        onEdit={() => setMode({ kind: 'edit', id: call.id })}
        onDelete={async () => { await deleteCall(viewer, call.id); showToast('Volunteer call deleted'); setMode({ kind: 'list' }); }}
        showToast={showToast}
        describeError={describeError}
      />
    );
  }

  // ── List + overview ──
  const loading = calls === null || apps === null;
  const scopedCalls = (calls || []).filter((c) => ownerFilter === 'all' || c.createdBy === ownerFilter);
  const scopedIds = new Set(scopedCalls.map((c) => c.id));
  const scopedApps = (apps || []).filter((a) => scopedIds.has(a.callId));
  const visible = scopedCalls
    .filter((c) => statusFilter === 'all' || c.status === statusFilter)
    .filter((c) => !search.trim() || c.title.toLowerCase().includes(search.trim().toLowerCase()));
  const week = 7 * 864e5;
  const openCount = scopedCalls.filter((c) => c.status === 'open').length;

  return (
    <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-head">
        <div>
          <h1>Volunteer calls</h1>
          <p>
            {viewer.isAdmin
              ? 'Recruitment forms from every board member. You can see and manage all of them.'
              : 'Your recruitment forms. Only you and the chapter admins can see these applicants.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <DownloadMenu
            label="Download all applications"
            disabled={scopedApps.length === 0}
            onPick={async (format) => {
              try {
                await exportApplications({
                  format,
                  kind: 'applicants',
                  apps: scopedApps,
                  callsById,
                  title: 'Volunteer applications — all calls',
                  scope: `${scopedCalls.length} call${scopedCalls.length === 1 ? '' : 's'}`,
                  filename: `volunteer-applications-${new Date().toISOString().slice(0, 10)}`,
                });
                showToast(`${format === 'pdf' ? 'PDF' : 'Excel sheet'} downloaded`);
              } catch (err) { showToast(`Could not create the file: ${await describeError(err)}`, 'error'); }
            }}
          />
          <button className="btn primary" onClick={() => setMode({ kind: 'create' })}><Icon name="plus" size={15} /> New call</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}
        </div>
      ) : (calls || []).length === 0 ? (
        <div className="admin-panel">
          <EmptyState icon="clipboard" title="No volunteer calls yet">
            Create a call to recruit an organising committee for your next event.
          </EmptyState>
          <div style={{ textAlign: 'center', paddingBottom: '24px' }}>
            <button className="btn primary" onClick={() => setMode({ kind: 'create' })}><Icon name="plus" size={15} /> Create your first call</button>
          </div>
        </div>
      ) : (
        <>
          {viewer.isAdmin && owners.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Icon name="filter" size={14} /> Board member</span>
              <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--white)', fontSize: '13px' }}>
                <option value="all">Everyone ({owners.length})</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <Kpi label="Open calls" value={openCount} hint={`${scopedCalls.length} calls in total`} icon={<span className="icon-tile green"><Icon name="clipboard" size={18} /></span>} />
            <Kpi label="Applications" value={scopedApps.length} hint={`${scopedApps.filter((a) => Date.now() - a.createdAt <= week).length} in the last 7 days`} icon={<span className="icon-tile"><Icon name="inbox" size={18} /></span>} />
            <Kpi label="Awaiting review" value={scopedApps.filter((a) => a.status === 'pending').length} icon={<span className="icon-tile amber"><Icon name="clock" size={18} /></span>} />
            <Kpi label="Volunteers selected" value={scopedApps.filter((a) => a.status === 'selected').length} icon={<span className="icon-tile violet"><Icon name="userCheck" size={18} /></span>} />
          </div>

          {scopedApps.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
              <ChartCard title="Applications per day" subtitle="All calls, last 30 days">
                <DailyColumns data={perDay(scopedApps, 30)} />
              </ChartCard>
              <ChartCard title="Applications by call">
                <BarList data={scopedCalls.map((c) => ({ label: c.title, value: (appsByCall[c.id] || []).length })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value)} />
              </ChartCard>
              {viewer.isAdmin && owners.length > 1 && ownerFilter === 'all' && (
                <ChartCard title="Applications by board member">
                  <BarList data={owners.map((o) => ({ label: o.name, value: scopedApps.filter((a) => callsById[a.callId]?.createdBy === o.id).length })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value)} />
                </ChartCard>
              )}
            </div>
          )}

          <div className="admin-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
              <div className="segmented" role="tablist">
                {(['all', 'open', 'draft', 'closed'] as const).map((s) => (
                  <button key={s} role="tab" aria-selected={statusFilter === s} className={statusFilter === s ? 'active' : ''} onClick={() => setStatusFilter(s)} style={{ textTransform: 'capitalize' }}>
                    {s} <span style={{ opacity: 0.7 }}>{s === 'all' ? scopedCalls.length : scopedCalls.filter((c) => c.status === s).length}</span>
                  </button>
                ))}
              </div>
              <div className="input-icon" style={{ flex: '1 1 220px' }}>
                <Icon name="search" size={15} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search calls" style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--paper)', fontSize: '13px', outline: 'none' }} />
              </div>
            </div>

            {visible.length === 0 ? (
              <EmptyState icon="filter" title="No calls match these filters" />
            ) : (
              <div className="vc-grid">
                {visible.map((c, i) => {
                  const list = appsByCall[c.id] || [];
                  const pending = list.filter((a) => a.status === 'pending').length;
                  const sel = list.filter((a) => a.status === 'selected').length;
                  const slots = c.positions.reduce((s, p) => s + (p.slots || 0), 0);
                  return (
                    <button key={c.id} className="admin-item-card vc-card anim-in" style={{ ['--i' as string]: i }} onClick={() => setMode({ kind: 'detail', id: c.id })}>
                      <div className="vc-card-poster">
                        {c.poster ? <img src={c.poster} alt="" loading="lazy" /> : (
                          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.5)' }}><Icon name="clipboard" size={36} /></div>
                        )}
                        <span style={{ position: 'absolute', top: '10px', left: '10px' }}><CallStatusBadge call={c} /></span>
                      </div>
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, width: '100%' }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)' }}>{c.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.summary}</div>
                        {viewer.isAdmin && <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Icon name="users" size={12} /> {c.createdByName || c.createdByEmail}</div>}
                        <div style={{ display: 'flex', gap: '16px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--line)', fontSize: '12px', color: 'var(--muted)' }}>
                          <span><strong style={{ color: 'var(--ink)', fontSize: '15px' }}>{list.length}</strong> applied</span>
                          <span><strong style={{ color: 'var(--ink)', fontSize: '15px' }}>{pending}</strong> to review</span>
                          <span><strong style={{ color: 'var(--ink)', fontSize: '15px' }}>{sel}</strong>{slots ? ` / ${slots}` : ''} selected</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
