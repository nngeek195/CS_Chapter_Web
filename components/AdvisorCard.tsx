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

  const rawName = advisor.name && advisor.name !== 'Dr. / Senior Lecturer' ? advisor.name : 'Mrs. Saranga Somaweera';
  const initials = advisor.initials && advisor.initials !== 'FA' ? advisor.initials : 'SS';

  const [imgError, setImgError] = React.useState(false);
  const advisorPhoto = !imgError && (advisor.image && advisor.image.trim() !== '' ? advisor.image : '/images/advisor.webp');

  return (
    <div className={`surface advisor ${isPreview ? 'advisor-preview' : 'advisor-full'}`}>
      <div className="advisor-media">
        {advisorPhoto ? (
          <img
            src={advisorPhoto}
            alt={rawName}
            className="advisor-photo"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="advisor-photo advisor-photo-placeholder">{initials}</div>
        )}
      </div>

      <div className="advisor-content">
        {isPreview && (
          <div className="advisor-eyebrow eyebrow mono">
            {advisor.title === 'Faculty Advisor' ? 'Advisor' : (advisor.title || 'Advisor')}
          </div>
        )}

        {isPreview ? (
          <h3 className="advisor-name">
            <span className="advisor-name-text">{rawName}</span>
            <span className="advisor-role-badge">- Senior Lecturer</span>
          </h3>
        ) : (
          <h2 className="advisor-name advisor-name-large">
            <span className="advisor-name-text">{rawName}</span>
            <span className="advisor-role-badge">- Senior Lecturer</span>
          </h2>
        )}

        <div className="advisor-meta">
          <p className="advisor-dept">{advisor.department}</p>
          {advisor.bio && (
            <p className={isPreview ? 'advisor-bio-preview' : 'advisor-bio-full'}>
              {advisor.bio}
            </p>
          )}
        </div>

        {isPreview ? (
          <Link href="/leadership" className="advisor-link">
            <span>View Executive Committee</span>
            <span className="advisor-arrow" aria-hidden="true">→</span>
          </Link>
        ) : (
          <div className="advisor-socials-wrap">
            <SocialLinks linkedin={advisor.linkedin} email={advisor.email} />
          </div>
        )}
      </div>
    </div>
  );
}
