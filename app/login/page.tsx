'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
      const destination = searchParams.get('from') || '/admin';
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
          ADMINISTRATION
        </div>
        <h2>Chapter Portal</h2>
        <p style={{ marginTop: '8px', fontSize: '14px' }}>
          Sign in with your authorized chapter credentials to manage content and records.
        </p>
      </div>

      {error && (
        <div className="login-error-alert" role="alert">
          <span>⚠️ {error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label htmlFor="email">Admin Email</label>
          <input
            id="email"
            type="email"
            required
            placeholder="admin@ieeecs-susl.ac.lk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          className="btn primary"
          disabled={loading}
          style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}
        >
          {loading ? 'Authenticating...' : 'Sign In to Dashboard →'}
        </button>
      </form>

      <div className="login-foot">
        <Link href="/" className="link-arrow" style={{ fontSize: '13px' }}>
          ← Return to public website
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

