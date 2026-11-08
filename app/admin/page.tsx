'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ImageUploader from '@/components/ImageUploader';
import ZipGalleryUploader from '@/components/ZipGalleryUploader';
import { sendBoardInvite } from '@/lib/boardInvite';
import VolunteerCallsManager from '@/components/volunteers/VolunteerCallsManager';
import Icon, { IconName } from '@/components/ui/Icon';
import {
  Toast,
  EmptyState,
  SectionHeader,
  ButtonSpinner,
  PermissionPicker,
  PERMISSIONS,
  permissionLabel,
  Avatar,
} from '@/components/ui/Portal';
import {
  FacultyAdvisorData,
  EventItem,
  EventCategory,
  CommitteeMember,
  PastCommittee,
  ResourceItem,
  GalleryPhoto,
  ContactMessage,
} from '@/lib/types';
import {
  getFacultyAdvisor,
  updateFacultyAdvisor,
  getEventCategories,
  addEventCategory,
  deleteEventCategory,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  setEventSpotlight,
  getCommittee,
  createCommitteeMember,
  updateCommitteeMember,
  deleteCommitteeMember,
  endCurrentYearCommittee,
  getPastCommittees,
  createPastCommittee,
  deletePastCommittee,
  getResources,
  createResource,
  updateResource,
  deleteResource,
  getGalleryPhotos,
  createGalleryPhoto,
  deleteGalleryPhoto,
  getContactMessages,
  markContactMessageAsRead,
  deleteContactMessage,
  getBoardMembers,
  syncMemberAccess,
  explainPermissionError,
  createBoardMember,
  deleteBoardMember,
  updateBoardMember,
  BoardMember,
} from '@/lib/firestore';

import { seedAllData } from '@/lib/seedData';

type Tab = 'overview' | 'advisor' | 'events' | 'leadership' | 'resources' | 'gallery' | 'messages' | 'volunteers' | 'board';

const BATCH_OPTIONS = [
  "2020/2021 Batch",
  '2021/2022 Batch',
  '2022/2023 Batch',
  '2023/2024 Batch',
  '2024/2025 Batch',
  '2025/2026 Batch',
  '2026/2027 Batch',
];


