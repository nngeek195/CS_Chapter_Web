'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/Icon';
import { Avatar, ButtonSpinner, EmptyState } from '@/components/ui/Portal';
import { BarList, ChartCard, DailyColumns, Kpi, SlotMeter, StatusBar } from './Charts';
import DownloadMenu from './DownloadMenu';
import { ExportFormat, ExportKind, exportApplications } from '@/lib/volunteerExport';
import {
  APPLICATION_STATUSES,
  ApplicationStatus,
  CallStatus,
  TeamRole,
  Viewer,
  VolunteerApplication,
  VolunteerCall,
  countBy,
  deleteApplication,
  isAcceptingApplications,
  perDay,
  positionName,
  reviewApplication,
  setCallStatus,
} from '@/lib/volunteers';

interface Props {
  viewer: Viewer;
  call: VolunteerCall;
  apps: VolunteerApplication[];
  appsLoading: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  showToast: (msg: string, kind?: 'ok' | 'error') => void;
  describeError: (err: unknown) => Promise<string>;
}

type View = 'dashboard' | 'applicants' | 'team';

const STATUS_BADGE: Record<ApplicationStatus, string> = { pending: 'blue', shortlisted: 'amber', selected: 'green', rejected: 'red' };
export const statusLabel = (s: ApplicationStatus) => APPLICATION_STATUSES.find((x) => x.key === s)?.label || s;

export function CallStatusBadge({ call }: { call: VolunteerCall }) {
  if (call.status === 'draft') return <span className="badge">Draft</span>;
  if (call.status === 'closed') return <span className="badge amber">Closed</span>;
  if (!isAcceptingApplications(call)) return <span className="badge amber">Deadline passed</span>;
  return <span className="badge green"><span className="status-dot pulse" /> Open</span>;
}

