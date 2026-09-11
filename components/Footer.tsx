import React from 'react';
import Link from 'next/link';
import TypographyVortexCanvas from '@/components/TypographyVortexCanvas';

export default function Footer() {
  return (
    <footer>
      {/* Background Typography Vortex animation with low opacity */}
      <div className="footer-bg-vortex" aria-hidden="true">
        <TypographyVortexCanvas
          phrase="IEEE CS CHAPTER | SUSL / "
          mode="dark"
          speed={0.8}
          ringGrowth={1.21}
          opacity={0.35}
          dissolveRadius={1.2}
          particleAmount={1.1}
          background="transparent"
          showHint={false}
        />
      </div>

      <div className="container">
        <div className="footer-grid">
          <div>
            <Link href="/" className="brand" aria-label="IEEE CS SUSL Chapter Home">
              <img
                src="/images/logo.png"
                alt="IEEE Computer Society SUSL Logo"
                className="brand-logo"
              />
              <span className="brand-name">IEEE CS · SUSL</span>
            </Link>
            <p style={{ marginTop: '18px', maxWidth: '34ch' }}>
              A professional chapter platform for technical learning, coding culture,
              community and research exposure at Sabaragamuwa University of Sri Lanka.
            </p>
          </div>

          <div>
            <h4>Explore</h4>
            <Link href="/about">About</Link>
            <Link href="/leadership">Leadership</Link>
            <Link href="/events">Events</Link>
            <Link href="/gallery">Gallery</Link>
          </div>

          <div>
            <h4>Participate</h4>
            <Link href="/membership">Membership</Link>
            <Link href="/resources">Resources</Link>
            <Link href="/contact">Contact</Link>
          </div>

          <div>
            <h4>Connect</h4>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a>
            <a href="mailto:ieeecs@sab.ac.lk">ieeecs@sab.ac.lk</a>
          </div>
        </div>

        {/* Restored IEEE CS Chapter Mark */}
        <div className="footer-mark">IEEE CS</div>

        <div className="footer-bottom">
          <span>IEEE Computer Society Chapter · Sabaragamuwa University of Sri Lanka</span>
          <span>© {new Date().getFullYear()} Chapter Website</span>
        </div>
      </div>
    </footer>
  );
}
