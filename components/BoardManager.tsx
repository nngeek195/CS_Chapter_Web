'use client';

import React, { useEffect, useState } from 'react';
import {
  BoardMember,
  createBoardMember,
  updateBoardMember,
  deleteBoardMember,
  subscribeToCollection,
  explainPermissionError,
} from '@/lib/firestore';
import { auth } from '@/lib/firebase';
import { sendBoardInvite } from '@/lib/boardInvite';
import Icon from '@/components/ui/Icon';
import {
  Avatar,
  ButtonSpinner,
  EmptyState,
  PermissionPicker,
  SectionHeader,
  SkeletonList,
  permissionLabel,
} from '@/components/ui/Portal';

interface BoardManagerProps {
  /** Email of the signed-in user — their own record is read-only to avoid self-lockout / self-escalation. */
  currentEmail: string;
  showToast: (msg: string, kind?: 'ok' | 'error') => void;
}

const norm = (e?: string) => (e || '').trim().toLowerCase();
const EMPTY_FORM = { name: '', role: '', email: '', permissions: [] as string[] };
const formGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' };

function TempPasswordNotice({ title, email, password, onClose }: { title: string; email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="alert-box success anim-in" style={{ alignItems: 'center' }}>
      <div className="icon-tile green"><Icon name="send" size={18} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="alert-title">{title}</div>
        <div>Sign-in details were emailed to <strong>{email}</strong>. The temporary password is shown once:</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
          <code style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.06em', padding: '6px 12px', background: '#fff', border: '1px solid rgba(5,150,105,0.25)', borderRadius: '8px', color: 'var(--ink)' }}>
            {password}
          </code>
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => { navigator.clipboard?.writeText(password).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }); }}
          >
            <Icon name={copied ? 'check' : 'file'} size={14} /> {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <button className="modal-close" onClick={onClose} aria-label="Dismiss"><Icon name="x" size={16} /></button>
    </div>
  );
}

