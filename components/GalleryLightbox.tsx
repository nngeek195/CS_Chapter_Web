'use client';

import React, { useState, useEffect } from 'react';

interface GalleryPhoto {
  src: string;
  alt: string;
  caption?: string;
}

interface GalleryLightboxProps {
  photos: GalleryPhoto[];
}

export default function GalleryLightbox({ photos }: GalleryLightboxProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPhoto(null);
      }
    };

    if (selectedPhoto) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPhoto]);

  return (
    <>
      <div className="gallery-grid">
        {photos.map((photo, idx) => (
          <div
            key={idx}
            className="gallery-item"
            onClick={() => setSelectedPhoto(photo)}
          >
            <img src={photo.src} alt={photo.alt} loading="lazy" />
          </div>
        ))}
      </div>

      {selectedPhoto && (
        <div
          className="lightbox"
          onClick={() => setSelectedPhoto(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="lightbox-close"
            onClick={() => setSelectedPhoto(null)}
            aria-label="Close lightbox"
          >
            ✕
          </button>
          <img
            src={selectedPhoto.src}
            alt={selectedPhoto.alt}
            onClick={(e) => e.stopPropagation()}
          />
          {selectedPhoto.caption && (
            <p
              style={{
                position: 'absolute',
                bottom: '24px',
                color: '#fff',
                fontSize: '14px',
                background: 'rgba(0,0,0,0.6)',
                padding: '6px 16px',
                borderRadius: '99px',
              }}
            >
              {selectedPhoto.caption}
            </p>
          )}
        </div>
      )}
    </>
  );
}
