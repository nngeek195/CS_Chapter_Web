'use client';

import React, { useRef } from 'react';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export default function TiltCard({ children, className = '', ...props }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const x = e.clientX / r.width + r.left / r.width - 0.5;
    const y = e.clientY / r.height + r.top / r.height - 0.5;
    cardRef.current.style.transform = `perspective(900px) rotateX(${y * -4}deg) rotateY(${x * 4}deg) translateY(-4px)`;
  };

  const handlePointerLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = '';
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`surface card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
