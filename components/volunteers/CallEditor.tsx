'use client';

import React, { useState } from 'react';
import ImageUploader from '@/components/ImageUploader';
import Icon from '@/components/ui/Icon';
import { ButtonSpinner, SectionHeader } from '@/components/ui/Portal';
import {
  CallDraft,
  CallPosition,
  CallQuestion,
  CallStatus,
  QUESTION_TYPES,
  QuestionType,
  Viewer,
  VolunteerCall,
  createCall,
  uid,
  updateCall,
} from '@/lib/volunteers';

interface Props {
  viewer: Viewer;
  call?: VolunteerCall | null;
  applicationCount?: number;
  onCancel: () => void;
  onSaved: (id: string) => void;
  showToast: (msg: string, kind?: 'ok' | 'error') => void;
  describeError: (err: unknown) => Promise<string>;
}

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' };

const toLocalInput = (ms: number | null) => {
  if (!ms) return '';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const newPosition = (): CallPosition => ({ id: uid(), name: '', description: '', slots: 0, leadRole: false });
const newQuestion = (): CallQuestion => ({ id: uid(), label: '', type: 'short', options: [], required: false, help: '' });

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export default function CallEditor({ viewer, call, applicationCount = 0, onCancel, onSaved, showToast, describeError }: Props) {
  const editing = !!call;
  const [title, setTitle] = useState(call?.title || '');
  const [summary, setSummary] = useState(call?.summary || '');
  const [description, setDescription] = useState(call?.description || '');
  const [poster, setPoster] = useState(call?.poster || '');
  const [eventDate, setEventDate] = useState(call?.eventDate || '');
  const [deadline, setDeadline] = useState(toLocalInput(call?.deadlineAt ?? null));
  const [maxChoices, setMaxChoices] = useState(call?.maxChoices || 2);
  const [positions, setPositions] = useState<CallPosition[]>(call?.positions?.length ? call.positions : [newPosition()]);
  const [questions, setQuestions] = useState<CallQuestion[]>(call?.questions || []);
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>(
    Object.fromEntries((call?.questions || []).map((q) => [q.id, (q.options || []).join('\n')]))
  );
  const [saving, setSaving] = useState<CallStatus | 'save' | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const setPos = (i: number, patch: Partial<CallPosition>) => setPositions((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setQ = (i: number, patch: Partial<CallQuestion>) => setQuestions((q) => q.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!title.trim()) errs.push('Give the call a title.');
    if (!summary.trim()) errs.push('Add a short summary.');
    const named = positions.filter((p) => p.name.trim());
    if (named.length === 0) errs.push('Add at least one position.');
    if (new Set(named.map((p) => p.name.trim().toLowerCase())).size !== named.length) errs.push('Position names must be unique.');
    questions.forEach((q, i) => {
      if (!q.label.trim()) errs.push(`Question ${i + 1} needs a question text.`);
      if ((q.type === 'single' || q.type === 'multi') && parseOptions(optionDrafts[q.id]).length < 2) errs.push(`Question ${i + 1} needs at least two options.`);
    });
    if (deadline && new Date(deadline).getTime() < Date.now() && !editing) errs.push('The deadline is in the past.');
    return errs;
  };

  const parseOptions = (text = '') => text.split('\n').map((s) => s.trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

  const save = async (status: CallStatus | 'save') => {
    const errs = validate();
    setErrors(errs);
    if (errs.length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const draft: CallDraft = {
      title: title.trim(),
      summary: summary.trim(),
      description: description.trim(),
      poster,
      eventDate,
      deadlineAt: deadline ? new Date(deadline).getTime() : null,
      maxChoices: Math.max(1, Math.min(maxChoices, positions.filter((p) => p.name.trim()).length || 1)),
      positions: positions
        .filter((p) => p.name.trim())
        .map((p) => ({ ...p, name: p.name.trim(), description: (p.description || '').trim(), slots: Math.max(0, Number(p.slots) || 0) })),
      questions: questions.map((q) => ({
        ...q,
        label: q.label.trim(),
        help: (q.help || '').trim(),
        options: q.type === 'single' || q.type === 'multi' ? parseOptions(optionDrafts[q.id]) : [],
      })),
      status: status === 'save' ? (call?.status || 'draft') : status,
    };
    setSaving(status);
    try {
      if (editing && call) {
        await updateCall(call.id, draft);
        showToast('Volunteer call updated');
        onSaved(call.id);
      } else {
        const id = await createCall(viewer, draft);
        showToast(status === 'open' ? 'Volunteer call published' : 'Draft saved');
        onSaved(id);
      }
    } catch (err) {
      showToast(`Could not save the call: ${await describeError(err)}`, 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-head">
        <div>
          <button className="btn secondary sm" onClick={onCancel} style={{ marginBottom: '12px' }}>
            <Icon name="arrowLeft" size={14} /> Back
          </button>
          <h1>{editing ? 'Edit volunteer call' : 'New volunteer call'}</h1>
          <p>Describe the project, the teams you need, and any questions for applicants.</p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="alert-box danger anim-in" role="alert">
          <Icon name="alert" size={18} />
          <div>
            <div className="alert-title">Please fix the following</div>
            <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        </div>
      )}

      {editing && applicationCount > 0 && (
        <div className="alert-box warning">
          <Icon name="info" size={18} />
          <div>
            <div className="alert-title">{applicationCount} people have already applied</div>
            Renaming positions or questions is safe. Removing a position or question hides it from existing applications.
          </div>
        </div>
      )}

      <div className="admin-panel admin-form" style={{ padding: '24px' }}>
        <SectionHeader icon="clipboard" title="Basics" />
        <div className="form-group">
          <label htmlFor="vc-title">Title</label>
          <input id="vc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CodeSprint 2026 — Organising Committee" maxLength={120} />
        </div>
        <div className="form-group">
          <label htmlFor="vc-summary">Short summary</label>
          <input id="vc-summary" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={180} placeholder="One sentence shown on the volunteer listing" />
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', textAlign: 'right' }}>{summary.length}/180</div>
        </div>
        <div className="form-group">
          <label htmlFor="vc-desc">Full description</label>
          <textarea id="vc-desc" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is the project? What will volunteers do? Time commitment, benefits…" />
        </div>
        <div style={grid}>
          <div className="form-group">
            <label htmlFor="vc-event">Event / project date (optional)</label>
            <input id="vc-event" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="vc-deadline">Applications close (optional)</label>
            <input id="vc-deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="vc-choices">Preferences per applicant</label>
            <select id="vc-choices" value={maxChoices} onChange={(e) => setMaxChoices(Number(e.target.value))}>
              {[1, 2, 3].map((n) => <option key={n} value={n}>{n === 1 ? 'One position' : `Up to ${n} (ranked)`}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <ImageUploader label="Poster (optional)" currentImage={poster} onUpload={setPoster} />
        </div>
      </div>

      <div className="admin-panel admin-form" style={{ padding: '24px' }}>
        <SectionHeader
          icon="users"
          title={`Positions (${positions.length})`}
          subtitle="The teams applicants can choose from."
          actions={<button type="button" className="btn secondary sm" onClick={() => setPositions((p) => [...p, newPosition()])}><Icon name="plus" size={14} /> Add position</button>}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {positions.map((p, i) => (
            <div key={p.id} className="builder-item anim-in">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <span className="badge blue" style={{ marginTop: '12px' }}>{i + 1}</span>
                <div style={{ flex: '1 1 260px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label>Position name</label>
                    <input value={p.name} onChange={(e) => setPos(i, { name: e.target.value })} placeholder="e.g. Logistics" maxLength={60} />
                  </div>
                  <div>
                    <label>Volunteers needed</label>
                    <input type="number" min={0} max={500} value={p.slots || ''} placeholder="Any" onChange={(e) => setPos(i, { slots: Number(e.target.value) })} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>What this team does (optional)</label>
                    <input value={p.description || ''} onChange={(e) => setPos(i, { description: e.target.value })} maxLength={240} />
                  </div>
                  <label className={`perm-option${p.leadRole ? ' checked' : ''}`} style={{ position: 'relative', gridColumn: '1 / -1' }}>
                    <input type="checkbox" checked={!!p.leadRole} onChange={(e) => setPos(i, { leadRole: e.target.checked })} />
                    <span className="perm-check"><Icon name="check" size={12} strokeWidth={3} /></span>
                    <span>
                      <span style={{ display: 'block', fontSize: '13px', fontWeight: 600 }}>Applicants can volunteer to lead this team</span>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', fontWeight: 400 }}>Adds a “member / lead / either” choice to the form.</span>
                    </span>
                  </label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button type="button" className="btn secondary icon-only sm" title="Move up" aria-label="Move up" disabled={i === 0} onClick={() => setPositions((x) => move(x, i, i - 1))}><Icon name="arrowUp" size={14} /></button>
                  <button type="button" className="btn secondary icon-only sm" title="Move down" aria-label="Move down" disabled={i === positions.length - 1} onClick={() => setPositions((x) => move(x, i, i + 1))}><Icon name="arrowDown" size={14} /></button>
                  <button type="button" className="btn ghost-danger icon-only sm" title="Remove" aria-label="Remove position" disabled={positions.length === 1} onClick={() => setPositions((x) => x.filter((_, j) => j !== i))}><Icon name="trash" size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-panel admin-form" style={{ padding: '24px' }}>
        <SectionHeader
          icon="list"
          title={`Questions (${questions.length})`}
          subtitle="Name, email, phone, student ID, faculty and year are always collected."
          actions={<button type="button" className="btn secondary sm" onClick={() => setQuestions((q) => [...q, newQuestion()])}><Icon name="plus" size={14} /> Add question</button>}
        />
        {questions.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--muted)', padding: '8px 0' }}>No custom questions. Add one to ask about experience, availability, motivation and so on.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {questions.map((q, i) => (
              <div key={q.id} className="builder-item anim-in">
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <span className="badge violet" style={{ marginTop: '12px' }}>Q{i + 1}</span>
                  <div style={{ flex: '1 1 260px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label>Question</label>
                      <input value={q.label} onChange={(e) => setQ(i, { label: e.target.value })} placeholder="e.g. Have you organised an event before?" maxLength={200} />
                    </div>
                    <div>
                      <label>Answer type</label>
                      <select value={q.type} onChange={(e) => setQ(i, { type: e.target.value as QuestionType })}>
                        {QUESTION_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label>Help text (optional)</label>
                      <input value={q.help || ''} onChange={(e) => setQ(i, { help: e.target.value })} maxLength={200} />
                    </div>
                    {(q.type === 'single' || q.type === 'multi') && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label>Options (one per line)</label>
                        <textarea rows={3} value={optionDrafts[q.id] || ''} onChange={(e) => setOptionDrafts((o) => ({ ...o, [q.id]: e.target.value }))} placeholder={'Option A\nOption B'} />
                      </div>
                    )}
                    <label className={`perm-option${q.required ? ' checked' : ''}`} style={{ position: 'relative', gridColumn: '1 / -1' }}>
                      <input type="checkbox" checked={q.required} onChange={(e) => setQ(i, { required: e.target.checked })} />
                      <span className="perm-check"><Icon name="check" size={12} strokeWidth={3} /></span>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Required</span>
                    </label>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button type="button" className="btn secondary icon-only sm" title="Move up" aria-label="Move up" disabled={i === 0} onClick={() => setQuestions((x) => move(x, i, i - 1))}><Icon name="arrowUp" size={14} /></button>
                    <button type="button" className="btn secondary icon-only sm" title="Move down" aria-label="Move down" disabled={i === questions.length - 1} onClick={() => setQuestions((x) => move(x, i, i + 1))}><Icon name="arrowDown" size={14} /></button>
                    <button type="button" className="btn ghost-danger icon-only sm" title="Remove" aria-label="Remove question" onClick={() => setQuestions((x) => x.filter((_, j) => j !== i))}><Icon name="trash" size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-panel" style={{ padding: '16px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', position: 'sticky', bottom: '12px', zIndex: 5 }}>
        <button className="btn secondary" onClick={onCancel} disabled={!!saving}>Cancel</button>
        {editing ? (
          <button className="btn primary" onClick={() => save('save')} disabled={!!saving}>
            {saving ? <ButtonSpinner /> : <Icon name="check" size={15} />} Save changes
          </button>
        ) : (
          <>
            <button className="btn secondary" onClick={() => save('draft')} disabled={!!saving}>
              {saving === 'draft' ? <ButtonSpinner /> : <Icon name="file" size={15} />} Save as draft
            </button>
            <button className="btn primary" onClick={() => save('open')} disabled={!!saving}>
              {saving === 'open' ? <ButtonSpinner /> : <Icon name="send" size={15} />} Publish and open applications
            </button>
          </>
        )}
      </div>
    </div>
  );
}
