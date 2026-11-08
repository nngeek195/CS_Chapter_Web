'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { getPublishedCalls, isAcceptingApplications, VolunteerCall } from '@/lib/volunteers';

function formatDate(value: number | string | null | undefined, withTime = false) {
  if (value === null || value === undefined || value === '') return '';
  const d = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

function statusOf(call: VolunteerCall): { label: string; tone: 'green' | 'amber' | 'plain' } {
  if (isAcceptingApplications(call)) return { label: 'Open', tone: 'green' };
  if (call.status === 'open' && call.deadlineAt !== null && Date.now() > call.deadlineAt) {
    return { label: 'Deadline passed', tone: 'amber' };
  }
  return { label: 'Closed', tone: 'plain' };
}

function CallCard({ call, index }: { call: VolunteerCall; index: number }) {
  const accepting = isAcceptingApplications(call);
  const status = statusOf(call);
  const shownPositions = call.positions.slice(0, 5);
  const extra = call.positions.length - shownPositions.length;

  return (
    <article className="vol-card anim-in" style={{ ['--i' as string]: index }}>
      <Link href={`/volunteer/${call.id}`} className="vol-card-media" aria-label={`View ${call.title}`} tabIndex={-1}>
        {call.poster ? (
          <img src={call.poster} alt="" loading="lazy" />
        ) : (
          <div className="vol-card-placeholder">
            <Icon name="users" size={40} strokeWidth={1.5} />
          </div>
        )}
        <span className={`badge ${status.tone === 'plain' ? '' : status.tone} vol-card-status`}>
          {accepting && <span className="status-dot pulse" />}
          {status.label}
        </span>
      </Link>

      <div className="vol-card-body">
        <h3 className="vol-card-title">
          <Link href={`/volunteer/${call.id}`}>{call.title}</Link>
        </h3>
        {call.summary && <p className="vol-card-summary">{call.summary}</p>}

        <ul className="vol-meta">
          {call.deadlineAt !== null && (
            <li>
              <Icon name="clock" size={15} />
              {accepting ? 'Applications close ' : 'Applications closed '}
              {formatDate(call.deadlineAt, true)}
            </li>
          )}
          {call.eventDate && (
            <li>
              <Icon name="calendar" size={15} />
              Event on {formatDate(call.eventDate)}
            </li>
          )}
          <li>
            <Icon name="clipboard" size={15} />
            {call.positions.length} {call.positions.length === 1 ? 'role' : 'roles'} available
          </li>
        </ul>

        {shownPositions.length > 0 && (
          <div className="vol-chips">
            {shownPositions.map((p) => (
              <span key={p.id} className="vol-chip">{p.name}</span>
            ))}
            {extra > 0 && <span className="vol-chip muted">+{extra} more</span>}
          </div>
        )}

        <div className="vol-card-foot">
          {accepting ? (
            <Link href={`/volunteer/${call.id}`} className="btn primary vol-cta">
              Apply now <Icon name="arrowRight" size={16} />
            </Link>
          ) : (
            <Link href={`/volunteer/${call.id}`} className="btn vol-cta vol-cta-closed">
              Applications closed <Icon name="arrowRight" size={16} />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default function VolunteerPage() {
  const [calls, setCalls] = useState<VolunteerCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getPublishedCalls()
      .then((list) => {
        const sorted = [...list].sort((a, b) => {
          const oa = isAcceptingApplications(a) ? 0 : 1;
          const ob = isAcceptingApplications(b) ? 0 : 1;
          if (oa !== ob) return oa - ob;
          return b.createdAt - a.createdAt;
        });
        setCalls(sorted);
      })
      .catch((err) => {
        console.warn('Volunteer calls fetch failed:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const openCount = calls.filter((c) => isAcceptingApplications(c)).length;

  return (
    <div className="vol-page">
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow mono" style={{ color: '#74c0ea' }}>
            Volunteer · Organising committees
          </div>
          <h1>Build the events with us.</h1>
          <p>
            Every chapter event is run by student volunteers. Pick a role that matches your skills,
            work alongside the board, and gain real experience organising technical events.
          </p>
        </div>
      </section>

      <section className="section vol-section">
        <div className="container">
          <div className="vol-section-head">
            <div>
              <div className="eyebrow mono">Volunteer calls</div>
              <h2 className="vol-h2">
                {loading
                  ? 'Loading volunteer calls'
                  : openCount > 0
                  ? `${openCount} ${openCount === 1 ? 'call is' : 'calls are'} open for applications`
                  : 'Current volunteer calls'}
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="vol-grid" aria-busy="true" aria-label="Loading volunteer calls">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="vol-card">
                  <div className="skeleton" style={{ height: 180, borderRadius: 0 }} />
                  <div className="vol-card-body">
                    <div className="skeleton" style={{ height: 22, width: '70%' }} />
                    <div className="skeleton" style={{ height: 14, width: '95%' }} />
                    <div className="skeleton" style={{ height: 14, width: '80%' }} />
                    <div className="skeleton" style={{ height: 40, width: '45%', marginTop: 8 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="alert-box danger" role="alert">
              <Icon name="alert" size={18} />
              <div>
                <div className="alert-title">Volunteer calls could not be loaded</div>
                Please check your connection and refresh the page.
              </div>
            </div>
          ) : calls.length === 0 ? (
            <div className="vol-empty">
              <div className="icon-tile lg"><Icon name="clipboard" size={24} /></div>
              <h3>No open volunteer calls right now</h3>
              <p>Check back soon — new calls are posted ahead of each chapter event.</p>
              <Link href="/events" className="btn primary" style={{ marginTop: 18 }}>
                See upcoming events <Icon name="arrowRight" size={16} />
              </Link>
            </div>
          ) : (
            <div className="vol-grid">
              {calls.map((call, i) => (
                <CallCard key={call.id} call={call} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
