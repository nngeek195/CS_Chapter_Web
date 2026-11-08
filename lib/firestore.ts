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
  orderBy,
  writeBatch,
  onSnapshot,
  deleteField,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  FacultyAdvisorData,
  EventItem,
  EventCategory,
  CommitteeMember,
  PastCommittee,
  ResourceItem,
  GalleryPhoto,
  ContactMessage,
} from './types';
import {
  INITIAL_ADVISOR,
  INITIAL_CATEGORIES,
} from './seedData';

// ==========================================
// FACULTY ADVISOR
// ==========================================
export async function getFacultyAdvisor(): Promise<FacultyAdvisorData> {
  try {
    const snap = await getDoc(doc(db, 'site_settings', 'advisor'));
    if (snap.exists()) {
      return snap.data() as FacultyAdvisorData;
    }
  } catch (err) {
    console.warn('Firestore advisor fetch fallback:', err);
  }
  return INITIAL_ADVISOR;
}

export async function updateFacultyAdvisor(data: Partial<FacultyAdvisorData>): Promise<void> {
  const ref = doc(db, 'site_settings', 'advisor');
  await setDoc(ref, { ...data, updatedAt: Date.now() }, { merge: true });
}

// ==========================================
// EVENT CATEGORIES
// ==========================================
export async function getEventCategories(): Promise<EventCategory[]> {
  try {
    const snap = await getDocs(collection(db, 'event_categories'));
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventCategory));
    }
  } catch (err) {
    console.warn('Firestore categories fetch fallback:', err);
  }
  return INITIAL_CATEGORIES;
}

export async function addEventCategory(key: string, label: string): Promise<EventCategory> {
  const cleanKey = key.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
  const ref = doc(db, 'event_categories', `cat-${cleanKey}`);
  const newCat: EventCategory = { id: `cat-${cleanKey}`, key: cleanKey, label: label.trim() };
  await setDoc(ref, newCat);
  return newCat;
}

export async function deleteEventCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, 'event_categories', id));
}

// ==========================================
// EVENTS
// ==========================================
export async function getEvents(): Promise<EventItem[]> {
  try {
    const snap = await getDocs(collection(db, 'events'));
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventItem));
    }
  } catch (err) {
    console.warn('Firestore events fetch fallback:', err);
  }
  return [];
}

export async function createEvent(event: Omit<EventItem, 'id'>): Promise<EventItem> {
  const col = collection(db, 'events');
  const ref = await addDoc(col, { ...event, createdAt: Date.now() });
  return { id: ref.id, ...event };
}

export async function updateEvent(id: string, event: Partial<EventItem>): Promise<void> {
  const ref = doc(db, 'events', id);
  await updateDoc(ref, event);
}

export async function deleteEvent(id: string): Promise<void> {
  await deleteDoc(doc(db, 'events', id));
}

/**
 * Sets one event as the featured spotlight on the home page.
 * Clears isSpotlight from every other event first, then flags the chosen one.
 */
export async function setEventSpotlight(spotlightId: string): Promise<void> {
  const snap = await getDocs(collection(db, 'events'));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { isSpotlight: d.id === spotlightId });
  });
  await batch.commit();
}

/**
 * Returns the single event currently marked as spotlight, or null.
 */
export async function getSpotlightEvent(): Promise<EventItem | null> {
  try {
    const snap = await getDocs(collection(db, 'events'));
    const found = snap.docs.find((d) => d.data().isSpotlight === true);
    if (found) return { id: found.id, ...found.data() } as EventItem;
  } catch (err) {
    console.warn('Firestore spotlight event fetch fallback:', err);
  }
  return null;
}



// ==========================================
// LEADERSHIP (CURRENT COMMITTEE)
// ==========================================
export async function getCommittee(): Promise<CommitteeMember[]> {
  try {
    const snap = await getDocs(collection(db, 'leadership'));
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommitteeMember));
      return items.sort((a, b) => (a.order || 99) - (b.order || 99));
    }
  } catch (err) {
    console.warn('Firestore committee fetch fallback:', err);
  }
  return [];
}

export async function createCommitteeMember(member: Omit<CommitteeMember, 'id'>): Promise<CommitteeMember> {
  const initials =
    member.initials ||
    member.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);
  const col = collection(db, 'leadership');
  const ref = await addDoc(col, { ...member, initials });
  return { id: ref.id, ...member, initials };
}

export async function updateCommitteeMember(id: string, member: Partial<CommitteeMember>): Promise<void> {
  const ref = doc(db, 'leadership', id);
  await updateDoc(ref, member);
}

export async function deleteCommitteeMember(id: string): Promise<void> {
  await deleteDoc(doc(db, 'leadership', id));
}

