import React from 'react';

interface PageHeroProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export default function PageHero({ title, description, children }: PageHeroProps) {
  return (
    <section className="page-hero">
      <div className="container">
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </div>
    </section>
  );
}