const fmtDate = (ms?: number | null) => (ms ? new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
function timeAgo(ms: number) {
  const m = Math.round((Date.now() - ms) / 6e4);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d} day${d === 1 ? '' : 's'} ago` : new Date(ms).toLocaleDateString();
}

function deadlineText(call: VolunteerCall) {
  if (call.status === 'draft') return 'Draft';
  if (call.status === 'closed') return 'Closed';
  if (!call.deadlineAt) return 'No deadline';
  const ms = call.deadlineAt - Date.now();
  if (ms <= 0) return 'Deadline passed';
  const h = Math.floor(ms / 36e5);
  if (h < 1) return 'In under an hour';
  if (h < 48) return `In ${h} hour${h === 1 ? '' : 's'}`;
  return `In ${Math.floor(h / 24)} days`;
}
const roleLabel = (r?: string) => (r === 'lead' ? 'Lead' : r === 'either' ? 'Lead or member' : 'Member');

export default function CallDetail({ viewer, call, apps, appsLoading, onBack, onEdit, onDelete, showToast, describeError }: Props) {
  const [view, setView] = useState<View>('dashboard');
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  // Order of the list the drawer was opened from, for previous / next.
  const [navIds, setNavIds] = useState<string[]>([]);
  const open = (id: string, ids: string[]) => { setNavIds(ids); setOpenId(id); };

  const fail = async (prefix: string, err: unknown) => showToast(`${prefix}: ${await describeError(err)}`, 'error');

  const changeStatus = async (status: CallStatus, msg: string) => {
    setBusy(`status-${status}`);
    try { await setCallStatus(call.id, status); showToast(msg); }
    catch (err) { await fail('Could not update the call', err); }
    finally { setBusy(null); }
  };

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/volunteer/${call.id}` : `/volunteer/${call.id}`;
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(publicUrl); showToast('Application link copied'); }
    catch { showToast(publicUrl); }
  };

  const runExport = async (format: ExportFormat, kind: ExportKind, rows: VolunteerApplication[], scope: string) => {
    if (rows.length === 0) { showToast('There is nothing to download yet.', 'error'); return; }
    try {
      await exportApplications({
        format,
        kind,
        apps: rows,
        callsById: { [call.id]: call },
        title: kind === 'team' ? `${call.title} — Selected team` : `${call.title} — Applicants`,
        scope,
        filename: `${call.title}-${kind === 'team' ? 'selected-team' : 'applicants'}-${new Date().toISOString().slice(0, 10)}`,
      });
      showToast(`${format === 'pdf' ? 'PDF' : 'Excel sheet'} downloaded`);
    } catch (err) { await fail('Could not create the file', err); }
  };

  const selected = apps.filter((a) => a.status === 'selected');
  const openApp = apps.find((a) => a.id === openId) || null;
  const navIndex = openApp ? navIds.indexOf(openApp.id) : -1;
  const prevId = navIndex > 0 ? navIds[navIndex - 1] : null;
  const nextId = navIndex >= 0 && navIndex < navIds.length - 1 ? navIds[navIndex + 1] : null;
  const slotsTotal = call.positions.reduce((n, p) => n + (p.slots || 0), 0);
  const count = (s: ApplicationStatus) => apps.filter((a) => a.status === s).length;

  return (
    <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="admin-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '20px', padding: '22px 24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {call.poster ? (
            <img src={call.poster} alt="" style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '12px', flexShrink: 0 }} />
          ) : (
            <div className="icon-tile lg" style={{ width: '90px', height: '90px', borderRadius: '16px' }}><Icon name="clipboard" size={34} /></div>
          )}
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <button className="btn secondary sm" onClick={onBack} style={{ marginBottom: '10px' }}><Icon name="arrowLeft" size={14} /> All calls</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, font: '700 22px/1.25 Montserrat, sans-serif', color: 'var(--ink)' }}>{call.title}</h1>
              <CallStatusBadge call={call} />
            </div>
            <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: '14px' }}>{call.summary}</p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px', fontSize: '12px', color: 'var(--muted)' }}>
              {call.deadlineAt && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Icon name="clock" size={13} /> Closes {fmtDate(call.deadlineAt)}</span>}
              {call.eventDate && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Icon name="calendar" size={13} /> Event {call.eventDate}</span>}
              {viewer.isAdmin && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Icon name="users" size={13} /> Owner: {call.createdByName || call.createdByEmail}</span>}
            </div>
          </div>
        </div>
        <div className="call-stats">
          <div><span>Applications</span><strong>{apps.length}</strong></div>
          <div><span>Awaiting review</span><strong className={count('pending') ? 'warn' : ''}>{count('pending')}</strong></div>
          <div><span>Shortlisted</span><strong>{count('shortlisted')}</strong></div>
          <div><span>Selected</span><strong className="ok">{selected.length}{slotsTotal ? <small> / {slotsTotal}</small> : null}</strong></div>
          <div><span>{call.status === 'open' ? 'Closes' : 'Status'}</span><strong className="sm">{deadlineText(call)}</strong></div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '12px 24px', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
          {call.status === 'draft' && (
            <button className="btn primary sm" disabled={!!busy} onClick={() => changeStatus('open', 'Call published — applications are open')}>
              {busy === 'status-open' ? <ButtonSpinner /> : <Icon name="send" size={14} />} Publish
            </button>
          )}
          {call.status === 'open' && (
            <button className="btn secondary sm" disabled={!!busy} onClick={() => confirm('Stop accepting applications? You can reopen later.') && changeStatus('closed', 'Applications closed')}>
              {busy === 'status-closed' ? <ButtonSpinner /> : <Icon name="pause" size={14} />} Close applications
            </button>
          )}
          {call.status === 'closed' && (
            <button className="btn secondary sm" disabled={!!busy} onClick={() => changeStatus('open', 'Applications reopened')}>
              {busy === 'status-open' ? <ButtonSpinner /> : <Icon name="play" size={14} />} Reopen
            </button>
          )}
          {call.status !== 'draft' && (
            <>
              <button className="btn secondary sm" onClick={copyLink}><Icon name="copy" size={14} /> Copy application link</button>
              <a className="btn secondary sm" href={`/volunteer/${call.id}`} target="_blank" rel="noopener noreferrer"><Icon name="external" size={14} /> View public page</a>
            </>
          )}
          <button className="btn secondary sm" onClick={onEdit}><Icon name="pencil" size={14} /> Edit form</button>
          {call.status !== 'draft' && (
            <button className="btn secondary sm" disabled={!!busy} onClick={() => confirm('Unpublish this call? It will disappear from the website.') && changeStatus('draft', 'Call moved back to draft')}>
              <Icon name="eyeOff" size={14} /> Unpublish
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button
            className="btn ghost-danger sm"
            disabled={!!busy}
            onClick={async () => {
              if (!confirm(`Delete "${call.title}" and all ${apps.length} applications? This cannot be undone.`)) return;
              setBusy('delete');
              try { await onDelete(); } catch (err) { await fail('Could not delete the call', err); setBusy(null); }
            }}
          >
            {busy === 'delete' ? <ButtonSpinner /> : <Icon name="trash" size={14} />} Delete
          </button>
        </div>
      </div>

      {/* View switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div className="segmented" role="tablist">
          <button role="tab" aria-selected={view === 'dashboard'} className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}><Icon name="chart" size={14} /> Dashboard</button>
          <button role="tab" aria-selected={view === 'applicants'} className={view === 'applicants' ? 'active' : ''} onClick={() => setView('applicants')}><Icon name="list" size={14} /> Applicants ({apps.length})</button>
          <button role="tab" aria-selected={view === 'team'} className={view === 'team' ? 'active' : ''} onClick={() => setView('team')}><Icon name="userCheck" size={14} /> Selected team ({selected.length})</button>
        </div>
        <DownloadMenu label="Download all" count={apps.length} disabled={apps.length === 0} onPick={(f) => runExport(f, 'applicants', apps, 'All applicants')} />
      </div>

      {appsLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}
        </div>
      ) : view === 'dashboard' ? (
        <Dashboard call={call} apps={apps} onOpen={open} />
      ) : view === 'applicants' ? (
        <Applicants call={call} apps={apps} viewer={viewer} onOpen={open} onExport={(f, rows, scope) => runExport(f, 'applicants', rows, scope)} showToast={showToast} fail={fail} />
      ) : (
        <Team call={call} apps={selected} onOpen={open} onExport={(f) => runExport(f, 'team', selected, 'Selected volunteers by position')} showToast={showToast} />
      )}

      {openApp && (
        <ApplicantDrawer
          key={openApp.id}
          call={call}
          app={openApp}
          viewer={viewer}
          onClose={() => setOpenId(null)}
          onPrev={prevId ? () => setOpenId(prevId) : undefined}
          onNext={nextId ? () => setOpenId(nextId) : undefined}
          position={navIndex >= 0 ? `${navIndex + 1} of ${navIds.length}` : undefined}
          showToast={showToast}
          fail={fail}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────
function Dashboard({ call, apps, onOpen }: { call: VolunteerCall; apps: VolunteerApplication[]; onOpen: (id: string, ids: string[]) => void }) {
  const stats = useMemo(() => {
    const now = Date.now();
    const week = 7 * 864e5;
    const last7 = apps.filter((a) => now - a.createdAt <= week).length;
    const prev7 = apps.filter((a) => now - a.createdAt > week && now - a.createdAt <= 2 * week).length;
    const days = Math.min(60, Math.max(14, Math.ceil((now - (call.createdAt || now)) / 864e5) + 1));
    const byStatus = APPLICATION_STATUSES.map((s) => ({ key: s.key, label: s.label, value: apps.filter((a) => a.status === s.key).length }));
    const anyPref = countBy(apps, (a) => a.positions);
    const firstPref = countBy(apps, (a) => a.positions?.[0]);
    const positions = call.positions.map((p) => ({
      label: p.name,
      value: anyPref.find((x) => x.label === p.id)?.value || 0,
      sub: `${firstPref.find((x) => x.label === p.id)?.value || 0} as 1st choice`,
    })).sort((a, b) => b.value - a.value);
    const slotsTotal = call.positions.reduce((s, p) => s + (p.slots || 0), 0);
    const selected = apps.filter((a) => a.status === 'selected');
    const leadInterest = apps.filter((a) => a.preferredRole === 'lead' || a.preferredRole === 'either').length;
    const questionCharts = call.questions
      .filter((q) => q.type === 'single' || q.type === 'multi' || q.type === 'yesno')
      .map((q) => ({ q, data: countBy(apps, (a) => a.answers?.[q.id] as string | string[] | undefined) }));
    return {
      last7, prev7, days, byStatus, positions, slotsTotal, selected, leadInterest, questionCharts,
      faculty: countBy(apps, (a) => a.faculty),
      year: countBy(apps, (a) => a.academicYear),
      daily: perDay(apps, days),
      pending: apps.filter((a) => a.status === 'pending').length,
      recent: [...apps].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6),
    };
  }, [apps, call]);

  if (apps.length === 0) {
    return (
      <div className="admin-panel">
        <EmptyState icon="chart" title="No applications yet">
          {call.status === 'draft' ? 'Publish the call to start collecting applications.' : 'Share the application link — charts appear here as soon as people apply.'}
        </EmptyState>
      </div>
    );
  }

  const delta = stats.last7 - stats.prev7;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <Kpi label="Total applications" value={apps.length} icon={<span className="icon-tile"><Icon name="inbox" size={18} /></span>} />
        <Kpi
          label="Last 7 days"
          value={stats.last7}
          icon={<span className="icon-tile violet"><Icon name="chart" size={18} /></span>}
          hint={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: delta > 0 ? '#047857' : delta < 0 ? '#b91c1c' : 'var(--muted)' }}>
              {delta !== 0 && <Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} size={12} />}
              {delta === 0 ? 'Same as the week before' : `${Math.abs(delta)} ${delta > 0 ? 'more' : 'fewer'} than the week before`}
            </span>
          }
        />
        <Kpi
          label="Selected"
          value={stats.slotsTotal ? <>{stats.selected.length}<span style={{ fontSize: '15px', color: 'var(--muted)' }}> / {stats.slotsTotal}</span></> : stats.selected.length}
          icon={<span className="icon-tile green"><Icon name="userCheck" size={18} /></span>}
          hint={stats.slotsTotal ? `${Math.max(0, stats.slotsTotal - stats.selected.length)} places left` : 'No fixed team size'}
        />
        <Kpi label="Awaiting review" value={stats.pending} icon={<span className="icon-tile amber"><Icon name="clock" size={18} /></span>} hint={`${stats.leadInterest} interested in leading`} />
      </div>

      <div className="dash-split">
        <ChartCard title="Applications per day" subtitle={`Last ${stats.days} days`}>
          <DailyColumns data={stats.daily} />
        </ChartCard>
        <ChartCard title="Latest applications" subtitle="Click to review">
          <div className="recent-list">
            {stats.recent.map((a) => (
              <button key={a.id} type="button" onClick={() => onOpen(a.id, stats.recent.map((r) => r.id))}>
                <Avatar name={a.name} size={30} muted={a.status === 'rejected'} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{a.name}</strong>
                  <small>{positionName(call, a.positions?.[0]) || '—'} · {timeAgo(a.createdAt)}</small>
                </span>
                <span className={`badge ${STATUS_BADGE[a.status]}`}>{statusLabel(a.status)}</span>
              </button>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Review progress" subtitle="Where every application currently stands">
        <StatusBar segments={stats.byStatus} />
      </ChartCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        <ChartCard title="Interest by position" subtitle="Applicants who listed the position in any preference">
          <BarList data={stats.positions} total={apps.length} />
        </ChartCard>
        <ChartCard title="Team filling" subtitle="Selected volunteers against the number needed">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {call.positions.map((p) => {
              const filled = stats.selected.filter((a) => a.assignedPosition === p.id).length;
              const leads = stats.selected.filter((a) => a.assignedPosition === p.id && a.assignedRole === 'lead').length;
              return (
                <div key={p.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <strong style={{ color: 'var(--ink)' }}>{p.name}</strong>
                    {p.leadRole && <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{leads ? `${leads} lead` : 'No lead yet'}</span>}
                  </div>
                  {p.slots ? <SlotMeter filled={filled} target={p.slots} /> : <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{filled} selected · no fixed size</div>}
                </div>
              );
            })}
          </div>
        </ChartCard>
        <ChartCard title="Faculty"><BarList data={stats.faculty} total={apps.length} /></ChartCard>
        <ChartCard title="Academic year"><BarList data={stats.year} total={apps.length} /></ChartCard>
        {stats.questionCharts.map(({ q, data }) => (
          <ChartCard key={q.id} title={q.label} subtitle={q.type === 'multi' ? 'Applicants could pick several' : 'Answers'}>
            <BarList data={data} total={apps.length} emptyText="No answers yet" />
          </ChartCard>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Applicants table
// ─────────────────────────────────────────────────────────────
type Fail = (prefix: string, err: unknown) => Promise<void>;

function Applicants({
  call, apps, viewer, onOpen, onExport, showToast, fail,
}: {
  call: VolunteerCall;
  apps: VolunteerApplication[];
  viewer: Viewer;
  onOpen: (id: string, ids: string[]) => void;
  onExport: (format: ExportFormat, rows: VolunteerApplication[], scope: string) => Promise<void>;
  showToast: (m: string, k?: 'ok' | 'error') => void;
  fail: Fail;
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | ApplicationStatus>('all');
  const [position, setPosition] = useState('all');
  const [faculty, setFaculty] = useState('all');
  const [year, setYear] = useState('all');
  const [lead, setLead] = useState(false);
  const [sort, setSort] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<string | null>(null);

  const faculties = useMemo(() => Array.from(new Set(apps.map((a) => a.faculty).filter(Boolean) as string[])).sort(), [apps]);
  const years = useMemo(() => Array.from(new Set(apps.map((a) => a.academicYear).filter(Boolean) as string[])).sort(), [apps]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps
      .filter((a) => status === 'all' || a.status === status)
      .filter((a) => position === 'all' || a.positions?.includes(position) || a.assignedPosition === position)
      .filter((a) => faculty === 'all' || a.faculty === faculty)
      .filter((a) => year === 'all' || a.academicYear === year)
      .filter((a) => !lead || a.preferredRole === 'lead' || a.preferredRole === 'either')
      .filter((a) => !q || [a.name, a.email, a.studentId, a.phone, a.faculty].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'oldest' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt));
  }, [apps, search, status, position, faculty, year, lead, sort]);

  // Drop ticks for applications that disappeared (deleted elsewhere).
  useEffect(() => {
    setPicked((prev) => {
      const ids = new Set(apps.map((a) => a.id));
      const next = new Set(Array.from(prev).filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [apps]);

  const filtersOn = search || status !== 'all' || position !== 'all' || faculty !== 'all' || year !== 'all' || lead;
  const clearFilters = () => { setSearch(''); setStatus('all'); setPosition('all'); setFaculty('all'); setYear('all'); setLead(false); };

  const scope = [
    status !== 'all' && statusLabel(status),
    position !== 'all' && `Position: ${positionName(call, position)}`,
    faculty !== 'all' && `Faculty: ${faculty}`,
    year !== 'all' && year,
    lead && 'Interested in leading',
    search.trim() && `Search: "${search.trim()}"`,
  ].filter(Boolean).join(', ');

  const allVisiblePicked = rows.length > 0 && rows.every((r) => picked.has(r.id));
  const toggleAll = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      rows.forEach((r) => (allVisiblePicked ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const pickedApps = apps.filter((a) => picked.has(a.id));

  const bulk = async (to: ApplicationStatus, label: string) => {
    const targets = pickedApps.filter((a) => a.status !== to);
    if (targets.length === 0) { showToast(`All picked applicants are already ${label.toLowerCase()}.`); return; }
    if (to === 'rejected' && !confirm(`Mark ${targets.length} applicant${targets.length === 1 ? '' : 's'} as not selected?`)) return;
    setBulkBusy(to);
    try {
      const clear = to === 'rejected' || to === 'pending';
      await Promise.all(targets.map((a) => reviewApplication(a.id, clear ? { status: to, assignedPosition: undefined, assignedRole: undefined } : { status: to }, viewer)));
      showToast(`${targets.length} applicant${targets.length === 1 ? '' : 's'} → ${label}`);
      setPicked(new Set());
    } catch (err) { await fail('Some applicants could not be updated', err); }
    finally { setBulkBusy(null); }
  };

  const copyPickedEmails = async () => {
    try { await navigator.clipboard.writeText(pickedApps.map((a) => a.email).join(', ')); showToast(`${pickedApps.length} email addresses copied`); }
    catch { showToast('Could not access the clipboard', 'error'); }
  };

  if (apps.length === 0) {
    return <div className="admin-panel"><EmptyState icon="inbox" title="No applicants yet">Applications appear here in real time.</EmptyState></div>;
  }

  const selectStyle: React.CSSProperties = { padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--paper)', fontSize: '13px' };
  const ids = rows.map((r) => r.id);

  return (
    <div className="admin-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
        <div className="input-icon" style={{ flex: '1 1 220px' }}>
          <Icon name="search" size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, student ID…" style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--paper)', fontSize: '13px', outline: 'none' }} />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort" style={selectStyle}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
        </select>
        <DownloadMenu label="Download view" count={rows.length} disabled={rows.length === 0} onPick={(f) => onExport(f, rows, scope || 'All applicants')} />
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
        <Icon name="filter" size={14} style={{ color: 'var(--muted)' }} />
        <select value={position} onChange={(e) => setPosition(e.target.value)} aria-label="Filter by position" style={selectStyle}>
          <option value="all">All positions</option>
          {call.positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {faculties.length > 1 && (
          <select value={faculty} onChange={(e) => setFaculty(e.target.value)} aria-label="Filter by faculty" style={selectStyle}>
            <option value="all">All faculties</option>
            {faculties.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
        {years.length > 1 && (
          <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Filter by academic year" style={selectStyle}>
            <option value="all">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        <label className={`chip-toggle${lead ? ' on' : ''}`}>
          <input type="checkbox" checked={lead} onChange={(e) => setLead(e.target.checked)} />
          <Icon name="award" size={13} /> Wants to lead
        </label>
        {filtersOn && <button className="btn secondary sm" onClick={clearFilters}><Icon name="x" size={13} /> Clear filters</button>}
      </div>

      <div className="segmented" style={{ marginBottom: '14px' }} role="tablist">
        {(['all', ...APPLICATION_STATUSES.map((s) => s.key)] as const).map((s) => (
          <button key={s} role="tab" aria-selected={status === s} className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>
            {s === 'all' ? 'All' : statusLabel(s)} <span style={{ opacity: 0.7 }}>{s === 'all' ? apps.length : apps.filter((a) => a.status === s).length}</span>
          </button>
        ))}
      </div>

      {picked.size > 0 && (
        <div className="bulk-bar" role="toolbar" aria-label="Bulk actions">
          <strong>{picked.size} picked</strong>
          <button className="btn secondary sm" disabled={!!bulkBusy} onClick={() => bulk('shortlisted', 'Shortlisted')}>
            {bulkBusy === 'shortlisted' ? <ButtonSpinner /> : <Icon name="star" size={14} />} Shortlist
          </button>
          <button className="btn secondary sm" disabled={!!bulkBusy} onClick={() => bulk('rejected', 'Not selected')}>
            {bulkBusy === 'rejected' ? <ButtonSpinner /> : <Icon name="x" size={14} />} Not selected
          </button>
          <button className="btn secondary sm" disabled={!!bulkBusy} onClick={() => bulk('pending', 'Pending')}>
            {bulkBusy === 'pending' ? <ButtonSpinner /> : <Icon name="replace" size={14} />} Back to pending
          </button>
          <button className="btn secondary sm" onClick={copyPickedEmails}><Icon name="mail" size={14} /> Copy emails</button>
          <DownloadMenu label="Download picked" onPick={(f) => onExport(f, pickedApps, `${pickedApps.length} hand-picked applicants`)} />
          <span style={{ flex: 1 }} />
          <button className="btn secondary sm" onClick={() => setPicked(new Set())}>Clear</button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState icon="filter" title="No applicants match these filters">
          <button className="btn secondary sm" onClick={clearFilters} style={{ marginTop: 10 }}>Clear filters</button>
        </EmptyState>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" className="row-check" aria-label="Pick all shown" checked={allVisiblePicked} onChange={toggleAll} />
                </th>
                <th>Applicant</th>
                <th>Preferences</th>
                <th>Faculty / year</th>
                <th>Applied</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} onClick={() => onOpen(a.id, ids)} className={picked.has(a.id) ? 'row-picked' : ''} style={{ cursor: 'pointer' }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="row-check" aria-label={`Pick ${a.name}`} checked={picked.has(a.id)} onChange={() => toggle(a.id)} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Avatar name={a.name} size={32} muted={a.status === 'rejected'} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{a.name}</div>
                        <div style={{ color: 'var(--muted)', fontSize: '12px' }}>{a.email}</div>
                        {a.studentId && <div style={{ color: 'var(--muted)', fontSize: '11px' }}>{a.studentId}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    {(a.positions || []).map((p, i) => (
                      <div key={p} style={{ fontSize: '12px', color: i === 0 ? 'var(--ink)' : 'var(--muted)', fontWeight: i === 0 ? 600 : 400 }}>
                        {i + 1}. {positionName(call, p)}
                      </div>
                    ))}
                    {a.preferredRole && a.preferredRole !== 'member' && <span className="badge violet plain" style={{ marginTop: '4px' }}>{roleLabel(a.preferredRole)}</span>}
                  </td>
                  <td style={{ fontSize: '12px' }}>
                    <div>{a.faculty || '—'}</div>
                    <div style={{ color: 'var(--muted)' }}>{a.academicYear}</div>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }} title={fmtDate(a.createdAt)}>{timeAgo(a.createdAt)}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[a.status]}`}>{statusLabel(a.status)}</span>
                    {a.status === 'selected' && a.assignedPosition && (
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                        {positionName(call, a.assignedPosition)} · {a.assignedRole === 'lead' ? 'Lead' : 'Member'}
                      </div>
                    )}
                    {a.notes && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }} title={a.notes}><Icon name="pencil" size={10} /> Has notes</div>}
                  </td>
                  <td><Icon name="chevronRight" size={16} style={{ color: 'var(--muted)' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px' }}>
            Showing {rows.length} of {apps.length} applicant{apps.length === 1 ? '' : 's'}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Selected team
// ─────────────────────────────────────────────────────────────
function Team({ call, apps, onOpen, onExport, showToast }: { call: VolunteerCall; apps: VolunteerApplication[]; onOpen: (id: string, ids: string[]) => void; onExport: (format: ExportFormat) => Promise<void>; showToast: (m: string) => void }) {
  if (apps.length === 0) {
    return <div className="admin-panel"><EmptyState icon="userCheck" title="Nobody selected yet">Open an applicant and choose “Select” to build the team.</EmptyState></div>;
  }
  const groups = [
    ...call.positions.map((p) => ({ id: p.id, name: p.name, slots: p.slots || 0, members: apps.filter((a) => a.assignedPosition === p.id) })),
    { id: '__none', name: 'Position not assigned', slots: 0, members: apps.filter((a) => !a.assignedPosition || !call.positions.some((p) => p.id === a.assignedPosition)) },
  ].filter((g) => g.members.length > 0 || g.id !== '__none');

  const teamIds = groups.flatMap((g) => [...g.members].sort((a, b) => (a.assignedRole === 'lead' ? -1 : 0) - (b.assignedRole === 'lead' ? -1 : 0)).map((a) => a.id));
  const copyEmails = async () => {
    try { await navigator.clipboard.writeText(apps.map((a) => a.email).join(', ')); showToast(`${apps.length} email addresses copied`); }
    catch { showToast('Could not access the clipboard'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button className="btn secondary sm" onClick={copyEmails}><Icon name="mail" size={14} /> Copy all emails</button>
        <DownloadMenu label="Download team" count={apps.length} primary onPick={onExport} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {groups.map((g, gi) => {
          const sorted = [...g.members].sort((a, b) => (a.assignedRole === 'lead' ? -1 : 0) - (b.assignedRole === 'lead' ? -1 : 0));
          return (
            <div key={g.id} className="admin-panel anim-in" style={{ ['--i' as string]: gi, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, font: '700 15px Montserrat, sans-serif' }}>{g.name}</h4>
                <span className="badge plain">{g.members.length}{g.slots ? ` / ${g.slots}` : ''}</span>
              </div>
              {g.slots > 0 && <div style={{ marginBottom: '12px' }}><SlotMeter filled={g.members.length} target={g.slots} /></div>}
              {sorted.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>No one assigned yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sorted.map((a) => (
                    <button key={a.id} onClick={() => onOpen(a.id, teamIds)} className="nav-card" style={{ padding: '10px 12px', gap: '10px' }}>
                      <Avatar name={a.name} size={32} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="nav-card-title" style={{ fontSize: '13px' }}>{a.name}</span>
                        <span className="nav-card-desc">{a.email}{a.phone ? ` · ${a.phone}` : ''}</span>
                      </span>
                      {a.assignedRole === 'lead' && <span className="badge violet"><Icon name="award" size={11} /> Lead</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Applicant drawer (details + review)
// ─────────────────────────────────────────────────────────────
function ApplicantDrawer({
  call, app, viewer, onClose, onPrev, onNext, position: navLabel, showToast, fail,
}: {
  call: VolunteerCall; app: VolunteerApplication; viewer: Viewer; onClose: () => void;
  onPrev?: () => void; onNext?: () => void; position?: string;
  showToast: (m: string, k?: 'ok' | 'error') => void; fail: (p: string, e: unknown) => Promise<void>;
}) {
  const [assignedPosition, setAssignedPosition] = useState(app.assignedPosition || app.positions?.[0] || '');
  const [assignedRole, setAssignedRole] = useState<TeamRole>(app.assignedRole || (app.preferredRole === 'lead' ? 'lead' : 'member'));
  const [notes, setNotes] = useState(app.notes || '');
  const [busy, setBusy] = useState<string | null>(null);

  const save = async (status: ApplicationStatus, msg: string) => {
    setBusy(status);
    try {
      await reviewApplication(
        app.id,
        status === 'selected'
          ? { status, assignedPosition, assignedRole, notes }
          : { status, notes, assignedPosition: status === 'rejected' || status === 'pending' ? undefined : app.assignedPosition, assignedRole: status === 'rejected' || status === 'pending' ? undefined : app.assignedRole },
        viewer
      );
      showToast(msg);
    } catch (err) { await fail('Could not update the applicant', err); }
    finally { setBusy(null); }
  };

  const remove = async () => {
    if (!confirm(`Delete ${app.name}'s application permanently?`)) return;
    setBusy('delete');
    try { await deleteApplication(app.id); showToast('Application deleted'); onClose(); }
    catch (err) { await fail('Could not delete the application', err); setBusy(null); }
  };

  const position = call.positions.find((p) => p.id === assignedPosition);

  // Esc closes; ← / → step through the list (not while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === 'Escape') onClose();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext) onNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Application from ${app.name}`}>
        <div className="drawer-head">
          <Avatar name={app.name} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--ink)' }}>{app.name}</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
              <span className={`badge ${STATUS_BADGE[app.status]}`}>{statusLabel(app.status)}</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Applied {fmtDate(app.createdAt)}</span>
            </div>
          </div>
          {(onPrev || onNext) && (
            <div className="drawer-nav">
              <button className="icon-btn" onClick={onPrev} disabled={!onPrev} aria-label="Previous applicant" title="Previous (←)"><Icon name="arrowLeft" size={15} /></button>
              {navLabel && <span>{navLabel}</span>}
              <button className="icon-btn" onClick={onNext} disabled={!onNext} aria-label="Next applicant" title="Next (→)"><Icon name="arrowRight" size={15} /></button>
            </div>
          )}
          <button className="modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>

        <div className="drawer-body">
          <h5 style={{ margin: '0 0 10px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>Contact</h5>
          <dl className="kv">
            <dt>Email</dt><dd><a href={`mailto:${app.email}`} style={{ color: 'var(--blue)' }}>{app.email}</a></dd>
            <dt>Phone</dt><dd>{app.phone ? <a href={`tel:${app.phone}`} style={{ color: 'var(--blue)' }}>{app.phone}</a> : '—'}</dd>
            <dt>Student ID</dt><dd>{app.studentId || '—'}</dd>
            <dt>Faculty</dt><dd>{app.faculty || '—'}</dd>
            <dt>Academic year</dt><dd>{app.academicYear || '—'}</dd>
          </dl>

          <h5 style={{ margin: '22px 0 10px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>Preferences</h5>
          <dl className="kv">
            {(app.positions || []).map((p, i) => (<React.Fragment key={p}><dt>{i + 1}. choice</dt><dd>{positionName(call, p)}</dd></React.Fragment>))}
            <dt>Role</dt><dd>{roleLabel(app.preferredRole)}</dd>
          </dl>

          {call.questions.length > 0 && (
            <>
              <h5 style={{ margin: '22px 0 10px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>Answers</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {call.questions.map((q) => {
                  const v = app.answers?.[q.id];
                  const text = Array.isArray(v) ? v.join(', ') : v;
                  return (
                    <div key={q.id}>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>{q.label}</div>
                      <div style={{ fontSize: '14px', color: text ? 'var(--ink)' : 'var(--muted)', whiteSpace: 'pre-wrap', marginTop: '2px' }}>{text || 'No answer'}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="admin-subcard admin-form" style={{ marginTop: '24px', padding: '16px' }}>
            <h5 style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--ink)' }}>Review</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Assign to position</label>
                <select value={assignedPosition} onChange={(e) => setAssignedPosition(e.target.value)}>
                  {call.positions.map((p) => <option key={p.id} value={p.id}>{p.name}{app.positions?.includes(p.id) ? '' : ' (not chosen)'}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Role</label>
                <select value={assignedRole} onChange={(e) => setAssignedRole(e.target.value as TeamRole)} disabled={!position?.leadRole}>
                  <option value="member">Team member</option>
                  {position?.leadRole && <option value="lead">Team lead</option>}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ margin: '12px 0 0' }}>
              <label>Private notes</label>
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only visible to reviewers" maxLength={2000} />
            </div>
          </div>
          {app.reviewedBy && (
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px' }}>Last reviewed by {app.reviewedBy} · {fmtDate(app.reviewedAt)}</div>
          )}
        </div>

        <div className="drawer-foot">
          <button className="btn primary sm" disabled={!!busy || !assignedPosition} onClick={() => save('selected', `${app.name} selected for ${position?.name || 'the team'}`)}>
            {busy === 'selected' ? <ButtonSpinner /> : <Icon name="userCheck" size={14} />} {app.status === 'selected' ? 'Update selection' : 'Select'}
          </button>
          <button className="btn secondary sm" disabled={!!busy || app.status === 'shortlisted'} onClick={() => save('shortlisted', `${app.name} shortlisted`)}>
            {busy === 'shortlisted' ? <ButtonSpinner /> : <Icon name="star" size={14} />} Shortlist
          </button>
          <button className="btn secondary sm" disabled={!!busy || app.status === 'rejected'} onClick={() => save('rejected', `${app.name} marked as not selected`)}>
            {busy === 'rejected' ? <ButtonSpinner /> : <Icon name="x" size={14} />} Not selected
          </button>
          {app.status !== 'pending' && (
            <button className="btn secondary sm" disabled={!!busy} onClick={() => save('pending', `${app.name} moved back to pending`)}>
              <Icon name="replace" size={14} /> Reset
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button className="btn ghost-danger icon-only sm" disabled={!!busy} onClick={remove} aria-label="Delete application" title="Delete application">
            {busy === 'delete' ? <ButtonSpinner /> : <Icon name="trash" size={14} />}
          </button>
        </div>
      </aside>
    </>
  );
}
