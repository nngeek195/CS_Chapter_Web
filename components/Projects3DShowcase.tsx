'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { EventItem } from '@/lib/types';

interface Projects3DShowcaseProps {
  events: EventItem[];
}

export default function Projects3DShowcase({ events }: Projects3DShowcaseProps) {
  // Find the index of the spotlight event if any exists
  const spotlightIndex = useMemo(() => {
    if (!events || events.length === 0) return 0;
    const idx = events.findIndex((e) => e.isSpotlight === true);
    return idx !== -1 ? idx : 0;
  }, [events]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Set the front card to the spotlight event when events are loaded
  useEffect(() => {
    if (events && events.length > 0) {
      setActiveIndex(spotlightIndex);
    }
  }, [spotlightIndex, events]);

  const total = events.length;

  const rollNext = useCallback(() => {
    if (total <= 1) return;
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const rollPrev = useCallback(() => {
    if (total <= 1) return;
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const rollTo = useCallback((idx: number) => {
    setActiveIndex(idx);
  }, []);

  const rollToSpotlight = useCallback(() => {
    setActiveIndex(spotlightIndex);
  }, [spotlightIndex]);

  // Gentle auto-roll every 6 seconds, paused when hovered or interacted with
  useEffect(() => {
    if (isPaused || total <= 1) return;
    const timer = setInterval(() => {
      rollNext();
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, total, rollNext]);

  // Touch and swipe gesture handling
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - (touchStartY.current || 0);

    // Prioritize horizontal swipe over vertical scrolling
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        rollNext();
      } else {
        rollPrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Mouse drag handling
  const mouseStartX = useRef<number | null>(null);
  const isDragging = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    isDragging.current = true;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current || mouseStartX.current === null) return;
    const deltaX = e.clientX - mouseStartX.current;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        rollNext();
      } else {
        rollPrev();
      }
    }
    mouseStartX.current = null;
    isDragging.current = false;
  };

  // Circular offset calculation relative to the front active card
  const getOffset = (index: number) => {
    if (total <= 1) return 0;
    let diff = index - activeIndex;
    while (diff > total / 2) diff -= total;
    while (diff < -total / 2) diff += total;
    return diff;
  };

  if (!events || events.length === 0) {
    return (
      <div className="container">
        <div
          style={{
            marginTop: '32px',
            border: '2px dashed var(--line)',
            borderRadius: '20px',
            padding: '56px 36px',
            textAlign: 'center',
            background: 'var(--paper)',
          }}
        >
          
          <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>No showcase events yet</h3>
          <p style={{ color: 'var(--muted)', maxWidth: '420px', margin: '0 auto 20px' }}>
            Head to the Admin panel → Events tab and add events or set a spotlight to showcase them here.
          </p>
          <Link href="/events" className="link-arrow">
            Browse all events →
          </Link>
        </div>
      </div>
    );
  }

  const currentIsSpotlight = events[activeIndex]?.isSpotlight === true;

  return (
    <div
      className="coverflow-wrapper"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      role="region"
      aria-label="3D Projects & Events Showcase"
    >
      {/* 3D Rolling Stage */}
      <div className="coverflow-stage">
        {events.map((event, idx) => {
          const diff = getOffset(idx);
          const isFront = diff === 0;
          const isLeftBack = diff === -1;
          const isRightBack = diff === 1;
          const isSpotlight = event.isSpotlight === true;

          // Determine card class based on 3D depth
          let depthClass = 'coverflow-card-hidden';
          if (isFront) depthClass = 'coverflow-card-front';
          else if (isLeftBack) depthClass = 'coverflow-card-left';
          else if (isRightBack) depthClass = 'coverflow-card-right';
          else if (diff === -2) depthClass = 'coverflow-card-far-left';
          else if (diff === 2) depthClass = 'coverflow-card-far-right';

          return (
            <div
              key={event.id || idx}
              className={`coverflow-card ${depthClass} ${isSpotlight ? 'coverflow-card-spotlight' : ''}`}
              onClick={() => {
                if (!isFront) rollTo(idx);
              }}
              tabIndex={isFront ? 0 : -1}
              aria-hidden={!isFront}
            >
              {/* Card Media Banner */}
              <div className="coverflow-media">
                {event.image ? (
                  <img src={event.image} alt={event.title} />
                ) : (
                  <div className="coverflow-media-placeholder" />
                )}

                {/* Badge: Spotlight or Type Label */}
                <div className="coverflow-badge-row">
                  {isSpotlight && (
                    <span className="coverflow-spotlight-badge">
                      ★ Featured Spotlight
                    </span>
                  )}
                  <span className="coverflow-type-badge">{event.typeLabel}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="coverflow-body">
                <div className="coverflow-meta">
                  <span className="coverflow-date">{event.date}</span>
                  {isFront && (
                    <span className="coverflow-status-pill">Active in Front</span>
                  )}
                </div>

                <h3 className="coverflow-title">{event.title}</h3>
                <p className="coverflow-desc">{event.description}</p>

                {event.tags && event.tags.length > 0 && (
                  <div className="coverflow-tags">
                    {event.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="coverflow-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {isFront && event.link && (
                  <div className="coverflow-action">
                    <Link
                      href={event.link}
                      className="coverflow-cta-btn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Explore Project ↗
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Controls & Rolling Navigation */}
      <div className="coverflow-controls-container">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={rollPrev}
          className="coverflow-arrow-btn"
          aria-label="Roll to previous card"
          title="Previous"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>

        {/* Center Indicators / Spotlight Snapper */}
        <div className="coverflow-indicators-wrap">
          {/* Snap Back to Spotlight button (shows if user has rolled away) */}
          {!currentIsSpotlight && events[spotlightIndex]?.isSpotlight && (
            <button
              type="button"
              onClick={rollToSpotlight}
              className="coverflow-snap-spotlight"
              title="Snap back to front spotlight"
            >
              ⭐ Roll to Spotlight
            </button>
          )}

          {/* Indicator Dots */}
          <div className="coverflow-dots">
            {events.map((ev, i) => (
              <button
                key={ev.id || i}
                type="button"
                className={`coverflow-dot ${i === activeIndex ? 'active' : ''} ${ev.isSpotlight ? 'spotlight-dot' : ''}`}
                onClick={() => rollTo(i)}
                aria-label={`Jump to item ${i + 1}: ${ev.title}`}
                title={ev.isSpotlight ? `Spotlight: ${ev.title}` : ev.title}
              />
            ))}
          </div>
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={rollNext}
          className="coverflow-arrow-btn"
          aria-label="Roll to next card"
          title="Next"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </div>

      {/* Helpful Hint */}
      <div className="coverflow-hint mono">
        Click side cards or drag to roll · Spotlight centered in front
      </div>
    </div>
  );
}
