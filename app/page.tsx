'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StatsCounter from '@/components/StatsCounter';
import TiltCard from '@/components/TiltCard';
import MagneticButton from '@/components/MagneticButton';
import Scene from '@/components/Scene';
import LoadingScreen from '@/components/LoadingScreen';
import Projects3DShowcase from '@/components/Projects3DShowcase';
import { getEvents, getFacultyAdvisor } from '@/lib/firestore';
import { INITIAL_ADVISOR } from '@/lib/seedData';
import { EventItem, FacultyAdvisorData } from '@/lib/types';

export default function HomePage() {
  const [animationLoaded, setAnimationLoaded] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [orbOffset, setOrbOffset] = useState({ x: 0, y: 0 });
  const [allEvents, setAllEvents] = useState<EventItem[]>([]);
  const [advisor, setAdvisor] = useState<FacultyAdvisorData>(INITIAL_ADVISOR);

  useEffect(() => {
    let isMounted = true;
    const minDisplayTime = 1300; // Ensures loader progress journey is smooth and visible
    const maxSafetyTimeout = 4000; // Never keeps the screen blocked longer than 4s

    // 1. Fetch Firestore Events & Advisor data
    const dataPromise = Promise.all([
      getEvents().catch((err) => {
        console.warn('Events fetch fallback:', err);
        return [];
      }),
      getFacultyAdvisor().catch((err) => {
        console.warn('Advisor fetch fallback:', err);
        return INITIAL_ADVISOR;
      }),
    ]).then(([events, adv]) => {
      if (isMounted) {
        setAllEvents(events || []);
        if (adv) setAdvisor(adv);
      }
      return { events: events || [], advisor: adv };
    });

    // 2. Preload critical images (advisor image & top coverflow event thumbnails) + fonts
    const assetsPromise = dataPromise.then(({ events, advisor: adv }) => {
      const urls: string[] = [];
      if (adv?.image) urls.push(adv.image);
      if (events && events.length > 0) {
        events.slice(0, 4).forEach((ev) => {
          if (ev.image) urls.push(ev.image);
        });
      }

      const imgLoaders = urls.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          })
      );

      const fontsLoader =
        typeof document !== 'undefined' && document.fonts
          ? document.fonts.ready.catch(() => {})
          : Promise.resolve();

      return Promise.all([...imgLoaders, fontsLoader]);
    });

    // 3. Minimum display timer to prevent abrupt flashing
    const minTimerPromise = new Promise((resolve) =>
      setTimeout(resolve, minDisplayTime)
    );

    // 4. Combined readiness with safety timeout guarantee
    let safetyTimer: NodeJS.Timeout;
    const safetyPromise = new Promise((resolve) => {
      safetyTimer = setTimeout(resolve, maxSafetyTimeout);
    });

    Promise.race([
      Promise.all([dataPromise, assetsPromise, minTimerPromise]),
      safetyPromise,
    ]).then(() => {
      if (isMounted) {
        setDataReady(true);
        setAnimationLoaded(true); // Guarantees the loading screen clears even if 3D scene was slow
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);


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
      <LoadingScreen isLoaded={animationLoaded && dataReady} />

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

          <div className="hero-foot">
            <div className="line mono">Scroll to explore the chapter</div>
            <div className="mono">Sabaragamuwa University · Sri Lanka</div>
          </div>
        </div>
      </section>

      {/* Interactive Stats Band */}
      <StatsCounter stats={stats} />

      {/* Projects Showcase */}
      <section className="section showcase-section">
        <div className="container">
          <div className="split" style={{ alignItems: 'end', marginBottom: '36px' }}>
            <div>
              <div className="eyebrow mono">Featured / upcoming</div>
              <h2 className="section-title">Projects &amp; events showcase.</h2>
              <p className="section-lead">
                Every initiative we run — workshops, competitions, flagship events — with our prime spotlight in the front and seamless 3D rolling access to all chapter projects.
              </p>
            </div>
            <Link className="link-arrow" href="/events">
              View all events →
            </Link>
          </div>
        </div>

        {/* 3D Rolling Coverflow Showcase */}
        <Projects3DShowcase events={allEvents} />
      </section>

      {/* Why Join IEEE CS */}
      <section className="section section-dark">
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

          <div className="surface advisor">
            {advisor.image ? (
              <img
                src={advisor.image}
                alt={advisor.name}
                className="advisor-photo"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className="advisor-photo">{advisor.initials || 'FA'}</div>
            )}
            <div>
              <div className="eyebrow mono">{advisor.title}</div>
              <h3 style={{ fontSize: '30px' }}>{advisor.name}</h3>
              <p style={{ marginTop: '10px' }}>
                {advisor.department}. {advisor.bio}
              </p>
              <Link href="/leadership" className="link-arrow" style={{ marginTop: '14px' }}>
                View Full Executive Committee →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