// ==========================================
// END CURRENT YEAR COMMITTEE & ARCHIVE
// ==========================================
export async function endCurrentYearCommittee(
  committeeYear: string
): Promise<{ success: boolean; message: string; archivedCount: number }> {
  try {
    const currentMembers = await getCommittee();
    if (currentMembers.length === 0) {
      return { success: false, message: 'No current committee members to archive.', archivedCount: 0 };
    }

    // Format member names and roles as strings: e.g. "Webmaster: Niranga Nayanajith"
    const memberStrings = currentMembers.map((m) => `${m.role}: ${m.name}`);

    // Create entry in past_committees
    const pastDocId = `pc-${committeeYear.replace(/[^0-9]/g, '-').replace(/--+/g, '-')}`;
    const pastRef = doc(db, 'past_committees', pastDocId);
    await setDoc(pastRef, {
      year: committeeYear,
      members: memberStrings,
      createdAt: Date.now(),
    });

    // Delete all current active committee docs from 'leadership' collection
    const snap = await getDocs(collection(db, 'leadership'));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();

    return {
      success: true,
      message: `Committee successfully archived to past leadership under '${committeeYear}'.`,
      archivedCount: currentMembers.length,
    };
  } catch (err: any) {
    console.error('Failed to end current year committee:', err);
    return { success: false, message: err?.message || 'Archive operation failed', archivedCount: 0 };
  }
}

// ==========================================
// PAST COMMITTEES
// ==========================================
export async function getPastCommittees(): Promise<PastCommittee[]> {
  try {
    const snap = await getDocs(collection(db, 'past_committees'));
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PastCommittee));
      return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  } catch (err) {
    console.warn('Firestore past committees fetch fallback:', err);
  }
  return [];
}

export async function createPastCommittee(year: string, members: string[]): Promise<PastCommittee> {
  const col = collection(db, 'past_committees');
  const ref = await addDoc(col, { year, members, createdAt: Date.now() });
  return { id: ref.id, year, members };
}

export async function deletePastCommittee(id: string): Promise<void> {
  await deleteDoc(doc(db, 'past_committees', id));
}

// ==========================================
// RESOURCES
// ==========================================
export async function getResources(): Promise<ResourceItem[]> {
  try {
    const snap = await getDocs(collection(db, 'resources'));
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ResourceItem));
      return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  } catch (err) {
    console.warn('Firestore resources fetch fallback:', err);
  }
  return [];
}

export async function createResource(resource: Omit<ResourceItem, 'id'>): Promise<ResourceItem> {
  const col = collection(db, 'resources');
  const ref = await addDoc(col, { ...resource, createdAt: Date.now() });
  return { id: ref.id, ...resource };
}

export async function updateResource(id: string, resource: Partial<ResourceItem>): Promise<void> {
  const ref = doc(db, 'resources', id);
  await updateDoc(ref, resource);
}

export async function deleteResource(id: string): Promise<void> {
  await deleteDoc(doc(db, 'resources', id));
}

// ==========================================
// GALLERY
// ==========================================
export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  try {
    const snap = await getDocs(collection(db, 'gallery'));
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GalleryPhoto));
      return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  } catch (err) {
    console.warn('Firestore gallery fetch fallback:', err);
  }
  return [];
}

export async function createGalleryPhoto(photo: Omit<GalleryPhoto, 'id'>): Promise<GalleryPhoto> {
  const col = collection(db, 'gallery');
  const ref = await addDoc(col, { ...photo, createdAt: Date.now() });
  return { id: ref.id, ...photo };
}

export async function deleteGalleryPhoto(id: string): Promise<void> {
  await deleteDoc(doc(db, 'gallery', id));
}

// ==========================================
// CONTACT MESSAGES
// ==========================================
export async function submitContactMessage(
  data: Omit<ContactMessage, 'id' | 'createdAt' | 'read'>
): Promise<ContactMessage> {
  const col = collection(db, 'contact_messages');
  const payload = {
    ...data,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const ref = await addDoc(col, payload);
  return { id: ref.id, ...payload };
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  try {
    const snap = await getDocs(collection(db, 'contact_messages'));
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContactMessage));
      return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (err) {
    console.warn('Firestore contact messages fetch:', err);
  }
  return [];
}

export async function markContactMessageAsRead(id: string, read: boolean): Promise<void> {
  const ref = doc(db, 'contact_messages', id);
  await updateDoc(ref, { read });
}

export async function deleteContactMessage(id: string): Promise<void> {
  await deleteDoc(doc(db, 'contact_messages', id));
}

// ==========================================
// BOARD MEMBERS (Admin Users)
// ==========================================

export interface BoardMember {
  id: string;
  name: string;
  role: string;
  email: string;
  permissions: string[];
  status: 'pending' | 'active';
  mustChangePassword: boolean;
  invitedAt: number;
  activatedAt?: number;
  updatedAt?: number;
}

