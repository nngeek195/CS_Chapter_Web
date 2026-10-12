'use client';

import React, { useEffect, useState, useRef } from 'react';

interface LoadingScreenProps {
  isLoaded?: boolean;
}

export default function LoadingScreen({ isLoaded = false }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  const currentRef = useRef(0);
  const isLoadedRef = useRef(isLoaded);

  useEffect(() => {
    isLoadedRef.current = isLoaded;
  }, [isLoaded]);

  useEffect(() => {
    let animFrameId: number;
    let completed = false;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const loaded = isLoadedRef.current;

      if (!loaded) {
        // Natural progress curve while UI components load:
        // Starts briskly, rises smoothly through the 60s and 70s, then gently creeps up to ~93%
        const simulated = Math.min(
          93,
          Math.floor((1 - Math.exp(-elapsed / 700)) * 88 + (elapsed / 4000) * 5)
        );
        currentRef.current = Math.max(currentRef.current, simulated);
      } else {
        // All UI components loaded: briskly accelerate from current position straight to 100%
        const remaining = 100 - currentRef.current;
        const step = Math.max(1, Math.round(remaining * 0.28));
        currentRef.current = Math.min(100, currentRef.current + step);
      }

      setProgress(currentRef.current);

      if (currentRef.current < 100) {
        animFrameId = requestAnimationFrame(tick);
      } else if (!completed) {
        completed = true;
        // Hold at 100% briefly for visual completion, then trigger fade-out
        setTimeout(() => {
          setIsDone(true);
          // Remove from DOM after CSS transition finishes
          setTimeout(() => {
            setShouldRender(false);
          }, 700);
        }, 180);
      }
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  if (!shouldRender) {
    return null;
  }

  return (
    <div id="boot" className={isDone ? 'done' : ''} aria-hidden={isDone}>
      <div className="boot-inner">
        <span className="boot-mark" aria-hidden="true"></span>
        <span className="boot-rail" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${progress}%` }}></i>
        </span>
        <span className="boot-num">{String(progress).padStart(3, '0')}</span>
      </div>
    </div>
  );
}
