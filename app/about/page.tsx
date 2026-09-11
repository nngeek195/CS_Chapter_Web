import React from 'react';
import type { Metadata } from 'next';
import TiltCard from '@/components/TiltCard';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about the IEEE Computer Society Chapter at Sabaragamuwa University of Sri Lanka.',
};

export default function AboutPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow mono" style={{ color: '#74c0ea' }}>
            01 · ABOUT US
          </div>
          <h1>Why this chapter exists.</h1>
          <p>
            Mission, history and relationship with IEEE Computer Society, IEEE Sri Lanka Section and
            Sabaragamuwa University of Sri Lanka.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="section">
        <div className="container split">
          <div>
            <div className="eyebrow mono">Mission & Vision</div>
            <h2 className="section-title">Build a stronger computing culture, together.</h2>
          </div>

          <div className="surface card">
            <h3>Our Mission</h3>
            <p style={{ marginTop: '8px' }}>
              Create a vibrant, practical community around computer science through technical learning,
              competitive programming, collaborative open-source projects, and deep exposure to cutting-edge
              industry and academic research.
            </p>

            <h3 style={{ marginTop: '28px' }}>Our Vision</h3>
            <p style={{ marginTop: '8px' }}>
              Become a premier student platform connecting computing curriculum with real-world impact,
              fostering future software engineers, researchers, and tech pioneers with an inclusive,
              sustainable chapter culture.
            </p>
          </div>
        </div>
      </section>

      {/* Chapter Context */}
      <section className="section section-dark">
        <div className="container">
          <div className="eyebrow mono">Chapter context</div>
          <h2 className="section-title">Connected to a global ecosystem.</h2>

          <div className="grid g4" style={{ marginTop: '42px' }}>
            <TiltCard>
              <div className="card-icon">01</div>
              <h3>IEEE Computer Society</h3>
              <p>The premier computing-focused global professional association with members worldwide.</p>
            </TiltCard>

            <TiltCard>
              <div className="card-icon">02</div>
              <h3>IEEE Sri Lanka Section</h3>
              <p>National IEEE governance facilitating cross-university hackathons, conferences, and section awards.</p>
            </TiltCard>

            <TiltCard>
              <div className="card-icon">03</div>
              <h3>Sabaragamuwa University</h3>
              <p>Our academic home in Belihuloya, nurturing passionate tech talent in computing and engineering.</p>
            </TiltCard>

            <TiltCard>
              <div className="card-icon">04</div>
              <h3>Student Community</h3>
              <p>The heart and engine: translating opportunities into hands-on events, competitions, and skills.</p>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* History Timeline */}
      <section className="section">
        <div className="container">
          <div className="eyebrow mono">History</div>
          <h2 className="section-title">Milestones in our journey.</h2>

          <div className="timeline">
            <div className="timeline-item">
              <div className="year">Founding</div>
              <h3>Official Chapter Inception</h3>
              <p>
                Established under the IEEE Student Branch of Sabaragamuwa University of Sri Lanka to provide
                specialized computing focus for undergraduate students.
              </p>
            </div>

            <div className="timeline-item">
              <div className="year">Growth</div>
              <h3>Flagship Workshops & IEEEXtreme</h3>
              <p>
                Launched annual hands-on workshops in machine learning, full-stack development, and spearheaded
                high-ranking university teams at IEEEXtreme global hackathons.
              </p>
            </div>

            <div className="timeline-item">
              <div className="year">Today</div>
              <h3>Continuous Innovation & Handover</h3>
              <p>
                Maintaining active industry partnerships, research symposiums, open-source repositories, and an
                alumni mentorship network for seamless leadership continuity.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
