'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

export interface EventSlideItem {
  id: string;
  title: string;
  description: string;
  image: string;
  tag?: string;
  typeLabel?: string;
  type?: string;
  date?: string;
  link?: string;
  tags?: string[];
  isSpotlight?: boolean;
}

interface EventsCarouselProps {
  events: EventSlideItem[];
  autoPlayInterval?: number;
}

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=82',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=82',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&q=82',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=82',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1600&q=82',
];

export default function EventsCarousel({
  events,
  autoPlayInterval = 6500,
}: EventsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Touch and drag swipe state
  const touchStartX = useRef<number | null>(null);
  const touchCurrentX = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);

  const total = events.length;

  const nextSlide = useCallback(() => {
    if (total === 0) return;
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total === 0) return;
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = (idx: number) => {
    setActiveIndex(idx);
  };

  // Auto rotation
  useEffect(() => {
    if (isPaused || total <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [isPaused, total, nextSlide, autoPlayInterval]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevSlide, nextSlide]);

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchCurrentX.current !== null) {
      const diffX = touchStartX.current - touchCurrentX.current;
      if (Math.abs(diffX) > 40) {
        if (diffX > 0) nextSlide();
        else prevSlide();
      }
    }
    touchStartX.current = null;
    touchCurrentX.current = null;
    setIsPaused(false);
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    touchStartX.current = e.clientX;
    setIsPaused(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    touchCurrentX.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (isDragging.current && touchStartX.current !== null && touchCurrentX.current !== null) {
      const diffX = touchStartX.current - touchCurrentX.current;
      if (Math.abs(diffX) > 45) {
        if (diffX > 0) nextSlide();
        else prevSlide();
      }
    }
    isDragging.current = false;
    touchStartX.current = null;
    touchCurrentX.current = null;
    setIsPaused(false);
  };

  const handleShare = async (item: EventSlideItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/events#event-${item.id}`
        : '';
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
        if (err.name !== 'AbortError') console.warn(err);
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareData.title}\n${shareUrl}`);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      console.warn('Failed to copy', err);
    }
  };

  if (total === 0) {
    return (
      <div className="events-carousel-empty">
        <p>No featured events scheduled at the moment.</p>
      </div>
    );
  }

  // Calculate circular offset for each event relative to activeIndex
  const getOffset = (index: number) => {
    if (total === 1) return 0;
    let diff = index - activeIndex;
    while (diff > total / 2) diff -= total;
    while (diff < -total / 2) diff += total;
    return diff;
  };

  return (
    <div
      className="events-carousel-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        setIsPaused(false);
        isDragging.current = false;
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 3D Carousel Stage */}
      <div className="events-carousel-stage">
        {events.map((event, index) => {
          const offset = getOffset(index);
          const isCenter = offset === 0;
          const isLeft = offset === -1;
          const isRight = offset === 1;

          let cardClass = 'events-carousel-card';
          if (isCenter) cardClass += ' center-active';
          else if (isLeft) cardClass += ' side-left';
          else if (isRight) cardClass += ' side-right';
          else cardClass += ' hidden-card';

          return (
            <div
              key={event.id || index}
              className={cardClass}
              onClick={() => {
                if (!isCenter) {
                  goToSlide(index);
                }
              }}
              style={
                {
                  '--offset': offset,
                } as React.CSSProperties
              }
            >
              <EventCardMedia
                event={event}
                fallbackImage={FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]}
              />

              <div className="events-carousel-card-body">
                <div className="event-carousel-meta-row">
                  <span className="event-carousel-tag">
                    {event.typeLabel || event.tag || 'Chapter Event'}
                  </span>
                  {event.date && (
                    <span className="event-carousel-date-text">{event.date}</span>
                  )}
                </div>

                <h3 className="event-carousel-card-title">{event.title}</h3>
                <p className="event-carousel-card-desc">{event.description}</p>

                <div className="event-carousel-card-actions">
                  <Link
                    href={event.link || '/events'}
                    className="event-carousel-cta-btn"
                  >
                    <span>{event.isSpotlight ? 'Explore Spotlight' : 'Explore Event'}</span>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <button
                    type="button"
                    className="event-carousel-share-btn"
                    onClick={(e) => handleShare(event, e)}
                    title="Share Event"
                  >
                    {copiedId === event.id ? (
                      <>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        <span>Share</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Navigation Arrows */}
      {total > 1 && (
        <>
          <button
            type="button"
            className="carousel-nav-arrow prev"
            onClick={prevSlide}
            aria-label="Previous event"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            className="carousel-nav-arrow next"
            onClick={nextSlide}
            aria-label="Next event"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Bottom Pagination Indicators */}
      {total > 1 && (
        <div className="carousel-pagination">
          {events.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`carousel-pagination-pill ${i === activeIndex ? 'active' : ''}`}
              onClick={() => goToSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Media component with graceful image fallback handling
function EventCardMedia({
  event,
  fallbackImage,
}: {
  event: EventSlideItem;
  fallbackImage: string;
}) {
  const [src, setSrc] = useState(event.image || fallbackImage);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(event.image || fallbackImage);
    setFailed(false);
  }, [event.image, fallbackImage]);

  const handleError = () => {
    if (!failed) {
      setFailed(true);
      setSrc(fallbackImage);
    }
  };

  return (
    <div className="event-carousel-media-wrapper">
      <img
        src={src}
        alt={event.title}
        onError={handleError}
        className="event-carousel-img"
        loading="lazy"
      />
      <div className="event-carousel-media-overlay" />

      {/* Badges on image */}
      <div className="event-carousel-badge-container top-left">
        {event.date && (
          <span className="event-carousel-pill date-pill">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {event.date}
          </span>
        )}
      </div>

      <div className="event-carousel-badge-container top-right">
        {event.isSpotlight ? (
          <span className="event-carousel-pill spotlight-pill">
            <span className="sparkle">✦</span> Spotlight
          </span>
        ) : event.type === 'flagship' ? (
          <span className="event-carousel-pill flagship-pill">
            ★ Flagship
          </span>
        ) : (
          <span className="event-carousel-pill upcoming-pill">
            <span className="pulse-dot" /> Upcoming
          </span>
        )}
      </div>
    </div>
  );
}
