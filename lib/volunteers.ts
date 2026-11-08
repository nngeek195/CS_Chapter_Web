/**
 * Volunteer calls (organising-committee recruitment forms).
 *
 * Collections
 *   volunteer_calls/{id}                    – the form definition, owned by `createdBy` (uid)
 *   volunteer_applications/{callId}__{email} – one submission per email per call
 *
 * Access (enforced by firestore.rules, mirrored here):
 *   - Admins see and manage every call and application.
 *   - Board members with the `volunteers` permission see/manage only calls they created
 *     and the applications to those calls (`callOwner` == their uid).
 *   - The public can read published calls and submit an application while a call is open.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  Unsubscribe,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type QuestionType = 'short' | 'long' | 'single' | 'multi' | 'yesno';

export interface CallQuestion {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
  help?: string;
}

export interface CallPosition {
  id: string;
  name: string;
  description?: string;
  /** Number of volunteers wanted (0 / undefined = no fixed number). */
  slots?: number;
  /** When true, applicants can volunteer to lead this team. */
  leadRole?: boolean;
}

export type CallStatus = 'draft' | 'open' | 'closed';

export interface VolunteerCall {
  id: string;
  title: string;
  summary: string;
  description: string;
  poster?: string;
  eventDate?: string;
  /** Epoch ms after which applications are rejected; null = no deadline. */
  deadlineAt: number | null;
  positions: CallPosition[];
  questions: CallQuestion[];
  /** How many position preferences an applicant may choose. */
  maxChoices: number;
  status: CallStatus;
  /** Derived from status (status !== 'draft'); used by the security rules / public queries. */
  published: boolean;
  createdBy: string;
  createdByEmail: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
}

export type ApplicationStatus = 'pending' | 'shortlisted' | 'selected' | 'rejected';
export type TeamRole = 'lead' | 'member';

export interface VolunteerApplication {
  id: string;
  callId: string;
  callOwner: string;
  name: string;
  email: string;
  phone?: string;
  studentId?: string;
  faculty?: string;
  academicYear?: string;
  /** Position ids in order of preference. */
  positions: string[];
  preferredRole?: 'member' | 'lead' | 'either';
  answers: Record<string, string | string[]>;
  status: ApplicationStatus;
  assignedPosition?: string;
  assignedRole?: TeamRole;
  notes?: string;
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

export const APPLICATION_STATUSES: { key: ApplicationStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'selected', label: 'Selected' },
  { key: 'rejected', label: 'Not selected' },
];

export const FACULTIES = [
  'Applied Sciences',
  'Computing',
  'Geomatics',
  'Management Studies',
  'Medicine',
  'Social Sciences & Languages',
  'Agricultural Sciences',
  'Technology',
  'Graduate Studies',
  'Other',
];

export const ACADEMIC_YEARS = ['1st year', '2nd year', '3rd year', '4th year', 'Postgraduate'];

export const QUESTION_TYPES: { key: QuestionType; label: string }[] = [
  { key: 'short', label: 'Short answer' },
  { key: 'long', label: 'Paragraph' },
  { key: 'single', label: 'Multiple choice (one)' },
  { key: 'multi', label: 'Checkboxes (many)' },
  { key: 'yesno', label: 'Yes / No' },
];

export const uid = () => Math.random().toString(36).slice(2, 10);

export const applicationId = (callId: string, email: string) => `${callId}__${email.trim().toLowerCase()}`;