export default function BoardManager({ currentEmail, showToast }: BoardManagerProps) {
  const [members, setMembers] = useState<BoardMember[] | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // which action is running

  const [form, setForm] = useState(EMPTY_FORM);
  const [inviteResult, setInviteResult] = useState<{ title: string; email: string; password: string } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPerms, setEditingPerms] = useState<string[]>([]);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [replaceForm, setReplaceForm] = useState(EMPTY_FORM);

  useEffect(
    () =>
      subscribeToCollection<BoardMember>(
        'board_members',
        (items) => { setMembers(items); setSyncError(null); },
        (err) => setSyncError(err.message),
        (a, b) => (b.invitedAt || 0) - (a.invitedAt || 0)
      ),
    []
  );

  const emailTaken = (email: string, exceptId?: string) =>
    (members || []).some((m) => m.id !== exceptId && norm(m.email) === norm(email));

  const fail = async (prefix: string, err: unknown) =>
    showToast(`${prefix}: ${await explainPermissionError(err, auth.currentUser)}`, 'error');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name.trim(), role: form.role.trim(), email: form.email.trim(), permissions: form.permissions };
    if (!payload.name || !payload.role || !payload.email) { showToast('Name, role and email are required.', 'error'); return; }
    if (payload.permissions.length === 0) { showToast('Select at least one permission.', 'error'); return; }
    if (emailTaken(payload.email)) { showToast(`${payload.email} is already a board member. Edit their permissions instead.`, 'error'); return; }
    setBusy('invite');
    try {
      const { tempPassword } = await sendBoardInvite(payload);
      await createBoardMember({ ...payload, status: 'pending', mustChangePassword: true, invitedAt: Date.now() });
      setInviteResult({ title: 'Invitation sent', email: payload.email, password: tempPassword });
      setForm(EMPTY_FORM);
      showToast(`Invitation sent to ${payload.email}`);
    } catch (err) {
      await fail('Could not send the invitation', err);
    } finally {
      setBusy(null);
    }
  };

  const handleSavePerms = async (m: BoardMember) => {
    if (editingPerms.length === 0) { showToast('Keep at least one permission selected.', 'error'); return; }
    setBusy(`perms-${m.id}`);
    try {
      await updateBoardMember(m.id, { permissions: editingPerms });
      setEditingId(null);
      showToast(`Permissions updated for ${m.name}`);
    } catch (err) {
      await fail('Could not update permissions', err);
    } finally {
      setBusy(null);
    }
  };

  const handleReplace = async (e: React.FormEvent, m: BoardMember) => {
    e.preventDefault();
    const payload = { name: replaceForm.name.trim(), role: replaceForm.role.trim(), email: replaceForm.email.trim(), permissions: replaceForm.permissions };
    if (!payload.name || !payload.role || !payload.email) { showToast('Name, role and email are required.', 'error'); return; }
    if (payload.permissions.length === 0) { showToast('Select at least one permission.', 'error'); return; }
    if (emailTaken(payload.email, m.id)) { showToast(`${payload.email} is already a board member.`, 'error'); return; }
    if (!confirm(`${m.name} will lose portal access and ${payload.name} will be invited as ${payload.role}. Continue?`)) return;
    setBusy(`replace-${m.id}`);
    try {
      const { tempPassword } = await sendBoardInvite(payload);
      await updateBoardMember(m.id, {
        ...payload, status: 'pending', mustChangePassword: true, invitedAt: Date.now(), activatedAt: undefined,
      });
      setInviteResult({ title: `Post handed over to ${payload.name}`, email: payload.email, password: tempPassword });
      setReplacingId(null);
      setReplaceForm(EMPTY_FORM);
      showToast(`Invitation sent to ${payload.email}`);
    } catch (err) {
      await fail('Could not replace the post', err);
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async (m: BoardMember) => {
    if (!confirm(`Remove ${m.name} (${m.role}) from the portal? They will be signed out immediately.`)) return;
    setBusy(`remove-${m.id}`);
    try {
      await deleteBoardMember(m.id);
      showToast(`${m.name} was removed`);
    } catch (err) {
      await fail('Could not remove the member', err);
    } finally {
      setBusy(null);
    }
  };

  const list = members || [];
  const active = list.filter((m) => m.status === 'active').length;
  const pending = list.filter((m) => m.status === 'pending').length;

  return (
    <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-head">
        <div>
          <h1>Board Members</h1>
          <p>Invite board members and decide what each person can manage.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div className="stat-card" style={{ padding: '12px 16px' }}>
            <div className="icon-tile green"><Icon name="checkCircle" size={18} /></div>
            <div><div className="stat-value">{members ? active : '–'}</div><div className="stat-label">Active</div></div>
          </div>
          <div className="stat-card" style={{ padding: '12px 16px' }}>
            <div className="icon-tile amber"><Icon name="clock" size={18} /></div>
            <div><div className="stat-value">{members ? pending : '–'}</div><div className="stat-label">Awaiting first sign-in</div></div>
          </div>
        </div>
      </div>

      {syncError && (
        <div className="alert-box danger">
          <Icon name="alert" size={18} />
          <div><div className="alert-title">Board members could not be loaded</div>{syncError}</div>
        </div>
      )}

      {inviteResult && <TempPasswordNotice {...inviteResult} onClose={() => setInviteResult(null)} />}

      <div className="admin-panel" style={{ padding: '24px' }}>
        <SectionHeader icon="userPlus" title="Invite a board member" subtitle="They receive an email with a temporary password and set their own password at first sign-in." />
        <form onSubmit={handleInvite} className="admin-form">
          <div style={formGrid}>
            <div className="form-group">
              <label>Full name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Board role</label>
              <input placeholder="e.g. Secretary" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Email address</label>
              <input type="email" placeholder="member@sab.ac.lk" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label>Permissions</label>
            <PermissionPicker value={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button type="submit" className="btn primary" disabled={!!busy}>
              {busy === 'invite' ? <ButtonSpinner /> : <Icon name="send" size={15} />}
              {busy === 'invite' ? 'Sending invitation…' : 'Send invitation'}
            </button>
            {form.permissions.length > 0 && (
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                {form.permissions.length} permission{form.permissions.length === 1 ? '' : 's'} selected
              </span>
            )}
          </div>
        </form>
      </div>

      <div className="admin-panel" style={{ padding: '24px' }}>
        <SectionHeader icon="shield" title="Current board" subtitle={members ? `${list.length} member${list.length === 1 ? '' : 's'}` : 'Loading…'} />
        {members === null && !syncError ? (
          <SkeletonList rows={3} height={84} />
        ) : list.length === 0 ? (
          <EmptyState icon="users" title="No board members yet">Invite your first board member using the form above.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {list.map((m, i) => {
              const isSelf = norm(m.email) === norm(currentEmail);
              const isEditing = editingId === m.id;
              const isReplacing = replacingId === m.id;
              const isActive = m.status === 'active';
              return (
                <div
                  key={m.id}
                  className="anim-in"
                  style={{
                    ['--i' as string]: i,
                    border: isActive ? '1px solid var(--line)' : '1px dashed rgba(217,119,6,0.45)',
                    borderRadius: '14px', overflow: 'hidden', background: 'var(--white)',
                    boxShadow: isEditing || isReplacing ? '0 0 0 3px rgba(0,98,155,0.08)' : undefined,
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <Avatar name={m.name} size={44} muted={!isActive} />
                    <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>{m.name}</strong>
                        {isSelf && <span className="badge plain">You</span>}
                        <span className={`badge ${isActive ? 'green' : 'amber'}`}>
                          <span className={`status-dot${isActive ? '' : ' pulse'}`} />
                          {isActive ? 'Active' : 'Pending'}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--blue)', fontWeight: 600, marginTop: '2px' }}>{m.role}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', wordBreak: 'break-all' }}>{m.email}</div>
                      {!isEditing && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                          {(m.permissions || []).map((p) => (
                            <span key={p} className="badge blue plain">{permissionLabel(p)}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {isSelf ? (
                      <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name="lock" size={14} /> Only an admin can change your own access
                      </span>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          className="btn secondary sm"
                          onClick={() => { setReplacingId(null); setEditingId(isEditing ? null : m.id); setEditingPerms([...(m.permissions || [])]); }}
                        >
                          <Icon name={isEditing ? 'x' : 'key'} size={14} /> {isEditing ? 'Cancel' : 'Permissions'}
                        </button>
                        <button
                          className="btn secondary sm"
                          onClick={() => { setEditingId(null); setReplacingId(isReplacing ? null : m.id); setReplaceForm({ ...EMPTY_FORM, role: m.role, permissions: [...(m.permissions || [])] }); }}
                        >
                          <Icon name={isReplacing ? 'x' : 'replace'} size={14} /> {isReplacing ? 'Cancel' : 'Replace'}
                        </button>
                        <button className="btn ghost-danger sm" disabled={!!busy} onClick={() => handleRemove(m)}>
                          {busy === `remove-${m.id}` ? <ButtonSpinner /> : <Icon name="trash" size={14} />} Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="tab-panel" style={{ borderTop: '1px solid var(--line)', background: 'var(--paper)', padding: '18px 20px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--ink)' }}>Permissions for {m.name}</div>
                      <PermissionPicker value={editingPerms} onChange={setEditingPerms} />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                        <button className="btn primary sm" disabled={!!busy || editingPerms.length === 0} onClick={() => handleSavePerms(m)}>
                          {busy === `perms-${m.id}` ? <ButtonSpinner /> : <Icon name="check" size={14} />} Save permissions
                        </button>
                        <button className="btn secondary sm" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {isReplacing && (
                    <form onSubmit={(e) => handleReplace(e, m)} className="admin-form tab-panel" style={{ borderTop: '1px solid var(--line)', background: 'var(--paper)', padding: '18px 20px' }}>
                      <div className="alert-box warning" style={{ marginBottom: '16px' }}>
                        <Icon name="alert" size={16} />
                        <span>{m.name} loses portal access as soon as the new person is invited.</span>
                      </div>
                      <div style={formGrid}>
                        <div className="form-group">
                          <label>New member name</label>
                          <input value={replaceForm.name} onChange={(e) => setReplaceForm({ ...replaceForm, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                          <label>New member email</label>
                          <input type="email" value={replaceForm.email} onChange={(e) => setReplaceForm({ ...replaceForm, email: e.target.value })} required />
                        </div>
                        <div className="form-group">
                          <label>Role</label>
                          <input value={replaceForm.role} onChange={(e) => setReplaceForm({ ...replaceForm, role: e.target.value })} required />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Permissions</label>
                        <PermissionPicker value={replaceForm.permissions} onChange={(permissions) => setReplaceForm({ ...replaceForm, permissions })} />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" className="btn primary sm" disabled={!!busy}>
                          {busy === `replace-${m.id}` ? <ButtonSpinner /> : <Icon name="replace" size={14} />} Replace and send invitation
                        </button>
                        <button type="button" className="btn secondary sm" onClick={() => setReplacingId(null)}>Cancel</button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
