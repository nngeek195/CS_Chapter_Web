import React from 'react';
import type { Metadata } from 'next';
import EventFilterGrid, { EventItem } from '@/components/EventFilterGrid';

export const metadata: Metadata = {
  title: 'Events',
  description: 'Upcoming events, past workshops, and flagship competitions by IEEE CS SUSL.',
};

export default function EventsPage() {
  const events: EventItem[] = [
    {
      id: '1',
      type: 'upcoming',
      typeLabel: 'Workshop',
      date: 'March 2026',
      title: 'Technical Workshop Series',
      description: 'Hands-on practical sessions in AI/ML, modern web frameworks, cloud deployment, and developer tooling.',
      image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=82',
      tags: ['Chapter', 'CS', 'Workshop'],
    },
    {
      id: '2',
      type: 'flagship',
      typeLabel: 'Flagship',
      date: 'May 2026',
      title: 'SUSL Annual Hackathon',
      description: 'Competitive 24-hour sprint where student teams solve pressing industry and community challenges.',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=82',
      tags: ['Hackathon', 'Flagship', 'Coding'],
    },
    {
      id: '3',
      type: 'upcoming',
      typeLabel: 'Talk series',
      date: 'April 2026',
      title: 'Tech Talk Series',
      description: 'Inviting global practitioners, alumni in top tech companies, and academic researchers for insightful AMA sessions.',
      image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=82',
      tags: ['Talks', 'Webinar', 'Alumni'],
    },
    {
      id: '4',
      type: 'past',
      typeLabel: 'Competition',
      date: 'October 2025',
      title: 'IEEEXtreme 19.0 Participation',
      description: 'Over 20 SUSL teams tackled 24 hours of grueling competitive programming, setting new national benchmarks.',
      image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=82',
      tags: ['IEEEXtreme', 'Past', 'Global'],
    },
    {
      id: '5',
      type: 'past',
      typeLabel: 'Challenge',
      date: 'August 2025',
      title: 'CSIDC / Chapter Innovation Challenge',
      description: 'Design and software competition centered around social good, healthcare, and sustainable development goals.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=82',
      tags: ['CSIDC', 'Innovation', 'Past'],
    },
    {
      id: '6',
      type: 'flagship',
      typeLabel: 'Flagship',
      date: 'December 2025',
      title: 'Annual Chapter Showcase Day',
      description: 'Celebration of undergraduate research, member milestones, capstone exhibitions, and annual chapter awards.',
      image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=82',
      tags: ['Showcase', 'Celebration', 'Awards'],
    },
  ];

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow mono" style={{ color: '#74c0ea' }}>
            03 · EVENTS
          </div>
          <h1>Events are the engine.</h1>
          <p>
            Upcoming events, past events and flagship chapter activities in one interactive, filterable archive.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="eyebrow mono">Event Archive</div>
          <EventFilterGrid events={events} />
        </div>
      </section>
    </>
  );
}
