import React from 'react';
import TiltCard from './TiltCard';
import SocialLinks from './SocialLinks';
import { CommitteeMember } from '@/lib/types';

interface PersonCardProps {
  person: CommitteeMember;
}

export default function PersonCard({ person }: PersonCardProps) {
  const img =
    person.image ||
    (person.role?.toLowerCase().includes('visibility') ||
    person.name?.toLowerCase().includes('nisal')
      ? '/images/publicVisibilityChair.png'
      : undefined);

  return (
    <TiltCard className="person">
      {img ? (
        <img
          src={img}
          alt={person.name}
          className="person-avatar"
          style={{
            objectFit: 'cover',
            objectPosition: 'top center',
            background: '#f1f5f9',
            padding: 0,
          }}
        />
      ) : (
        <div className="person-avatar">{person.initials}</div>
      )}
      <h3>{person.name}</h3>
      <div className="role">{person.role}</div>
      <div className="batch">{person.batch}</div>
      {person.department && (
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
          {person.department}
        </p>
      )}
      <SocialLinks
        linkedin={person.linkedin}
        email={person.email}
        alwaysShowPlaceholders
      />
    </TiltCard>
  );
}
