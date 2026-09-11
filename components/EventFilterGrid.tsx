'use client';

import React, { useState } from 'react';
import TiltCard from './TiltCard';

export interface EventItem {
  id: string;
  type: 'upcoming' | 'past' | 'flagship';
  typeLabel: string;
  date: string;
  title: string;
  description: string;
  image: string;
  tags: string[];
}

interface EventFilterGridProps {
  events: EventItem[];
}

export default function EventFilterGrid({ events }: EventFilterGridProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'past' | 'flagship'>('all');

  const filteredEvents = events.filter((e) => {
    if (activeFilter === 'all') return true;
    return e.type === activeFilter;
  });

  return (
    <div>
      <div className="filters">
        <button
          className={`filter ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All
        </button>
        <button
          className={`filter ${activeFilter === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveFilter('upcoming')}
        >
          Upcoming
        </button>
        <button
          className={`filter ${activeFilter === 'past' ? 'active' : ''}`}
          onClick={() => setActiveFilter('past')}
        >
          Past
        </button>
        <button
          className={`filter ${activeFilter === 'flagship' ? 'active' : ''}`}
          onClick={() => setActiveFilter('flagship')}
        >
          Flagship
        </button>
      </div>

      <div className="event-grid">
        {filteredEvents.map((item) => (
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
                  <span key={tIdx} className="tag-pill">{tag}</span>
                ))}
              </div>
            </div>
          </TiltCard>
        ))}
      </div>
    </div>
  );
}
