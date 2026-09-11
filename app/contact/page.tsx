import React from 'react';
import type { Metadata } from 'next';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact IEEE Computer Society Chapter at Sabaragamuwa University of Sri Lanka.',
};

export default function ContactPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow mono" style={{ color: '#74c0ea' }}>
            07 · CONTACT
          </div>
          <h1>Get in touch with us.</h1>
          <p>
            Have a collaboration idea, question about chapter membership, or want to sponsor an event?
            We would love to hear from you.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="contact-grid">
            {/* Interactive Form */}
            <ContactForm />

            {/* Chapter Location and Info Panel */}
            <div className="map-panel">
              <div className="eyebrow mono" style={{ color: '#88d2f7' }}>
                Chapter Headquarters
              </div>
              <h3 style={{ fontSize: '28px', marginTop: '10px' }}>
                Sabaragamuwa University of Sri Lanka
              </h3>
              <p style={{ marginTop: '14px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.8 }}>
                Faculty of Applied Sciences<br />
                Department of Computing and Information Systems<br />
                P.O. Box 02, Pambahinna, Belihuloya 70140<br />
                Sri Lanka
              </p>

              <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '20px' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.6)' }}>
                  Official Email
                </div>
                <a
                  href="mailto:ieeecs@sab.ac.lk"
                  style={{ color: '#fff', fontSize: '18px', fontWeight: 600, display: 'inline-block', marginTop: '4px' }}
                >
                  ieeecs@sab.ac.lk
                </a>
              </div>

              <div className="map-pin"></div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
