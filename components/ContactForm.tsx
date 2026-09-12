'use client';

import React, { useState } from 'react';
import { submitContactMessage } from '@/lib/firestore';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    setIsError(false);

    try {
      await submitContactMessage({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });
      setStatus('Thank you! Your message has been sent to chapter leadership. We will get back to you shortly.');
      setIsError(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      console.error('Contact submit error:', err);
      setStatus(err?.message || 'Failed to send your message. Please try again or email us directly.');
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
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
            background: isError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(0, 98, 155, 0.1)',
            color: isError ? '#dc2626' : 'var(--blue)',
            border: isError ? '1px solid rgba(220, 38, 38, 0.3)' : '1px solid rgba(0, 98, 155, 0.25)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {isError ? '⚠️ ' : '✅ '}
          {status}
        </div>
      )}
    </form>
  );
}
