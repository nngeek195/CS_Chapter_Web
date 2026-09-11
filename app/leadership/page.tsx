import React from 'react';
import type { Metadata } from 'next';
import TiltCard from '@/components/TiltCard';
import LeadershipAccordion from '@/components/LeadershipAccordion';

export const metadata: Metadata = {
  title: 'Leadership',
  description: 'Executive committee and faculty advisor of IEEE Computer Society Chapter at SUSL.',
};

export default function LeadershipPage() {
  const committee = [
    { initials: 'P', name: 'Naveen Fernando', role: 'President', batch: 'CIS / 2022/2023 Batch' },
    { initials: 'VP', name: 'Chamodi Rajapakse', role: 'Vice President', batch: 'SE / 2022/2023 Batch' },
    { initials: 'S', name: 'Kavindu Dilshan', role: 'Secretary', batch: 'CIS / 2023/2024 Batch' },
    { initials: 'VS', name: 'Tharushi Silva', role: 'Vice Secretary', batch: 'PST / 2023/2024 Batch' },
    { initials: 'T', name: 'Janith Senaratne', role: 'Treasurer', batch: 'SE / 2022/2023 Batch' },
    { initials: 'PV', name: 'Nisal Bandara', role: 'Public Visibility Chair', batch: 'CIS / 2023/2024 Batch' },
  ];

  const pastCommittees = [
    {
      year: '2024 / 2025',
      members: [
        'President: Malith Bandara',
        'Vice President: Hasini Wickramasinghe',
        'Secretary: Anuki Jayasundara',
        'Treasurer: Kasun Perera',
        'Public Visibility Chair: Shenal Dias',
      ],
    },
    {
      year: '2023 / 2024',
      members: [
        'President: Dineth Gunawardena',
        'Vice President: Kaveesha Rodrigo',
        'Secretary: Lakshan Senanayake',
        'Treasurer: Nuwantha Ekanayake',
        'Editor / Webmaster: Tharindu Weerasinghe',
      ],
    },
  ];

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
          <div className="eyebrow mono">Faculty Advisor</div>
          <div className="surface advisor">
            <div className="advisor-photo">FA</div>
            <div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>Faculty Advisor</h2>
              <p style={{ fontWeight: 600, color: 'var(--blue)', marginTop: '6px' }}>
                Senior Lecturer, Department of Computing & Information Systems
              </p>
              <p style={{ marginTop: '12px' }}>
                Guiding the student chapter with strategic vision, academic rigor, and mentorship.
                Bridging university research initiatives with international IEEE standards and industry relations.
              </p>
              <div className="person-socials">
                <a href="#" className="social-mini" aria-label="LinkedIn">in</a>
                <a href="mailto:ieeecs@sab.ac.lk" className="social-mini" aria-label="Email">@</a>
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

          <div className="person-grid" style={{ marginTop: '38px' }}>
            {committee.map((person, idx) => (
              <TiltCard key={idx} className="person">
                <div className="person-avatar">{person.initials}</div>
                <h3>{person.name}</h3>
                <div className="role">{person.role}</div>
                <div className="batch">{person.batch}</div>
                <div className="person-socials">
                  <a href="#" className="social-mini" aria-label="LinkedIn">in</a>
                  <a href="#" className="social-mini" aria-label="Contact">@</a>
                </div>
              </TiltCard>
            ))}
          </div>
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

          <LeadershipAccordion committees={pastCommittees} />
        </div>
      </section>
    </>
  );
}
