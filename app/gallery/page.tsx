import React from 'react';
import type { Metadata } from 'next';
import GalleryLightbox from '@/components/GalleryLightbox';

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'Photo highlights and moments from IEEE CS SUSL events, workshops, and hackathons.',
};

export default function GalleryPage() {
  const photos = [
    {
      src: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=82',
      alt: 'Students collaborating during technical workshop',
      caption: 'Collaborative Problem Solving Session',
    },
    {
      src: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=82',
      alt: 'Hands-on coding lab at Sabaragamuwa University',
      caption: 'Hands-on Coding Lab',
    },
    {
      src: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=82',
      alt: 'Tech Talk keynote presentation',
      caption: 'Guest Speaker Keynote & Discussion',
    },
    {
      src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=82',
      alt: 'Hackathon team sprinting through the night',
      caption: 'IEEEXtreme Hackathon Team Sprint',
    },
    {
      src: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=82',
      alt: 'Chapter annual showcase and awards',
      caption: 'Annual Chapter Showcase & Awards',
    },
    {
      src: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=82',
      alt: 'Workshop participants sharing demo code',
      caption: 'Participant Demo & Knowledge Exchange',
    },
  ];

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

          <GalleryLightbox photos={photos} />
        </div>
      </section>
    </>
  );
}
