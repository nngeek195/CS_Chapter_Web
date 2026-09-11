'use client';

import React, { useEffect, useRef, useState } from 'react';

interface StatItem {
  end: number;
  suffix?: string;
  label: string;
}

interface StatsCounterProps {
  stats: StatItem[];
}

export default function StatsCounter({ stats }: StatsCounterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [counts, setCounts] = useState<number[]>(stats.map(() => 0));
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = performance.now();
          const duration = 1200;

          const animate = (currentTime: number) => {
            const elapsed = Math.min(1, (currentTime - startTime) / duration);
            // cubic easing: 1 - (1 - t)^3
            const progress = 1 - Math.pow(1 - elapsed, 3);

            setCounts(stats.map((s) => Math.round(s.end * progress)));

            if (elapsed < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [stats]);

  return (
    <section className="stat-band" ref={containerRef}>
      <div className="container">
        <div className="stats">
          {stats.map((s, idx) => (
            <div key={idx} className="stat">
              <div className="num">
                {counts[idx]}
                {s.suffix || ''}
              </div>
              <div className="label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
