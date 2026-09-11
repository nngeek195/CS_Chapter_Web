'use client';

import React, { useState, useEffect } from 'react';
import TiltCard from '@/components/TiltCard';
import LeadershipAccordion from '@/components/LeadershipAccordion';
import {
  getFacultyAdvisor,
  getCommittee,
  getPastCommittees,
} from '@/lib/firestore';
import {
  INITIAL_ADVISOR,
  INITIAL_COMMITTEE,
  INITIAL_PAST_COMMITTEES,
} from '@/lib/seedData';
import {
  FacultyAdvisorData,
  CommitteeMember,
  PastCommittee,
} from '@/lib/types';

export default function LeadershipPage() {
  const [advisor, setAdvisor] = useState<FacultyAdvisorData>(INITIAL_ADVISOR);
  const [committee, setCommittee] = useState<CommitteeMember[]>(INITIAL_COMMITTEE);
  const [pastCommittees, setPastCommittees] = useState<PastCommittee[]>(INITIAL_PAST_COMMITTEES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getFacultyAdvisor(), getCommittee(), getPastCommittees()])
      .then(([adv, comm, past]) => {
        if (adv) setAdvisor(adv);
        if (comm && comm.length > 0) setCommittee(comm);
        if (past && past.length > 0) setPastCommittees(past);
      })
      .catch((err) => console.warn('Leadership fetch fallback:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow mono" style={{ color: '#74c0ea' }}>
            02 · LEADERSHIP
          </div>
          <h1>People behind the chapter.</h1>
          <p>
            Structured by role hierarchy so the advisor and executive committee are immediately understandable.
          </p>
        </div>
      </section>

      {/* Faculty Advisor */}
      <section className="section">
        <div className="container">
          <div className="eyebrow mono">{advisor.title || 'Faculty Advisor'}</div>
          <div className="surface advisor">
            {advisor.image ? (
              <img
                src={advisor.image}
                alt={advisor.name}
                className="advisor-photo"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className="advisor-photo">{advisor.initials || 'FA'}</div>
            )}
            <div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>{advisor.name}</h2>
              <p style={{ fontWeight: 600, color: 'var(--blue)', marginTop: '6px' }}>
                {advisor.department}
              </p>
              <p style={{ marginTop: '12px' }}>{advisor.bio}</p>
              <div className="person-socials">
                {advisor.linkedin && (
                  <a
                    href={advisor.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-mini"
                    aria-label="LinkedIn"
                  >
                    in
                  </a>
                )}
                {advisor.email && (
                  <a href={`mailto:${advisor.email}`} className="social-mini" aria-label="Email">
                    @
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Executive Committee */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="eyebrow mono">Executive Committee</div>
          <h2 className="section-title">Current committee.</h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner"></div>
            </div>
          ) : committee.length === 0 ? (
            <p style={{ marginTop: '24px', color: 'var(--muted)' }}>
              Current term completed. Elections and onboarding for the new cohort are in progress.
            </p>
          ) : (
            <div className="person-grid" style={{ marginTop: '38px' }}>
              {committee.map((person) => (
                <TiltCard key={person.id} className="person">
                  {person.image ? (
                    <img
                      src={person.image}
                      alt={person.name}
                      className="person-avatar"
                      style={{ objectFit: 'cover', padding: 0 }}
                    />
                  ) : (
                    <div className="person-avatar">{person.initials}</div>
                  )}
                  <h3>{person.name}</h3>
                  <div className="role">{person.role}</div>
                  <div className="batch">{person.batch}</div>
                  {person.department && (
                    <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
                      {person.department}
                    </p>
                  )}
                  <div className="person-socials">
                    {person.linkedin ? (
                      <a
                        href={person.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-mini"
                        aria-label="LinkedIn"
                      >
                        in
                      </a>
                    ) : (
                      <span className="social-mini" style={{ opacity: 0.3 }}>
                        in
                      </span>
                    )}
                    {person.email ? (
                      <a href={`mailto:${person.email}`} className="social-mini" aria-label="Contact">
                        @
                      </a>
                    ) : (
                      <span className="social-mini" style={{ opacity: 0.3 }}>
                        @
                      </span>
                    )}
                  </div>
                </TiltCard>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Past Leadership Accordion */}
      <section className="section section-dark">
        <div className="container">
          <div className="eyebrow mono">Past leadership</div>
          <h2 className="section-title">Honoring alumni contributions.</h2>
          <p style={{ marginTop: '14px', maxWidth: '60ch', color: 'rgba(255,255,255,0.7)' }}>
            Each committee paved the way for subsequent cohorts. Explore previous student leaders who shaped our chapter.
          </p>

          <LeadershipAccordion committees={pastCommittees} initialLimit={3} />
        </div>
      </section>
    </>
  );
}
