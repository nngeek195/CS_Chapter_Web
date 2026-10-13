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
            06 · CONTACT
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
                Faculty of Computing,<br />
                P.O. Box 02, Pambahinna, Belihuloya 70140<br />
                Sri Lanka
              </p>

              {/* Sabaragamuwa University Campus Map */}
              <div style={{ marginTop: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontWeight: 600,
                    }}
                  >
                    Campus Map
                  </span>
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Sabaragamuwa+University+of+Sri+Lanka"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '11px',
                      color: '#88d2f7',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600,
                    }}
                  >
                    View on Google Maps ↗
                  </a>
                </div>

                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '230px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                    background: 'rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <iframe
                    title="Sabaragamuwa University of Sri Lanka Map"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=80.7760%2C6.7040%2C80.7980%2C6.7240&layer=mapnik&marker=6.7142%2C80.7872"
                    width="100%"
                    height="100%"
                    style={{ border: 0, display: 'block' }}
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
