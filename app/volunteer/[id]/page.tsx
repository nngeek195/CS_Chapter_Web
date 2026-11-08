'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import {
  ACADEMIC_YEARS,
  AlreadyAppliedError,
  CallQuestion,
  FACULTIES,
  VolunteerCall,
  getPublicCall,
  isAcceptingApplications,
  submitApplication,
} from '@/lib/volunteers';

type Role = 'member' | 'lead' | 'either';
type Errors = Record<string, string>;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th'];

function formatDate(value: number | string | null | undefined, withTime = false) {
  if (value === null || value === undefined || value === '') return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    weekday: withTime ? 'short' : undefined,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

/** Field wrapper with label, help text and an inline error. */
function Field({
  id, label, required, help, error, children,
}: {
  id: string; label: string; required?: boolean; help?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className={`form-group vol-field${error ? ' has-error' : ''}`} data-field={id}>
      <label htmlFor={id}>
        {label}
        {required && <span className="vol-req" aria-hidden="true"> *</span>}
      </label>
      {help && <p className="vol-help" id={`${id}-help`}>{help}</p>}
      {children}
      {error && (
        <p className="vol-error" id={`${id}-error`} role="alert">
          <Icon name="alert" size={13} /> {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, help?: string) {
  return [help ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
}

export default function VolunteerCallPage() {
  const params = useParams<{ id: string }>();
  const callId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [call, setCall] = useState<VolunteerCall | null | undefined>(undefined); // undefined = loading
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [faculty, setFaculty] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [choices, setChoices] = useState<string[]>([]);
  const [preferredRole, setPreferredRole] = useState<Role>('member');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!callId) return;
    let active = true;
    getPublicCall(callId).then((c) => {
      if (active) setCall(c && c.published ? c : null);
    });
    return () => { active = false; };
  }, [callId]);

  const accepting = call ? isAcceptingApplications(call) : false;
  const maxChoices = call ? Math.max(1, Math.min(call.maxChoices || 1, call.positions.length || 1, 5)) : 1;
  const leadAvailable = useMemo(
    () => !!call && choices.some((id) => call.positions.find((p) => p.id === id)?.leadRole),
    [call, choices]
  );

  const toggleChoice = (id: string) => {
    setChoices((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (maxChoices === 1) return [id];
      if (prev.length >= maxChoices) return prev;
      return [...prev, id];
    });
    setErrors((e) => ({ ...e, positions: '' }));
  };

  const setAnswer = (q: CallQuestion, value: string | string[]) => {
    setAnswers((a) => ({ ...a, [q.id]: value }));
    setErrors((e) => ({ ...e, [`q-${q.id}`]: '' }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!name.trim()) e.name = 'Please enter your full name.';
    if (!email.trim()) e.email = 'Please enter your email address.';
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Please enter a valid email address.';
    if (!phone.trim()) e.phone = 'Please enter a phone number we can reach you on.';
    else if (phone.trim().length > 40) e.phone = 'Phone number is too long.';
    if (!studentId.trim()) e.studentId = 'Please enter your student ID.';
    if (!faculty) e.faculty = 'Please select your faculty.';
    if (!academicYear) e.academicYear = 'Please select your academic year.';
    if (choices.length === 0) e.positions = 'Please choose at least one role.';
    call?.questions.forEach((q) => {
      if (!q.required) return;
      const v = answers[q.id];
      const empty = Array.isArray(v) ? v.length === 0 : !v || !String(v).trim();
      if (empty) e[`q-${q.id}`] = 'This question is required.';
    });
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!call) return;
    setSubmitError(null);

    const found = validate();
    setErrors(found);
    const firstKey = Object.keys(found).find((k) => found[k]);
    if (firstKey) {
      const el = formRef.current?.querySelector(`[data-field="${firstKey}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el?.querySelector('input, select, textarea') as HTMLElement | null)?.focus({ preventScroll: true });
      return;
    }

    // Bots fill hidden fields — quietly pretend success.
    if (honeypot) { setSubmitted(true); return; }

    if (!isAcceptingApplications(call)) {
      setSubmitError('This call is no longer accepting applications.');
      return;
    }

    setSubmitting(true);
    try {
      const cleanAnswers: Record<string, string | string[]> = {};
      call.questions.forEach((q) => {
        const v = answers[q.id];
        if (Array.isArray(v) ? v.length > 0 : v && String(v).trim()) {
          cleanAnswers[q.id] = Array.isArray(v) ? v : String(v).trim();
        }
      });
      await submitApplication(call, {
        name, email, phone, studentId, faculty, academicYear,
        positions: choices,
        preferredRole: leadAvailable ? preferredRole : 'member',
        answers: cleanAnswers,
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof AlreadyAppliedError) setSubmitError(err.message);
      else {
        console.error('Application submit failed:', err);
        setSubmitError('Something went wrong while sending your application. Please check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (call === undefined) {
    return (
      <div className="vol-page">
        <section className="page-hero vol-detail-hero">
          <div className="container">
            <div className="skeleton vol-skel-dark" style={{ height: 14, width: 160, marginBottom: 22 }} />
            <div className="skeleton vol-skel-dark" style={{ height: 54, width: '60%' }} />
            <div className="skeleton vol-skel-dark" style={{ height: 18, width: '45%', marginTop: 22 }} />
          </div>
        </section>
        <section className="section vol-section">
          <div className="container vol-detail-grid" aria-busy="true">
            <div className="vol-panel"><div className="skeleton" style={{ height: 220 }} /></div>
            <div className="vol-panel"><div className="skeleton" style={{ height: 320 }} /></div>
          </div>
        </section>
      </div>
    );
  }

  // ── Not found ──
  if (call === null) {
    return (
      <div className="vol-page">
        <section className="page-hero vol-detail-hero">
          <div className="container">
            <div className="eyebrow mono" style={{ color: '#74c0ea' }}>Volunteer</div>
            <h1>Call not found.</h1>
          </div>
        </section>
        <section className="section vol-section">
          <div className="container">
            <div className="vol-empty">
              <div className="icon-tile lg"><Icon name="search" size={24} /></div>
              <h3>This volunteer call is not available</h3>
              <p>It may have been removed or is not published yet.</p>
              <Link href="/volunteer" className="btn primary" style={{ marginTop: 18 }}>
                <Icon name="arrowLeft" size={16} /> All volunteer calls
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const chosenPositions = choices.map((id) => call.positions.find((p) => p.id === id)).filter(Boolean);

  return (
    <div className="vol-page">
      {/* ── Hero ── */}
      <section className="page-hero vol-detail-hero">
        <div className="container vol-hero-grid">
          <div>
            <Link href="/volunteer" className="vol-back">
              <Icon name="arrowLeft" size={15} /> All volunteer calls
            </Link>
            <div className="eyebrow mono" style={{ color: '#74c0ea' }}>
              Volunteer call
            </div>
            <h1 className="vol-detail-title">{call.title}</h1>
            {call.summary && <p>{call.summary}</p>}
            <ul className="vol-hero-meta">
              <li>
                <span className={`badge ${accepting ? 'green' : ''}`}>
                  {accepting && <span className="status-dot pulse" />}
                  {accepting ? 'Accepting applications' : 'Applications closed'}
                </span>
              </li>
              {call.deadlineAt !== null && (
                <li><Icon name="clock" size={15} /> {accepting ? 'Closes' : 'Closed'} {formatDate(call.deadlineAt, true)}</li>
              )}
              {call.eventDate && <li><Icon name="calendar" size={15} /> Event on {formatDate(call.eventDate)}</li>}
            </ul>
          </div>
          {call.poster && (
            <div className="vol-hero-poster">
              <img src={call.poster} alt={`${call.title} poster`} />
            </div>
          )}
        </div>
      </section>

      <section className="section vol-section">
        <div className="container vol-detail-grid">
          {/* ── About + roles ── */}
          <div className="vol-col">
            {call.description && (
              <div className="vol-panel anim-in">
                <h2 className="vol-panel-title"><Icon name="info" size={18} /> About this call</h2>
                <p className="vol-description">{call.description}</p>
              </div>
            )}

            <div className="vol-panel anim-in" style={{ ['--i' as string]: 1 }}>
              <h2 className="vol-panel-title"><Icon name="users" size={18} /> Roles</h2>
              {call.positions.length === 0 ? (
                <p>Roles will be announced soon.</p>
              ) : (
                <ul className="vol-roles">
                  {call.positions.map((p) => (
                    <li key={p.id}>
                      <div className="vol-role-head">
                        <strong>{p.name}</strong>
                        <span className="vol-role-tags">
                          {p.slots ? <span className="badge blue plain">{p.slots} {p.slots === 1 ? 'volunteer' : 'volunteers'} needed</span> : null}
                          {p.leadRole && <span className="badge violet plain">Team lead role available</span>}
                        </span>
                      </div>
                      {p.description && <p>{p.description}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── Application ── */}
          <div className="vol-col">
            {submitted ? (
              <div className="vol-panel vol-success anim-in" role="status">
                <div className="success-check" aria-hidden="true">
                  <svg viewBox="0 0 52 52" width="72" height="72">
                    <circle cx="26" cy="26" r="24" fill="none" />
                    <path fill="none" d="M15 27l7 7 15-15" />
                  </svg>
                </div>
                <h2>Application received</h2>
                <p>
                  Thank you{name.trim() ? `, ${name.trim().split(' ')[0]}` : ''}. Your application for{' '}
                  <strong>{call.title}</strong> has been submitted.
                </p>
                {chosenPositions.length > 0 && (
                  <ol className="vol-summary">
                    {chosenPositions.map((p, i) => (
                      <li key={p!.id}><span>{ORDINALS[i]} choice</span> {p!.name}</li>
                    ))}
                  </ol>
                )}
                <p className="vol-help">The organisers will review applications and contact you by email{email.trim() ? ` at ${email.trim()}` : ''}.</p>
                <Link href="/volunteer" className="btn primary" style={{ marginTop: 8 }}>
                  <Icon name="arrowLeft" size={16} /> Back to volunteer calls
                </Link>
              </div>
            ) : !accepting ? (
              <div className="vol-panel anim-in">
                <div className="alert-box warning">
                  <Icon name="lock" size={18} />
                  <div>
                    <div className="alert-title">Applications are closed</div>
                    This call is no longer accepting applications. Keep an eye on the volunteer page for future calls.
                  </div>
                </div>
                <Link href="/volunteer" className="btn primary" style={{ marginTop: 18 }}>
                  <Icon name="arrowLeft" size={16} /> Other volunteer calls
                </Link>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} className="vol-panel admin-form vol-form anim-in" style={{ ['--i' as string]: 2 }} noValidate>
                <h2 className="vol-panel-title"><Icon name="clipboard" size={18} /> Apply</h2>
                <p className="vol-help" style={{ marginBottom: 20 }}>Fields marked * are required. You can apply once per call with each email address.</p>

                {/* Honeypot — hidden from people, irresistible to bots */}
                <div className="vol-hp" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                </div>

                <fieldset className="vol-fieldset">
                  <legend>Your details</legend>
                  <div className="vol-two">
                    <Field id="name" label="Full name" required error={errors.name}>
                      <input id="name" value={name} onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: '' })); }} autoComplete="name" maxLength={120} aria-invalid={!!errors.name} aria-describedby={describedBy('name', errors.name)} />
                    </Field>
                    <Field id="email" label="Email" required error={errors.email}>
                      <input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: '' })); }} autoComplete="email" maxLength={200} aria-invalid={!!errors.email} aria-describedby={describedBy('email', errors.email)} />
                    </Field>
                    <Field id="phone" label="Phone" required error={errors.phone}>
                      <input id="phone" type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setErrors((x) => ({ ...x, phone: '' })); }} autoComplete="tel" maxLength={40} aria-invalid={!!errors.phone} aria-describedby={describedBy('phone', errors.phone)} />
                    </Field>
                    <Field id="studentId" label="Student ID" required error={errors.studentId}>
                      <input id="studentId" value={studentId} onChange={(e) => { setStudentId(e.target.value); setErrors((x) => ({ ...x, studentId: '' })); }} maxLength={60} aria-invalid={!!errors.studentId} aria-describedby={describedBy('studentId', errors.studentId)} />
                    </Field>
                    <Field id="faculty" label="Faculty" required error={errors.faculty}>
                      <select id="faculty" value={faculty} onChange={(e) => { setFaculty(e.target.value); setErrors((x) => ({ ...x, faculty: '' })); }} aria-invalid={!!errors.faculty} aria-describedby={describedBy('faculty', errors.faculty)}>
                        <option value="">Select your faculty</option>
                        {FACULTIES.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </Field>
                    <Field id="academicYear" label="Academic year" required error={errors.academicYear}>
                      <select id="academicYear" value={academicYear} onChange={(e) => { setAcademicYear(e.target.value); setErrors((x) => ({ ...x, academicYear: '' })); }} aria-invalid={!!errors.academicYear} aria-describedby={describedBy('academicYear', errors.academicYear)}>
                        <option value="">Select your year</option>
                        {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </Field>
                  </div>
                </fieldset>

                <fieldset className="vol-fieldset" data-field="positions" aria-describedby={describedBy('positions', errors.positions, 'x')}>
                  <legend>
                    Preferred {maxChoices === 1 ? 'role' : 'roles'} <span className="vol-req" aria-hidden="true">*</span>
                  </legend>
                  <p className="vol-help" id="positions-help">
                    {maxChoices === 1
                      ? 'Choose the role you would like to take on.'
                      : `Choose up to ${maxChoices} roles in order of preference — your first click is your first choice.`}
                  </p>
                  <div className="vol-choices" role="group">
                    {call.positions.map((p) => {
                      const idx = choices.indexOf(p.id);
                      const selected = idx !== -1;
                      const disabled = !selected && maxChoices > 1 && choices.length >= maxChoices;
                      return (
                        <button
                          type="button"
                          key={p.id}
                          className={`vol-choice${selected ? ' selected' : ''}`}
                          onClick={() => toggleChoice(p.id)}
                          aria-pressed={selected}
                          disabled={disabled}
                        >
                          <span className="vol-choice-rank" aria-hidden="true">
                            {selected ? (maxChoices > 1 ? idx + 1 : <Icon name="check" size={13} strokeWidth={3} />) : ''}
                          </span>
                          <span className="vol-choice-text">
                            <span className="vol-choice-name">{p.name}</span>
                            {selected && maxChoices > 1 && <span className="vol-choice-order">{ORDINALS[idx]} choice</span>}
                            {!selected && p.leadRole && <span className="vol-choice-order">Lead role available</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.positions && (
                    <p className="vol-error" id="positions-error" role="alert"><Icon name="alert" size={13} /> {errors.positions}</p>
                  )}

                  {leadAvailable && (
                    <div className="vol-role-pref anim-in">
                      <div className="vol-sub-label">I&apos;d like to</div>
                      <div className="vol-radio-row">
                        {([
                          ['member', 'Be a team member'],
                          ['lead', 'Lead a team'],
                          ['either', 'Either is fine'],
                        ] as [Role, string][]).map(([value, label]) => (
                          <label key={value} className={`vol-option${preferredRole === value ? ' checked' : ''}`}>
                            <input type="radio" name="preferredRole" value={value} checked={preferredRole === value} onChange={() => setPreferredRole(value)} />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </fieldset>

                {call.questions.length > 0 && (
                  <fieldset className="vol-fieldset">
                    <legend>A few questions</legend>
                    {call.questions.map((q) => {
                      const id = `q-${q.id}`;
                      const err = errors[id];
                      const value = answers[q.id];
                      const desc = describedBy(id, err, q.help);
                      if (q.type === 'short' || q.type === 'long') {
                        return (
                          <Field key={q.id} id={id} label={q.label} required={q.required} help={q.help} error={err}>
                            {q.type === 'short' ? (
                              <input id={id} value={(value as string) || ''} onChange={(e) => setAnswer(q, e.target.value)} maxLength={500} aria-invalid={!!err} aria-describedby={desc} />
                            ) : (
                              <textarea id={id} rows={4} value={(value as string) || ''} onChange={(e) => setAnswer(q, e.target.value)} maxLength={3000} aria-invalid={!!err} aria-describedby={desc} />
                            )}
                          </Field>
                        );
                      }
                      const options = q.type === 'yesno' ? ['Yes', 'No'] : q.options || [];
                      const multi = q.type === 'multi';
                      const selected = multi ? ((value as string[]) || []) : [];
                      return (
                        <div key={q.id} className={`form-group vol-field${err ? ' has-error' : ''}`} data-field={id}>
                          <div className="vol-sub-label" id={`${id}-label`}>
                            {q.label}{q.required && <span className="vol-req" aria-hidden="true"> *</span>}
                          </div>
                          {q.help && <p className="vol-help" id={`${id}-help`}>{q.help}</p>}
                          <div
                            className={q.type === 'yesno' ? 'vol-radio-row' : 'vol-option-list'}
                            role={multi ? 'group' : 'radiogroup'}
                            aria-labelledby={`${id}-label`}
                            aria-describedby={desc}
                            aria-invalid={!!err}
                          >
                            {options.map((opt) => {
                              const checked = multi ? selected.includes(opt) : value === opt;
                              return (
                                <label key={opt} className={`vol-option${checked ? ' checked' : ''}`}>
                                  <input
                                    type={multi ? 'checkbox' : 'radio'}
                                    name={id}
                                    value={opt}
                                    checked={checked}
                                    onChange={(e) => {
                                      if (multi) setAnswer(q, e.target.checked ? [...selected, opt] : selected.filter((s) => s !== opt));
                                      else setAnswer(q, opt);
                                    }}
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                          {err && <p className="vol-error" id={`${id}-error`} role="alert"><Icon name="alert" size={13} /> {err}</p>}
                        </div>
                      );
                    })}
                  </fieldset>
                )}

                {submitError && (
                  <div className="alert-box danger anim-in" role="alert" style={{ marginBottom: 16 }}>
                    <Icon name="alert" size={18} />
                    <div>
                      <div className="alert-title">Application not submitted</div>
                      {submitError}
                    </div>
                  </div>
                )}

                <button type="submit" className="btn primary vol-submit" disabled={submitting}>
                  {submitting ? <span className="spinner" aria-hidden="true" /> : <Icon name="send" size={16} />}
                  {submitting ? 'Submitting…' : 'Submit application'}
                </button>
                <p className="vol-help" style={{ marginTop: 12, textAlign: 'center' }}>
                  Your details are shared only with the organisers of this event.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
