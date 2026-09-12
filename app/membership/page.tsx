import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import TiltCard from '@/components/TiltCard';
import FaqAccordion from '@/components/FaqAccordion';
import MagneticButton from '@/components/MagneticButton';

export const metadata: Metadata = {
  title: 'Membership',
  description: 'How to join IEEE Computer Society SUSL, benefits, and membership FAQ.',
};

export default function MembershipPage() {
  const faqs = [
    {
      question: 'Do I need to be a Computer Science major to join?',
      answer:
        'No! Any undergraduate or postgraduate student at Sabaragamuwa University of Sri Lanka with an interest in programming, computing, software development, data science, or technology is enthusiastically welcome to join.',
    },
    {
      question: 'How do I participate in chapter workshops and hackathons?',
      answer:
        'Keep an eye on our Events page, social media channels, and student community groups. Registration links and joining instructions are published ahead of every event. Active IEEE CS members receive priority admission and perks.',
    },
    {
      question: 'Where can I register for official IEEE & IEEE CS membership?',
      answer:
        'Official membership is registered at IEEE.org. During checkout, add the IEEE Computer Society student add-on. Sri Lankan university students qualify for substantial regional discounts.',
    },
    {
      question: 'Can I join the chapter organizing committee?',
      answer:
        'Yes! Each academic year, the chapter opens calls for volunteers, sub-committees (Editorial, Logistics, Webmaster, Public Relations), and subsequent Executive Committee elections.',
    },
  ];

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow mono" style={{ color: '#74c0ea' }}>
            06 · MEMBERSHIP
          </div>
          <h1>Join the learning loop.</h1>
          <p>
            A clear pathway: Join IEEE → Add Computer Society membership → Engage in SUSL chapter activities
            and leadership.
          </p>
          <div className="cs-membership">
            <a
              href="https://www.ieee.org/membership-catalog/productdetail/showProductDetailPage.html?product=MEMC016"
              target="_blank"
              rel="noopener noreferrer"
              className="btn primary"
            >
              Secure the Membership
            </a>
          </div>
        </div>
      </section>

      {/* 3 Simple Steps */}
      <section className="section">
        <div className="container">
          <div className="eyebrow mono">How to join</div>
          <h2 className="section-title">Three simple steps.</h2>

          <div className="steps" style={{ marginTop: '38px' }}>
            <article className="step">
              <div className="step-num">01</div>
              <h3>IEEE Membership</h3>
              <p style={{ marginTop: '12px' }}>
                Create your student account on the official IEEE global portal and select student membership.
              </p>
              <a
                className="link-arrow"
                target="_blank"
                rel="noopener noreferrer"
                href="https://www.ieee.org/membership/join/index.html"
              >
                IEEE.org ↗
              </a>
            </article>

            <article className="step">
              <div className="step-num">02</div>
              <h3>Computer Society</h3>
              <p style={{ marginTop: '12px' }}>
                Add the IEEE Computer Society Society membership to unlock computing publications and resources.
              </p>
              <a
                className="link-arrow"
                target="_blank"
                rel="noopener noreferrer"
                href="https://www.computer.org/membership/join"
              >
                Computer Society ↗
              </a>
            </article>

            <article className="step">
              <div className="step-num">03</div>
              <h3>Chapter Activities</h3>
              <p style={{ marginTop: '12px' }}>
                Get plugged into workshops, global hackathons, volunteer roles, and technical project teams at SUSL.
              </p>
              <Link className="link-arrow" href="/events">
                See events →
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* Member Benefits */}
      <section className="section section-dark">
        <div className="container">
          <div className="eyebrow mono">Benefits</div>
          <h2 className="section-title">What members get from the chapter.</h2>

          <div className="grid g3" style={{ marginTop: '42px' }}>
            <TiltCard>
              <div className="card-icon">01</div>
              <h3>Technical Growth</h3>
              <p>
                Structured hands-on bootcamps, coding workshops, code reviews, and competition coaching.
              </p>
            </TiltCard>

            <TiltCard>
              <div className="card-icon">02</div>
              <h3>Community & Networking</h3>
              <p>
                Peer collaboration, mentorship from senior students and alumni, and direct connections to tech leaders.
              </p>
            </TiltCard>

            <TiltCard>
              <div className="card-icon">03</div>
              <h3>Career & Exposure</h3>
              <p>
                Global IEEE credentials, certifications, leadership recognition, and resume-boosting project portfolios.
              </p>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="container surface" style={{ padding: 'clamp(28px, 5vw, 54px)' }}>
          <div className="split">
            <div>
              <div className="eyebrow mono">FAQ</div>
              <h2 className="section-title">Membership FAQ.</h2>
              <p style={{ marginTop: '14px' }}>
                Have questions about student membership, eligibility, or how to get involved?
              </p>
              <div style={{ marginTop: '24px' }}>
                <MagneticButton href="/contact" variant="primary">
                  Ask a Question →
                </MagneticButton>
              </div>
            </div>

            <FaqAccordion items={faqs} />
          </div>
        </div>
      </section>
    </>
  );
}
