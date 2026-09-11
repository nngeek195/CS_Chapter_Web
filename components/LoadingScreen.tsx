'use client';

import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  isLoaded?: boolean;
}

export default function LoadingScreen({ isLoaded = false }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    let animFrameId: number;
    let current = 0;

    const tick = () => {
      // If parent signals loaded, target is 100, otherwise approach 90
      const target = isLoaded ? 100 : 90;
      const step = isLoaded
        ? Math.max(1, Math.round((100 - current) * 0.22))
        : Math.max(1, Math.round((target - current) * 0.12));

      current = Math.min(target, current + step);
      setProgress(current);

      if (current < 100) {
        animFrameId = requestAnimationFrame(tick);
      } else {
        // Reached 100%, hold briefly for visual confirmation then fade out
        setTimeout(() => {
          setIsDone(true);
          // Remove from DOM after CSS fade-out finishes
          setTimeout(() => {
            setShouldRender(false);
          }, 700);
        }, 220);
      }
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [isLoaded]);

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
