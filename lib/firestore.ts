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
// SPOTLIGHT
// ==========================================
export async function getSpotlight(): Promise<SpotlightData> {
  try {
    const snap = await getDoc(doc(db, 'site_settings', 'spotlight'));
    if (snap.exists()) {
      return snap.data() as SpotlightData;
    }
  } catch (err) {
    console.warn('Firestore spotlight fetch fallback:', err);
  }
  return INITIAL_SPOTLIGHT;
}

export async function updateSpotlight(data: Partial<SpotlightData>): Promise<void> {
  const ref = doc(db, 'site_settings', 'spotlight');
  await setDoc(ref, { ...data, updatedAt: Date.now() }, { merge: true });
}

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
  return INITIAL_EVENTS;
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
  return INITIAL_COMMITTEE;
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

    // Format member names and roles as strings: e.g. "President: Naveen Fernando"
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
  return INITIAL_PAST_COMMITTEES;
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
  return INITIAL_RESOURCES;
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
  return INITIAL_GALLERY;
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

