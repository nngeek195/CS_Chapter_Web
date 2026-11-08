'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Icon from '@/components/ui/Icon';
import { ButtonSpinner } from '@/components/ui/Portal';

const RULES = [
  { label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
  { label: 'An uppercase letter (A–Z)', test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'A lowercase letter (a–z)', test: (pw: string) => /[a-z]/.test(pw) },
  { label: 'A number (0–9)', test: (pw: string) => /\d/.test(pw) },
  { label: 'A symbol (!@#$…)', test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
];

const STRENGTH = [
  { label: 'Very weak', color: '#ef4444' },
  { label: 'Weak', color: '#f97316' },
  { label: 'Fair', color: '#eab308' },
  { label: 'Good', color: '#22c55e' },
  { label: 'Strong', color: '#059669' },
];

function PasswordField({
  id, label, value, onChange, placeholder, state,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string; state?: 'ok' | 'bad';
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          required
          style={{ paddingRight: '44px', borderColor: state === 'bad' ? '#ef4444' : state === 'ok' ? '#22c55e' : undefined }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '6px', display: 'grid', placeItems: 'center' }}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={17} />
        </button>
      </div>
    </div>
  );
}

export default function FirstLoginModal() {
  const { changePasswordAndActivate, user, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const score = RULES.filter((r) => r.test(newPassword)).length;
  const strength = STRENGTH[Math.max(score - 1, 0)];
  const matchState = confirmPassword ? (confirmPassword === newPassword ? 'ok' : 'bad') : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (score < 3) { setError('Please choose a stronger password — mix upper and lower case letters, numbers and symbols.'); return; }

    setLoading(true);
    try {
      await changePasswordAndActivate(newPassword);
      setSuccess(true);
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        setError('Your session has expired. Log out, sign in again with your temporary password, then set your new password.');
      } else {
        setError(err?.message || 'Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay portal-modal" style={{ zIndex: 9999 }}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-login-title"
        style={{ maxWidth: '500px', padding: 0, overflow: 'hidden', maxHeight: '94vh', overflowY: 'auto' }}
      >
        {success ? (
          <div style={{ textAlign: 'center', padding: '44px 36px' }}>
            <div className="success-check" aria-hidden="true">
              <svg viewBox="0 0 52 52" width="72" height="72">
                <circle cx="26" cy="26" r="24" fill="none" />
                <path fill="none" d="M15 27l7 7 15-15" />
              </svg>
            </div>
            <h2 id="first-login-title" style={{ margin: '20px 0 8px', fontSize: '22px', fontFamily: 'Montserrat, sans-serif', color: 'var(--ink)' }}>
              Your account is active
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.65, margin: 0 }}>
              Your password has been updated. Welcome to the IEEE CS SUSL chapter portal.
            </p>
          </div>
        ) : (
          <>
            <div className="portal-hero" style={{ borderRadius: 0, padding: '26px 30px' }}>
              <span className="orb one" />
              <div style={{ position: 'relative', display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div className="icon-tile lg" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}>
                  <Icon name="key" size={22} />
                </div>
                <div>
                  <span className="eyebrow">First sign-in</span>
                  <h1 id="first-login-title" style={{ fontSize: '20px', margin: '6px 0 4px' }}>Set your password</h1>
                  <p style={{ fontSize: '13px' }}>Signed in as {user?.email}. Choose a permanent password to activate your account.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="admin-form" style={{ padding: '24px 30px 28px' }}>
              {error && (
                <div className="alert-box danger anim-in" role="alert" style={{ marginBottom: '18px' }}>
                  <Icon name="alert" size={16} />
                  <span>{error}</span>
                </div>
              )}

              <PasswordField id="new-password" label="New password" value={newPassword} onChange={setNewPassword} placeholder="Create a strong password" />

              {newPassword && (
                <div style={{ margin: '-8px 0 18px' }} aria-live="polite">
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                    {STRENGTH.map((_, i) => (
                      <div key={i} style={{ height: '4px', flex: 1, borderRadius: '2px', background: i < score ? strength.color : '#e2e8f0', transition: 'background 0.3s' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '12px', color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                </div>
              )}

              <PasswordField id="confirm-password" label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter your new password" state={matchState} />
              {matchState && (
                <div style={{ margin: '-10px 0 18px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: matchState === 'ok' ? '#059669' : '#dc2626' }}>
                  <Icon name={matchState === 'ok' ? 'check' : 'x'} size={13} strokeWidth={2.5} />
                  {matchState === 'ok' ? 'Passwords match' : 'Passwords do not match'}
                </div>
              )}

              <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Password requirements
                </div>
                {RULES.map((r) => {
                  const met = r.test(newPassword);
                  return (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '2px 0', color: met ? '#047857' : 'var(--muted)', transition: 'color 0.2s' }}>
                      <span style={{ width: '16px', height: '16px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: met ? '#059669' : 'transparent', border: met ? 'none' : '1.5px solid #cbd5e1', color: '#fff', transition: 'all 0.2s' }}>
                        {met && <Icon name="check" size={10} strokeWidth={3.5} />}
                      </span>
                      {r.label}
                    </div>
                  );
                })}
              </div>

              <button type="submit" className="btn primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? <ButtonSpinner /> : <Icon name="lock" size={15} />}
                {loading ? 'Activating account…' : 'Set password and activate account'}
              </button>
              <button
                type="button"
                onClick={async () => { await logout(); window.location.href = '/login'; }}
                disabled={loading}
                style={{ width: '100%', marginTop: '10px', background: 'none', border: 'none', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px' }}
              >
                <Icon name="logout" size={14} /> Log out instead
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
