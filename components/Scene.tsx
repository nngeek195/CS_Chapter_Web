'use client';

import React, { useEffect, useRef } from 'react';
import { ConstellationField } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";

interface SceneProps {
  onLoaded?: () => void;
}

export function Scene({ onLoaded }: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedNotified = useRef(false);

  // Notify when animation is ready
  useEffect(() => {
    const notifyLoaded = () => {
      if (!loadedNotified.current) {
        loadedNotified.current = true;
        onLoaded?.();
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data && (event.data.type === 'threeui-ready' || event.data.type === 'animation-ready')) {
        notifyLoaded();
      }
    };

    window.addEventListener('message', handleMessage);

    // Fallback: If no message fired within 900ms, mark as loaded
    const fallbackTimer = setTimeout(notifyLoaded, 900);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(fallbackTimer);
    };
  }, [onLoaded]);

  // Forward mouse movements to constellation canvas iframe
  useEffect(() => {
    let ticking = false;

    const getIframe = () => {
      return containerRef.current?.querySelector('iframe') || null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const iframe = getIframe();
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: 'pointer-move',
              clientX: e.clientX,
              clientY: e.clientY,
            },
            '*'
          );
        }
      });
    };

    const handleMouseLeave = () => {
      const iframe = getIframe();
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'pointer-leave' }, '*');
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div ref={containerRef} className="shader-frame">
      <ConstellationField
        mode="dark"
        speed={1.00}
        size={1.00}
        strokeWidth={1.00}
        length={1.00}
        density={1.00}
        opacity={1.00}
        hue={0}
        saturation={1.00}
        brightness={1.00}
      />
    </div>
  );
}

export default Scene;
