'use client';

import React, { useState, useEffect } from 'react';
import GalleryLightbox from '@/components/GalleryLightbox';
import { getGalleryPhotos } from '@/lib/firestore';
import { INITIAL_GALLERY } from '@/lib/seedData';
import { GalleryPhoto } from '@/lib/types';

export default function GalleryPage() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>(INITIAL_GALLERY);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGalleryPhotos()
      .then((items) => {
        if (items && items.length > 0) setPhotos(items);
      })
      .catch((err) => console.warn('Gallery fetch fallback:', err))
      .finally(() => setLoading(false));
  }, []);

  const displayedPhotos = showAll ? photos : photos.slice(0, 6);
  const hasMore = photos.length > 6;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow mono" style={{ color: '#74c0ea' }}>
            05 · GALLERY
          </div>
          <h1>Moments in action.</h1>
          <p>
            Snapshots from our workshops, competitive programming marathons, speaker series, and chapter milestones.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="eyebrow mono">Event Highlights</div>
          <h2 className="section-title" style={{ marginBottom: '38px' }}>
            Capturing the journey.
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              <GalleryLightbox photos={displayedPhotos} />

              {hasMore && (
                <div style={{ textAlign: 'center', marginTop: '36px' }}>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? 'Show Less ↑' : `Explore More Moments (${photos.length - 6} more) ↓`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
