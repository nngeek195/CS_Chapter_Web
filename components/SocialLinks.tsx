import React from 'react';

interface SocialLinksProps {
  linkedin?: string;
  email?: string;
  alwaysShowPlaceholders?: boolean;
}

export default function SocialLinks({
  linkedin,
  email,
  alwaysShowPlaceholders = false,
}: SocialLinksProps) {
  if (!linkedin && !email && !alwaysShowPlaceholders) return null;

  return (
    <div className="person-socials">
      {linkedin ? (
        <a
          href={linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="social-mini"
          aria-label="LinkedIn"
        >
          in
        </a>
      ) : alwaysShowPlaceholders ? (
        <span className="social-mini" style={{ opacity: 0.3 }}>
          in
        </span>
      ) : null}

      {email ? (
        <a href={`mailto:${email}`} className="social-mini" aria-label="Contact">
          @
        </a>
      ) : alwaysShowPlaceholders ? (
        <span className="social-mini" style={{ opacity: 0.3 }}>
          @
        </span>
      ) : null}
    </div>
  );
}
