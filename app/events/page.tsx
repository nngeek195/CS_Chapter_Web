'use client';

import React, { useState, useEffect } from 'react';
import EventFilterGrid from '@/components/EventFilterGrid';
import { getEvents, getEventCategories } from '@/lib/firestore';
import { INITIAL_EVENTS, INITIAL_CATEGORIES } from '@/lib/seedData';
import { EventItem, EventCategory } from '@/lib/types';

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [categories, setCategories] = useState<EventCategory[]>(INITIAL_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEvents(), getEventCategories()])
      .then(([evts, cats]) => {
        if (evts && evts.length > 0) setEvents(evts);
        if (cats && cats.length > 0) setCategories(cats);
      })
      .catch((err) => console.warn('Events fetch fallback:', err))
      .finally(() => setLoading(false));
  }, []);

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
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <EventFilterGrid events={events} categories={categories} />
          )}
        </div>
      </section>
    </>
  );
}
