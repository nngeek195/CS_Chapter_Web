'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StatsCounter from '@/components/StatsCounter';
import TiltCard from '@/components/TiltCard';
import MagneticButton from '@/components/MagneticButton';
import Scene from '@/components/Scene';
import LoadingScreen from '@/components/LoadingScreen';
import AdvisorCard from '@/components/AdvisorCard';
import EventsCarousel, { EventSlideItem } from '@/components/EventsCarousel';
import { getSpotlight, getEvents, getFacultyAdvisor } from '@/lib/firestore';
import { INITIAL_SPOTLIGHT, INITIAL_EVENTS, INITIAL_ADVISOR } from '@/lib/seedData';
import { SpotlightData, EventItem, FacultyAdvisorData } from '@/lib/types';

export default function HomePage() {
  const [animationLoaded, setAnimationLoaded] = useState(false);
  const [orbOffset, setOrbOffset] = useState({ x: 0, y: 0 });
  const [spotlight, setSpotlight] = useState<SpotlightData>(INITIAL_SPOTLIGHT);
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [advisor, setAdvisor] = useState<FacultyAdvisorData>(INITIAL_ADVISOR);

  useEffect(() => {
    getSpotlight().then((data) => {
      if (data) setSpotlight(data);
    });
    getEvents().then((evts) => {
      if (evts && evts.length > 0) setEvents(evts);
    });
    getFacultyAdvisor().then(setAdvisor);
  }, []);

  const featuredEventSlides = React.useMemo<EventSlideItem[]>(() => {
    const list: EventSlideItem[] = [];

    // 1. Featured spotlight card (InnovaX / active spotlight)
    if (spotlight && spotlight.title) {
      list.push({
        id: 'spotlight-featured',
        title: spotlight.title,
        description: spotlight.description,
        image: spotlight.image,
        tag: spotlight.tag || 'Flagship Series · 2026',
        typeLabel: 'Featured Spotlight',
        type: 'flagship',
        date: spotlight.tag || 'Featured 2026',
        link: spotlight.link || '/events',
        tags: ['Spotlight', 'Flagship', 'IEEE CS'],
        isSpotlight: true,
      });
    }

    // 2. Upcoming & Flagship events from events collection
    const upcomingAndFlagship = events.filter(
      (e) => e.type === 'upcoming' || e.type === 'flagship'
    );

    upcomingAndFlagship.forEach((evt) => {
      if (!list.some((s) => s.title.trim().toLowerCase() === evt.title.trim().toLowerCase())) {
        list.push({
          id: evt.id,
          title: evt.title,
          description: evt.description,
          image: evt.image,
          tag: evt.typeLabel || (evt.type === 'flagship' ? 'Flagship' : 'Upcoming'),
          typeLabel: evt.typeLabel || (evt.type === 'flagship' ? 'Flagship' : 'Upcoming Event'),
          type: evt.type,
          date: evt.date,
          link: evt.link || '/events',
          tags: evt.tags || ['Chapter', 'CS'],
          isSpotlight: false,
        });
      }
    });

    // 3. If there are fewer than 3 events, fill with other events for full carousel depth
    if (list.length < 3) {
      events.forEach((evt) => {
        if (!list.some((s) => s.title.trim().toLowerCase() === evt.title.trim().toLowerCase())) {
          list.push({
            id: evt.id,
            title: evt.title,
            description: evt.description,
            image: evt.image,
            tag: evt.typeLabel || evt.type,
            typeLabel: evt.typeLabel || 'Chapter Event',
            type: evt.type,
            date: evt.date,
            link: evt.link || '/events',
            tags: evt.tags || ['Chapter', 'CS'],
            isSpotlight: false,
          });
        }
      });
    }

    return list;
  }, [spotlight, events]);

  const stats = [
    { end: 120, suffix: '+', label: 'Active members' },
    { end: 24, suffix: '+', label: 'Events & sessions' },
    { end: 3, suffix: '+', label: 'Years active' },
    { end: 12, suffix: '+', label: 'Workshops delivered' },
  ];

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 35;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 25;
    setOrbOffset({ x, y });
  };

  const handleHeroMouseLeave = () => {
    setOrbOffset({ x: 0, y: 0 });
  };

  return (
    <>
      {/* Chapter Animation Loading Bar Screen */}
      <LoadingScreen isLoaded={animationLoaded} />

      {/* Hero Section */}
      <section
        className="hero hero-centered"
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
      >
        {/* ThreeUI ConstellationField Background Animation */}
        <Scene onLoaded={() => setAnimationLoaded(true)} />
        <div
          className="hero-orb"
          style={{
            transform: `translate(calc(-50% + ${orbOffset.x}px), calc(-50% + ${orbOffset.y}px))`,
          }}
        ></div>

        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <div className="hero-copy hero-copy-centered">
            <div className="eyebrow mono" style={{ color: 'white' }}>
              SABARAGAMUWA UNIVERSITY OF SRI LANKA
            </div>
            <h1>
              IEEE <span className="accent">CS</span> Chapter
            </h1>
            <p className="lead">
              Science. Technology. Engineering. A modern home for computing students to
              explore technical workshops, coding competitions, networking, certifications,
              research exposure and chapter-led opportunities.
            </p>
            <div className="hero-ctas">
              <MagneticButton href="/membership" variant="primary">
                Join IEEE CS ↗
              </MagneticButton>
              <MagneticButton href="/events" variant="secondary">
                Explore Events →
              </MagneticButton>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Stats Band */}
      <StatsCounter stats={stats} />

      {/* What We Do */}
      <section className="section">
        <div className="container split">
          <div>
            <div className="eyebrow mono">What we do</div>
            <h2 className="section-title">Computer science with a community around it.</h2>
            <p className="section-lead">
              Our chapter connects academic foundation with real-world skills through student-led
              workshops, global competitions, mentorship, and professional networking.
            </p>
          </div>

          <div className="list-rows">
            <Link className="list-row" href="/resources">
              <span className="index">01</span>
              <span>
                <h4>Technical Workshops</h4>
                <p>AI/ML, web technologies, cloud architectures, tools and hands-on coding.</p>
              </span>
              <span>→</span>
            </Link>
            <Link className="list-row" href="/events">
              <span className="index">02</span>
              <span>
                <h4>Coding Competitions</h4>
                <p>IEEEXtreme, CSIDC, university hackathons and competitive programming challenges.</p>
              </span>
              <span>→</span>
            </Link>
            <Link className="list-row" href="/leadership">
              <span className="index">03</span>
              <span>
                <h4>Networking & Mentorship</h4>
                <p>Industry leaders, alumni network, faculty guides and peer collaboration.</p>
              </span>
              <span>→</span>
            </Link>
            <Link className="list-row" href="/resources">
              <span className="index">04</span>
              <span>
                <h4>Research & Certifications</h4>
                <p>Talks, IEEE digital library access, academic publications, and certification pathways.</p>
              </span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="section" style={{ paddingTop: 0, overflow: 'hidden' }}>
        <div className="container">
          <div className="spotlight-head">
            <div>
              <div className="eyebrow mono">Featured / upcoming</div>
              <h2 className="section-title">Our Events</h2>
              <p className="section-lead">
                Keeping the spotlight on what matters now, with the full archive preserved on the Events page.
              </p>
            </div>
          </div>

          <EventsCarousel events={featuredEventSlides} />

          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <MagneticButton href="/events" variant="primary">
              View all events →
            </MagneticButton>
          </div>
        </div>
      </section>

      {/* Why Join IEEE CS */}
      <section className="section section-dark why-join-section">
        <div className="why-join-bg" />
        <div className="container">
          <div className="eyebrow mono">Why join IEEE CS</div>
          <h2 className="section-title">More than a membership badge.</h2>
          <div className="grid g3" style={{ marginTop: '46px' }}>
            <TiltCard className="titlecard">
              <div className="card-icon">01</div>
              <h3>Learn by doing</h3>
              <p>
                Hands-on workshops, bootcamps, and competition preparation turn abstract concepts into code
                and deployed projects you can showcase.
              </p>
            </TiltCard>

            <TiltCard className="titlecard">
              <div className="card-icon">02</div>
              <h3>Meet the ecosystem</h3>
              <p>
                Connect with IEEE members globally, alumni in industry, keynote speakers, and ambitious peers
                who share your passion for computing.
              </p>
            </TiltCard>

            <TiltCard className="titlecard">
              <div className="card-icon">03</div>
              <h3>Open the next door</h3>
              <p>
                Access IEEEXtreme, CSIDC global competitions, travel grants, research symposiums, and chapter
                executive leadership roles.
              </p>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* Leadership Preview */}
      <section className="section">
        <div className="container split">
          <div>
            <div className="eyebrow mono">Leadership preview</div>
            <h2 className="section-title">People first.</h2>
            <p className="section-lead">
              Our executive committee and faculty advisors steer the chapter with dedication to student
              success and technical excellence.
            </p>
            <div style={{ marginTop: '24px' }}>
              <MagneticButton href="/leadership" variant="primary">
                Meet the team →
              </MagneticButton>
            </div>
          </div>

          <AdvisorCard advisor={advisor} mode="preview" />
        </div>
      </section>
    </>
  );
}
