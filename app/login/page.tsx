'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Icon from '@/components/ui/Icon';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // login() now returns { user, boardMember } and sets the role cookie
      // immediately so middleware can enforce the correct route.
      const { boardMember } = await login(email.trim(), password);

      // ── Determine where to redirect ──────────────────────────────
      // Board/committee member → /member (their own limited dashboard).
      // Full admin → /admin (or honour the `from` query param).
      let destination: string;

      if (boardMember) {
        // This is a board/committee member — always send to /member portal
        // They should NEVER access /admin regardless of any `from` param
        destination = '/member';
      } else {
        // This is a full admin — send to /admin or honour the `from` param
        const fromParam = searchParams.get('from');
        if (fromParam && !fromParam.startsWith('/member')) {
          // Admin can go wherever they wanted (but not /member which is for board members)
          destination = fromParam;
        } else {
          destination = '/admin';
        }
      }

      router.push(destination);
      router.refresh();
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = 'Authentication failed. Please check your credentials.';
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password') {
        msg = 'Invalid email or password. Please try again.';
      } else if (err?.code === 'auth/too-many-requests') {
        msg = 'Too many failed login attempts. Please wait a moment and try again.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-card">
      <div className="login-header">
        <Link href="/" className="login-brand" aria-label="IEEE CS SUSL Home">
          <img
            src="/images/logo.png"
            alt="IEEE CS SUSL Logo"
            className="brand-logo"
            style={{ height: '42px', margin: '0 auto 12px' }}
          />
        </Link>
        <div className="eyebrow mono" style={{ justifyContent: 'center', marginBottom: '8px' }}>
          CHAPTER PORTAL
        </div>
        <h2>Sign In</h2>
        <p style={{ marginTop: '8px', fontSize: '14px' }}>
          Use your chapter account to manage the website.
        </p>
      </div>

      {error && (
        <div className="login-error-alert" role="alert">
          <Icon name="alert" size={16} style={{ marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            placeholder="your-email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ paddingRight: '44px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '6px', display: 'grid', placeItems: 'center' }}
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} size={17} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn primary"
          disabled={loading}
          style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}
        >
          {loading ? <span className="spinner" aria-hidden="true" /> : <Icon name="lock" size={15} />}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="login-foot">
        <Link href="/" className="link-arrow" style={{ fontSize: '13px' }}>
          <Icon name="arrowLeft" size={14} /> Back to the website
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <section className="login-section">
      <div className="container" style={{ maxWidth: '460px' }}>
        <Suspense fallback={<div className="login-card" style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </section>
  );
}
