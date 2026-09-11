'use client';

import React, { useState } from 'react';

interface PastCommittee {
  year: string;
  members: string[];
}

interface LeadershipAccordionProps {
  committees: PastCommittee[];
}

export default function LeadershipAccordion({ committees }: LeadershipAccordionProps) {
  const [openIndexes, setOpenIndexes] = useState<number[]>([]);

  const toggle = (index: number) => {
    setOpenIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div style={{ marginTop: '35px' }}>
      {committees.map((comm, idx) => {
        const isOpen = openIndexes.includes(idx);
        return (
          <div key={idx} className="accordion-item">
            <button
              className="accordion-trigger"
              onClick={() => toggle(idx)}
              aria-expanded={isOpen}
            >
              <span>{comm.year} Committee</span>
              <span style={{ fontSize: '20px', transition: 'transform 0.3s' }}>
                {isOpen ? '—' : '＋'}
              </span>
            </button>
            <div
              className="accordion-content"
              style={{
                maxHeight: isOpen ? '400px' : '0px',
              }}
            >
              <div style={{ paddingBottom: '22px' }}>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
                  {comm.members.map((m, mIdx) => (
                    <li key={mIdx}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
