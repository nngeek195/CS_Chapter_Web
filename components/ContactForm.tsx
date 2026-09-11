'use client';

import React, { useState } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setStatus('Thank you! Your message has been sent. We will get back to you shortly.');
      setIsSubmitting(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 600);
  };

  return (
    <form className="surface form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="name">Your Name</label>
        <input
          id="name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Nirmal Perera"
        />
      </div>

      <div className="field">
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="e.g. student@sab.ac.lk"
        />
      </div>

      <div className="field">
        <label htmlFor="subject">Subject</label>
        <input
          id="subject"
          type="text"
          required
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Membership inquiry, workshop proposal, etc."
        />
      </div>

      <div className="field">
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          required
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Write your message here..."
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn primary"
        style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
      >
        {isSubmitting ? 'Sending...' : 'Send Message →'}
      </button>

      {status && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(0, 98, 155, 0.1)',
            color: 'var(--blue)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {status}
        </div>
      )}
    </form>
  );
}
