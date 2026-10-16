'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import TiltCard from '@/components/TiltCard';

export default function DevelopersPage() {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [consoleTriggered, setConsoleTriggered] = useState(false);

  const developers = [
    {
      name: 'Niranga Nayanajith',
      role: 'Lead Developer',
      roleBadge: '⚡ Lead Developer',
      badgeColor: '#00629B',
      photo: '/images/developers/niranga.jpg',
      linkedin: 'https://www.linkedin.com/in/niranga-nayanajith/',
      affiliation: 'IEEE Computer Society Chapter · SUSL',
      bio: 'Architected and led the full-stack engineering, cloud infrastructure, and technical execution of the IEEE CS SUSL platform. Passionate about software architecture, modern web ecosystems, and empowering developer communities.',
      skills: ['Next.js App Router', 'TypeScript', 'Full-Stack Architecture', 'Firebase', 'Cloudinary', 'System Design'],
    },
    {
      name: 'Kaveesha Sandeepani',
      role: 'Front end Developer',
      roleBadge: '🎨 Front end Developer',
      badgeColor: '#FF6C0C',
      photo: '/images/developers/kaveesha.jpg',
      linkedin: 'https://www.linkedin.com/in/kaveesha-sandeepani/',
      affiliation: 'IEEE Computer Society Chapter · SUSL',
      bio: 'Crafted the user interface, interactive components, responsive aesthetics, and design systems for the IEEE CS SUSL digital experience. Dedicated to modern frontend development, UI/UX refinement, and accessible experiences.',
      skills: ['React 18', 'Front-End Architecture', 'UI / UX Design', 'CSS3 & Animations', 'Responsive Web', 'Design Systems'],
    },
  ];

  const handleCopy = (link: string, name: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopiedLink(name);
      setTimeout(() => setCopiedLink(null), 2500);
    }
  };

  const triggerConsoleLog = () => {
    const line = '═'.repeat(60);
    const subLine = '─'.repeat(60);
    console.log(
      `%c\n` +
      `╔${line}╗\n` +
      `║        🚀 IEEE CS SUSL · CONTACT THE DEVELOPERS           ║\n` +
      `╚${line}╝\n\n` +
      `%c👨‍💻 LEAD DEVELOPER: Niranga Nayanajith\n` +
      `   🔗 https://www.linkedin.com/in/niranga-nayanajith/\n\n` +
      `👩‍💻 FRONT END DEVELOPER: Kaveesha Sandeepani\n` +
      `   🔗 https://www.linkedin.com/in/kaveesha-sandeepani/\n\n` +
      `✨ Feel free to connect with us on LinkedIn or collaborate with IEEE CS SUSL!\n`,
      'color: #00629B; font-size: 14px; font-weight: bold; font-family: monospace;',
      'color: #FF6C0C; font-size: 13px; font-weight: 600; font-family: monospace;'
    );
    setConsoleTriggered(true);
    setTimeout(() => setConsoleTriggered(false), 3000);
  };

  return (
    <>
      {/* Secret Hero Banner */}
      <section className="page-hero" style={{ background: 'linear-gradient(145deg, #040d14 0%, #062b40 50%, #003B5C 100%)' }}>
        <div className="container">
          <div className="eyebrow mono" style={{ color: '#68cdf9', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#00e676',
                boxShadow: '0 0 12px #00e676',
              }}
            />
            0xDEV · SECRET CHAMBER · EASTER EGG UNLOCKED 🔓
          </div>

          <h1 style={{ maxWidth: '14ch' }}>
            Meet the <span className="accent">Developers.</span>
          </h1>

          <p style={{ maxWidth: '70ch' }}>
            You discovered the developer console! Meet the engineering team behind the official IEEE Computer Society Chapter platform at Sabaragamuwa University of Sri Lanka.
          </p>

          {/* Terminal Console Snippet */}
          <div
            style={{
              marginTop: '36px',
              maxWidth: '680px',
              background: 'rgba(5, 15, 23, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '18px 24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#d1e3ee',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', opacity: 0.6 }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }}></span>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }}></span>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f', display: 'inline-block' }}></span>
              <span style={{ marginLeft: '12px', fontSize: '11px', letterSpacing: '0.1em' }}>bash ~ ieee-cs-susl/dev-chamber</span>
            </div>
            <div style={{ lineHeight: 1.8 }}>
              <span style={{ color: '#68cdf9' }}>$</span> <span style={{ color: '#fff' }}>curl -s https://cschaptersusl.org/api/developers</span><br />
              <span style={{ color: '#27c93f' }}>[200 OK]</span> Loaded developer profiles:<br />
              &nbsp;&nbsp;→ <span style={{ color: '#FF6C0C', fontWeight: 'bold' }}>Niranga Nayanajith</span> <span style={{ opacity: 0.7 }}>[Lead Developer]</span><br />
              &nbsp;&nbsp;→ <span style={{ color: '#FF6C0C', fontWeight: 'bold' }}>Kaveesha Sandeepani</span> <span style={{ opacity: 0.7 }}>[Front end Developer]</span><br />
              <span style={{ color: '#ffbd2e' }}>[STATUS]</span> Ready to connect & collaborate! 🚀
            </div>
          </div>
        </div>
      </section>

      {/* Developers Profiles Grid */}
      <section className="section" style={{ background: 'var(--paper)', paddingTop: '60px', paddingBottom: '70px' }}>
        <div className="container">
          <div className="eyebrow mono">ENGINEERING TEAM</div>
          <h2 className="section-title">Contact the developers.</h2>
          <p style={{ marginTop: '12px', maxWidth: '65ch', color: 'var(--muted)' }}>
            The creative and engineering force powering our chapter's digital experiences, responsive design, and technological framework.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '32px',
              marginTop: '45px',
            }}
          >
            {developers.map((dev) => (
              <TiltCard
                key={dev.name}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '32px',
                  borderRadius: '20px',
                  background: 'var(--white)',
                  border: '1px solid var(--line)',
                  boxShadow: '0 16px 48px rgba(0, 59, 92, 0.08)',
                  transition: 'transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)',
                }}
              >
                {/* Developer Avatar & Header */}
                <div style={{ display: 'flex', gap: '22px', alignItems: 'center' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '100px',
                      height: '100px',
                      minWidth: '100px',
                      borderRadius: '18px',
                      overflow: 'hidden',
                      border: '3px solid #ffffff',
                      boxShadow: '0 8px 24px rgba(0, 59, 92, 0.18)',
                    }}
                  >
                    <img
                      src={dev.photo}
                      alt={dev.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </div>

                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        background: dev.role.includes('Lead')
                          ? 'rgba(0, 98, 155, 0.12)'
                          : 'rgba(255, 108, 12, 0.12)',
                        color: dev.badgeColor,
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                      }}
                    >
                      {dev.roleBadge}
                    </span>
                    <h3 style={{ fontSize: '24px', lineHeight: 1.2, margin: 0, color: 'var(--ink)' }}>
                      {dev.name}
                    </h3>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px', fontWeight: 500 }}>
                      {dev.affiliation}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <p style={{ marginTop: '22px', fontSize: '14.5px', lineHeight: 1.7, color: 'var(--muted)', flexGrow: 1 }}>
                  {dev.bio}
                </p>

                {/* Specialties / Skills Tags */}
                <div style={{ marginTop: '22px' }}>
                  <div className="mono" style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '8px' }}>
                    Specialties & Stack
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {dev.skills.map((skill) => (
                      <span
                        key={skill}
                        style={{
                          background: 'rgba(0, 59, 92, 0.05)',
                          border: '1px solid rgba(0, 59, 92, 0.08)',
                          color: 'var(--navy)',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions & LinkedIn Button */}
                <div
                  style={{
                    marginTop: '28px',
                    paddingTop: '20px',
                    borderTop: '1px solid var(--line)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <a
                    href={dev.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn primary"
                    style={{
                      textDecoration: 'none',
                      fontSize: '13px',
                      padding: '11px 20px',
                      gap: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    {/* LinkedIn SVG Icon */}
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z" />
                    </svg>
                    <span>Connect on LinkedIn</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopy(dev.linkedin, dev.name)}
                    className="btn secondary"
                    style={{
                      background: 'rgba(0, 98, 155, 0.08)',
                      borderColor: 'rgba(0, 98, 155, 0.15)',
                      color: 'var(--navy)',
                      fontSize: '12.5px',
                      padding: '11px 16px',
                    }}
                  >
                    {copiedLink === dev.name ? '✓ Copied Link' : 'Copy Profile Link'}
                  </button>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Developers Section */}
      <section className="section section-dark" style={{ background: '#031420', color: '#fff' }}>
        <div className="container">
          <div className="eyebrow mono" style={{ color: '#68cdf9' }}>CONNECT DIRECTLY</div>
          <h2 className="section-title">Want to collaborate or discuss the project?</h2>
          <p style={{ marginTop: '14px', maxWidth: '64ch', color: 'rgba(255, 255, 255, 0.72)', fontSize: '16px' }}>
            Whether you want to report a bug, inquire about technical implementation, suggest enhancements, or collaborate on tech ventures, the developers are reachable on LinkedIn and via the chapter.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              marginTop: '36px',
            }}
          >
            <a
              href="https://www.linkedin.com/in/niranga-nayanajith/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn primary"
              style={{ textDecoration: 'none' }}
            >
              Message Niranga (Lead Dev) →
            </a>

            <a
              href="https://www.linkedin.com/in/kaveesha-sandeepani/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn primary"
              style={{ background: '#00629B', borderColor: '#00629B', textDecoration: 'none' }}
            >
              Message Kaveesha (Front end Dev) →
            </a>

            <button
              type="button"
              onClick={triggerConsoleLog}
              className="btn secondary"
              style={{ cursor: 'pointer' }}
            >
              {consoleTriggered ? '✓ Printed to Console!' : 'Re-run Console Banner 💻'}
            </button>

            <Link href="/" className="btn secondary" style={{ textDecoration: 'none' }}>
              Back to Home
            </Link>
          </div>

          {/* Tech Stack Highlights */}
          <div
            style={{
              marginTop: '60px',
              paddingTop: '36px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '24px',
            }}
          >
          </div>
        </div>
      </section>
    </>
  );
}
