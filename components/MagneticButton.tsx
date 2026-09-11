'use client';

import React, { useRef } from 'react';
import Link from 'next/link';

interface MagneticButtonProps {
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
}

export default function MagneticButton({
  href,
  onClick,
  variant = 'primary',
  children,
  className = '',
  target,
  rel,
}: MagneticButtonProps) {
  const btnRef = useRef<HTMLElement>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) / r.width;
    const y = (e.clientY - r.top - r.height / 2) / r.height;
    btnRef.current.style.transform = `translate(${x * 7}px, ${y * 6}px)`;
  };

  const handlePointerLeave = () => {
    if (!btnRef.current) return;
    btnRef.current.style.transform = '';
  };

  const combinedClass = `btn ${variant} ${className}`;

  if (href) {
    if (href.startsWith('http') || target === '_blank') {
      return (
        <a
          ref={btnRef as React.RefObject<HTMLAnchorElement>}
          href={href}
          target={target}
          rel={rel || 'noopener noreferrer'}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className={combinedClass}
        >
          {children}
        </a>
      );
    }
    return (
      <Link
        ref={btnRef as React.RefObject<HTMLAnchorElement>}
        href={href}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={combinedClass}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      ref={btnRef as React.RefObject<HTMLButtonElement>}
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={combinedClass}
    >
      {children}
    </button>
  );
}
