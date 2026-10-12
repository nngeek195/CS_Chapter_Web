import {
  FacultyAdvisorData,
  EventCategory,
} from './types';
import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────
// EMPTY DEFAULTS
// These are used as safe initial React state before Firestore
// loads, and as Firestore fallback values when offline.
// They contain NO hardcoded mock/fake content.
// ─────────────────────────────────────────────────────────────

export const INITIAL_ADVISOR: FacultyAdvisorData = {
  name: '',
  title: 'Faculty Advisor',
  department: '',
  bio: '',
  initials: 'FA',
  email: '',
  linkedin: '',
};

export const INITIAL_CATEGORIES: EventCategory[] = [
  { id: 'cat-all',      key: 'all',      label: 'All' },
  { id: 'cat-upcoming', key: 'upcoming', label: 'Upcoming' },
  { id: 'cat-ongoing',  key: 'ongoing',  label: 'Ongoing' },
  { id: 'cat-past',     key: 'past',     label: 'Past' },
  { id: 'cat-flagship', key: 'flagship', label: 'Flagship' },
];

// ─────────────────────────────────────────────────────────────
// SEED FUNCTION
// Seeds only the base event categories and a blank advisor
// placeholder so the admin forms have something to start with.
// Events, gallery, resources, committee, and past committees
// are all managed exclusively through the Admin dashboard.
// ─────────────────────────────────────────────────────────────

export async function seedAllData(): Promise<{ success: boolean; message: string }> {
  try {
    const batch = writeBatch(db);

    // Advisor placeholder (only write if not already set)
    const advisorRef = doc(db, 'site_settings', 'advisor');
    const advisorSnap = await getDocs(collection(db, 'site_settings'));
    const advisorExists = advisorSnap.docs.some((d) => d.id === 'advisor');
    if (!advisorExists) {
      batch.set(advisorRef, { ...INITIAL_ADVISOR, updatedAt: Date.now() });
    }

    // Base event categories
    for (const cat of INITIAL_CATEGORIES) {
      batch.set(doc(db, 'event_categories', cat.id), cat);
    }

    await batch.commit();
    return {
      success: true,
      message: 'Base categories seeded. Add your own events, gallery photos, resources, and committee members through the Admin dashboard.',
    };
  } catch (err: any) {
    console.error('Failed to seed data to Firestore:', err);
    return { success: false, message: err?.message || 'Failed to seed data' };
  }
}
