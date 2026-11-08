'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ImageUploader from '@/components/ImageUploader';
import ZipGalleryUploader from '@/components/ZipGalleryUploader';
import BoardManager from '@/components/BoardManager';
import VolunteerCallsManager from '@/components/volunteers/VolunteerCallsManager';
import { subscribeManagedCalls } from '@/lib/volunteers';
import Icon, { IconName } from '@/components/ui/Icon';
import { Avatar, ButtonSpinner, EmptyState, SectionHeader, SkeletonList, Toast } from '@/components/ui/Portal';
import {
  EventItem,
  EventCategory,
  CommitteeMember,
  PastCommittee,
  ResourceItem,
  GalleryPhoto,
  ContactMessage,
} from '@/lib/types';
import {
  addEventCategory,
  deleteEventCategory,
  createEvent,
  updateEvent,
  deleteEvent,
  setEventSpotlight,
  createCommitteeMember,
  updateCommitteeMember,
  deleteCommitteeMember,
  endCurrentYearCommittee,
  createPastCommittee,
  deletePastCommittee,
  createResource,
  updateResource,
  deleteResource,
  createGalleryPhoto,
  deleteGalleryPhoto,
  markContactMessageAsRead,
  deleteContactMessage,
  subscribeToCollection,
  explainPermissionError,
} from '@/lib/firestore';
import { INITIAL_CATEGORIES } from '@/lib/seedData';

type MemberTab = 'overview' | 'events' | 'leadership' | 'gallery' | 'resources' | 'messages' | 'volunteers' | 'board';
type SectionKey = Exclude<MemberTab, 'overview'>;

const BATCH_OPTIONS = [
  '2020/2021 Batch',
  '2021/2022 Batch',
  '2022/2023 Batch',
  '2023/2024 Batch',
  '2024/2025 Batch',
  '2025/2026 Batch',
  '2026/2027 Batch',
];

const RESOURCE_CATEGORIES = ['Workshop Kit', 'Tutorial', 'Template', 'Guide', 'Tool', 'Other'];

const SECTION_ORDER: SectionKey[] = ['events', 'leadership', 'resources', 'gallery', 'messages', 'volunteers', 'board'];

const SECTIONS: Record<SectionKey, { icon: IconName; label: string; desc: string }> = {
  events: { icon: 'calendar', label: 'Events', desc: 'Create, edit and feature events' },
  leadership: { icon: 'users', label: 'Leadership', desc: 'Manage the committee roster' },
  resources: { icon: 'book', label: 'Resources', desc: 'Add and edit learning resources' },
  gallery: { icon: 'image', label: 'Gallery', desc: 'Upload and remove photos' },
  messages: { icon: 'mail', label: 'Inquiries', desc: 'Read contact messages' },
  volunteers: { icon: 'clipboard', label: 'Volunteer Calls', desc: 'Recruit volunteers and review applicants' },
  board: { icon: 'shield', label: 'Board', desc: 'Invite and manage board members' },
};

/** Firestore collection that backs each section's main list. */
const SECTION_COLLECTION: Record<SectionKey, string> = {
  events: 'events',
  leadership: 'leadership',
  resources: 'resources',
  gallery: 'gallery',
  messages: 'contact_messages',
  volunteers: '',
  board: 'board_members',
};

const DEFAULT_EVENT_IMAGE =
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=82';

const EMPTY_EVENT: Partial<EventItem> = {
  title: '', type: 'upcoming', typeLabel: 'Upcoming', date: '', description: '', image: '', tags: ['CS', 'Chapter'], link: '',
};
const EMPTY_MEMBER: Partial<CommitteeMember> = {
  name: '', role: '', department: 'Computing & Information Systems', batch: '2023/2024 Batch', image: '', linkedin: '', email: '',
};
const EMPTY_RESOURCE: Partial<ResourceItem> = { category: 'Workshop Kit', title: '', description: '', link: '' };
const EMPTY_PHOTO: Partial<GalleryPhoto> = { src: '', alt: '', caption: '' };

const byCreatedDesc = (a: { createdAt?: number }, b: { createdAt?: number }) => (b.createdAt || 0) - (a.createdAt || 0);
const byOrder = (a: CommitteeMember, b: CommitteeMember) => (a.order || 99) - (b.order || 99);
const byMessageDate = (a: ContactMessage, b: ContactMessage) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

/** Remove the `id` field so it is not written into the Firestore document body. */
function withoutId<T extends { id?: string }>(obj: T): Omit<T, 'id'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...rest } = obj;
  return rest;
}

