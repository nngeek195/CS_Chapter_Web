import React from 'react';
import Link from 'next/link';
import StatsCounter from '@/components/StatsCounter';
import TiltCard from '@/components/TiltCard';
import MagneticButton from '@/components/MagneticButton';
import WaterHeroOrb from '@/components/WaterHeroOrb';

export default function HomePage() {
  const stats = [
    { end: 120, suffix: '+', label: 'Active members' },
    { end: 24, suffix: '+', label: 'Events & sessions' },
    { end: 3, suffix: '+', label: 'Years active' },
    { end: 12, suffix: '+', label: 'Workshops delivered' },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        {/* Floating Water Orb Background with Centered Bigger Logo & WebGL2 Water Simulation */}
        <WaterHeroOrb />

        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <div className="hero-copy">
            <div className="eyebrow mono" style={{ color: '#74c0ea' }}>
              SABARAGAMUWA UNIVERSITY OF SRI LANKA
            </div>
            <h1>
              IEEE <span className="accent">CS</span> Chapter
            </h1>
            <p className="lead">
              Science. Technology. Engineering. A modern home for computing students to
              explore technical workshops, coding competitions, networking, certifications,
              research exposure and chapter-led opportunities.
            </p>
            <div className="hero-ctas">
              <MagneticButton href="/membership" variant="primary">
                Join IEEE CS ↗
              </MagneticButton>
              <MagneticButton href="/events" variant="secondary">
                Explore Events →
              </MagneticButton>
            </div>
          </div>

          <div className="hero-foot">
            <div className="line mono">Scroll to explore the chapter</div>
            <div className="mono">Sabaragamuwa University · Sri Lanka</div>
          </div>
        </div>
      </section>

      {/* Interactive Stats Band */}
      <StatsCounter stats={stats} />

      {/* What We Do */}
      <section className="section">
        <div className="container split">
          <div>
            <div className="eyebrow mono">What we do</div>
            <h2 className="section-title">Computer science with a community around it.</h2>
            <p className="section-lead">
              Our chapter connects academic foundation with real-world skills through student-led
              workshops, global competitions, mentorship, and professional networking.
            </p>
          </div>

          <div className="list-rows">
            <Link className="list-row" href="/resources">
              <span className="index">01</span>
              <span>
                <h4>Technical Workshops</h4>
                <p>AI/ML, web technologies, cloud architectures, tools and hands-on coding.</p>
              </span>
              <span>→</span>
            </Link>
            <Link className="list-row" href="/events">
              <span className="index">02</span>
              <span>
                <h4>Coding Competitions</h4>
                <p>IEEEXtreme, CSIDC, university hackathons and competitive programming challenges.</p>
              </span>
              <span>→</span>
            </Link>
            <Link className="list-row" href="/leadership">
              <span className="index">03</span>
              <span>
                <h4>Networking & Mentorship</h4>
                <p>Industry leaders, alumni network, faculty guides and peer collaboration.</p>
              </span>
              <span>→</span>
            </Link>
            <Link className="list-row" href="/resources">
              <span className="index">04</span>
              <span>
                <h4>Research & Certifications</h4>
                <p>Talks, IEEE digital library access, academic publications, and certification pathways.</p>
              </span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Spotlight */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="split" style={{ alignItems: 'end' }}>
            <div>
              <div className="eyebrow mono">Featured / upcoming</div>
              <h2 className="section-title">One strong spotlight, not an event dump.</h2>
              <p className="section-lead">
                Keeping the spotlight on what matters now, with the full archive preserved on the Events page.
              </p>
            </div>
            <Link className="link-arrow" href="/events">
              View all events →
            </Link>
          </div>

          <div className="feature" style={{ marginTop: '42px' }}>
            <img
              src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1800&q=82"
              alt="Students collaborating at an event"
            />
            <div className="feature-overlay">
              <div className="date-chip">Flagship Series · 2026</div>
              <h3>Annual Tech Talk & Hackathon Series</h3>
              <p>
                Bringing leading tech practitioners, researchers, and alumni together for practical keynotes,
                live coding demos, and project showcases.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Join IEEE CS */}
      <section className="section section-dark">
        <div className="container">
          <div className="eyebrow mono">Why join IEEE CS</div>
          <h2 className="section-title">More than a membership badge.</h2>
          <div className="grid g3" style={{ marginTop: '46px' }}>
            <TiltCard>
              <div className="card-icon">01</div>
              <h3>Learn by doing</h3>
              <p>
                Hands-on workshops, bootcamps, and competition preparation turn abstract concepts into code
                and deployed projects you can showcase.
              </p>
            </TiltCard>

            <TiltCard>
              <div className="card-icon">02</div>
              <h3>Meet the ecosystem</h3>
              <p>
                Connect with IEEE members globally, alumni in industry, keynote speakers, and ambitious peers
                who share your passion for computing.
              </p>
            </TiltCard>

            <TiltCard>
              <div className="card-icon">03</div>
              <h3>Open the next door</h3>
              <p>
                Access IEEEXtreme, CSIDC global competitions, travel grants, research symposiums, and chapter
                executive leadership roles.
              </p>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* Leadership Preview */}
      <section className="section">
        <div className="container split">
          <div>
            <div className="eyebrow mono">Leadership preview</div>
            <h2 className="section-title">People first.</h2>
            <p className="section-lead">
              Our executive committee and faculty advisors steer the chapter with dedication to student
              success and technical excellence.
            </p>
            <div style={{ marginTop: '24px' }}>
              <MagneticButton href="/leadership" variant="primary">
                Meet the team →
              </MagneticButton>
            </div>
          </div>

          <div className="surface advisor">
            <div className="advisor-photo">FA</div>
            <div>
              <div className="eyebrow mono">Faculty Advisor</div>
              <h3 style={{ fontSize: '30px' }}>Dr. / Senior Lecturer</h3>
              <p style={{ marginTop: '10px' }}>
                Department of Computing and Information Systems, Faculty of Applied Sciences,
                Sabaragamuwa University of Sri Lanka. Mentoring student leaders in academic and technical excellence.
              </p>
              <Link href="/leadership" className="link-arrow" style={{ marginTop: '14px' }}>
                View Full Executive Committee →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
