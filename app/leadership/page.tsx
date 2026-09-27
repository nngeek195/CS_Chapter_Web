'use client';

import React, { useState, useEffect } from 'react';
import LeadershipAccordion from '@/components/LeadershipAccordion';
import PageHero from '@/components/PageHero';
import AdvisorCard from '@/components/AdvisorCard';
import PersonCard from '@/components/PersonCard';
import { getFacultyAdvisor, getCommittee, getPastCommittees } from '@/lib/firestore';
import { INITIAL_ADVISOR, INITIAL_COMMITTEE, INITIAL_PAST_COMMITTEES } from '@/lib/seedData';
import { FacultyAdvisorData, CommitteeMember, PastCommittee } from '@/lib/types';

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
      <PageHero
        eyebrow="02 · LEADERSHIP"
        title="People behind the chapter."
        description="Structured by role hierarchy so the advisor and executive committee are immediately understandable."
      />

      {/* Faculty Advisor */}
      <section className="section">
        <div className="container">
          <div className="eyebrow mono">{advisor.title || 'Faculty Advisor'}</div>
          <AdvisorCard advisor={advisor} />
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
                <PersonCard key={person.id} person={person} />
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