// ─────────────────────────────────────────────────────────────
// Scope (who is looking)
// ─────────────────────────────────────────────────────────────
export interface Viewer {
  uid: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

// ─────────────────────────────────────────────────────────────
// Calls
// ─────────────────────────────────────────────────────────────
const callsCol = () => collection(db, 'volunteer_calls');
const appsCol = () => collection(db, 'volunteer_applications');

function normaliseCall(id: string, data: Record<string, unknown>): VolunteerCall {
  const d = data as Partial<VolunteerCall>;
  return {
    id,
    title: d.title || 'Untitled call',
    summary: d.summary || '',
    description: d.description || '',
    poster: d.poster || '',
    eventDate: d.eventDate || '',
    deadlineAt: typeof d.deadlineAt === 'number' ? d.deadlineAt : null,
    positions: Array.isArray(d.positions) ? d.positions : [],
    questions: Array.isArray(d.questions) ? d.questions : [],
    maxChoices: d.maxChoices || 1,
    status: (d.status as CallStatus) || 'draft',
    published: !!d.published,
    createdBy: d.createdBy || '',
    createdByEmail: d.createdByEmail || '',
    createdByName: d.createdByName || '',
    createdAt: d.createdAt || 0,
    updatedAt: d.updatedAt || 0,
  };
}

/** Live list of the calls this viewer may manage (all for admins, own for members). */
export function subscribeManagedCalls(
  viewer: Viewer,
  onData: (calls: VolunteerCall[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = viewer.isAdmin ? callsCol() : query(callsCol(), where('createdBy', '==', viewer.uid));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => normaliseCall(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt)),
    (err) => { console.warn('volunteer_calls subscription error:', err); onError?.(err); }
  );
}

/** Live list of applications this viewer may see, optionally for a single call. */
export function subscribeManagedApplications(
  viewer: Viewer,
  callId: string | null,
  onData: (apps: VolunteerApplication[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const constraints: QueryConstraint[] = [];
  if (!viewer.isAdmin) constraints.push(where('callOwner', '==', viewer.uid));
  if (callId) constraints.push(where('callId', '==', callId));
  const q = constraints.length ? query(appsCol(), ...constraints) : appsCol();
  return onSnapshot(
    q,
    (snap) =>
      onData(
        snap.docs
          .map((d) => ({ ...(d.data() as Omit<VolunteerApplication, 'id'>), id: d.id }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      ),
    (err) => { console.warn('volunteer_applications subscription error:', err); onError?.(err); }
  );
}

export type CallDraft = Omit<VolunteerCall, 'id' | 'published' | 'createdBy' | 'createdByEmail' | 'createdByName' | 'createdAt' | 'updatedAt'>;

export async function createCall(viewer: Viewer, draft: CallDraft): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(callsCol(), {
    ...cleanDraft(draft),
    published: draft.status !== 'draft',
    createdBy: viewer.uid,
    createdByEmail: viewer.email,
    createdByName: viewer.name,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateCall(id: string, patch: Partial<CallDraft>): Promise<void> {
  const data: Record<string, unknown> = { ...cleanDraft(patch), updatedAt: Date.now() };
  if (patch.status) data.published = patch.status !== 'draft';
  await updateDoc(doc(db, 'volunteer_calls', id), data);
}

export async function setCallStatus(id: string, status: CallStatus): Promise<void> {
  await updateDoc(doc(db, 'volunteer_calls', id), { status, published: status !== 'draft', updatedAt: Date.now() });
}

/** Deletes a call and every application submitted to it. */
export async function deleteCall(viewer: Viewer, callId: string): Promise<void> {
  const constraints: QueryConstraint[] = [where('callId', '==', callId)];
  if (!viewer.isAdmin) constraints.push(where('callOwner', '==', viewer.uid));
  const snap = await getDocs(query(appsCol(), ...constraints));
  for (let i = 0; i < snap.docs.length; i += 450) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, 'volunteer_calls', callId));
}

function cleanDraft<T extends Record<string, unknown>>(draft: T): T {
  // Firestore rejects undefined values.
  return JSON.parse(JSON.stringify(draft, (_k, v) => (v === undefined ? null : v)));
}

// ─────────────────────────────────────────────────────────────
// Applications (management)
// ─────────────────────────────────────────────────────────────
export async function reviewApplication(
  id: string,
  patch: Partial<Pick<VolunteerApplication, 'status' | 'assignedPosition' | 'assignedRole' | 'notes'>>,
  reviewer: Viewer
): Promise<void> {
  const data: Record<string, unknown> = { ...patch, reviewedAt: Date.now(), reviewedBy: reviewer.email };
  Object.keys(data).forEach((k) => data[k] === undefined && (data[k] = null));
  await updateDoc(doc(db, 'volunteer_applications', id), data);
}

export async function deleteApplication(id: string): Promise<void> {
  await deleteDoc(doc(db, 'volunteer_applications', id));
}

// ─────────────────────────────────────────────────────────────
// Public side
// ─────────────────────────────────────────────────────────────
export async function getPublishedCalls(): Promise<VolunteerCall[]> {
  const snap = await getDocs(query(callsCol(), where('published', '==', true)));
  return snap.docs.map((d) => normaliseCall(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt);
}

/** Returns the call if it is published; null if it does not exist or is a private draft. */
export async function getPublicCall(id: string): Promise<VolunteerCall | null> {
  try {
    const snap = await getDoc(doc(db, 'volunteer_calls', id));
    return snap.exists() ? normaliseCall(snap.id, snap.data()) : null;
  } catch {
    return null; // drafts are not readable by the public
  }
}

export const isAcceptingApplications = (call: VolunteerCall, now = Date.now()) =>
  call.status === 'open' && call.published && (call.deadlineAt === null || now <= call.deadlineAt);

export interface ApplicationInput {
  name: string;
  email: string;
  phone: string;
  studentId: string;
  faculty: string;
  academicYear: string;
  positions: string[];
  preferredRole: 'member' | 'lead' | 'either';
  answers: Record<string, string | string[]>;
}

export class AlreadyAppliedError extends Error {}

export async function submitApplication(call: VolunteerCall, input: ApplicationInput): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const payload: Omit<VolunteerApplication, 'id'> = {
    callId: call.id,
    callOwner: call.createdBy,
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
    studentId: input.studentId.trim(),
    faculty: input.faculty,
    academicYear: input.academicYear,
    positions: input.positions,
    preferredRole: input.preferredRole,
    answers: input.answers,
    status: 'pending',
    createdAt: Date.now(),
  };
  try {
    // The document id includes the email, so a second submission becomes an
    // "update", which the security rules refuse → one application per email.
    await setDoc(doc(db, 'volunteer_applications', applicationId(call.id, email)), payload);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'permission-denied') {
      throw new AlreadyAppliedError(
        'We could not accept this application. You may have already applied with this email, or the call has just closed.'
      );
    }
    throw err;
  }
}

/** Number of calls currently accepting applications (for the public navbar). */
export async function countOpenCalls(): Promise<number> {
  try {
    const calls = await getPublishedCalls();
    return calls.filter((c) => isAcceptingApplications(c)).length;
  } catch {
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────
// Analytics helpers
// ─────────────────────────────────────────────────────────────
export function countBy<T>(items: T[], key: (item: T) => string | string[] | undefined | null): { label: string; value: number }[] {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const k = key(item);
    const keys = Array.isArray(k) ? k : [k];
    keys.forEach((kk) => {
      if (kk === undefined || kk === null || kk === '') return;
      map.set(kk, (map.get(kk) || 0) + 1);
    });
  });
  return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/** Applications per calendar day between `from` and today (inclusive). */
/** Local calendar day as YYYY-MM-DD (not UTC — Sri Lanka is UTC+5:30). */
const localDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function perDay(apps: { createdAt: number }[], days = 30): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const counts = new Map<string, number>();
  apps.forEach((a) => {
    const k = localDayKey(new Date(a.createdAt));
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = localDayKey(d);
    out.push({ date: k, value: counts.get(k) || 0 });
  }
  return out;
}

export const positionName = (call: VolunteerCall | undefined, id?: string) =>
  (id && call?.positions.find((p) => p.id === id)?.name) || id || '';
