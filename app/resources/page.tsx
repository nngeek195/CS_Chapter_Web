import React from 'react';
import type { Metadata } from 'next';
import TiltCard from '@/components/TiltCard';

export const metadata: Metadata = {
  title: 'Resources',
  description: 'Technical learning materials, workshop recordings, competition kits, and research guides.',
};

export default function ResourcesPage() {
  const resources = [
    {
      category: 'Workshop Kit',
      title: 'Full-Stack Web Development Handbook',
      description: 'Modern guide covering Next.js, TypeScript, REST & GraphQL APIs, and Docker deployments.',
      link: '#',
    },
    {
      category: 'IEEEXtreme Prep',
      title: 'Competitive Programming Cheat Sheet',
      description: 'Data structures, graph algorithms, dynamic programming templates, and practice problem sets.',
      link: '#',
    },
    {
      category: 'AI & Data Science',
      title: 'Machine Learning Fundamentals & PyTorch',
      description: 'Introductory notebook collection covering supervised learning, neural networks, and model evaluation.',
      link: '#',
    },
    {
      category: 'Research',
      title: 'IEEE Research Paper Writing Guide',
      description: 'LaTeX templates, citation standards, writing abstracts, and submitting to IEEE conferences.',
      link: '#',
    },
    {
      category: 'Open Source',
      title: 'Git & GitHub Workflow for Teams',
      description: 'Branching strategies, pull request etiquette, continuous integration, and collaborative development.',
      link: '#',
    },
    {
      category: 'Cloud & DevOps',
      title: 'Cloud Architecture & Microservices',
      description: 'Introduction to containerization, serverless functions, and deploying resilient cloud applications.',
      link: '#',
    },
  ];

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow mono" style={{ color: '#74c0ea' }}>
            04 · RESOURCES
          </div>
          <h1>Learn, build, and publish.</h1>
          <p>
            Curated learning tracks, coding challenge archives, research guidelines, and engineering toolkits
            maintained by IEEE CS SUSL members.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="eyebrow mono">Curated Materials</div>
          <h2 className="section-title">Knowledge repository.</h2>

          <div className="resource-grid" style={{ marginTop: '38px' }}>
            {resources.map((item, idx) => (
              <TiltCard key={idx} className="resource">
                <div className="resource-thumb">
                  <span>{item.category}</span>
                </div>
                <div className="resource-body">
                  <h3>{item.title}</h3>
                  <p style={{ marginTop: '10px' }}>{item.description}</p>
                  <a href={item.link} className="link-arrow" style={{ marginTop: '16px' }}>
                    Access Resource ↗
                  </a>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* IEEE Digital Library Access */}
      <section className="section section-dark">
        <div className="container split">
          <div>
            <div className="eyebrow mono">IEEE Xplore</div>
            <h2 className="section-title">Access millions of scientific documents.</h2>
            <p style={{ marginTop: '18px', color: 'rgba(255,255,255,0.7)' }}>
              IEEE CS student members receive discounted and institutional access to IEEE Xplore Digital
              Library — the leading repository for electrical engineering, computer science, and electronics literature.
            </p>
          </div>

          <div className="surface card">
            <h3>Student Member Perks</h3>
            <ul style={{ marginTop: '16px', paddingLeft: '20px', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li>Free access to Computer.org digital magazine & articles</li>
              <li>Discounts on IEEE certifications (Cybersecurity, Software Engineering)</li>
              <li>Free @ieee.org professional email alias</li>
              <li>Eligibility for international travel grants and scholarships</li>
            </ul>
            <a
              href="https://www.computer.org"
              target="_blank"
              rel="noopener noreferrer"
              className="link-arrow"
              style={{ marginTop: '20px' }}
            >
              Explore Computer.org ↗
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