export async function getBoardMembers(): Promise<BoardMember[]> {
  try {
    const snap = await getDocs(collection(db, 'board_members'));
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BoardMember));
      return items.sort((a, b) => (b.invitedAt || 0) - (a.invitedAt || 0));
    }
  } catch (err) {
    console.warn('Firestore board_members fetch fallback:', err);
  }
  return [];
}

// `member_access/{lowercase email}` mirrors each board member's permissions.
// Firestore security rules use it to check what a signed-in member may write
// (rules can look documents up by id, but cannot search board_members by email).
const accessKey = (email: string) => email.trim().toLowerCase();
const accessRef = (email: string) => doc(db, 'member_access', accessKey(email));

export async function createBoardMember(
  member: Omit<BoardMember, 'id'>
): Promise<BoardMember> {
  const ref = doc(collection(db, 'board_members'));
  const batch = writeBatch(db);
  batch.set(ref, { ...member, updatedAt: Date.now() });
  batch.set(accessRef(member.email), { permissions: member.permissions || [], memberId: ref.id });
  await batch.commit();
  return { id: ref.id, ...member };
}

export async function updateBoardMember(
  id: string,
  data: Partial<BoardMember>
): Promise<void> {
  const ref = doc(db, 'board_members', id);
  // Firestore rejects `undefined`, so treat it as "remove this field"; stamp
  // updatedAt so the most recently edited record wins if duplicates exist.
  const clean = Object.fromEntries(
    Object.entries(data)
      .filter(([k]) => k !== 'id')
      .map(([k, v]) => [k, v === undefined ? deleteField() : v])
  );
  const batch = writeBatch(db);
  batch.update(ref, { ...clean, updatedAt: Date.now() });

  // Keep the permission mirror in step when permissions or the email change.
  if (data.permissions !== undefined || data.email !== undefined) {
    const current = await getDoc(ref);
    const prev = current.exists() ? (current.data() as BoardMember) : null;
    const email = data.email ?? prev?.email;
    const permissions = data.permissions ?? prev?.permissions ?? [];
    if (prev?.email && email && accessKey(prev.email) !== accessKey(email)) {
      batch.delete(accessRef(prev.email)); // post replaced — old holder loses access
    }
    if (email) batch.set(accessRef(email), { permissions, memberId: id });
  }
  await batch.commit();
}

export async function deleteBoardMember(id: string): Promise<void> {
  const ref = doc(db, 'board_members', id);
  const current = await getDoc(ref);
  const batch = writeBatch(db);
  batch.delete(ref);
  const email = current.exists() ? (current.data() as BoardMember).email : '';
  if (email) batch.delete(accessRef(email));
  await batch.commit();
}

/**
 * Rebuilds member_access from board_members. Run by the admin dashboard on
 * load so members invited before the mirror existed keep working.
 */
export async function syncMemberAccess(): Promise<void> {
  const [members, access] = await Promise.all([
    getDocs(collection(db, 'board_members')),
    getDocs(collection(db, 'member_access')),
  ]);
  const wanted = new Map<string, { permissions: string[]; memberId: string; stamp: number }>();
  members.docs.forEach((d) => {
    const m = d.data() as BoardMember;
    if (!m.email) return;
    const key = accessKey(m.email);
    const stamp = Math.max(m.updatedAt || 0, m.activatedAt || 0, m.invitedAt || 0);
    const existing = wanted.get(key);
    if (!existing || stamp >= existing.stamp) wanted.set(key, { permissions: m.permissions || [], memberId: d.id, stamp });
  });
  const have = new Map(access.docs.map((d) => [d.id, d.data()]));
  const batch = writeBatch(db);
  let changes = 0;
  wanted.forEach(({ permissions, memberId }, key) => {
    const cur = have.get(key);
    if (!cur || cur.memberId !== memberId || JSON.stringify(cur.permissions) !== JSON.stringify(permissions)) {
      batch.set(doc(db, 'member_access', key), { permissions, memberId });
      changes++;
    }
  });
  have.forEach((_, key) => {
    if (!wanted.has(key)) { batch.delete(doc(db, 'member_access', key)); changes++; }
  });
  if (changes > 0) await batch.commit();
}

/**
 * True if `admins/{uid}` exists. Returns null when the read is denied —
 * i.e. the new security rules have not been deployed yet.
 */
export async function isAdminUid(uid: string): Promise<boolean | null> {
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch (err) {
    console.warn('Admin check failed (are the new Firestore rules deployed?):', err);
    return null;
  }
}

const sameEmail = (a: unknown, b: string) =>
  typeof a === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Picks the board-member record for an email. If several records share the
 * email (e.g. invited twice), the most recently edited / invited one wins —
 * that is the one the admin is looking at when they change permissions.
 */
