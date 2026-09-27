import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  SpotlightData,
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
  INITIAL_SPOTLIGHT,
  INITIAL_ADVISOR,
  INITIAL_CATEGORIES,
  INITIAL_EVENTS,
  INITIAL_COMMITTEE,
  INITIAL_PAST_COMMITTEES,
  INITIAL_RESOURCES,
  INITIAL_GALLERY,
} from './seedData';

// ==========================================
// GENERIC FIRESTORE HELPERS
// ==========================================
async function fetchDoc<T>(colName: string, id: string, fallback: T): Promise<T> {
  try {
    const snap = await getDoc(doc(db, colName, id));
    if (snap.exists()) return snap.data() as T;
  } catch (err) {
    console.warn(`Firestore ${colName}/${id} fallback:`, err);
  }
  return fallback;
}

async function fetchCollection<T>(
  colName: string,
  fallback: T[],
  transform?: (doc: any) => T
): Promise<T[]> {
  try {
    const snap = await getDocs(collection(db, colName));
    if (!snap.empty) {
      return snap.docs.map((d) => (transform ? transform(d) : ({ id: d.id, ...d.data() } as T)));
    }
  } catch (err) {
    console.warn(`Firestore ${colName} fallback:`, err);
  }
  return fallback;
}

async function createDoc<T extends object>(colName: string, data: T): Promise<T & { id: string }> {
  const payload = { ...data, createdAt: Date.now() };
  const ref = await addDoc(collection(db, colName), payload);
  return { id: ref.id, ...payload };
}

const updateDocById = <T extends object>(colName: string, id: string, data: Partial<T>) =>
  updateDoc(doc(db, colName, id), data as Record<string, any>);

const deleteDocById = (colName: string, id: string) => deleteDoc(doc(db, colName, id));

const setDocById = <T extends object>(colName: string, id: string, data: Partial<T>) =>
  setDoc(doc(db, colName, id), { ...data, updatedAt: Date.now() }, { merge: true });

// ==========================================
// SPOTLIGHT
// ==========================================
export const getSpotlight = () => fetchDoc<SpotlightData>('site_settings', 'spotlight', INITIAL_SPOTLIGHT);
export const updateSpotlight = (data: Partial<SpotlightData>) => setDocById('site_settings', 'spotlight', data);

// ==========================================
// FACULTY ADVISOR
// ==========================================
export const getFacultyAdvisor = () => fetchDoc<FacultyAdvisorData>('site_settings', 'advisor', INITIAL_ADVISOR);
export const updateFacultyAdvisor = (data: Partial<FacultyAdvisorData>) => setDocById('site_settings', 'advisor', data);

// ==========================================
// EVENT CATEGORIES
// ==========================================
export const getEventCategories = () => fetchCollection<EventCategory>('event_categories', INITIAL_CATEGORIES);

export async function addEventCategory(key: string, label: string): Promise<EventCategory> {
  const cleanKey = key.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
  const newCat: EventCategory = { id: `cat-${cleanKey}`, key: cleanKey, label: label.trim() };
  await setDoc(doc(db, 'event_categories', newCat.id), newCat);
  return newCat;
}

export const deleteEventCategory = (id: string) => deleteDocById('event_categories', id);

// ==========================================
// EVENTS
// ==========================================
export const getEvents = () => fetchCollection<EventItem>('events', INITIAL_EVENTS);
export const createEvent = (event: Omit<EventItem, 'id'>) => createDoc<Omit<EventItem, 'id'>>('events', event);
export const updateEvent = (id: string, event: Partial<EventItem>) => updateDocById<EventItem>('events', id, event);
export const deleteEvent = (id: string) => deleteDocById('events', id);

// ==========================================
// LEADERSHIP (CURRENT COMMITTEE)
// ==========================================
export async function getCommittee(): Promise<CommitteeMember[]> {
  const items = await fetchCollection<CommitteeMember>('leadership', INITIAL_COMMITTEE, (d) => {
    const data = d.data() as CommitteeMember;
    const item: CommitteeMember = { ...data, id: d.id };
    if (
      !item.image &&
      (item.id === 'cm-6' ||
        item.role?.toLowerCase().includes('visibility') ||
        item.name?.toLowerCase().includes('nisal'))
    ) {
      item.image = '/images/publicVisibilityChair.png';
    }
    return item;
  });
  return items.sort((a, b) => (a.order || 99) - (b.order || 99));
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

export const updateCommitteeMember = (id: string, member: Partial<CommitteeMember>) =>
  updateDocById<CommitteeMember>('leadership', id, member);
export const deleteCommitteeMember = (id: string) => deleteDocById('leadership', id);

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

    const memberStrings = currentMembers.map((m) => `${m.role}: ${m.name}`);
    const pastDocId = `pc-${committeeYear.replace(/[^0-9]/g, '-').replace(/--+/g, '-')}`;
    await setDoc(doc(db, 'past_committees', pastDocId), {
      year: committeeYear,
      members: memberStrings,
      createdAt: Date.now(),
    });

    const snap = await getDocs(collection(db, 'leadership'));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
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
  const items = await fetchCollection<PastCommittee>('past_committees', INITIAL_PAST_COMMITTEES);
  const filtered = items.filter(
    (i) => !i.year?.includes('2023') && !i.year?.includes('2022') && !i.year?.includes('2021')
  );
  if (!filtered.some((i) => i.year?.includes('2024'))) {
    const item2024 = INITIAL_PAST_COMMITTEES.find((p) => p.year.includes('2024'));
    if (item2024) filtered.unshift(item2024);
  }
  return filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export const createPastCommittee = (year: string, members: string[]) =>
  createDoc<Omit<PastCommittee, 'id'>>('past_committees', { year, members });

export const deletePastCommittee = (id: string) => deleteDocById('past_committees', id);

// ==========================================
// RESOURCES
// ==========================================
export async function getResources(): Promise<ResourceItem[]> {
  const items = await fetchCollection<ResourceItem>('resources', INITIAL_RESOURCES);
  return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export const createResource = (resource: Omit<ResourceItem, 'id'>) =>
  createDoc<Omit<ResourceItem, 'id'>>('resources', resource);

export const updateResource = (id: string, resource: Partial<ResourceItem>) =>
  updateDocById<ResourceItem>('resources', id, resource);

export const deleteResource = (id: string) => deleteDocById('resources', id);

// ==========================================
// GALLERY
// ==========================================
export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  const items = await fetchCollection<GalleryPhoto>('gallery', INITIAL_GALLERY);
  return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export const createGalleryPhoto = (photo: Omit<GalleryPhoto, 'id'>) =>
  createDoc<Omit<GalleryPhoto, 'id'>>('gallery', photo);

export const deleteGalleryPhoto = (id: string) => deleteDocById('gallery', id);

// ==========================================
// CONTACT MESSAGES
// ==========================================
export async function submitContactMessage(
  data: Omit<ContactMessage, 'id' | 'createdAt' | 'read'>
): Promise<ContactMessage> {
  const payload = {
    ...data,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, 'contact_messages'), payload);
  return { id: ref.id, ...payload };
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  const items = await fetchCollection<ContactMessage>('contact_messages', []);
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const markContactMessageAsRead = (id: string, read: boolean) =>
  updateDocById<ContactMessage>('contact_messages', id, { read });

export const deleteContactMessage = (id: string) => deleteDocById('contact_messages', id);
