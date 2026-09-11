'use client';

import React, { useState } from 'react';
import { PastCommittee } from '@/lib/types';

interface LeadershipAccordionProps {
  committees: PastCommittee[];
  initialLimit?: number;
}

export default function LeadershipAccordion({
  committees,
  initialLimit = 3,
}: LeadershipAccordionProps) {
  const [openIndexes, setOpenIndexes] = useState<number[]>([0]); // First committee open by default
  const [showAll, setShowAll] = useState(false);

  const displayedCommittees = showAll ? committees : committees.slice(0, initialLimit);
  const hasMore = committees.length > initialLimit;

  const toggle = (index: number) => {
    setOpenIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div style={{ marginTop: '35px' }}>
      {displayedCommittees.map((comm, idx) => {
        const isOpen = openIndexes.includes(idx);
        const yearTitle = comm.year.toLowerCase().includes('committee')
          ? comm.year
          : `${comm.year} Committee`;

        return (
          <div key={comm.id || idx} className="accordion-item">
            <button
              className="accordion-trigger"
              onClick={() => toggle(idx)}
              aria-expanded={isOpen}
            >
              <span>{yearTitle}</span>
              <span style={{ fontSize: '20px', transition: 'transform 0.3s' }}>
                {isOpen ? '—' : '＋'}
              </span>
            </button>
            <div
              className="accordion-content"
              style={{
                maxHeight: isOpen ? '500px' : '0px',
              }}
            >
              <div style={{ paddingBottom: '22px' }}>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '20px',
                    color: 'rgba(255,255,255,0.78)',
                    lineHeight: 1.8,
                  }}
                >
                  {comm.members.map((m, mIdx) => (
                    <li key={mIdx}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '28px' }}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => setShowAll(!showAll)}
            style={{
              borderColor: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              background: 'rgba(255, 255, 255, 0.05)',
            }}
          >
            {showAll
              ? 'Show Less ↑'
              : `Explore More Past Committees (${committees.length - initialLimit} older) ↓`}
          </button>
        </div>
      )}
    </div>
  );
}