function errMsg(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

const twoCol: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' };
const iconBtn: React.CSSProperties = { fontSize: '12px', padding: '6px 10px' };
const dangerBtn: React.CSSProperties = { ...iconBtn, color: '#dc2626' };

export default function MemberDashboardPage() {
  const { user, loading: authLoading, logout, boardMember } = useAuth();
  const router = useRouter();

  // Sections this member may manage — recomputed live when the admin changes permissions.
  const permissionKey = (boardMember?.permissions || []).slice().sort().join(',');
  const allowedSections = useMemo(
    () => SECTION_ORDER.filter((s) => permissionKey.split(',').includes(s)),
    [permissionKey]
  );
  const hasPermission = (perm: SectionKey) => allowedSections.includes(perm);

  const [activeTab, setActiveTab] = useState<MemberTab>('overview');
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [syncErrors, setSyncErrors] = useState<Record<string, string>>({});
  const [pendingSections, setPendingSections] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  // Data
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [committee, setCommittee] = useState<CommitteeMember[]>([]);
  const [pastCommittees, setPastCommittees] = useState<PastCommittee[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messageFilter, setMessageFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [messageSearch, setMessageSearch] = useState('');
  const [boardCount, setBoardCount] = useState(0);
  const [volunteerCount, setVolunteerCount] = useState(0);

  // Forms
  const [eventForm, setEventForm] = useState<Partial<EventItem>>(EMPTY_EVENT);
  const [modalEditEvent, setModalEditEvent] = useState<EventItem | null>(null);
  const [newCatKey, setNewCatKey] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');

  const [committeeForm, setCommitteeForm] = useState<Partial<CommitteeMember>>(EMPTY_MEMBER);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const committeeFormRef = useRef<HTMLDivElement>(null);
  const [endYearPrompt, setEndYearPrompt] = useState('');
  const [showEndModal, setShowEndModal] = useState(false);
  const [newPastYear, setNewPastYear] = useState('');
  const [newPastMembersText, setNewPastMembersText] = useState('');
  const [expandedPast, setExpandedPast] = useState<string | null>(null);

  const [resourceForm, setResourceForm] = useState<Partial<ResourceItem>>(EMPTY_RESOURCE);
  const [editingResId, setEditingResId] = useState<string | null>(null);
  const resourceFormRef = useRef<HTMLDivElement>(null);

  const [galleryForm, setGalleryForm] = useState<Partial<GalleryPhoto>>(EMPTY_PHOTO);
  const [galleryUploadMode, setGalleryUploadMode] = useState<'single' | 'zip'>('single');

  // ── Auth routing ──
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/login');
    else if (!boardMember) router.replace('/admin');
  }, [user, authLoading, boardMember, router]);

  // ── Live data subscriptions (only for permitted sections) ──
  useEffect(() => {
    if (!user || !boardMember) return;
    const unsubs: Array<() => void> = [];
    const pending = new Set<string>();

    const track = <T extends { id: string }>(
      name: string,
      setter: (items: T[]) => void,
      sort?: (a: T, b: T) => number
    ) => {
      pending.add(name);
      unsubs.push(
        subscribeToCollection<T>(
          name,
          (items) => {
            setter(items);
            setSyncErrors((prev) => {
              if (!(name in prev)) return prev;
              const next = { ...prev };
              delete next[name];
              return next;
            });
            setPendingSections((prev) => {
              if (!prev.has(name)) return prev;
              const next = new Set(prev);
              next.delete(name);
              return next;
            });
          },
          (err) => {
            setSyncErrors((prev) => ({ ...prev, [name]: err.message }));
            setPendingSections((prev) => {
              const next = new Set(prev);
              next.delete(name);
              return next;
            });
          },
          sort
        )
      );
    };

    if (allowedSections.includes('events')) {
      track<EventCategory>('event_categories', (items) => setCategories(items.length ? items : INITIAL_CATEGORIES));
      track<EventItem>('events', setEvents, byCreatedDesc);
    }
    if (allowedSections.includes('leadership')) {
      track<CommitteeMember>('leadership', setCommittee, byOrder);
      track<PastCommittee>('past_committees', setPastCommittees, byCreatedDesc);
    }
    if (allowedSections.includes('resources')) track<ResourceItem>('resources', setResources, byCreatedDesc);
    if (allowedSections.includes('gallery')) track<GalleryPhoto>('gallery', setGallery, byCreatedDesc);
    if (allowedSections.includes('messages')) track<ContactMessage>('contact_messages', setMessages, byMessageDate);
    if (allowedSections.includes('board')) track<{ id: string }>('board_members', (items) => setBoardCount(items.length));
    // Members may only list their own calls, so this uses the owner-scoped query.
    if (allowedSections.includes('volunteers')) {
      unsubs.push(subscribeManagedCalls(
        { uid: user.uid, email: user.email || '', name: boardMember.name || '', isAdmin: false },
        (calls) => setVolunteerCount(calls.length),
        (err) => setSyncErrors((prev) => ({ ...prev, volunteer_calls: err.message }))
      ));
    }

    setPendingSections(pending);
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, boardMember?.id, allowedSections]);

  // If a permission is revoked while its tab is open, fall back to overview.
  useEffect(() => {
    if (activeTab !== 'overview' && !allowedSections.includes(activeTab)) setActiveTab('overview');
  }, [activeTab, allowedSections]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const showToast = (msg: string, kind: 'ok' | 'error' = 'ok') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, kind });
    toastTimer.current = setTimeout(() => setToast(null), kind === 'error' ? 6000 : 3500);
  };

  /** Runs a write, shows a toast on success / failure, and blocks double-submits. */
  const run = async (action: () => Promise<unknown>, okMsg: string, failMsg: string) => {
    setBusy(true);
    try {
      await action();
      showToast(okMsg);
      return true;
    } catch (err) {
      showToast(`${failMsg}: ${await explainPermissionError(err, user ? { uid: user.uid, email: user.email } : null)}`, 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  // Category options for event selects: no "all", and always include the core lifecycle states.
  const categoryOptions = useMemo(() => {
    const opts = categories.filter((c) => c.key !== 'all').map((c) => ({ key: c.key, label: c.label }));
    for (const core of ['upcoming', 'ongoing', 'past']) {
      if (!opts.some((o) => o.key === core)) opts.push({ key: core, label: core[0].toUpperCase() + core.slice(1) });
    }
    return opts;
  }, [categories]);
  const labelFor = (key: string) =>
    categoryOptions.find((c) => c.key === key)?.label || key.charAt(0).toUpperCase() + key.slice(1);
  const renderCategoryOptions = (current?: string) => (
    <>
      {categoryOptions.map((c) => (<option key={c.key} value={c.key}>{c.label}</option>))}
      {current && !categoryOptions.some((c) => c.key === current) && <option value={current}>{labelFor(current)}</option>}
    </>
  );

  // ── Event handlers ──
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = newCatKey.trim();
    const label = newCatLabel.trim();
    if (!key || !label) return;
    if (categories.some((c) => c.key === key.toLowerCase())) { showToast(`Category key "${key}" already exists.`, 'error'); return; }
    const ok = await run(() => addEventCategory(key, label), `Category "${label}" added!`, 'Error adding category');
    if (ok) { setNewCatKey(''); setNewCatLabel(''); }
  };

  const handleDeleteCategory = async (id: string, label: string) => {
    if (!confirm(`Remove category "${label}"?`)) return;
    await run(() => deleteEventCategory(id), `Category "${label}" removed.`, 'Error deleting category');
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title?.trim() || !eventForm.date || !eventForm.description?.trim()) {
      showToast('Please fill out title, date and description.', 'error');
      return;
    }
    const type = eventForm.type || 'upcoming';
    const ok = await run(
      () => createEvent({
        title: eventForm.title!.trim(),
        type,
        typeLabel: eventForm.typeLabel?.trim() || labelFor(type),
        date: eventForm.date!,
        description: eventForm.description!.trim(),
        image: eventForm.image || DEFAULT_EVENT_IMAGE,
        tags: eventForm.tags?.length ? eventForm.tags : ['Chapter'],
        link: eventForm.link || '',
      }),
      'Event created successfully!',
      'Error saving event'
    );
    if (ok) setEventForm(EMPTY_EVENT);
  };

  const handleQuickStatusChange = async (eventId: string, newType: string) => {
    const typeLabel = labelFor(newType);
    await run(() => updateEvent(eventId, { type: newType, typeLabel }), `Event status updated to "${typeLabel}"!`, 'Failed to update event status');
  };

  const handleSetSpotlight = async (eventId: string, title: string) => {
    await run(() => setEventSpotlight(eventId), `"${title}" is now the Featured Spotlight!`, 'Error setting spotlight');
  };

  const handleModalEventSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditEvent) return;
    const ev = modalEditEvent;
    const ok = await run(
      () => updateEvent(ev.id, { ...withoutId(ev), image: ev.image || DEFAULT_EVENT_IMAGE }),
      `Event "${ev.title}" updated!`,
      'Error updating event'
    );
    if (ok) setModalEditEvent(null);
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (!confirm(`Delete the event "${title}"?`)) return;
    await run(() => deleteEvent(id), 'Event deleted.', 'Error deleting event');
  };

  // ── Committee handlers ──
  const resetCommitteeForm = () => { setEditingMemberId(null); setCommitteeForm(EMPTY_MEMBER); };

  const handleCommitteeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!committeeForm.name?.trim() || !committeeForm.role?.trim()) { showToast('Name and role are required.', 'error'); return; }
    let ok: boolean;
    if (editingMemberId) {
      const data = withoutId(committeeForm);
      ok = await run(() => updateCommitteeMember(editingMemberId, data), 'Member details updated!', 'Error saving committee member');
    } else {
      const nextOrder = committee.reduce((max, m) => Math.max(max, m.order || 0), 0) + 1;
      ok = await run(
        () => createCommitteeMember({
          name: committeeForm.name!.trim(),
          role: committeeForm.role!.trim(),
          department: committeeForm.department || 'Computing & Information Systems',
          batch: committeeForm.batch || '2023/2024 Batch',
          image: committeeForm.image || '',
          linkedin: committeeForm.linkedin || '',
          email: committeeForm.email || '',
          order: nextOrder,
        }),
        'Committee member added!',
        'Error saving committee member'
      );
    }
    if (ok) resetCommitteeForm();
  };

  const handleEditMember = (m: CommitteeMember) => {
    setEditingMemberId(m.id);
    setCommitteeForm(m);
    committeeFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDeleteMember = async (m: CommitteeMember) => {
    if (!confirm(`Remove ${m.name} from the committee?`)) return;
    const ok = await run(() => deleteCommitteeMember(m.id), 'Member removed.', 'Error removing member');
    if (ok && editingMemberId === m.id) resetCommitteeForm();
  };

  const handleEndCommittee = async () => {
    const year = endYearPrompt.trim();
    if (!year) { showToast('Please provide a committee term year.', 'error'); return; }
    if (!confirm(`Archive all ${committee.length} members under "${year}" and clear the active roster?`)) return;
    setBusy(true);
    try {
      const res = await endCurrentYearCommittee(year);
      if (res.success) { showToast(res.message); setShowEndModal(false); setEndYearPrompt(''); }
      else showToast(res.message, 'error');
    } catch (err) {
      showToast('Failed to archive committee: ' + errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAddPastCommittee = async (e: React.FormEvent) => {
    e.preventDefault();
    const year = newPastYear.trim();
    const members = newPastMembersText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!year || members.length === 0) { showToast('Enter a year and at least one member.', 'error'); return; }
    const ok = await run(() => createPastCommittee(year, members), `Past committee ${year} added!`, 'Error adding past committee');
    if (ok) { setNewPastYear(''); setNewPastMembersText(''); }
  };

  const handleDeletePastCommittee = async (pc: PastCommittee) => {
    if (!confirm(`Delete the ${pc.year} committee entry?`)) return;
    await run(() => deletePastCommittee(pc.id), 'Past committee entry deleted.', 'Error deleting past committee');
  };

  // ── Resource handlers ──
  const resetResourceForm = () => { setEditingResId(null); setResourceForm(EMPTY_RESOURCE); };

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceForm.title?.trim() || !resourceForm.description?.trim()) { showToast('Title and description are required.', 'error'); return; }
    let ok: boolean;
    if (editingResId) {
      const data = withoutId(resourceForm);
      ok = await run(() => updateResource(editingResId, data), 'Resource updated!', 'Error saving resource');
    } else {
      ok = await run(
        () => createResource({
          category: resourceForm.category || 'Workshop Kit',
          title: resourceForm.title!.trim(),
          description: resourceForm.description!.trim(),
          link: resourceForm.link?.trim() || '#',
        }),
        'Resource added!',
        'Error saving resource'
      );
    }
    if (ok) resetResourceForm();
  };

  const handleEditResource = (r: ResourceItem) => {
    setEditingResId(r.id);
    setResourceForm(r);
    resourceFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDeleteResource = async (r: ResourceItem) => {
    if (!confirm(`Delete the resource "${r.title}"?`)) return;
    const ok = await run(() => deleteResource(r.id), 'Resource deleted.', 'Error deleting resource');
    if (ok && editingResId === r.id) resetResourceForm();
  };

  // ── Gallery handlers ──
  const handleGallerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryForm.src || !galleryForm.caption?.trim()) { showToast('Please upload an image and add a caption.', 'error'); return; }
    const caption = galleryForm.caption.trim();
    const ok = await run(
      () => createGalleryPhoto({ src: galleryForm.src!, alt: galleryForm.alt?.trim() || caption, caption }),
      'Photo added to gallery!',
      'Error adding photo'
    );
    if (ok) setGalleryForm(EMPTY_PHOTO);
  };

  const handleDeleteGalleryPhoto = async (g: GalleryPhoto) => {
    if (!confirm(`Delete the photo "${g.caption}"?`)) return;
    await run(() => deleteGalleryPhoto(g.id), 'Photo deleted.', 'Error deleting photo');
  };

  // ── Message handlers ──
  const handleToggleMessageRead = async (m: ContactMessage) => {
    await run(() => markContactMessageAsRead(m.id, !m.read), !m.read ? 'Marked as read' : 'Marked as unread', 'Error updating inquiry');
  };

  const handleDeleteMessage = async (m: ContactMessage) => {
    if (!confirm(`Delete the inquiry from ${m.name}?`)) return;
    await run(() => deleteContactMessage(m.id), 'Inquiry deleted.', 'Error deleting inquiry');
  };

  // ── Render ──
  if (authLoading || !user || !boardMember) {
    return (
      <div className="admin-loading-screen">
        <div className="spinner"></div>
        <p style={{ marginTop: '16px', fontWeight: 600, color: 'var(--muted)' }}>Loading member portal…</p>
      </div>
    );
  }

  const unreadCount = messages.filter((m) => !m.read).length;
  const counts: Record<SectionKey, number> = {
    events: events.length,
    leadership: committee.length,
    resources: resources.length,
    gallery: gallery.length,
    messages: messages.length,
    volunteers: volunteerCount,
    board: boardCount,
  };

  const filteredMessages = messages
    .filter((m) => (messageFilter === 'unread' ? !m.read : messageFilter === 'read' ? !!m.read : true))
    .filter((m) => {
      if (!messageSearch) return true;
      const q = messageSearch.toLowerCase();
      return [m.name, m.email, m.subject, m.message].some((v) => v?.toLowerCase().includes(q));
    });

  const sectionLoading = (...cols: string[]) => cols.some((c) => pendingSections.has(c));
  const syncErrorList = Object.entries(syncErrors);
  const firstName = (boardMember.name || 'there').split(' ')[0];

  return (
    <div className="admin-layout">
      {toast && <Toast msg={toast.msg} kind={toast.kind} durationMs={toast.kind === 'error' ? 6000 : 3500} />}

      {/* ── Top bar ── */}
      <header className="admin-topbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', minWidth: 0 }}>
            <Link href="/member" className="brand" style={{ gap: '10px' }}>
              <img src="/images/logo.png" alt="IEEE CS SUSL" className="brand-logo" style={{ height: '32px' }} />
              <span className="brand-name" style={{ fontSize: '13px' }}>MEMBER PORTAL</span>
            </Link>
            <span className="admin-badge">{boardMember.role || 'Committee Member'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="portal-user" title={user.email || ''}>
              <Avatar name={boardMember.name || user.email || '?'} size={32} />
              <span className="portal-email" style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
            </span>
            <Link href="/" target="_blank" className="btn secondary sm">
              <Icon name="external" size={14} /> Public site
            </Link>
            <button onClick={handleLogout} className="btn danger sm">
              <Icon name="logout" size={14} /> Log out
            </button>
          </div>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="admin-tabs-bar">
        <div className="container">
          <nav className="admin-tabs" role="tablist">
            <button role="tab" aria-selected={activeTab === 'overview'} className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              <Icon name="dashboard" size={16} /> Overview
            </button>
            {allowedSections.map((s) => (
              <button key={s} role="tab" aria-selected={activeTab === s} className={`admin-tab ${activeTab === s ? 'active' : ''}`} onClick={() => setActiveTab(s)}>
                <Icon name={SECTIONS[s].icon} size={16} /> {SECTIONS[s].label}
                {s === 'messages' && unreadCount > 0
                  ? <span className="tab-count alert">{unreadCount} new</span>
                  : <span className="tab-count">{sectionLoading(SECTION_COLLECTION[s]) ? '–' : counts[s]}</span>}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="container" style={{ padding: '32px 0 80px' }}>
        {syncErrorList.length > 0 && (
          <div className="alert-box danger" style={{ marginBottom: '24px' }}>
            <Icon name="alert" size={18} />
            <div>
              <div className="alert-title">Some data could not be synced</div>
              {syncErrorList.map(([col, msg]) => (<div key={col}><code>{col}</code>: {msg}</div>))}
            </div>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <section className="portal-hero">
              <span className="orb one" /><span className="orb two" />
              <div style={{ position: 'relative' }}>
                <span className="eyebrow">IEEE Computer Society · SUSL Chapter</span>
                <h1>Welcome back, {firstName}</h1>
                <p>
                  You are signed in as <strong style={{ color: '#fff' }}>{boardMember.role || 'a committee member'}</strong>.
                  Changes you publish here appear on the public website immediately.
                </p>
              </div>
            </section>

            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader icon="layers" title="Your sections" subtitle="Areas of the website you are allowed to manage." />
              {allowedSections.length === 0 ? (
                <EmptyState icon="lock" title="No sections assigned yet">Ask a chapter admin to grant you access.</EmptyState>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                  {allowedSections.map((s, i) => (
                    <button key={s} onClick={() => setActiveTab(s)} className="nav-card anim-in" style={{ ['--i' as string]: i }}>
                      <span className="icon-tile lg"><Icon name={SECTIONS[s].icon} size={22} /></span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="nav-card-title">{SECTIONS[s].label}</span>
                        <span className="nav-card-desc">{SECTIONS[s].desc}</span>
                      </span>
                      <span className="nav-card-count">{sectionLoading(SECTION_COLLECTION[s]) ? '–' : counts[s]}</span>
                      <Icon name="chevronRight" size={18} className="nav-card-arrow" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="alert-box info">
              <Icon name="info" size={18} />
              <div>
                <div className="alert-title">Access is managed by the chapter admin</div>
                You can only manage the sections listed above. When your access changes, this page updates automatically.
              </div>
            </div>
          </div>
        )}

        {/* ── EVENTS ── */}
        {activeTab === 'events' && hasPermission('events') && (
          <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="page-head">
              <div><h1>Events</h1><p>Publish chapter events and choose which one is featured on the home page.</p></div>
            </div>

            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader icon="tag" title="Event categories" subtitle="Categories appear as filters on the public Events page." />
              <div className="admin-tag-cloud" style={{ marginBottom: '16px' }}>
                {categories.filter((c) => c.key !== 'all').map((cat) => (
                  <div key={cat.id} className="admin-chip">
                    {cat.label}
                    <button type="button" className="admin-chip-del" onClick={() => handleDeleteCategory(cat.id, cat.label)} aria-label={`Remove ${cat.label}`}>
                      <Icon name="x" size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddCategory} className="admin-form" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 180px' }}>
                  <label>Key</label>
                  <input placeholder="e.g. hackathon" value={newCatKey} onChange={(e) => setNewCatKey(e.target.value)} required />
                </div>
                <div style={{ flex: '1 1 180px' }}>
                  <label>Label</label>
                  <input placeholder="e.g. Hackathon" value={newCatLabel} onChange={(e) => setNewCatLabel(e.target.value)} required />
                </div>
                <button type="submit" className="btn secondary" disabled={busy} style={{ height: '45px' }}>
                  <Icon name="plus" size={15} /> Add category
                </button>
              </form>
            </div>

            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader icon="plus" title="Create an event" />
              <form onSubmit={handleEventSubmit} className="admin-form">
                <div className="form-group">
                  <label>Event title</label>
                  <input value={eventForm.title || ''} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required />
                </div>
                <div style={twoCol}>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={eventForm.type || 'upcoming'} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value, typeLabel: labelFor(e.target.value) })}>
                      {renderCategoryOptions(eventForm.type)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Display label</label>
                    <input placeholder="e.g. Workshop" value={eventForm.typeLabel || ''} onChange={(e) => setEventForm({ ...eventForm, typeLabel: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={eventForm.date || ''} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={eventForm.description || ''} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} required rows={3} />
                </div>
                <div className="form-group">
                  <ImageUploader label="Event image" currentImage={eventForm.image || ''} onUpload={(url: string) => setEventForm((f) => ({ ...f, image: url }))} />
                </div>
                <div style={twoCol}>
                  <div className="form-group">
                    <label>Tags (comma separated)</label>
                    <TagsInput value={eventForm.tags || []} onChange={(tags) => setEventForm({ ...eventForm, tags })} />
                  </div>
                  <div className="form-group">
                    <label>Registration / info link</label>
                    <input type="url" placeholder="https://" value={eventForm.link || ''} onChange={(e) => setEventForm({ ...eventForm, link: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className="btn primary" disabled={busy}>
                  {busy ? <ButtonSpinner /> : <Icon name="plus" size={15} />} {busy ? 'Saving…' : 'Create event'}
                </button>
              </form>
            </div>

            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader
                icon="calendar"
                title={`All events (${events.length})`}
                subtitle={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Icon name="star" size={13} /> The spotlight event is featured on the home page.</span>}
              />
              {sectionLoading('events') ? <SkeletonList rows={3} height={110} /> : events.length === 0 ? (
                <EmptyState icon="calendar" title="No events yet">Create your first event using the form above.</EmptyState>
              ) : (
                <div className="admin-grid-cards">
                  {events.map((ev, i) => (
                    <div key={ev.id} className="admin-item-card anim-in" style={{ ['--i' as string]: i, position: 'relative', outline: ev.isSpotlight ? '2px solid #f59e0b' : undefined }}>
                      {ev.isSpotlight && (
                        <span className="badge solid-amber" style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1 }}>
                          <Icon name="star" size={11} /> Spotlight
                        </span>
                      )}
                      <img src={ev.image || DEFAULT_EVENT_IMAGE} alt={ev.title} className="admin-card-thumb" loading="lazy" />
                      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Icon name="calendar" size={13} /> {ev.date}</span>
                          <span className="badge blue">{ev.typeLabel}</span>
                        </div>
                        <h4 style={{ margin: 0, fontSize: '16px' }}>{ev.title}</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {ev.description}
                        </p>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Status
                          <select
                            value={ev.type}
                            onChange={(e) => handleQuickStatusChange(ev.id, e.target.value)}
                            disabled={busy}
                            style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--paper)', fontSize: '13px' }}
                          >
                            {renderCategoryOptions(ev.type)}
                          </select>
                        </label>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {!ev.isSpotlight && (
                            <button onClick={() => handleSetSpotlight(ev.id, ev.title)} className="btn secondary sm" disabled={busy}><Icon name="star" size={13} /> Spotlight</button>
                          )}
                          <button onClick={() => setModalEditEvent({ ...ev, tags: ev.tags || [] })} className="btn secondary sm"><Icon name="pencil" size={13} /> Edit</button>
                          <button onClick={() => handleDeleteEvent(ev.id, ev.title)} className="btn ghost-danger sm" disabled={busy}><Icon name="trash" size={13} /> Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {modalEditEvent && (
              <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalEditEvent(null); }}>
                <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Edit event" style={{ maxWidth: '660px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div className="modal-head">
                    <div className="icon-tile"><Icon name="pencil" size={18} /></div>
                    <h3>Edit event</h3>
                    <button className="modal-close" onClick={() => setModalEditEvent(null)} aria-label="Close"><Icon name="x" size={18} /></button>
                  </div>
                  <form onSubmit={handleModalEventSave} className="admin-form">
                    <div className="form-group">
                      <label>Title</label>
                      <input value={modalEditEvent.title} onChange={(e) => setModalEditEvent({ ...modalEditEvent, title: e.target.value })} required />
                    </div>
                    <div style={twoCol}>
                      <div className="form-group">
                        <label>Category</label>
                        <select value={modalEditEvent.type} onChange={(e) => setModalEditEvent({ ...modalEditEvent, type: e.target.value, typeLabel: labelFor(e.target.value) })}>
                          {renderCategoryOptions(modalEditEvent.type)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Display label</label>
                        <input value={modalEditEvent.typeLabel || ''} onChange={(e) => setModalEditEvent({ ...modalEditEvent, typeLabel: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Date</label>
                        <input type="date" value={modalEditEvent.date} onChange={(e) => setModalEditEvent({ ...modalEditEvent, date: e.target.value })} required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea value={modalEditEvent.description} onChange={(e) => setModalEditEvent({ ...modalEditEvent, description: e.target.value })} rows={4} required />
                    </div>
                    <div className="form-group">
                      <ImageUploader label="Event image" currentImage={modalEditEvent.image || ''} onUpload={(url: string) => setModalEditEvent((m) => (m ? { ...m, image: url } : m))} />
                    </div>
                    <div style={twoCol}>
                      <div className="form-group">
                        <label>Tags (comma separated)</label>
                        <TagsInput value={modalEditEvent.tags || []} onChange={(tags) => setModalEditEvent({ ...modalEditEvent, tags })} />
                      </div>
                      <div className="form-group">
                        <label>Registration / info link</label>
                        <input type="url" placeholder="https://" value={modalEditEvent.link || ''} onChange={(e) => setModalEditEvent({ ...modalEditEvent, link: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn secondary" onClick={() => setModalEditEvent(null)}>Cancel</button>
                      <button type="submit" className="btn primary" disabled={busy}>{busy ? <ButtonSpinner /> : <Icon name="check" size={15} />} Save changes</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LEADERSHIP ── */}
        {activeTab === 'leadership' && hasPermission('leadership') && (
          <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="page-head">
              <div><h1>Leadership</h1><p>Maintain the current committee and the archive of past committees.</p></div>
            </div>

            <div className="admin-panel" style={{ padding: '24px', scrollMarginTop: '80px' }} ref={committeeFormRef}>
              <SectionHeader icon={editingMemberId ? 'pencil' : 'userPlus'} title={editingMemberId ? 'Edit committee member' : 'Add a committee member'} />
              <form onSubmit={handleCommitteeSubmit} className="admin-form">
                <div style={twoCol}>
                  <div className="form-group">
                    <label>Full name</label>
                    <input value={committeeForm.name || ''} onChange={(e) => setCommitteeForm({ ...committeeForm, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Role / position</label>
                    <input value={committeeForm.role || ''} onChange={(e) => setCommitteeForm({ ...committeeForm, role: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input value={committeeForm.department || ''} onChange={(e) => setCommitteeForm({ ...committeeForm, department: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Batch</label>
                    <select value={committeeForm.batch || '2023/2024 Batch'} onChange={(e) => setCommitteeForm({ ...committeeForm, batch: e.target.value })}>
                      {BATCH_OPTIONS.map((b) => (<option key={b} value={b}>{b}</option>))}
                      {committeeForm.batch && !BATCH_OPTIONS.includes(committeeForm.batch) && <option value={committeeForm.batch}>{committeeForm.batch}</option>}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <ImageUploader label="Member photo" currentImage={committeeForm.image || ''} onUpload={(url: string) => setCommitteeForm((f) => ({ ...f, image: url }))} />
                </div>
                <div style={twoCol}>
                  <div className="form-group">
                    <label>LinkedIn URL</label>
                    <input type="url" placeholder="https://linkedin.com/in/…" value={committeeForm.linkedin || ''} onChange={(e) => setCommitteeForm({ ...committeeForm, linkedin: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={committeeForm.email || ''} onChange={(e) => setCommitteeForm({ ...committeeForm, email: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn primary" disabled={busy}>
                    {busy ? <ButtonSpinner /> : <Icon name={editingMemberId ? 'check' : 'plus'} size={15} />}
                    {busy ? 'Saving…' : editingMemberId ? 'Update member' : 'Add member'}
                  </button>
                  {editingMemberId && <button type="button" className="btn secondary" onClick={resetCommitteeForm}>Cancel</button>}
                </div>
              </form>
            </div>

            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader
                icon="users"
                title={`Current committee (${committee.length})`}
                actions={
                  <button onClick={() => setShowEndModal(true)} className="btn ghost-danger sm" disabled={committee.length === 0}>
                    <Icon name="archive" size={14} /> End committee year
                  </button>
                }
              />
              {sectionLoading('leadership') ? <SkeletonList rows={2} height={76} /> : committee.length === 0 ? (
                <EmptyState icon="users" title="No committee members yet">Add members using the form above.</EmptyState>
              ) : (
                <div className="admin-grid-cards">
                  {committee.map((m, i) => (
                    <div key={m.id} className="admin-item-card anim-in" style={{ ['--i' as string]: i, flexDirection: 'row', alignItems: 'center', gap: '12px', padding: '16px', outline: editingMemberId === m.id ? '2px solid var(--blue)' : undefined }}>
                      {m.image ? (
                        <img src={m.image} alt={m.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <Avatar name={m.name} size={48} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: 600 }}>{m.role}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{m.batch}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button onClick={() => handleEditMember(m)} className="btn secondary icon-only sm" aria-label={`Edit ${m.name}`} title="Edit"><Icon name="pencil" size={14} /></button>
                        <button onClick={() => handleDeleteMember(m)} className="btn ghost-danger icon-only sm" disabled={busy} aria-label={`Remove ${m.name}`} title="Remove"><Icon name="trash" size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader icon="archive" title={`Past committees (${pastCommittees.length})`} subtitle="Add an archived committee manually, or use “End committee year” above." />
              <form onSubmit={handleAddPastCommittee} className="admin-form admin-subcard" style={{ marginBottom: '20px' }}>
                <div className="form-group">
                  <label>Term</label>
                  <input placeholder="e.g. 2023 / 2024" value={newPastYear} onChange={(e) => setNewPastYear(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Members (one per line, e.g. “President: Jane Doe”)</label>
                  <textarea value={newPastMembersText} onChange={(e) => setNewPastMembersText(e.target.value)} rows={4} required />
                </div>
                <button type="submit" className="btn secondary" disabled={busy}><Icon name="plus" size={15} /> Add past committee</button>
              </form>
              {sectionLoading('past_committees') ? <SkeletonList rows={2} height={56} /> : pastCommittees.length === 0 ? (
                <EmptyState icon="archive" title="No past committees recorded" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pastCommittees.map((pc, i) => {
                    const open = expandedPast === pc.id;
                    return (
                      <div key={pc.id} className="anim-in" style={{ ['--i' as string]: i, padding: '12px 14px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button
                            type="button"
                            onClick={() => setExpandedPast(open ? null : pc.id)}
                            aria-expanded={open}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}
                          >
                            <Icon name="chevronRight" size={16} style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none', color: 'var(--muted)' }} />
                            <span>
                              <span style={{ display: 'block', fontSize: '14px', fontWeight: 700 }}>{pc.year}</span>
                              <span style={{ display: 'block', fontSize: '12px', color: 'var(--muted)' }}>{pc.members?.length || 0} members</span>
                            </span>
                          </button>
                          <button onClick={() => handleDeletePastCommittee(pc)} className="btn ghost-danger icon-only sm" disabled={busy} aria-label={`Delete ${pc.year}`} title="Delete"><Icon name="trash" size={14} /></button>
                        </div>
                        {open && (
                          <ul className="tab-panel" style={{ margin: '10px 0 0 26px', paddingLeft: '16px', fontSize: '13px', color: 'var(--ink)', lineHeight: 1.7 }}>
                            {(pc.members || []).map((name, j) => <li key={j}>{name}</li>)}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {showEndModal && (
              <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !busy) setShowEndModal(false); }}>
                <div className="admin-modal" role="dialog" aria-modal="true" aria-label="End committee year">
                  <div className="modal-head">
                    <div className="icon-tile red"><Icon name="archive" size={18} /></div>
                    <h3>End committee year</h3>
                    <button className="modal-close" onClick={() => setShowEndModal(false)} disabled={busy} aria-label="Close"><Icon name="x" size={18} /></button>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 16px' }}>
                    All {committee.length} current members will be archived under Past committees and the active roster will be cleared.
                  </p>
                  <div className="admin-form">
                    <div className="form-group">
                      <label>Committee term</label>
                      <input placeholder="e.g. 2025 / 2026" value={endYearPrompt} onChange={(e) => setEndYearPrompt(e.target.value)} autoFocus />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowEndModal(false)} className="btn secondary" disabled={busy}>Cancel</button>
                    <button onClick={handleEndCommittee} className="btn danger" disabled={busy || !endYearPrompt.trim()}>
                      {busy ? <ButtonSpinner /> : <Icon name="archive" size={15} />} {busy ? 'Archiving…' : 'Archive committee'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── RESOURCES ── */}
        {activeTab === 'resources' && hasPermission('resources') && (
          <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="page-head">
              <div><h1>Resources</h1><p>Share workshop kits, tutorials and guides with members.</p></div>
            </div>

            <div className="admin-panel" style={{ padding: '24px', scrollMarginTop: '80px' }} ref={resourceFormRef}>
              <SectionHeader icon={editingResId ? 'pencil' : 'plus'} title={editingResId ? 'Edit resource' : 'Add a resource'} />
              <form onSubmit={handleResourceSubmit} className="admin-form">
                <div style={twoCol}>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={resourceForm.category || 'Workshop Kit'} onChange={(e) => setResourceForm({ ...resourceForm, category: e.target.value })}>
                      {RESOURCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      {resourceForm.category && !RESOURCE_CATEGORIES.includes(resourceForm.category) && <option value={resourceForm.category}>{resourceForm.category}</option>}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Title</label>
                    <input value={resourceForm.title || ''} onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={resourceForm.description || ''} onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })} required rows={3} />
                </div>
                <div className="form-group">
                  <label>Link URL</label>
                  <input placeholder="https://" value={resourceForm.link === '#' ? '' : resourceForm.link || ''} onChange={(e) => setResourceForm({ ...resourceForm, link: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn primary" disabled={busy}>
                    {busy ? <ButtonSpinner /> : <Icon name={editingResId ? 'check' : 'plus'} size={15} />}
                    {busy ? 'Saving…' : editingResId ? 'Update resource' : 'Add resource'}
                  </button>
                  {editingResId && <button type="button" className="btn secondary" onClick={resetResourceForm}>Cancel</button>}
                </div>
              </form>
            </div>

            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader icon="book" title={`All resources (${resources.length})`} />
              {sectionLoading('resources') ? <SkeletonList rows={3} height={90} /> : resources.length === 0 ? (
                <EmptyState icon="book" title="No resources yet">Add the first resource using the form above.</EmptyState>
              ) : (
                <div className="admin-grid-cards">
                  {resources.map((r, i) => (
                    <div key={r.id} className="admin-item-card anim-in" style={{ ['--i' as string]: i, padding: '18px', gap: '8px', outline: editingResId === r.id ? '2px solid var(--blue)' : undefined }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="icon-tile"><Icon name="file" size={18} /></span>
                        <span className="badge blue">{r.category}</span>
                      </div>
                      <h4 style={{ margin: 0, fontSize: '15px' }}>{r.title}</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', flex: 1 }}>{r.description}</p>
                      {r.link && r.link !== '#' && (
                        <a href={r.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--blue)', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <Icon name="link" size={13} /> {r.link}
                        </a>
                      )}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleEditResource(r)} className="btn secondary sm"><Icon name="pencil" size={13} /> Edit</button>
                        <button onClick={() => handleDeleteResource(r)} className="btn ghost-danger sm" disabled={busy}><Icon name="trash" size={13} /> Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── GALLERY ── */}
        {activeTab === 'gallery' && hasPermission('gallery') && (
          <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="page-head">
              <div><h1>Gallery</h1><p>Upload photos from chapter events.</p></div>
            </div>

            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader
                icon="upload"
                title="Add photos"
                actions={
                  <div style={{ display: 'inline-flex', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '10px', padding: '3px' }} role="tablist">
                    {(['single', 'zip'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        role="tab"
                        aria-selected={galleryUploadMode === mode}
                        onClick={() => setGalleryUploadMode(mode)}
                        className={`btn sm ${galleryUploadMode === mode ? 'primary' : ''}`}
                        style={galleryUploadMode === mode ? undefined : { background: 'transparent', border: '1px solid transparent', color: 'var(--muted)', boxShadow: 'none' }}
                      >
                        <Icon name={mode === 'single' ? 'image' : 'archive'} size={14} /> {mode === 'single' ? 'Single photo' : 'Bulk ZIP'}
                      </button>
                    ))}
                  </div>
                }
              />
              {galleryUploadMode === 'single' ? (
                <form onSubmit={handleGallerySubmit} className="admin-form tab-panel">
                  <div className="form-group">
                    <ImageUploader label="Photo" currentImage={galleryForm.src || ''} onUpload={(url: string) => setGalleryForm((f) => ({ ...f, src: url }))} />
                  </div>
                  <div style={twoCol}>
                    <div className="form-group">
                      <label>Caption</label>
                      <input value={galleryForm.caption || ''} onChange={(e) => setGalleryForm({ ...galleryForm, caption: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Alt text</label>
                      <input placeholder="Defaults to the caption" value={galleryForm.alt || ''} onChange={(e) => setGalleryForm({ ...galleryForm, alt: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" className="btn primary" disabled={busy || !galleryForm.src}>
                    {busy ? <ButtonSpinner /> : <Icon name="plus" size={15} />} {busy ? 'Saving…' : 'Add to gallery'}
                  </button>
                </form>
              ) : (
                <div className="tab-panel">
                  {/* New photos arrive through the live gallery subscription. */}
                  <ZipGalleryUploader onPhotoAdded={() => {}} showToast={(msg) => showToast(msg)} />
                </div>
              )}
            </div>

            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader icon="image" title={`Gallery photos (${gallery.length})`} />
              {sectionLoading('gallery') ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px' }}>
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '1' }} />)}
                </div>
              ) : gallery.length === 0 ? (
                <EmptyState icon="image" title="No photos yet">Upload your first photo above.</EmptyState>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px' }}>
                  {gallery.map((g, i) => (
                    <figure key={g.id} className="gallery-tile anim-in" style={{ ['--i' as string]: Math.min(i, 20) }}>
                      <img src={g.src} alt={g.alt} loading="lazy" />
                      <figcaption>{g.caption}</figcaption>
                      <button onClick={() => handleDeleteGalleryPhoto(g)} disabled={busy} aria-label={`Delete ${g.caption}`} title="Delete photo" className="gallery-tile-del">
                        <Icon name="trash" size={14} />
                      </button>
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VOLUNTEER CALLS ── */}
        {activeTab === 'volunteers' && hasPermission('volunteers') && (
          <VolunteerCallsManager
            viewer={{ uid: user.uid, email: user.email || '', name: boardMember.name || user.email || '', isAdmin: false }}
            showToast={showToast}
            describeError={(err) => explainPermissionError(err, { uid: user.uid, email: user.email })}
          />
        )}

        {/* ── BOARD ── */}
        {activeTab === 'board' && hasPermission('board') && (
          <BoardManager currentEmail={user.email || ''} showToast={showToast} />
        )}

        {/* ── MESSAGES ── */}
        {activeTab === 'messages' && hasPermission('messages') && (
          <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="page-head">
              <div><h1>Inquiries</h1><p>Messages sent through the website contact form.</p></div>
            </div>
            <div className="admin-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'inline-flex', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '10px', padding: '3px' }} role="tablist">
                  {(['all', 'unread', 'read'] as const).map((f) => (
                    <button
                      key={f}
                      role="tab"
                      aria-selected={messageFilter === f}
                      onClick={() => setMessageFilter(f)}
                      className={`btn sm ${messageFilter === f ? 'primary' : ''}`}
                      style={messageFilter === f ? { textTransform: 'capitalize' } : { textTransform: 'capitalize', background: 'transparent', border: '1px solid transparent', color: 'var(--muted)', boxShadow: 'none' }}
                    >
                      {f} <span style={{ opacity: 0.75 }}>{f === 'unread' ? unreadCount : f === 'read' ? messages.length - unreadCount : messages.length}</span>
                    </button>
                  ))}
                </div>
                <div className="input-icon" style={{ flex: '1 1 220px' }}>
                  <Icon name="search" size={15} />
                  <input
                    placeholder="Search by name, email or text"
                    value={messageSearch}
                    onChange={(e) => setMessageSearch(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--paper)', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>

              {sectionLoading('contact_messages') ? <SkeletonList rows={3} height={96} /> : filteredMessages.length === 0 ? (
                <EmptyState icon="inbox" title={messages.length === 0 ? 'No inquiries yet' : 'No matching inquiries'}>
                  {messages.length === 0 ? 'Messages from the contact form will appear here.' : 'Try a different search or filter.'}
                </EmptyState>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredMessages.map((m, i) => (
                    <article
                      key={m.id}
                      className="anim-in"
                      style={{ ['--i' as string]: Math.min(i, 15), padding: '16px 18px', background: m.read ? 'var(--white)' : 'rgba(0,98,155,0.03)', borderRadius: '12px', border: '1px solid var(--line)', borderLeft: m.read ? '3px solid #cbd5e1' : '3px solid var(--blue)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '12px', flex: '1 1 320px', minWidth: 0 }}>
                          <Avatar name={m.name || '?'} size={38} muted={!!m.read} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>{m.subject || '(No subject)'}</span>
                              {!m.read && <span className="badge blue"><span className="status-dot pulse" /> New</span>}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 8px', wordBreak: 'break-word' }}>
                              <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{m.name}</strong> · {m.email}
                              {m.createdAt ? ` · ${new Date(m.createdAt).toLocaleString()}` : ''}
                            </div>
                            <div style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.message}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Your inquiry'))}`} className="btn secondary sm">
                            <Icon name="send" size={13} /> Reply
                          </a>
                          <button onClick={() => handleToggleMessageRead(m)} className="btn secondary sm" disabled={busy}>
                            <Icon name={m.read ? 'mail' : 'mailOpen'} size={13} /> {m.read ? 'Mark unread' : 'Mark read'}
                          </button>
                          <button onClick={() => handleDeleteMessage(m)} className="btn ghost-danger icon-only sm" disabled={busy} aria-label="Delete inquiry" title="Delete"><Icon name="trash" size={14} /></button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Comma-separated tag input that keeps the raw text while typing (so commas/spaces aren't eaten). */
function TagsInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [text, setText] = useState(value.join(', '));
  const joined = value.join(', ');
  const lastJoined = useRef(joined);
  useEffect(() => {
    // Sync when the value is replaced from outside (e.g. form reset).
    if (joined !== lastJoined.current) { setText(joined); lastJoined.current = joined; }
  }, [joined]);
  return (
    <input
      placeholder="e.g. CS, Workshop"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const tags = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
        lastJoined.current = tags.join(', ');
        onChange(tags);
      }}
    />
  );
}
