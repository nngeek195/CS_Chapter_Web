'use client';

import React from 'react';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export default function TiltCard({ children, className = '', ...props }: TiltCardProps) {
  return (
    <div
      className={`surface card card-popup ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

