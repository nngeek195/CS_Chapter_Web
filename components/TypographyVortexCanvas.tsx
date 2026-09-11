'use client';

import React, { useEffect, useRef } from "react";
import { createTypographyVortexRenderer } from "./typographyVortexRenderer";

export type TypographyVortexCanvasProps = {
  mode?: "dark" | "light";
  phrase?: string;
  speed?: number;
  ringGrowth?: number;
  opacity?: number;
  dissolveRadius?: number;
  particleAmount?: number;
  suctionDuration?: number;
  className?: string;
  background?: string;
  showHint?: boolean;
};

export const TYPOGRAPHY_VORTEX_DEFAULTS = {
  mode: "dark" as const,
  phrase: "IEEE CS CHAPTER | SUSL / ",
  speed: 1,
  ringGrowth: 1.21,
  opacity: 1,
  dissolveRadius: 1.1,
  particleAmount: 1.2,
  suctionDuration: 920,
  showHint: true,
} as const;

export function TypographyVortexCanvas({ className = "", showHint = true, ...props }: TypographyVortexCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef({ ...TYPOGRAPHY_VORTEX_DEFAULTS, showHint, ...props });
  optionsRef.current = { ...TYPOGRAPHY_VORTEX_DEFAULTS, showHint, ...props };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;
    return createTypographyVortexRenderer(host, canvas, () => optionsRef.current);
  }, []);

  // Forward pointer movements & clicks so interactive dissolve & suction work even when rendered as a background element
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let wasInside = false;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (isInside) {
        if (!wasInside) {
          wasInside = true;
          host.dispatchEvent(
            new PointerEvent("pointerenter", {
              clientX: e.clientX,
              clientY: e.clientY,
              bubbles: false,
            })
          );
        }
        host.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: e.clientX,
            clientY: e.clientY,
            bubbles: false,
          })
        );
      } else if (wasInside) {
        wasInside = false;
        host.dispatchEvent(
          new PointerEvent("pointerleave", {
            bubbles: false,
          })
        );
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.closest("a") || e.target.closest("button") || e.target.closest("input"))
      ) {
        return;
      }
      const rect = host.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        host.dispatchEvent(
          new PointerEvent("pointerdown", {
            clientX: e.clientX,
            clientY: e.clientY,
            bubbles: false,
          })
        );
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`typography-vortex-component typography-vortex-component--${optionsRef.current.mode}${className ? ` ${className}` : ""}`}
      data-mode={optionsRef.current.mode}
      data-dissolve-state="ambient"
      data-suction-state="idle"
      data-particles="0"
      data-dissolve-strength="0.00"
    >
      <canvas ref={canvasRef} aria-label="Interactive typography vortex" />
      {showHint && (
        <span className="typography-vortex-component__hint">MOVE / DISSOLVE · CLICK / SUCTION</span>
      )}
    </div>
  );
}

export default TypographyVortexCanvas;
