'use client';

import React, { useState, useEffect } from 'react';
import TiltCard from '@/components/TiltCard';
import { getResources } from '@/lib/firestore';
import { INITIAL_RESOURCES } from '@/lib/seedData';
import { ResourceItem } from '@/lib/types';

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>(INITIAL_RESOURCES);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResources()
      .then((res) => {
        if (res && res.length > 0) setResources(res);
      })
      .catch((err) => console.warn('Resources fetch fallback:', err))
      .finally(() => setLoading(false));
  }, []);

  const displayedResources = showAll ? resources : resources.slice(0, 6);
  const hasMore = resources.length > 6;

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

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              <div className="resource-grid" style={{ marginTop: '38px' }}>
                {displayedResources.map((item) => (
                  <TiltCard key={item.id} className="resource">
                    <div className="resource-thumb">
                      <span>{item.category}</span>
                    </div>
                    <div className="resource-body">
                      <h3>{item.title}</h3>
                      <p style={{ marginTop: '10px' }}>{item.description}</p>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-arrow"
                        style={{ marginTop: '16px', display: 'inline-block' }}
                      >
                        Access Resource ↗
                      </a>
                    </div>
                  </TiltCard>
                ))}
              </div>

              {hasMore && (
                <div style={{ textAlign: 'center', marginTop: '36px' }}>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? 'Show Less ↑' : `Explore More Resources (${resources.length - 6} more) ↓`}
                  </button>
                </div>
              )}
            </>
          )}
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
            <h3>Member Benefit Highlights</h3>
            <ul style={{ marginTop: '14px', paddingLeft: '20px', lineHeight: 1.8 }}>
              <li>Access to IEEE Computer Society Digital Library (CSDL)</li>
              <li>Subscription to <em>Computer</em> flagship magazine</li>
              <li>Free access to over 3,000 online training courses</li>
              <li>Student discounts for top IEEE technical conferences</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