export default function AdminDashboardPage() {
  const { user, loading: authLoading, logout, boardMember, isAdmin } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<{ msg: string; kind: 'ok' | 'error' } | null>(null);

  // Data states
  const [advisor, setAdvisor] = useState<FacultyAdvisorData | null>(null);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [committee, setCommittee] = useState<CommitteeMember[]>([]);
  const [pastCommittees, setPastCommittees] = useState<PastCommittee[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messageFilter, setMessageFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [messageSearch, setMessageSearch] = useState('');
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);

  // Board member invite form
  const [boardForm, setBoardForm] = useState({ name: '', role: '', email: '', permissions: [] as string[] });
  const [boardInviting, setBoardInviting] = useState(false);
  const [boardInviteResult, setBoardInviteResult] = useState<{ tempPassword: string; email: string } | null>(null);

  // Board member permission editing
  const [editingPermsMemberId, setEditingPermsMemberId] = useState<string | null>(null);
  const [editingPerms, setEditingPerms] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  // Board member post replacement
  const [replacingMemberId, setReplacingMemberId] = useState<string | null>(null);
  const [replaceForm, setReplaceForm] = useState({ name: '', email: '', role: '', permissions: [] as string[] });
  const [replaceInviting, setReplaceInviting] = useState(false);
  const [replaceResult, setReplaceResult] = useState<{ tempPassword: string; email: string; name: string } | null>(null);

  // Forms / Modals
  const [newCatKey, setNewCatKey] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');

  // Event form
  const [eventForm, setEventForm] = useState<Partial<EventItem>>({
    title: '',
    type: 'upcoming',
    typeLabel: 'Workshop',
    date: '',
    description: '',
    image: '',
    tags: ['CS', 'Chapter'],
    link: '',
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [modalEditEvent, setModalEditEvent] = useState<EventItem | null>(null);

  // Committee form
  const [committeeForm, setCommitteeForm] = useState<Partial<CommitteeMember>>({
    name: '',
    role: '',
    department: 'Computing & Information Systems',
    batch: '2023/2024 Batch',
    image: '',
    linkedin: '',
    email: '',
  });
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  // End committee modal
  const [endYearPrompt, setEndYearPrompt] = useState('2024 / 2025');
  const [showEndModal, setShowEndModal] = useState(false);

  // Past committee manual form
  const [newPastYear, setNewPastYear] = useState('');
  const [newPastMembersText, setNewPastMembersText] = useState('');

  // Resource form
  const [resourceForm, setResourceForm] = useState<Partial<ResourceItem>>({
    category: 'Workshop Kit',
    title: '',
    description: '',
    link: '#',
  });
  const [editingResId, setEditingResId] = useState<string | null>(null);

  // Gallery form
  const [galleryForm, setGalleryForm] = useState<Partial<GalleryPhoto>>({
    src: '',
    alt: '',
    caption: '',
  });
  const [galleryUploadMode, setGalleryUploadMode] = useState<'single' | 'zip'>('single');

  // Load all data
  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        advisorData,
        categoriesData,
        eventsData,
        committeeData,
        pastData,
        resourcesData,
        galleryData,
        messagesData,
        boardData,
      ] = await Promise.all([
        getFacultyAdvisor(),
        getEventCategories(),
        getEvents(),
        getCommittee(),
        getPastCommittees(),
        getResources(),
        getGalleryPhotos(),
        getContactMessages(),
        getBoardMembers(),
      ]);

      setAdvisor(advisorData);
      setCategories(categoriesData);
      setEvents(eventsData);
      setCommittee(committeeData);
      setPastCommittees(pastData);
      setResources(resourcesData);
      setGallery(galleryData);
      setMessages(messagesData);
      setBoardMembers(boardData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
    } else if (boardMember) {
      router.replace('/member');
    } else if (isAdmin) {
      loadAll();
      // Make sure every board member has a permission mirror for the security rules.
      syncMemberAccess().catch((err) => console.warn('member_access sync failed:', err));
    } else {
      setLoading(false);
    }
  }, [user, authLoading, boardMember?.id, isAdmin]);

  const showToast = (msg: string, kind: 'ok' | 'error' = 'ok') => {
    setSaveStatus({ msg, kind });
    setTimeout(() => setSaveStatus((cur) => (cur && cur.msg === msg ? null : cur)), kind === 'error' ? 6000 : 3500);
  };

  // Set an event as the home-page spotlight
  const handleSetSpotlight = async (eventId: string, eventTitle: string) => {
    try {
      await setEventSpotlight(eventId);
      // Optimistically update local state
      setEvents((prev) => prev.map((ev) => ({ ...ev, isSpotlight: ev.id === eventId })));
      showToast(`"${eventTitle}" is now the Featured Spotlight!`);
    } catch (err: any) {
      alert('Error setting spotlight: ' + err.message);
    }
  };

  // 2. Advisor Save
  const handleAdvisorSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisor) return;
    try {
      await updateFacultyAdvisor(advisor);
      showToast('Faculty Advisor successfully updated!');
    } catch (err: any) {
      alert('Error updating advisor: ' + err.message);
    }
  };

  // 3. Category Actions
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatKey || !newCatLabel) return;
    try {
      const added = await addEventCategory(newCatKey, newCatLabel);
      setCategories([...categories, added]);
      setNewCatKey('');
      setNewCatLabel('');
      showToast(`Category "${added.label}" added!`);
    } catch (err: any) {
      alert('Error adding category: ' + err.message);
    }
  };

  const handleDeleteCategory = async (id: string, label: string) => {
    if (!confirm(`Are you sure you want to remove category "${label}"?`)) return;
    try {
      await deleteEventCategory(id);
      setCategories(categories.filter((c) => c.id !== id));
      showToast(`Category "${label}" removed.`);
    } catch (err: any) {
      alert('Error deleting category: ' + err.message);
    }
  };

  // 4. Event Actions
  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date || !eventForm.description) {
      alert('Please fill out all required event fields.');
      return;
    }

    try {
      if (editingEventId) {
        await updateEvent(editingEventId, eventForm);
        setEvents(events.map((ev) => (ev.id === editingEventId ? ({ ...ev, ...eventForm } as EventItem) : ev)));
        showToast('Event updated successfully!');
      } else {
        const created = await createEvent({
          title: eventForm.title!,
          type: eventForm.type || 'upcoming',
          typeLabel: eventForm.typeLabel || 'Event',
          date: eventForm.date!,
          description: eventForm.description!,
          image: eventForm.image || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=82',
          tags: eventForm.tags || ['Chapter'],
          link: eventForm.link || '',
        });
        setEvents([created, ...events]);
        showToast('Event created successfully!');
      }

      setEditingEventId(null);
      setEventForm({
        title: '',
        type: 'upcoming',
        typeLabel: 'Workshop',
        date: '',
        description: '',
        image: '',
        tags: ['CS', 'Chapter'],
        link: '',
      });
    } catch (err: any) {
      alert('Error saving event: ' + err.message);
    }
  };

  const handleEditEvent = (ev: EventItem) => {
    setModalEditEvent({ ...ev });
  };

  // Quick lifecycle status switcher: Upcoming <-> Ongoing <-> Past
  const handleQuickStatusChange = async (eventId: string, newType: string) => {
    try {
      const cat = categories.find((c) => c.key === newType);
      const typeLabel = cat ? cat.label : newType.charAt(0).toUpperCase() + newType.slice(1);
      await updateEvent(eventId, { type: newType, typeLabel });
      setEvents((prev) =>
        prev.map((ev) => (ev.id === eventId ? { ...ev, type: newType, typeLabel } : ev))
      );
      showToast(`Event status updated to "${typeLabel}"!`);
    } catch (err: any) {
      alert('Failed to update event status: ' + err.message);
    }
  };

  // Full Edit Modal submit handler
  const handleModalEventSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditEvent) return;
    try {
      await updateEvent(modalEditEvent.id, modalEditEvent);
      setEvents((prev) =>
        prev.map((ev) => (ev.id === modalEditEvent.id ? modalEditEvent : ev))
      );
      showToast(`Event "${modalEditEvent.title}" updated successfully!`);
      setModalEditEvent(null);
    } catch (err: any) {
      alert('Error updating event: ' + err.message);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteEvent(id);
      setEvents(events.filter((ev) => ev.id !== id));
      showToast('Event deleted.');
    } catch (err: any) {
      alert('Error deleting event: ' + err.message);
    }
  };

  // 5. Committee Actions
  const handleCommitteeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!committeeForm.name || !committeeForm.role) {
      alert('Name and role are required.');
      return;
    }

    try {
      if (editingMemberId) {
        await updateCommitteeMember(editingMemberId, committeeForm);
        setCommittee(committee.map((m) => (m.id === editingMemberId ? ({ ...m, ...committeeForm } as CommitteeMember) : m)));
        showToast('Member details updated!');
      } else {
        const created = await createCommitteeMember({
          name: committeeForm.name!,
          role: committeeForm.role!,
          department: committeeForm.department || 'Computing & Information Systems',
          batch: committeeForm.batch || '2023/2024 Batch',
          image: committeeForm.image || '',
          linkedin: committeeForm.linkedin || '',
          email: committeeForm.email || '',
          order: committee.length + 1,
        });
        setCommittee([...committee, created]);
        showToast('Committee member added!');
      }

      setEditingMemberId(null);
      setCommitteeForm({
        name: '',
        role: '',
        department: 'Computing & Information Systems',
        batch: '2023/2024 Batch',
        image: '',
        linkedin: '',
        email: '',
      });
    } catch (err: any) {
      alert('Error saving committee member: ' + err.message);
    }
  };

  const handleEditMember = (m: CommitteeMember) => {
    setEditingMemberId(m.id);
    setCommitteeForm(m);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Remove this committee member?')) return;
    try {
      await deleteCommitteeMember(id);
      setCommittee(committee.filter((m) => m.id !== id));
      showToast('Member removed.');
    } catch (err: any) {
      alert('Error removing member: ' + err.message);
    }
  };

  // End Committee Execution
  const handleEndCommittee = async () => {
    if (!endYearPrompt.trim()) {
      alert('Please provide a committee term year (e.g. 2024 / 2025).');
      return;
    }

    const conf = confirm(
      `Confirm ending the committee for "${endYearPrompt}"?\n\nThis will archive all current members to the "Honoring alumni contributions" section and clear the active executive roster.`
    );
    if (!conf) return;

    try {
      const res = await endCurrentYearCommittee(endYearPrompt.trim());
      if (res.success) {
        showToast(res.message);
        setShowEndModal(false);
        await loadAll();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert('Failed to archive committee: ' + err.message);
    }
  };

  // Past Committee Add
  const handleAddPastCommittee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPastYear || !newPastMembersText) return;
    const members = newPastMembersText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    try {
      const created = await createPastCommittee(newPastYear.trim(), members);
      setPastCommittees([created, ...pastCommittees]);
      setNewPastYear('');
      setNewPastMembersText('');
      showToast(`Past committee ${created.year} added!`);
    } catch (err: any) {
      alert('Error adding past committee: ' + err.message);
    }
  };

  const handleDeletePastCommittee = async (id: string) => {
    if (!confirm('Delete this past committee archive entry?')) return;
    try {
      await deletePastCommittee(id);
      setPastCommittees(pastCommittees.filter((p) => p.id !== id));
      showToast('Past committee entry deleted.');
    } catch (err: any) {
      alert('Error deleting past committee: ' + err.message);
    }
  };

  // 6. Resources Actions
  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceForm.title || !resourceForm.description) return;

    try {
      if (editingResId) {
        await updateResource(editingResId, resourceForm);
        setResources(resources.map((r) => (r.id === editingResId ? ({ ...r, ...resourceForm } as ResourceItem) : r)));
        showToast('Resource updated!');
      } else {
        const created = await createResource({
          category: resourceForm.category || 'Workshop Kit',
          title: resourceForm.title!,
          description: resourceForm.description!,
          link: resourceForm.link || '#',
        });
        setResources([created, ...resources]);
        showToast('Resource added!');
      }

      setEditingResId(null);
      setResourceForm({
        category: 'Workshop Kit',
        title: '',
        description: '',
        link: '#',
      });
    } catch (err: any) {
      alert('Error saving resource: ' + err.message);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Delete this resource item?')) return;
    try {
      await deleteResource(id);
      setResources(resources.filter((r) => r.id !== id));
      showToast('Resource deleted.');
    } catch (err: any) {
      alert('Error deleting resource: ' + err.message);
    }
  };

  // 7. Gallery Actions
  const handleGallerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryForm.src || !galleryForm.caption) {
      alert('Please upload an image and add a caption.');
      return;
    }

    try {
      const created = await createGalleryPhoto({
        src: galleryForm.src!,
        alt: galleryForm.alt || galleryForm.caption!,
        caption: galleryForm.caption!,
      });
      setGallery([created, ...gallery]);
      setGalleryForm({ src: '', alt: '', caption: '' });
      showToast('Photo added to gallery!');
    } catch (err: any) {
      alert('Error adding photo: ' + err.message);
    }
  };

  const handleDeleteGalleryPhoto = async (id: string) => {
    if (!confirm('Delete this gallery photo?')) return;
    try {
      await deleteGalleryPhoto(id);
      setGallery(gallery.filter((g) => g.id !== id));
      showToast('Photo deleted.');
    } catch (err: any) {
      alert('Error deleting photo: ' + err.message);
    }
  };

  // 8. Contact Inquiries Actions
  const handleToggleMessageRead = async (id: string, currentRead: boolean | undefined) => {
    try {
      await markContactMessageAsRead(id, !currentRead);
      setMessages(
        messages.map((m) => (m.id === id ? { ...m, read: !currentRead } : m))
      );
      showToast(!currentRead ? 'Inquiry marked as read' : 'Inquiry marked as unread');
    } catch (err: any) {
      alert('Error updating inquiry: ' + err.message);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this contact inquiry?')) return;
    try {
      await deleteContactMessage(id);
      setMessages(messages.filter((m) => m.id !== id));
      showToast('Inquiry deleted.');
    } catch (err: any) {
      alert('Error deleting inquiry: ' + err.message);
    }
  };

  // Board Member: Invite handler
  const handleInviteBoardMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardForm.name || !boardForm.role || !boardForm.email) {
      alert('Name, role and email are required.');
      return;
    }
    if (boardForm.permissions.length === 0) {
      alert('Please select at least one permission.');
      return;
    }
    setBoardInviting(true);
    setBoardInviteResult(null);
    try {
      if (boardMembers.some((b) => b.email?.trim().toLowerCase() === boardForm.email.trim().toLowerCase())) {
        throw new Error(`${boardForm.email} is already a board member. Use "Permissions" on their card instead.`);
      }
      const data = await sendBoardInvite(boardForm);

      // Save board member record in Firestore
      const created = await createBoardMember({
        name: boardForm.name,
        role: boardForm.role,
        email: boardForm.email,
        permissions: boardForm.permissions,
        status: 'pending',
        mustChangePassword: true,
        invitedAt: Date.now(),
      });
      setBoardMembers((prev) => [created, ...prev]);
      setBoardInviteResult({ tempPassword: data.tempPassword, email: boardForm.email });
      setBoardForm({ name: '', role: '', email: '', permissions: [] });
      showToast(`Invitation sent to ${boardForm.email}!`);
    } catch (err: any) {
      alert('Failed to invite board member: ' + (await explainPermissionError(err, user)));
    } finally {
      setBoardInviting(false);
    }
  };

  const handleDeleteBoardMember = async (id: string, name: string) => {
    if (!confirm(`Remove board member "${name}" from the portal?`)) return;
    try {
      await deleteBoardMember(id);
      setBoardMembers((prev) => prev.filter((b) => b.id !== id));
      showToast('Board member removed.');
    } catch (err: any) {
      alert('Error removing board member: ' + (await explainPermissionError(err, user)));
    }
  };

  // Board Member: Save updated permissions
  const handleSavePermissions = async (memberId: string) => {
    if (editingPerms.length === 0) {
      alert('Please keep at least one permission selected.');
      return;
    }
    setSavingPerms(true);
    try {
      await updateBoardMember(memberId, { permissions: editingPerms });
      setBoardMembers((prev) =>
        prev.map((b) => (b.id === memberId ? { ...b, permissions: editingPerms } : b))
      );
      setEditingPermsMemberId(null);
      showToast('Permissions updated successfully!');
    } catch (err: any) {
      alert('Failed to update permissions: ' + (await explainPermissionError(err, user)));
    } finally {
      setSavingPerms(false);
    }
  };

  // Board Member: Replace post with a new person
  const handleReplacePost = async (
    e: React.FormEvent,
    memberId: string,
  ) => {
    e.preventDefault();
    if (!replaceForm.name.trim() || !replaceForm.email.trim()) {
      alert('Full name and email are required.');
      return;
    }
    if (!replaceForm.role.trim()) {
      alert('Role / Position is required.');
      return;
    }
    if (replaceForm.permissions.length === 0) {
      alert('Please select at least one permission.');
      return;
    }
    setReplaceInviting(true);
    setReplaceResult(null);
    try {
      // 1. Create Firebase Auth account + send invitation email to new person
      const data = await sendBoardInvite({
        name: replaceForm.name.trim(),
        role: replaceForm.role.trim(),
        email: replaceForm.email.trim(),
        permissions: replaceForm.permissions,
      });

      // 2. Update the Firestore board member record with all new post details
      await updateBoardMember(memberId, {
        name: replaceForm.name.trim(),
        email: replaceForm.email.trim(),
        role: replaceForm.role.trim(),
        permissions: replaceForm.permissions,
        status: 'pending',
        mustChangePassword: true,
        invitedAt: Date.now(),
        activatedAt: undefined as unknown as number,
      });

      setBoardMembers((prev) =>
        prev.map((b) =>
          b.id === memberId
            ? {
                ...b,
                name: replaceForm.name.trim(),
                email: replaceForm.email.trim(),
                role: replaceForm.role.trim(),
                permissions: replaceForm.permissions,
                status: 'pending' as const,
                mustChangePassword: true,
                invitedAt: Date.now(),
                activatedAt: undefined,
              }
            : b
        )
      );

      setReplaceResult({
        tempPassword: data.tempPassword,
        email: replaceForm.email.trim(),
        name: replaceForm.name.trim(),
      });
      setReplacingMemberId(null);
      setReplaceForm({ name: '', email: '', role: '', permissions: [] });
      showToast(`Post replaced! Invitation sent to ${replaceForm.email.trim()}.`);
    } catch (err: any) {
      alert('Failed to replace post: ' + (await explainPermissionError(err, user)));
    } finally {
      setReplaceInviting(false);
    }
  };

  // Seed Handler
  const handleSeed = async () => {
    if (!confirm('Seed all default initial data into Firestore? This will populate events, leadership, advisor, resources, and gallery.')) return;
    setLoading(true);
    const res = await seedAllData();
    setLoading(false);
    if (res.success) {
      showToast(res.message);
      await loadAll();
    } else {
      alert(res.message);
    }
  };

  if (!authLoading && user && !boardMember && !isAdmin) {
    return (
      <div className="admin-layout">
      <div className="admin-loading-screen" style={{ padding: '24px' }}>
        <div className="admin-panel anim-in" style={{ maxWidth: '600px', width: '100%', textAlign: 'center', padding: '40px 32px' }}>
          <div className="icon-tile lg amber" style={{ margin: '0 auto 18px' }}>
            <Icon name="lock" size={24} />
          </div>
          <h1 style={{ font: '700 22px/1.3 Montserrat, sans-serif', margin: '0 0 10px' }}>Admin access is not set up for this account</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.65, margin: '0 auto', maxWidth: '480px' }}>
            To make <strong style={{ color: 'var(--ink)' }}>{user.email}</strong> an administrator, open the Firebase console,
            go to <strong>Firestore Database</strong>, create a collection named <code>admins</code>, and add a document whose
            <strong> Document ID</strong> is:
          </p>
          <code
            style={{
              display: 'inline-block', margin: '18px 0', padding: '12px 18px', background: 'var(--paper)',
              border: '1px solid var(--line)', borderRadius: '10px', fontSize: '14px', userSelect: 'all', wordBreak: 'break-all',
            }}
          >
            {user.uid}
          </code>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 22px' }}>
            Add any field (for example <code>email</code> = your email address), then reload this page.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => window.location.reload()} className="btn primary">
              <Icon name="replace" size={15} /> Reload
            </button>
            <button onClick={logout} className="btn secondary">
              <Icon name="logout" size={15} /> Log out
            </button>
          </div>
        </div>
      </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="admin-loading-screen">
        <div className="spinner"></div>
        <p style={{ marginTop: '16px', fontWeight: 600, color: 'var(--muted)' }}>Loading chapter dashboard…</p>
      </div>
    );
  }

  const unreadCount = messages.filter((m) => !m.read).length;
  const readCount = messages.length - unreadCount;
  const readPct = messages.length > 0 ? Math.round((readCount / messages.length) * 100) : 0;
  const activeBoard = boardMembers.filter((b) => b.status === 'active').length;
  const pendingBoard = boardMembers.filter((b) => b.status === 'pending').length;
  const formGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 18px' };
  const stagger = (i: number) => ({ ['--i' as string]: i } as React.CSSProperties);
  const statusTone = (type: string) => (type === 'ongoing' ? 'green' : type === 'upcoming' ? 'blue' : type === 'past' ? '' : 'amber');

  const TABS: { key: Tab; label: string; icon: IconName; count?: number; alert?: boolean }[] = [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'events', label: 'Events', icon: 'calendar', count: events.length },
    { key: 'advisor', label: 'Faculty Advisor', icon: 'graduation' },
    { key: 'leadership', label: 'Leadership', icon: 'users', count: committee.length },
    { key: 'resources', label: 'Resources', icon: 'book', count: resources.length },
    { key: 'gallery', label: 'Gallery', icon: 'image', count: gallery.length },
    { key: 'messages', label: 'Inquiries', icon: 'mail', count: unreadCount > 0 ? unreadCount : messages.length, alert: unreadCount > 0 },
    { key: 'volunteers', label: 'Volunteer Calls', icon: 'clipboard' },
    { key: 'board', label: 'Board Members', icon: 'shield', count: boardMembers.length },
  ];

  const emptyEventForm = {
    title: '',
    type: 'upcoming',
    typeLabel: 'Workshop',
    date: '',
    description: '',
    image: '',
    tags: ['CS', 'Chapter'],
    link: '',
  };
  const emptyCommitteeForm = {
    name: '',
    role: '',
    department: 'Computing & Information Systems',
    batch: '2023/2024 Batch',
    image: '',
    linkedin: '',
    email: '',
  };

  return (
    <div className="admin-layout">
      {saveStatus && <Toast msg={saveStatus.msg} kind={saveStatus.kind} />}

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="admin-topbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', minWidth: 0 }}>
            <Link href="/admin" className="brand" style={{ gap: '10px' }}>
              <img src="/images/logo.png" alt="IEEE CS SUSL" className="brand-logo" style={{ height: '32px' }} />
              <span className="brand-name" style={{ fontSize: '14px' }}>IEEE CS SUSL · Admin</span>
            </Link>
            <span className="admin-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="shield" size={12} /> Administrator
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="portal-user" title={user?.email || ''}>
              <span className="portal-avatar">{(user?.email || 'A')[0].toUpperCase()}</span>
              <span className="portal-email" style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </span>
            </span>
            <Link href="/" target="_blank" className="btn secondary sm">
              <Icon name="external" size={14} /> Public site
            </Link>
            <button onClick={handleSeed} className="btn secondary sm" title="Populate Firestore with default data">
              <Icon name="database" size={14} /> Seed data
            </button>
            <button onClick={logout} className="btn danger sm">
              <Icon name="logout" size={14} /> Log out
            </button>
          </div>
        </div>
      </header>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="admin-tabs-bar">
        <div className="container">
          <nav className="admin-tabs" aria-label="Dashboard sections">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`admin-tab ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
                aria-current={activeTab === t.key ? 'page' : undefined}
              >
                <Icon name={t.icon} size={16} />
                {t.label}
                {t.count !== undefined && <span className={`tab-count${t.alert ? ' alert' : ''}`}>{t.count}</span>}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="container" style={{ padding: '32px 0 80px' }}>

        {/* ════════════════ OVERVIEW ════════════════ */}
        {activeTab === 'overview' && (() => {
          const upcomingCount = events.filter((e) => e.type === 'upcoming').length;
          const ongoingCount = events.filter((e) => e.type === 'ongoing').length;
          const pastCount = events.filter((e) => e.type === 'past').length;
          const otherCount = events.length - upcomingCount - ongoingCount - pastCount;
          const committeeTarget = 15;
          const committeePct = Math.min(100, Math.round((committee.length / committeeTarget) * 100));
          const committeeColor = committeePct >= 80 ? '#059669' : committeePct >= 50 ? '#d97706' : '#dc2626';

          const stats: { icon: IconName; tone?: 'violet' | 'green' | 'amber' | 'red'; label: string; value: number; sub: string; tab: Tab }[] = [
            { icon: 'calendar', label: 'Events', value: events.length, sub: `${upcomingCount} upcoming · ${ongoingCount} ongoing`, tab: 'events' },
            { icon: 'users', tone: 'green', label: 'Active committee', value: committee.length, sub: `${pastCommittees.length} past terms archived`, tab: 'leadership' },
            { icon: 'image', tone: 'violet', label: 'Gallery photos', value: gallery.length, sub: 'Published photos', tab: 'gallery' },
            { icon: 'mail', tone: unreadCount > 0 ? 'red' : undefined, label: 'Inquiries', value: messages.length, sub: `${unreadCount} unread`, tab: 'messages' },
            { icon: 'book', tone: 'amber', label: 'Resources', value: resources.length, sub: 'Learning materials', tab: 'resources' },
            { icon: 'shield', tone: 'violet', label: 'Board members', value: boardMembers.length, sub: `${activeBoard} active · ${pendingBoard} pending`, tab: 'board' },
          ];

          const Bar = ({ label, count, total, color }: { label: string; count: number; total: number; color: string }) => (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                <span style={{ color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />{label}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{count}</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(16,24,32,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: total > 0 ? `${(count / total) * 100}%` : '0%', background: color, borderRadius: '99px', transition: 'width 0.8s var(--ease)' }} />
              </div>
            </div>
          );

          const Ring = ({ pct, color, label }: { pct: number; color: string; label: string }) => (
            <div style={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: 84, height: 84, transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(16,24,32,0.07)" strokeWidth="3.2" />
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke={color} strokeWidth="3.2" strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s var(--ease)' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', font: '700 15px/1 Montserrat, sans-serif', color: 'var(--ink)' }}>{label}</div>
            </div>
          );

          return (
            <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="portal-hero">
                <span className="orb one" />
                <span className="orb two" />
                <div style={{ position: 'relative' }}>
                  <span className="eyebrow">Administration portal</span>
                  <h1>IEEE CS SUSL Chapter overview</h1>
                  <p>Live statistics and quick access to every part of the chapter website.</p>
                </div>
              </div>

              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                {stats.map((s, i) => (
                  <button key={s.label} className="nav-card anim-in" style={stagger(i)} onClick={() => setActiveTab(s.tab)}>
                    <span className={`icon-tile${s.tone ? ` ${s.tone}` : ''}`}><Icon name={s.icon} size={19} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="stat-value" style={{ display: 'block' }}>{s.value}</span>
                      <span className="nav-card-title" style={{ fontSize: '13px', marginTop: '4px' }}>{s.label}</span>
                      <span className="nav-card-desc">{s.sub}</span>
                    </span>
                    <Icon name="chevronRight" size={16} className="nav-card-arrow" />
                  </button>
                ))}
              </div>

              {/* Analytics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                <div className="admin-panel anim-in" style={{ ...stagger(1), padding: '24px' }}>
                  <SectionHeader icon="calendar" title="Events breakdown" subtitle={`${events.length} total`} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Bar label="Upcoming" count={upcomingCount} total={events.length} color="#00629b" />
                    <Bar label="Ongoing" count={ongoingCount} total={events.length} color="#059669" />
                    <Bar label="Past" count={pastCount} total={events.length} color="#94a3b8" />
                    {otherCount > 0 && <Bar label="Other" count={otherCount} total={events.length} color="#d97706" />}
                  </div>
                </div>

                <div className="admin-panel anim-in" style={{ ...stagger(2), padding: '24px' }}>
                  <SectionHeader icon="inbox" tone={unreadCount > 0 ? 'red' : 'green'} title="Inquiry read rate" subtitle={`${messages.length} messages received`} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
                    <Ring pct={readPct} color={unreadCount > 0 ? '#d97706' : '#059669'} label={`${readPct}%`} />
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <div>
                        <div className="stat-value" style={{ fontSize: '20px', color: '#059669' }}>{readCount}</div>
                        <div className="stat-label">Read</div>
                      </div>
                      <div>
                        <div className="stat-value" style={{ fontSize: '20px', color: unreadCount > 0 ? '#dc2626' : 'var(--ink)' }}>{unreadCount}</div>
                        <div className="stat-label">Unread</div>
                      </div>
                    </div>
                  </div>
                  {unreadCount > 0 ? (
                    <div className="alert-box danger" style={{ alignItems: 'center' }}>
                      <span className="status-dot pulse" style={{ color: '#dc2626' }} />
                      <span style={{ flex: 1 }}>{unreadCount} message{unreadCount !== 1 ? 's' : ''} need{unreadCount === 1 ? 's' : ''} attention</span>
                      <button onClick={() => setActiveTab('messages')} className="btn danger sm">View <Icon name="arrowRight" size={13} /></button>
                    </div>
                  ) : messages.length > 0 ? (
                    <div className="alert-box success" style={{ alignItems: 'center' }}>
                      <Icon name="checkCircle" size={16} /> All inquiries have been read
                    </div>
                  ) : null}
                </div>

                <div className="admin-panel anim-in" style={{ ...stagger(3), padding: '24px' }}>
                  <SectionHeader icon="users" tone="green" title="Committee health" subtitle={`${committee.length} of ${committeeTarget} target members`} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
                    <Ring pct={committeePct} color={committeeColor} label={`${committeePct}%`} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '18px' }}>
                      <div><div className="stat-value" style={{ fontSize: '20px' }}>{committee.length}</div><div className="stat-label">Current</div></div>
                      <div><div className="stat-value" style={{ fontSize: '20px' }}>{pastCommittees.length}</div><div className="stat-label">Past terms</div></div>
                      <div><div className="stat-value" style={{ fontSize: '20px' }}>{activeBoard}</div><div className="stat-label">Board active</div></div>
                    </div>
                  </div>
                  <button onClick={() => setActiveTab('leadership')} className="btn secondary sm" style={{ width: '100%' }}>
                    Manage leadership <Icon name="arrowRight" size={13} />
                  </button>
                </div>
              </div>

              {/* Read-only summaries */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
                <div className="admin-panel" style={{ padding: '24px' }}>
                  <SectionHeader
                    icon="calendar"
                    title="Recent events"
                    subtitle="Read-only view"
                    actions={<button onClick={() => setActiveTab('events')} className="btn secondary sm">Manage</button>}
                  />
                  {events.length === 0 ? (
                    <EmptyState icon="calendar" title="No events yet" />
                  ) : (
                    <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {events.map((ev, i) => (
                        <div key={ev.id} className="anim-in" style={{ ...stagger(i), padding: '10px 12px', background: 'var(--paper)', borderRadius: '10px', border: '1px solid var(--line)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span className={`badge ${statusTone(ev.type)}`}>{ev.typeLabel}</span>
                            <span style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{ev.date}</span>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ev.isSpotlight && <Icon name="star" size={12} style={{ color: '#f59e0b', marginRight: 6 }} />}
                            {ev.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="admin-panel" style={{ padding: '24px' }}>
                  <SectionHeader
                    icon="users"
                    tone="green"
                    title="Active committee"
                    subtitle={`${committee.length} members`}
                    actions={<button onClick={() => setActiveTab('leadership')} className="btn secondary sm">Manage</button>}
                  />
                  {committee.length === 0 ? (
                    <EmptyState icon="users" title="No members yet" />
                  ) : (
                    <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {committee.map((m, i) => (
                        <div key={m.id} className="anim-in" style={{ ...stagger(i), display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'var(--paper)', borderRadius: '10px', border: '1px solid var(--line)' }}>
                          {m.image ? (
                            <img src={m.image} alt={m.name} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <Avatar name={m.name} size={34} />
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--blue)', fontWeight: 600 }}>{m.role}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="admin-panel" style={{ padding: '24px' }}>
                  <SectionHeader
                    icon="archive"
                    tone="amber"
                    title="Past committees"
                    subtitle={`${pastCommittees.length} archived terms`}
                    actions={<button onClick={() => setActiveTab('leadership')} className="btn secondary sm">Manage</button>}
                  />
                  {pastCommittees.length === 0 ? (
                    <EmptyState icon="archive" title="No past committees archived" />
                  ) : (
                    <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {pastCommittees.map((pc, i) => (
                        <div key={pc.id} className="anim-in" style={{ ...stagger(i), padding: '12px 14px', background: 'var(--paper)', borderRadius: '10px', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="icon-tile amber" style={{ width: 32, height: 32, borderRadius: 9 }}><Icon name="flag" size={15} /></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>{pc.year}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{pc.members.length} member{pc.members.length !== 1 ? 's' : ''} archived</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Gallery preview */}
              <div className="admin-panel" style={{ padding: '24px' }}>
                <SectionHeader
                  icon="image"
                  tone="violet"
                  title="Chapter photo gallery"
                  subtitle={`Read-only preview · ${gallery.length} photo${gallery.length !== 1 ? 's' : ''}`}
                  actions={<button onClick={() => setActiveTab('gallery')} className="btn secondary sm">Manage gallery</button>}
                />
                {gallery.length === 0 ? (
                  <EmptyState icon="image" title="No photos uploaded yet">Open the Gallery tab to upload chapter photos.</EmptyState>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                    {gallery.slice(0, 16).map((g, i) => (
                      <div key={g.id} className="anim-in" style={{ ...stagger(i), borderRadius: '10px', overflow: 'hidden', aspectRatio: '1', background: 'var(--paper)' }}>
                        <img src={g.src} alt={g.alt} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                    ))}
                    {gallery.length > 16 && (
                      <button
                        onClick={() => setActiveTab('gallery')}
                        style={{ borderRadius: '10px', aspectRatio: '1', background: 'rgba(124,58,237,0.06)', border: '1px dashed rgba(124,58,237,0.35)', color: '#6d28d9', cursor: 'pointer', font: '700 16px Montserrat, sans-serif' }}
                      >
                        +{gallery.length - 16}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Recent inquiries */}
              <div className="admin-panel" style={{ padding: '24px' }}>
                <SectionHeader
                  icon="mail"
                  title="Recent inquiries"
                  subtitle={`${messages.length} total · ${readPct}% read`}
                  actions={
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {unreadCount > 0 && <span className="badge red">{unreadCount} unread</span>}
                      <button onClick={() => setActiveTab('messages')} className="btn secondary sm">View all</button>
                    </div>
                  }
                />
                {messages.length === 0 ? (
                  <EmptyState icon="inbox" title="No inquiries received yet" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {messages.slice(0, 5).map((m, i) => (
                      <div
                        key={m.id}
                        className="anim-in"
                        style={{ ...stagger(i), display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: m.read ? 'var(--paper)' : 'rgba(0,98,155,0.05)', borderRadius: '10px', border: m.read ? '1px solid var(--line)' : '1px solid rgba(0,98,155,0.2)' }}
                      >
                        <span className={`status-dot${m.read ? '' : ' pulse'}`} style={{ color: m.read ? '#94a3b8' : 'var(--blue)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.subject || '(No subject)'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{m.name} · {new Date(m.createdAt).toLocaleDateString()}</div>
                        </div>
                        <span className={`badge ${m.read ? '' : 'blue'}`}>{m.read ? 'Read' : 'New'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div className="admin-panel" style={{ padding: '24px' }}>
                <SectionHeader icon="layers" title="Quick actions" />
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {([
                    { label: 'New event', tab: 'events', icon: 'calendar' },
                    { label: 'Add member', tab: 'leadership', icon: 'userPlus' },
                    { label: 'Upload photo', tab: 'gallery', icon: 'upload' },
                    { label: 'Add resource', tab: 'resources', icon: 'book' },
                    { label: 'View inquiries', tab: 'messages', icon: 'inbox' },
                    { label: 'Invite board member', tab: 'board', icon: 'shield' },
                  ] as { label: string; tab: Tab; icon: IconName }[]).map(({ label, tab, icon }) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className="btn secondary">
                      <Icon name={icon} size={15} /> {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ════════════════ FACULTY ADVISOR ════════════════ */}
        {activeTab === 'advisor' && advisor && (
          <div className="admin-panel tab-panel">
            <SectionHeader
              icon="graduation"
              title="Faculty advisor & senior lecturer"
              subtitle={'Controls the "People first" advisor section on the landing and leadership pages.'}
            />

            <form onSubmit={handleAdvisorSave} className="admin-form">
              <div style={formGrid}>
                <div className="form-group">
                  <label>Full name & honorific</label>
                  <input type="text" value={advisor.name} onChange={(e) => setAdvisor({ ...advisor, name: e.target.value })} placeholder="Dr. / Senior Lecturer Name" required />
                </div>
                <div className="form-group">
                  <label>Designation / title</label>
                  <input type="text" value={advisor.title} onChange={(e) => setAdvisor({ ...advisor, title: e.target.value })} placeholder="Faculty Advisor" required />
                </div>
              </div>

              <div className="form-group">
                <label>Department & faculty</label>
                <input type="text" value={advisor.department} onChange={(e) => setAdvisor({ ...advisor, department: e.target.value })} placeholder="Department of Computing & Information Systems" required />
              </div>

              <div className="form-group">
                <label>Biography & guidance details</label>
                <textarea rows={4} value={advisor.bio} onChange={(e) => setAdvisor({ ...advisor, bio: e.target.value })} placeholder="2–3 line bio and role description..." required />
              </div>

              <div className="form-group">
                <label>Advisor photo</label>
                <ImageUploader currentImage={advisor.image || ''} onUpload={(url) => setAdvisor({ ...advisor, image: url })} />
              </div>

              <div style={formGrid}>
                <div className="form-group">
                  <label>Email address</label>
                  <input type="email" value={advisor.email || ''} onChange={(e) => setAdvisor({ ...advisor, email: e.target.value })} placeholder="ieeecssusl@gmail.com" />
                </div>
                <div className="form-group">
                  <label>LinkedIn profile URL</label>
                  <input type="url" value={advisor.linkedin || ''} onChange={(e) => setAdvisor({ ...advisor, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
                </div>
              </div>

              <button type="submit" className="btn primary" style={{ marginTop: '8px' }}>
                <Icon name="check" size={15} /> Save advisor details
              </button>
            </form>
          </div>
        )}

        {/* ════════════════ EVENTS ════════════════ */}
        {activeTab === 'events' && (
          <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Categories */}
            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader icon="tag" title="Event categories" subtitle="Filtering categories displayed in the public events archive." />
              <div className="admin-tag-cloud" style={{ marginBottom: '18px' }}>
                {categories.map((c, i) => (
                  <div key={c.id} className="admin-chip anim-in" style={stagger(i)}>
                    <span>{c.label} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>({c.key})</span></span>
                    {c.key !== 'all' && (
                      <button type="button" onClick={() => handleDeleteCategory(c.id, c.label)} className="admin-chip-del" title="Remove category" aria-label={`Remove ${c.label}`}>
                        <Icon name="x" size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddCategory} className="admin-form" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
                  <label>Category key (lowercase)</label>
                  <input type="text" placeholder="e.g. workshop" value={newCatKey} onChange={(e) => setNewCatKey(e.target.value)} required />
                </div>
                <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
                  <label>Display label</label>
                  <input type="text" placeholder="e.g. Workshop" value={newCatLabel} onChange={(e) => setNewCatLabel(e.target.value)} required />
                </div>
                <button type="submit" className="btn secondary" style={{ height: '44px' }}>
                  <Icon name="plus" size={15} /> Add category
                </button>
              </form>
            </div>

            {/* Create / edit event */}
            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader
                icon={editingEventId ? 'pencil' : 'plus'}
                title={editingEventId ? 'Edit event' : 'Create new event'}
                subtitle="Published across the events page and the home page spotlight."
              />

              <form onSubmit={handleEventSubmit} className="admin-form">
                <div style={formGrid}>
                  <div className="form-group">
                    <label>Event title</label>
                    <input type="text" value={eventForm.title || ''} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="e.g. Technical Workshop Series" required />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={eventForm.type || 'upcoming'}
                      onChange={(e) => {
                        const selectedKey = e.target.value;
                        const matched = categories.find((c) => c.key === selectedKey);
                        setEventForm({ ...eventForm, type: selectedKey, typeLabel: matched ? matched.label : selectedKey });
                      }}
                      required
                    >
                      {categories.filter((c) => c.key !== 'all').map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Event date or timeline</label>
                    <input type="text" value={eventForm.date || ''} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} placeholder="e.g. March 2026 or 24-25 May 2026" required />
                  </div>
                  <div className="form-group">
                    <label>Registration / external link (optional)</label>
                    <input type="text" value={eventForm.link || ''} onChange={(e) => setEventForm({ ...eventForm, link: e.target.value })} placeholder="https://..." />
                  </div>
                </div>

                <div className="form-group">
                  <label>Event description</label>
                  <textarea rows={3} value={eventForm.description || ''} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Event details, takeaways, and speaker info..." required />
                </div>

                <div className="form-group">
                  <label>Banner image</label>
                  <ImageUploader currentImage={eventForm.image || ''} onUpload={(url) => setEventForm({ ...eventForm, image: url })} />
                </div>

                <div className="form-group">
                  <label>Tags (comma separated)</label>
                  <input
                    type="text"
                    value={eventForm.tags?.join(', ') || ''}
                    onChange={(e) => setEventForm({ ...eventForm, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
                    placeholder="CS, Workshop, AI/ML"
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn primary">
                    <Icon name={editingEventId ? 'check' : 'send'} size={15} /> {editingEventId ? 'Update event' : 'Publish event'}
                  </button>
                  {editingEventId && (
                    <button type="button" className="btn secondary" onClick={() => { setEditingEventId(null); setEventForm(emptyEventForm); }}>
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Event list */}
            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader
                icon="layers"
                title={`Existing events (${events.length})`}
                subtitle={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Icon name="star" size={12} style={{ color: '#f59e0b' }} /> Use “Set spotlight” to feature an event on the home page.</span>}
              />
              {events.length === 0 ? (
                <EmptyState icon="calendar" title="No events yet">Create your first event using the form above.</EmptyState>
              ) : (
                <div className="admin-grid-cards">
                  {events.map((ev, i) => (
                    <div
                      key={ev.id}
                      className="admin-item-card anim-in"
                      style={{
                        ...stagger(i),
                        position: 'relative',
                        outline: ev.isSpotlight ? '2px solid #f59e0b' : undefined,
                        boxShadow: ev.isSpotlight ? '0 0 0 4px rgba(245,158,11,0.12)' : undefined,
                      }}
                    >
                      {ev.isSpotlight && (
                        <span className="badge solid-amber" style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
                          <Icon name="star" size={11} /> Spotlight
                        </span>
                      )}
                      <img src={ev.image} alt={ev.title} className="admin-card-thumb" />
                      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <Icon name="clock" size={12} /> {ev.date}
                          </span>
                          <span className={`badge ${statusTone(ev.type)}`}>{ev.typeLabel}</span>
                        </div>
                        <h4 style={{ margin: 0, fontSize: '16px' }}>{ev.title}</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {ev.description}
                        </p>

                        {/* Quick lifecycle switcher */}
                        <div style={{ padding: '10px', background: 'var(--paper)', borderRadius: '10px', border: '1px solid var(--line)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</span>
                            <span className={`badge ${statusTone(ev.type)}`}>
                              <span className={`status-dot${ev.type === 'ongoing' ? ' pulse' : ''}`} style={{ width: 6, height: 6 }} />
                              {ev.type}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {ev.type !== 'upcoming' && (
                              <button type="button" onClick={() => handleQuickStatusChange(ev.id, 'upcoming')} className="btn secondary sm" title="Move event to Upcoming">
                                <Icon name="clock" size={12} /> Upcoming
                              </button>
                            )}
                            {ev.type !== 'ongoing' && (
                              <button type="button" onClick={() => handleQuickStatusChange(ev.id, 'ongoing')} className="btn secondary sm" title="Move event to Ongoing">
                                <Icon name="arrowRight" size={12} /> Ongoing
                              </button>
                            )}
                            {ev.type !== 'past' && (
                              <button type="button" onClick={() => handleQuickStatusChange(ev.id, 'past')} className="btn secondary sm" title="Move event to Past">
                                <Icon name="check" size={12} /> Past
                              </button>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                          {!ev.isSpotlight && (
                            <button onClick={() => handleSetSpotlight(ev.id, ev.title)} className="btn secondary sm" title="Show this event in the home-page spotlight">
                              <Icon name="star" size={13} /> Set spotlight
                            </button>
                          )}
                          <button onClick={() => handleEditEvent(ev)} className="btn secondary sm" title="Open full event editor">
                            <Icon name="pencil" size={13} /> Edit
                          </button>
                          <button onClick={() => handleDeleteEvent(ev.id)} className="btn ghost-danger sm">
                            <Icon name="trash" size={13} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Full edit modal */}
            {modalEditEvent && (
              <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalEditEvent(null); }}>
                <div className="admin-modal" style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div className="modal-head">
                    <div className="icon-tile"><Icon name="pencil" size={18} /></div>
                    <h3>Edit published event</h3>
                    <button type="button" className="modal-close" onClick={() => setModalEditEvent(null)} aria-label="Close">
                      <Icon name="x" size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleModalEventSave} className="admin-form">
                    <div style={formGrid}>
                      <div className="form-group">
                        <label>Event title</label>
                        <input type="text" value={modalEditEvent.title} onChange={(e) => setModalEditEvent({ ...modalEditEvent, title: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>Status / category</label>
                        <select
                          value={modalEditEvent.type}
                          onChange={(e) => {
                            const selectedKey = e.target.value;
                            const matched = categories.find((c) => c.key === selectedKey);
                            setModalEditEvent({
                              ...modalEditEvent,
                              type: selectedKey,
                              typeLabel: matched ? matched.label : selectedKey.charAt(0).toUpperCase() + selectedKey.slice(1),
                            });
                          }}
                          required
                        >
                          <option value="upcoming">Upcoming</option>
                          <option value="ongoing">Ongoing</option>
                          <option value="past">Past</option>
                          {categories.filter((c) => !['all', 'upcoming', 'ongoing', 'past'].includes(c.key)).map((c) => (
                            <option key={c.key} value={c.key}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Display label</label>
                        <input type="text" value={modalEditEvent.typeLabel} onChange={(e) => setModalEditEvent({ ...modalEditEvent, typeLabel: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>Event date / timeline</label>
                        <input type="text" value={modalEditEvent.date} onChange={(e) => setModalEditEvent({ ...modalEditEvent, date: e.target.value })} required />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Registration / external link (optional)</label>
                      <input type="text" value={modalEditEvent.link || ''} onChange={(e) => setModalEditEvent({ ...modalEditEvent, link: e.target.value })} placeholder="https://..." />
                    </div>

                    <div className="form-group">
                      <label>Event description</label>
                      <textarea rows={3} value={modalEditEvent.description} onChange={(e) => setModalEditEvent({ ...modalEditEvent, description: e.target.value })} required />
                    </div>

                    <div className="form-group">
                      <label>Banner image</label>
                      <ImageUploader currentImage={modalEditEvent.image || ''} onUpload={(url) => setModalEditEvent({ ...modalEditEvent, image: url })} />
                    </div>

                    <div className="form-group">
                      <label>Tags (comma separated)</label>
                      <input
                        type="text"
                        value={modalEditEvent.tags?.join(', ') || ''}
                        onChange={(e) => setModalEditEvent({ ...modalEditEvent, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                      <button type="button" className="btn secondary" onClick={() => setModalEditEvent(null)}>Cancel</button>
                      <button type="submit" className="btn primary"><Icon name="check" size={15} /> Save changes</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════ LEADERSHIP ════════════════ */}
        {activeTab === 'leadership' && (
          <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="admin-alert-banner" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div className="icon-tile" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}><Icon name="flag" size={19} /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', color: '#fff' }}>Executive committee term management</h3>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.8)', maxWidth: '640px' }}>
                    When a leadership term ends, archive the current committee to “Honoring alumni contributions” and start the next term.
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setShowEndModal(true)} className="btn primary" style={{ background: '#FF6C0C', borderColor: '#FF6C0C', boxShadow: 'none' }}>
                <Icon name="archive" size={15} /> End current term
              </button>
            </div>

            {showEndModal && (
              <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowEndModal(false); }}>
                <div className="admin-modal">
                  <div className="modal-head">
                    <div className="icon-tile amber"><Icon name="archive" size={18} /></div>
                    <h3>End current committee term</h3>
                    <button type="button" className="modal-close" onClick={() => setShowEndModal(false)} aria-label="Close"><Icon name="x" size={18} /></button>
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
                    All <strong style={{ color: 'var(--ink)' }}>{committee.length} active members</strong> will be moved into the
                    <strong style={{ color: 'var(--ink)' }}> Honoring alumni contributions</strong> archive with their names and roles.
                  </p>
                  <div className="admin-form">
                    <div className="form-group" style={{ margin: '20px 0' }}>
                      <label>Archived committee label / year</label>
                      <input type="text" value={endYearPrompt} onChange={(e) => setEndYearPrompt(e.target.value)} placeholder="e.g. 2024 / 2025 Committee" required />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button type="button" className="btn secondary" onClick={() => setShowEndModal(false)}>Cancel</button>
                    <button type="button" className="btn danger" onClick={handleEndCommittee}>
                      <Icon name="archive" size={15} /> Confirm & archive
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add / edit member */}
            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader
                icon={editingMemberId ? 'pencil' : 'userPlus'}
                tone="green"
                title={editingMemberId ? 'Edit committee member' : 'Add committee member'}
                subtitle="Photo, name, role, department and batch for the public leadership page."
              />
              <form onSubmit={handleCommitteeSubmit} className="admin-form">
                <div style={formGrid}>
                  <div className="form-group">
                    <label>Full name</label>
                    <input type="text" value={committeeForm.name || ''} onChange={(e) => setCommitteeForm({ ...committeeForm, name: e.target.value })} placeholder="e.g. Niranga Nayanajith" required />
                  </div>
                  <div className="form-group">
                    <label>Executive role</label>
                    <input type="text" value={committeeForm.role || ''} onChange={(e) => setCommitteeForm({ ...committeeForm, role: e.target.value })} placeholder="e.g. President / Vice President / Secretary" required />
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input type="text" value={committeeForm.department || ''} onChange={(e) => setCommitteeForm({ ...committeeForm, department: e.target.value })} placeholder="Computing & Information Systems" required />
                  </div>
                  <div className="form-group">
                    <label>Batch</label>
                    <select value={committeeForm.batch || '2022/2023 Batch'} onChange={(e) => setCommitteeForm({ ...committeeForm, batch: e.target.value })}>
                      {BATCH_OPTIONS.map((b) => (<option key={b} value={b}>{b}</option>))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Member photo</label>
                  <ImageUploader currentImage={committeeForm.image || ''} onUpload={(url) => setCommitteeForm({ ...committeeForm, image: url })} />
                </div>

                <div style={formGrid}>
                  <div className="form-group">
                    <label>LinkedIn URL (optional)</label>
                    <input type="url" value={committeeForm.linkedin || ''} onChange={(e) => setCommitteeForm({ ...committeeForm, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div className="form-group">
                    <label>Email address (optional)</label>
                    <input type="email" value={committeeForm.email || ''} onChange={(e) => setCommitteeForm({ ...committeeForm, email: e.target.value })} placeholder="member@sab.ac.lk" />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn primary">
                    <Icon name={editingMemberId ? 'check' : 'plus'} size={15} /> {editingMemberId ? 'Update member' : 'Add member'}
                  </button>
                  {editingMemberId && (
                    <button type="button" className="btn secondary" onClick={() => { setEditingMemberId(null); setCommitteeForm(emptyCommitteeForm); }}>
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Active roster */}
            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader icon="users" tone="green" title={`Current active committee (${committee.length})`} />
              {committee.length === 0 ? (
                <EmptyState icon="users" title="No committee members yet">Add members using the form above.</EmptyState>
              ) : (
                <div className="admin-grid-cards">
                  {committee.map((m, i) => (
                    <div key={m.id} className="admin-item-card anim-in" style={{ ...stagger(i), padding: '18px', gap: '10px', outline: editingMemberId === m.id ? '2px solid var(--blue)' : undefined }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {m.image ? (
                          <img src={m.image} alt={m.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <Avatar name={m.name} size={48} />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <h4 style={{ margin: 0, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</h4>
                          <div style={{ color: 'var(--blue)', fontSize: '13px', fontWeight: 600 }}>{m.role}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{m.department}</div>
                      <span className="badge plain" style={{ alignSelf: 'flex-start' }}>{m.batch}</span>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <button onClick={() => handleEditMember(m)} className="btn secondary sm"><Icon name="pencil" size={13} /> Edit</button>
                        <button onClick={() => handleDeleteMember(m.id)} className="btn ghost-danger sm"><Icon name="trash" size={13} /> Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past committees */}
            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader
                icon="archive"
                tone="amber"
                title="Past leadership archives"
                subtitle={'Honoring alumni contributions. The public site shows the 3 latest terms with an "Explore more" option.'}
              />
              <form onSubmit={handleAddPastCommittee} className="admin-form admin-subcard" style={{ marginBottom: '20px' }}>
                <div className="form-group">
                  <label>Committee year title</label>
                  <input type="text" placeholder="e.g. 2024 / 2025 Committee" value={newPastYear} onChange={(e) => setNewPastYear(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Members (one per line, e.g. “President: Malith Bandara”)</label>
                  <textarea
                    rows={4}
                    placeholder={`President: Malith Bandara\nVice President: Hasini Wickramasinghe\nSecretary: Anuki Jayasundara`}
                    value={newPastMembersText}
                    onChange={(e) => setNewPastMembersText(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn secondary"><Icon name="plus" size={15} /> Add past committee record</button>
              </form>

              {pastCommittees.length === 0 ? (
                <EmptyState icon="archive" title="No archived committees yet" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pastCommittees.map((pc, i) => (
                    <div key={pc.id} className="anim-in" style={{ ...stagger(i), padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px' }}>
                      <div className="icon-tile amber" style={{ width: 36, height: 36 }}><Icon name="flag" size={16} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: 0, fontSize: '15px' }}>{pc.year}</h4>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>{pc.members.length} members recorded</p>
                      </div>
                      <button onClick={() => handleDeletePastCommittee(pc.id)} className="btn ghost-danger sm"><Icon name="trash" size={13} /> Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════ RESOURCES ════════════════ */}
        {activeTab === 'resources' && (
          <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader
                icon={editingResId ? 'pencil' : 'book'}
                tone="amber"
                title={editingResId ? 'Edit resource' : 'Add knowledge resource'}
                subtitle={'Curated learning materials, cheat sheets and guides. The public site shows 6 at a time with "Explore more".'}
              />
              <form onSubmit={handleResourceSubmit} className="admin-form">
                <div style={formGrid}>
                  <div className="form-group">
                    <label>Category</label>
                    <input type="text" value={resourceForm.category || ''} onChange={(e) => setResourceForm({ ...resourceForm, category: e.target.value })} placeholder="Workshop Kit / AI & Data Science / Research" required />
                  </div>
                  <div className="form-group">
                    <label>Resource title</label>
                    <input type="text" value={resourceForm.title || ''} onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })} placeholder="e.g. Competitive Programming Cheat Sheet" required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea rows={3} value={resourceForm.description || ''} onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })} placeholder="Summary of topics, code libraries and tools covered..." required />
                </div>
                <div className="form-group">
                  <label>Resource file or external link</label>
                  <input type="text" value={resourceForm.link || ''} onChange={(e) => setResourceForm({ ...resourceForm, link: e.target.value })} placeholder="https://..." required />
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn primary">
                    <Icon name={editingResId ? 'check' : 'plus'} size={15} /> {editingResId ? 'Update resource' : 'Add resource'}
                  </button>
                  {editingResId && (
                    <button type="button" className="btn secondary" onClick={() => { setEditingResId(null); setResourceForm({ category: 'Workshop Kit', title: '', description: '', link: '#' }); }}>
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader icon="layers" tone="amber" title={`Existing resources (${resources.length})`} />
              {resources.length === 0 ? (
                <EmptyState icon="book" title="No resources yet">Add learning materials using the form above.</EmptyState>
              ) : (
                <div className="admin-grid-cards">
                  {resources.map((res, i) => (
                    <div key={res.id} className="admin-item-card anim-in" style={{ ...stagger(i), padding: '18px', gap: '8px', outline: editingResId === res.id ? '2px solid var(--blue)' : undefined }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="icon-tile amber" style={{ width: 34, height: 34, borderRadius: 10 }}><Icon name="file" size={16} /></div>
                        <span className="badge blue">{res.category}</span>
                      </div>
                      <h4 style={{ margin: 0, fontSize: '15px' }}>{res.title}</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', flex: 1 }}>{res.description}</p>
                      {res.link && res.link !== '#' && (
                        <a href={res.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', gap: '5px', wordBreak: 'break-all' }}>
                          <Icon name="link" size={12} /> {res.link}
                        </a>
                      )}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <button
                          onClick={() => { setEditingResId(res.id); setResourceForm(res); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                          className="btn secondary sm"
                        >
                          <Icon name="pencil" size={13} /> Edit
                        </button>
                        <button onClick={() => handleDeleteResource(res.id)} className="btn ghost-danger sm"><Icon name="trash" size={13} /> Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════ GALLERY ════════════════ */}
        {activeTab === 'gallery' && (
          <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader icon="upload" tone="violet" title="Add photos" subtitle={'Photos are stored on Cloudinary. The public gallery shows 6 at a time with "Explore more moments".'} />

              <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px', marginBottom: '22px' }}>
                <button type="button" className={`btn sm ${galleryUploadMode === 'single' ? 'primary' : 'secondary'}`} onClick={() => setGalleryUploadMode('single')} style={galleryUploadMode === 'single' ? undefined : { border: 'none', boxShadow: 'none', background: 'transparent' }}>
                  <Icon name="image" size={14} /> Single photo
                </button>
                <button type="button" className={`btn sm ${galleryUploadMode === 'zip' ? 'primary' : 'secondary'}`} onClick={() => setGalleryUploadMode('zip')} style={galleryUploadMode === 'zip' ? undefined : { border: 'none', boxShadow: 'none', background: 'transparent' }}>
                  <Icon name="archive" size={14} /> Bulk ZIP upload
                </button>
              </div>

              {galleryUploadMode === 'zip' ? (
                <ZipGalleryUploader onPhotoAdded={(photo) => setGallery((prev) => [photo, ...prev])} showToast={(msg) => showToast(msg)} />
              ) : (
                <form onSubmit={handleGallerySubmit} className="admin-form">
                  <div style={formGrid}>
                    <div className="form-group">
                      <label>Photo caption / title</label>
                      <input type="text" value={galleryForm.caption || ''} onChange={(e) => setGalleryForm({ ...galleryForm, caption: e.target.value })} placeholder="e.g. Hands-on Machine Learning Workshop" required />
                    </div>
                    <div className="form-group">
                      <label>Alt text (accessibility)</label>
                      <input type="text" value={galleryForm.alt || ''} onChange={(e) => setGalleryForm({ ...galleryForm, alt: e.target.value })} placeholder="Students collaborating at Sabaragamuwa University..." />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Photo</label>
                    <ImageUploader currentImage={galleryForm.src || ''} onUpload={(url) => setGalleryForm({ ...galleryForm, src: url })} />
                  </div>
                  <button type="submit" className="btn primary"><Icon name="plus" size={15} /> Add to gallery</button>
                </form>
              )}
            </div>

            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader icon="image" tone="violet" title={`Uploaded photos (${gallery.length})`} />
              {gallery.length === 0 ? (
                <EmptyState icon="image" title="No photos yet">Upload a single photo or a ZIP archive above.</EmptyState>
              ) : (
                <div className="admin-grid-cards">
                  {gallery.map((g, i) => (
                    <div key={g.id} className="admin-item-card anim-in" style={stagger(i)}>
                      <img src={g.src} alt={g.alt} loading="lazy" className="admin-card-thumb" style={{ height: '180px' }} />
                      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <p style={{ fontWeight: 600, fontSize: '14px', margin: 0, flex: 1 }}>{g.caption}</p>
                        <button onClick={() => handleDeleteGalleryPhoto(g.id)} className="btn ghost-danger sm" style={{ alignSelf: 'flex-start' }}>
                          <Icon name="trash" size={13} /> Delete photo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════ INQUIRIES ════════════════ */}
        {activeTab === 'messages' && (
          <div className="admin-panel tab-panel" style={{ padding: '24px' }}>
            <SectionHeader
              icon="mail"
              title={`Contact inquiries (${messages.length})`}
              subtitle="Messages from students, researchers, faculty and partners sent through the Contact form."
              actions={
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="badge red">{unreadCount} unread</span>
                  <span className="badge">{messages.length} total</span>
                </div>
              }
            />

            <div style={{ display: 'flex', gap: '10px', marginBottom: '22px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="input-icon" style={{ flex: '1 1 260px' }}>
                <Icon name="search" size={15} />
                <input
                  type="text"
                  placeholder="Search by sender name, email or subject..."
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--paper)', fontSize: '14px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px' }}>
                {(['all', 'unread', 'read'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setMessageFilter(f)}
                    className={`btn sm ${messageFilter === f ? 'primary' : 'secondary'}`}
                    style={messageFilter === f ? { textTransform: 'capitalize' } : { textTransform: 'capitalize', border: 'none', boxShadow: 'none', background: 'transparent' }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const filtered = messages.filter((m) => {
                if (messageFilter === 'unread' && m.read) return false;
                if (messageFilter === 'read' && !m.read) return false;
                if (messageSearch.trim()) {
                  const q = messageSearch.toLowerCase();
                  return (
                    m.name.toLowerCase().includes(q) ||
                    m.email.toLowerCase().includes(q) ||
                    m.subject.toLowerCase().includes(q) ||
                    m.message.toLowerCase().includes(q)
                  );
                }
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <EmptyState icon="inbox" title="No inquiries found">
                    {messages.length === 0
                      ? 'When visitors submit the Contact form, their inquiries will appear here.'
                      : 'No messages match your current search or filter.'}
                  </EmptyState>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {filtered.map((msg, i) => (
                    <div
                      key={msg.id}
                      className="anim-in"
                      style={{
                        ...stagger(i),
                        background: msg.read ? 'var(--paper)' : 'var(--white)',
                        border: msg.read ? '1px solid var(--line)' : '1px solid rgba(0, 98, 155, 0.35)',
                        borderLeft: msg.read ? '1px solid var(--line)' : '4px solid var(--blue)',
                        boxShadow: msg.read ? 'none' : '0 6px 18px rgba(0, 98, 155, 0.07)',
                        borderRadius: '14px',
                        padding: '20px 22px',
                        transition: 'background 0.2s, border-color 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ minWidth: 0, flex: '1 1 300px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span className={`badge ${msg.read ? '' : 'blue'}`}>
                              {!msg.read && <span className="status-dot pulse" style={{ width: 6, height: 6 }} />}
                              {msg.read ? 'Read' : 'New inquiry'}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <Icon name="clock" size={12} />
                              {new Date(msg.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          </div>
                          <h3 style={{ fontSize: '17px', margin: '8px 0 0', color: 'var(--ink)' }}>{msg.subject || '(No subject)'}</h3>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <a href={`mailto:${msg.email}?subject=${encodeURIComponent(`Re: ${msg.subject || 'IEEE CS Inquiry'}`)}`} className="btn primary sm">
                            <Icon name="send" size={13} /> Reply
                          </a>
                          <button onClick={() => handleToggleMessageRead(msg.id, msg.read)} className="btn secondary sm">
                            <Icon name={msg.read ? 'mail' : 'mailOpen'} size={13} /> {msg.read ? 'Mark unread' : 'Mark as read'}
                          </button>
                          <button onClick={() => handleDeleteMessage(msg.id)} className="btn ghost-danger sm icon-only" title="Delete inquiry" aria-label="Delete inquiry">
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', padding: '10px 14px', background: 'rgba(0, 98, 155, 0.04)', borderRadius: '10px', marginBottom: '14px', fontSize: '13px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Icon name="users" size={13} style={{ color: 'var(--muted)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{msg.name}</span>
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Icon name="mail" size={13} style={{ color: 'var(--muted)' }} />
                          <a href={`mailto:${msg.email}`} style={{ color: 'var(--blue)', wordBreak: 'break-all' }}>{msg.email}</a>
                        </span>
                      </div>

                      <div style={{ padding: '14px 18px', background: 'var(--white)', border: '1px solid var(--line)', borderRadius: '12px', fontSize: '14px', lineHeight: 1.7, color: 'var(--ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ════════════════ VOLUNTEER CALLS ════════════════ */}
        {activeTab === 'volunteers' && user && (
          <VolunteerCallsManager
            viewer={{ uid: user.uid, email: user.email || '', name: 'Chapter admin', isAdmin: true }}
            showToast={showToast}
            describeError={(err) => explainPermissionError(err, user)}
          />
        )}

        {/* ════════════════ BOARD MEMBERS ════════════════ */}
        {activeTab === 'board' && (
          <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="portal-hero" style={{ background: 'linear-gradient(120deg, #2e1065, #4c1d95, #6d28d9, #4c1d95)', backgroundSize: '300% 300%' }}>
              <span className="orb one" />
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                  <span className="eyebrow">Access control</span>
                  <h1>Board member management</h1>
                  <p>Invite chapter board members and assign what they can manage. Each invitee receives an email with a temporary password.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[{ n: activeBoard, l: 'Active', c: '#fff' }, { n: pendingBoard, l: 'Pending', c: '#fcd34d' }].map((s) => (
                    <div key={s.l} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '10px 18px', textAlign: 'center', minWidth: '84px' }}>
                      <div style={{ font: '700 22px/1 Montserrat, sans-serif', color: s.c }}>{s.n}</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '4px' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {boardInviteResult && (
              <div className="alert-box success anim-in" style={{ padding: '18px 20px' }}>
                <Icon name="checkCircle" size={20} />
                <div style={{ flex: 1 }}>
                  <div className="alert-title">Invitation sent</div>
                  <div>Login details were emailed to <strong>{boardInviteResult.email}</strong>. The member must set a new password on first login.</div>
                  <div style={{ marginTop: '10px', display: 'inline-block', background: '#fff', border: '1px solid rgba(5,150,105,0.3)', borderRadius: '10px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Temporary password (shown once)</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)', fontFamily: 'monospace', letterSpacing: '0.06em', userSelect: 'all' }}>{boardInviteResult.tempPassword}</div>
                  </div>
                </div>
                <button onClick={() => setBoardInviteResult(null)} className="modal-close" aria-label="Dismiss"><Icon name="x" size={16} /></button>
              </div>
            )}

            {/* Invite form */}
            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader icon="userPlus" tone="violet" title="Invite a new board member" subtitle="Enter their details and choose their permissions. A welcome email with a temporary password is sent automatically." />
              <form onSubmit={handleInviteBoardMember} className="admin-form">
                <div style={formGrid}>
                  <div className="form-group">
                    <label>Full name</label>
                    <input type="text" value={boardForm.name} onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })} placeholder="e.g. Niranga Nayanajith" required />
                  </div>
                  <div className="form-group">
                    <label>Board role / position</label>
                    <input type="text" value={boardForm.role} onChange={(e) => setBoardForm({ ...boardForm, role: e.target.value })} placeholder="e.g. President, Vice President, Secretary" required />
                  </div>
                  <div className="form-group">
                    <label>Email address</label>
                    <input type="email" value={boardForm.email} onChange={(e) => setBoardForm({ ...boardForm, email: e.target.value })} placeholder="member@sab.ac.lk" required />
                  </div>
                </div>

                <div className="form-group">
                  <label>Permissions</label>
                  <PermissionPicker value={boardForm.permissions} onChange={(permissions) => setBoardForm((prev) => ({ ...prev, permissions }))} />
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn primary" disabled={boardInviting}>
                    {boardInviting ? <><ButtonSpinner /> Sending invitation…</> : <><Icon name="send" size={15} /> Send invitation</>}
                  </button>
                  {boardForm.permissions.length > 0 && (
                    <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                      {boardForm.permissions.length} permission{boardForm.permissions.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
              </form>
            </div>

            {replaceResult && (
              <div className="alert-box info anim-in" style={{ padding: '18px 20px' }}>
                <Icon name="replace" size={20} />
                <div style={{ flex: 1 }}>
                  <div className="alert-title">Post replaced</div>
                  <div>Invitation sent to <strong>{replaceResult.name}</strong> at <strong>{replaceResult.email}</strong>. They must set a permanent password on first login.</div>
                  <div style={{ marginTop: '10px', display: 'inline-block', background: '#fff', border: '1px solid rgba(0,98,155,0.25)', borderRadius: '10px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Temporary password (shown once)</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)', fontFamily: 'monospace', letterSpacing: '0.06em', userSelect: 'all' }}>{replaceResult.tempPassword}</div>
                  </div>
                </div>
                <button onClick={() => setReplaceResult(null)} className="modal-close" aria-label="Dismiss"><Icon name="x" size={16} /></button>
              </div>
            )}

            {/* Member list */}
            <div className="admin-panel" style={{ padding: '24px' }}>
              <SectionHeader icon="shield" tone="violet" title={`Existing board members (${boardMembers.length})`} />
              {boardMembers.length === 0 ? (
                <EmptyState icon="shield" title="No board members yet">Use the form above to invite chapter board members.</EmptyState>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {boardMembers.map((bm, i) => {
                    const isEditingPerms = editingPermsMemberId === bm.id;
                    const isReplacing = replacingMemberId === bm.id;
                    const isActive = bm.status === 'active';

                    return (
                      <div
                        key={bm.id}
                        className="anim-in"
                        style={{
                          ...stagger(i),
                          background: 'var(--white)',
                          border: isActive ? '1px solid var(--line)' : '1px dashed rgba(217,119,6,0.5)',
                          borderRadius: '14px',
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 300px', minWidth: 0 }}>
                            <Avatar name={bm.name} size={46} muted={!isActive} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <h4 style={{ margin: 0, fontSize: '15px' }}>{bm.name}</h4>
                                <span className={`badge ${isActive ? 'green' : 'amber'}`}>
                                  <span className={`status-dot${isActive ? '' : ' pulse'}`} style={{ width: 6, height: 6 }} />
                                  {isActive ? 'Active' : 'Pending first login'}
                                </span>
                              </div>
                              <div style={{ color: 'var(--blue)', fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>{bm.role}</div>
                              <div style={{ color: 'var(--muted)', fontSize: '12px', wordBreak: 'break-all' }}>{bm.email}</div>
                              {!isEditingPerms && (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                                  {bm.permissions.map((p: string) => (
                                    <span key={p} className="badge plain blue">{permissionLabel(p)}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right', marginRight: '6px', lineHeight: 1.5 }}>
                              <div>Invited {new Date(bm.invitedAt).toLocaleDateString()}</div>
                              {bm.activatedAt && <div>Activated {new Date(bm.activatedAt).toLocaleDateString()}</div>}
                            </div>
                            <button
                              onClick={() => {
                                if (isEditingPerms) {
                                  setEditingPermsMemberId(null);
                                } else {
                                  setReplacingMemberId(null);
                                  setEditingPermsMemberId(bm.id);
                                  setEditingPerms([...bm.permissions]);
                                }
                              }}
                              className="btn secondary sm"
                              title="Edit permissions for this board member"
                            >
                              <Icon name={isEditingPerms ? 'x' : 'key'} size={13} /> {isEditingPerms ? 'Cancel' : 'Permissions'}
                            </button>
                            <button
                              onClick={() => {
                                if (isReplacing) {
                                  setReplacingMemberId(null);
                                  setReplaceForm({ name: '', email: '', role: '', permissions: [] });
                                } else {
                                  setEditingPermsMemberId(null);
                                  setReplacingMemberId(bm.id);
                                  setReplaceForm({ name: '', email: '', role: bm.role, permissions: [...bm.permissions] });
                                }
                              }}
                              className="btn secondary sm"
                              title="Replace this post with a new board member"
                            >
                              <Icon name={isReplacing ? 'x' : 'replace'} size={13} /> {isReplacing ? 'Cancel' : 'Replace post'}
                            </button>
                            <button onClick={() => handleDeleteBoardMember(bm.id, bm.name)} className="btn ghost-danger sm" title="Remove board member">
                              <Icon name="trash" size={13} /> Remove
                            </button>
                          </div>
                        </div>

                        {isEditingPerms && (
                          <div className="anim-in" style={{ borderTop: '1px solid var(--line)', background: 'rgba(0,98,155,0.03)', padding: '18px 20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '14px' }}>Edit permissions — {bm.name}</h4>
                                <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--muted)' }}>Choose the sections this member can manage.</p>
                              </div>
                              <span className="badge blue">{editingPerms.length} / {PERMISSIONS.length} selected</span>
                            </div>
                            <PermissionPicker value={editingPerms} onChange={setEditingPerms} />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                              <button onClick={() => handleSavePermissions(bm.id)} disabled={savingPerms || editingPerms.length === 0} className="btn primary sm">
                                {savingPerms ? <><ButtonSpinner /> Saving…</> : <><Icon name="check" size={13} /> Save permissions</>}
                              </button>
                              <button onClick={() => setEditingPermsMemberId(null)} className="btn secondary sm">Cancel</button>
                            </div>
                          </div>
                        )}

                        {isReplacing && (
                          <div className="anim-in" style={{ borderTop: '1px solid var(--line)', background: 'rgba(217,119,6,0.03)', padding: '18px 20px' }}>
                            <div style={{ marginBottom: '14px' }}>
                              <h4 style={{ margin: 0, fontSize: '14px' }}>Replace post — <span style={{ color: 'var(--blue)' }}>{bm.role}</span></h4>
                              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                                Enter the new person&apos;s details. You can also update the role and permissions before sending the invitation.
                              </p>
                            </div>

                            <form onSubmit={(e) => handleReplacePost(e, bm.id)} className="admin-form">
                              <div style={formGrid}>
                                <div className="form-group">
                                  <label>New member full name</label>
                                  <input type="text" value={replaceForm.name} onChange={(e) => setReplaceForm({ ...replaceForm, name: e.target.value })} placeholder="e.g. Kasun Perera" required />
                                </div>
                                <div className="form-group">
                                  <label>New member email</label>
                                  <input type="email" value={replaceForm.email} onChange={(e) => setReplaceForm({ ...replaceForm, email: e.target.value })} placeholder="newmember@sab.ac.lk" required />
                                </div>
                                <div className="form-group">
                                  <label>Board role / position</label>
                                  <input type="text" value={replaceForm.role} onChange={(e) => setReplaceForm({ ...replaceForm, role: e.target.value })} placeholder="e.g. President, Vice President, Secretary" required />
                                </div>
                              </div>

                              <div className="form-group">
                                <label>Permissions</label>
                                <PermissionPicker value={replaceForm.permissions} onChange={(permissions) => setReplaceForm((prev) => ({ ...prev, permissions }))} />
                              </div>

                              <div className="alert-box warning" style={{ marginBottom: '16px' }}>
                                <Icon name="alert" size={16} />
                                <span>
                                  The current holder (<strong>{bm.name}</strong>) loses portal access immediately. The new member receives a fresh invitation with temporary credentials.
                                </span>
                              </div>

                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="submit" disabled={replaceInviting} className="btn primary sm" style={{ background: '#d97706', borderColor: '#d97706', boxShadow: 'none' }}>
                                  {replaceInviting ? <><ButtonSpinner /> Replacing post…</> : <><Icon name="replace" size={13} /> Replace & send invitation</>}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setReplacingMemberId(null); setReplaceForm({ name: '', email: '', role: '', permissions: [] }); }}
                                  className="btn secondary sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
