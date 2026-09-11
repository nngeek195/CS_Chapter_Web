'use client';

import React, { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export default function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="faq">
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={idx} className="faq-item">
            <button
              className="faq-btn"
              onClick={() => toggle(idx)}
              aria-expanded={isOpen}
            >
              <span>{item.question}</span>
              <span className={`faq-icon ${isOpen ? 'open' : ''}`}>+</span>
            </button>
            <div
              className="faq-panel"
              style={{
                maxHeight: isOpen ? '300px' : '0px',
              }}
            >
              <div className="faq-inner">
                <p>{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
