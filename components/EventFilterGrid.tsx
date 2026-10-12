'use client';

import React, { useState } from 'react';
import TiltCard from './TiltCard';
import { EventItem, EventCategory } from '@/lib/types';
import { INITIAL_CATEGORIES } from '@/lib/seedData';

export type { EventItem };

interface EventFilterGridProps {
  events: EventItem[];
  categories?: EventCategory[];
}

export default function EventFilterGrid({
  events,
  categories = INITIAL_CATEGORIES,
}: EventFilterGridProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(6);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleFilterChange = (key: string) => {
    setActiveFilter(key);
    setVisibleCount(6);
  };

  const filteredEvents = events.filter((e) => {
    if (activeFilter === 'all') return true;
    return e.type.toLowerCase() === activeFilter.toLowerCase();
  });

  const displayedEvents = filteredEvents.slice(0, visibleCount);
  const hasMore = filteredEvents.length > visibleCount;

  const handleShare = async (item: EventItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/events#event-${item.id}` : '';
    const shareData = {
      title: `${item.title} — IEEE CS SUSL`,
      text: `${item.title}: ${item.description}`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Share error:', err);
        }
      }
    }

    // Fallback: Copy link to clipboard
    try {
      await navigator.clipboard.writeText(`${shareData.title}\n${shareUrl}`);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div>
      {/* Category Filter Pills */}
      <div className="filters">
        {categories.map((cat) => (
          <button
            key={cat.key}
            className={`filter ${activeFilter === cat.key ? 'active' : ''}`}
            onClick={() => handleFilterChange(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filteredEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
          <p>No events found for this category.</p>
        </div>
      ) : (
        <>
          <div className="event-grid">
            {displayedEvents.map((item) => (
              <TiltCard key={item.id} className="event-card" style={{ padding: 0 }}>
                <div className="event-media">
                  <img src={item.image} alt={item.title} />
                </div>
                <div className="event-body">
                  <div className="meta">
                    <span>{item.date}</span>
                    <span>{item.typeLabel}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className="tag-row">
                    {item.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="tag-pill">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '16px',
                      paddingTop: '14px',
                      borderTop: '1px solid var(--line)',
                    }}
                  >
                    {item.link ? (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-arrow"
                        style={{ fontSize: '12px' }}
                      >
                        Register / Learn ↗
                      </a>
                    ) : (
                      <span></span>
                    )}

                    <button
                      type="button"
                      className="event-share-btn"
                      onClick={(e) => handleShare(item, e)}
                      title="Share Event"
                    >
                      {copiedId === item.id ? '✓ Link Copied' : '🔗 Share'}
                    </button>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>

          {/* Show More / Show Less Button if > 6 events */}
          {filteredEvents.length > 6 && (
            <div style={{ textAlign: 'center', marginTop: '42px' }}>
              {hasMore ? (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                >
                  Show More Events ({filteredEvents.length - visibleCount} more) ↓
                </button>
              ) : (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setVisibleCount(6)}
                >
                  Show Less ↑
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