function pickBoardMember(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
  email: string
): BoardMember | null {
  const matches = docs
    .filter((d) => sameEmail(d.data().email, email))
    .map((d) => ({ ...d.data(), id: d.id } as BoardMember));
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    console.warn(`Found ${matches.length} board_members records for ${email}; using the most recently updated one.`);
  }
  const stamp = (m: BoardMember) => Math.max(m.updatedAt || 0, m.activatedAt || 0, m.invitedAt || 0);
  return matches.sort((a, b) => stamp(b) - stamp(a))[0];
}

export async function getBoardMemberByEmail(email: string): Promise<BoardMember | null> {
  if (!email) return null;
  try {
    const snap = await getDocs(collection(db, 'board_members'));
    const found = pickBoardMember(snap.docs, email);
    if (found) return found;
  } catch (err) {
    console.warn('Firestore board member by email fetch:', err);
  }
  return null;
}

export async function markPasswordChanged(email: string): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'board_members'));
    const found = snap.docs.find((d) => sameEmail(d.data().email, email));
    if (found) {
      await updateDoc(found.ref, {
        mustChangePassword: false,
        status: 'active',
        activatedAt: Date.now(),
      });
    }
  } catch (err) {
    console.warn('markPasswordChanged error:', err);
  }
}


// ==========================================
// REAL-TIME SUBSCRIPTIONS
// ==========================================

/**
 * Live-subscribes to a whole collection. The callback fires immediately with
 * the current data and again on every change (including local writes), so
 * screens using this stay in sync with edits made elsewhere (e.g. the admin).
 */
export function subscribeToCollection<T extends { id: string }>(
  name: string,
  onData: (items: T[]) => void,
  onError?: (err: Error) => void,
  sort?: (a: T, b: T) => number
): Unsubscribe {
  return onSnapshot(
    collection(db, name),
    (snap) => {
      const items = snap.docs.map((d) => ({ ...d.data(), id: d.id } as T));
      onData(sort ? items.sort(sort) : items);
    },
    (err) => {
      console.warn(`Firestore ${name} subscription error:`, err);
      onError?.(err);
    }
  );
}

/**
 * Live-subscribes to the board-member record for an email (case-insensitive).
 * Follows the email rather than a document id so permission changes are picked
 * up even if the admin edits a different / newer record for the same person.
 * `null` means no record exists any more (access revoked).
 */
export function subscribeToBoardMemberByEmail(
  email: string,
  onData: (member: BoardMember | null) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'board_members'),
    (snap) => {
      // Ignore cache-only snapshots so a stale/empty cache never revokes access.
      if (snap.metadata.fromCache) return;
      onData(pickBoardMember(snap.docs, email));
    },
    (err) => console.warn('Firestore board member subscription error:', err)
  );
}

/**
 * Turns a Firestore "Missing or insufficient permissions" error into a message
 * that says which part of the role setup is missing for the signed-in user.
 */
export async function explainPermissionError(
  err: unknown,
  user: { uid: string; email: string | null } | null
): Promise<string> {
  const base = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code;
  if (!user || (code !== 'permission-denied' && !/insufficient permissions/i.test(base))) return base;

  const email = (user.email || '').trim().toLowerCase();
  const tryGet = async (path: string) => {
    try {
      const snap = await getDoc(doc(db, path));
      return snap.exists() ? 'exists' : 'missing';
    } catch {
      return 'denied';
    }
  };

  const adminDoc = await tryGet(`admins/${user.uid}`);
  if (adminDoc === 'denied') {
    return `${base} — the published Firestore rules have no "admins" section. Publish the full rules from firestore.rules (replace everything).`;
  }
  const accessDoc = email ? await tryGet(`member_access/${email}`) : 'missing';
  if (adminDoc === 'exists') {
    if (accessDoc === 'denied') {
      return `${base} — the published Firestore rules have no "member_access" section. Publish the full rules from firestore.rules (replace everything).`;
    }
    return `${base} — you are an admin, so this should be allowed. Make sure the full rules from firestore.rules are published and reload the page.`;
  }
  if (accessDoc === 'denied') {
    return `${base} — the published Firestore rules have no "member_access" section. Publish the full rules from firestore.rules (replace everything).`;
  }
  if (accessDoc === 'missing') {
    const isMember = (await getBoardMemberByEmail(email)) !== null;
    return isMember
      ? `${base} — your access record (member_access/${email}) has not been created yet. An admin must open the /admin page once to sync it.`
      : `${base} — this account (${user.email}) is not registered as an admin. Create a Firestore document at admins/${user.uid}.`;
  }
  return `${base} — your board permissions do not include this action. Ask an admin to grant it.`;
}
