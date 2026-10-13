'use client';

import React, { useEffect, useRef, memo } from 'react';

interface SceneProps {
  onLoaded?: () => void;
}

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export const Scene = memo(function Scene({ onLoaded }: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: -1000, y: -1000 });
  const onLoadedRef = useRef(onLoaded);

  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    const LINK = 160;
    let nodes: Node[] = [];

    const resize = () => {
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };

    const initNodes = () => {
      const maxNodes = width < 768 ? 40 : 85;
      nodes = [];
      for (let i = 0; i < maxNodes; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 2.4 + 1.8,
        });
      }
    };

    resize();
    initNodes();

    // Notify parent immediately that animation is ready
    if (onLoadedRef.current) {
      onLoadedRef.current();
    }

    const handleResize = () => {
      resize();
      initNodes();
    };

    window.addEventListener('resize', handleResize);

    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        pointerRef.current.x = e.clientX - rect.left;
        pointerRef.current.y = e.clientY - rect.top;
      } else {
        pointerRef.current.x = -1000;
        pointerRef.current.y = -1000;
      }
    };

    const resetPointer = () => {
      pointerRef.current.x = -1000;
      pointerRef.current.y = -1000;
    };

    const handleScroll = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        resetPointer();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      if (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        pointerRef.current.x = touch.clientX - rect.left;
        pointerRef.current.y = touch.clientY - rect.top;
      } else {
        resetPointer();
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mouseleave', resetPointer);
    window.addEventListener('blur', resetPointer);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', resetPointer);
    window.addEventListener('touchcancel', resetPointer);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderFrame = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';

      const pointer = pointerRef.current;

      // 1. Draw Links between nodes
      ctx.strokeStyle = '#E6C879';
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = dist(nodes[i], nodes[j]);
          if (d < LINK) {
            ctx.globalAlpha = 0.22 + (1 - d / LINK) * 0.55;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // 2. Draw interactive cursor links & cursor glow if pointer is on screen
      if (pointer.x > 0 && pointer.y > 0) {
        ctx.strokeStyle = '#E6C879';
        ctx.lineWidth = 1;
        for (let i = 0; i < nodes.length; i++) {
          const pd = dist(nodes[i], pointer);
          if (pd < LINK * 1.25) {
            ctx.globalAlpha = 0.25 + (1 - pd / (LINK * 1.25)) * 0.65;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }

        // Ambient glow at mouse cursor
        ctx.fillStyle = '#E6C879';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Update & Draw Nodes
      const now = Date.now();
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Responsive pointer gravity
        const pd = dist(node, pointer);
        if (pd < 240) {
          const force = Math.min(0.02, (1 - pd / 240) * 0.015);
          node.x -= (node.x - pointer.x) * force;
          node.y -= (node.y - pointer.y) * force;
        }

        // Draw Node (Pale Gold) — core + soft halo so particles read at retina scale
        const pulse = 0.78 + Math.sin(now * 0.001 + node.x) * 0.22;
        ctx.fillStyle = '#E6C879';
        ctx.globalAlpha = pulse * 0.28;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mouseleave', resetPointer);
      window.removeEventListener('blur', resetPointer);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', resetPointer);
      window.removeEventListener('touchcancel', resetPointer);
    };
  }, []);

  return (
    <div ref={containerRef} className="shader-frame">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
});

export default Scene;
