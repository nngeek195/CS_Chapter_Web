import React from 'react';
import Link from 'next/link';
import SocialLinks from './SocialLinks';
import { FacultyAdvisorData } from '@/lib/types';

interface AdvisorCardProps {
  advisor: FacultyAdvisorData;
  mode?: 'full' | 'preview';
}

export default function AdvisorCard({ advisor, mode = 'full' }: AdvisorCardProps) {
  const isPreview = mode === 'preview';

  return (
    <div className="surface advisor">
      {advisor.image ? (
        <img
          src={advisor.image}
          alt={advisor.name}
          className="advisor-photo"
          style={{ objectFit: 'cover' }}
        />
      ) : (
        <div className="advisor-photo">{advisor.initials || 'FA'}</div>
      )}
      <div>
        {isPreview && <div className="eyebrow mono">{advisor.title}</div>}
        {isPreview ? (
          <h3 style={{ fontSize: '30px' }}>{advisor.name}</h3>
        ) : (
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>{advisor.name}</h2>
        )}
        <p
          style={{
            fontWeight: isPreview ? 400 : 600,
            color: isPreview ? 'inherit' : 'var(--blue)',
            marginTop: isPreview ? '10px' : '6px',
          }}
        >
          {advisor.department}
          {isPreview ? `. ${advisor.bio}` : ''}
        </p>
        {!isPreview && <p style={{ marginTop: '12px' }}>{advisor.bio}</p>}

        {isPreview ? (
          <Link href="/leadership" className="link-arrow" style={{ marginTop: '14px' }}>
            View Full Executive Committee →
          </Link>
        ) : (
          <SocialLinks linkedin={advisor.linkedin} email={advisor.email} />
        )}
      </div>
    </div>
  );
}
