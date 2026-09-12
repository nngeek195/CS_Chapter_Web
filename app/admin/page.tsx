'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ImageUploader from '@/components/ImageUploader';
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
} from '@/lib/types';
import {
  getSpotlight,
  updateSpotlight,
  getFacultyAdvisor,
  updateFacultyAdvisor,
  getEventCategories,
  addEventCategory,
  deleteEventCategory,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
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
} from '@/lib/firestore';
import { seedAllData } from '@/lib/seedData';

type Tab = 'spotlight' | 'advisor' | 'events' | 'leadership' | 'resources' | 'gallery' | 'messages';

const BATCH_OPTIONS = [
  '2021/2022 Batch',
  '2022/2023 Batch',
  '2023/2024 Batch',
  '2024/2025 Batch',
  '2025/2026 Batch',
  '2026/2027 Batch',
];

export default function AdminDashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('spotlight');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Data states
  const [spotlight, setSpotlight] = useState<SpotlightData | null>(null);
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

  // Load all data
  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        spotlightData,
        advisorData,
        categoriesData,
        eventsData,
        committeeData,
        pastData,
        resourcesData,
        galleryData,
        messagesData,
      ] = await Promise.all([
        getSpotlight(),
        getFacultyAdvisor(),
        getEventCategories(),
        getEvents(),
        getCommittee(),
        getPastCommittees(),
        getResources(),
        getGalleryPhotos(),
        getContactMessages(),
      ]);

      setSpotlight(spotlightData);
      setAdvisor(advisorData);
      setCategories(categoriesData);
      setEvents(eventsData);
      setCommittee(committeeData);
      setPastCommittees(pastData);
      setResources(resourcesData);
      setGallery(galleryData);
      setMessages(messagesData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      loadAll();
    }
  }, [user, authLoading]);

  const showToast = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 3500);
  };

  // 1. Spotlight Save
  const handleSpotlightSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotlight) return;
    try {
      await updateSpotlight(spotlight);
      showToast('Spotlight successfully updated!');
    } catch (err: any) {
      alert('Error updating spotlight: ' + err.message);
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
    setEditingEventId(ev.id);
    setEventForm(ev);
    window.scrollTo({ top: 300, behavior: 'smooth' });
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

  if (authLoading || (loading && !spotlight)) {
    return (
      <div className="admin-loading-screen">
        <div className="spinner"></div>
        <p style={{ marginTop: '16px', fontWeight: 600 }}>Loading Chapter Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Toast Notification */}
      {saveStatus && (
        <div className="admin-toast">
          <span>✅ {saveStatus}</span>
        </div>
      )}

      {/* Admin Top Header */}
      <header className="admin-topbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/admin" className="brand" style={{ gap: '10px' }}>
              <img src="/images/logo.png" alt="Logo" className="brand-logo" style={{ height: '32px' }} />
              <span className="brand-name" style={{ fontSize: '15px' }}>IEEE CS SUSL · Admin</span>
            </Link>
            <span className="admin-badge">Verified Manager</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={handleSeed} className="btn secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
              ⚡ Seed Initial Data
            </button>
            <Link href="/" target="_blank" className="btn secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
              Public Site ↗
            </Link>
            <button
              onClick={logout}
              className="btn primary"
              style={{ fontSize: '12px', padding: '6px 14px', background: '#dc2626', borderColor: '#dc2626' }}
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Navigation Tabs */}
      <div className="admin-tabs-bar">
        <div className="container">
          <nav className="admin-tabs">
            <button className={`admin-tab ${activeTab === 'spotlight' ? 'active' : ''}`} onClick={() => setActiveTab('spotlight')}>
              🌟 Spotlight
            </button>
            <button className={`admin-tab ${activeTab === 'advisor' ? 'active' : ''}`} onClick={() => setActiveTab('advisor')}>
              🎓 Faculty Advisor
            </button>
            <button className={`admin-tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
              📅 Events & Categories ({events.length})
            </button>
            <button className={`admin-tab ${activeTab === 'leadership' ? 'active' : ''}`} onClick={() => setActiveTab('leadership')}>
              👥 Leadership & Committees ({committee.length})
            </button>
            <button className={`admin-tab ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')}>
              📚 Resources ({resources.length})
            </button>
            <button className={`admin-tab ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveTab('gallery')}>
              🖼️ Gallery ({gallery.length})
            </button>
            <button className={`admin-tab ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
              📬 Inquiries ({messages.length})
              {messages.filter((m) => !m.read).length > 0 && (
                <span
                  style={{
                    marginLeft: '6px',
                    background: '#dc2626',
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '1px 7px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {messages.filter((m) => !m.read).length} new
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      <div className="container" style={{ padding: '36px 0 80px' }}>
        {/* ==================================================== */}
        {/* TAB 1: SPOTLIGHT */}
        {/* ==================================================== */}
        {activeTab === 'spotlight' && spotlight && (
          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>Featured Spotlight</h2>
              <p>Controls the hero card under "One strong spotlight, not an event dump" on the home page.</p>
            </div>

            <form onSubmit={handleSpotlightSave} className="admin-form">
              <div className="form-group">
                <label>Date Tag / Chip</label>
                <input
                  type="text"
                  value={spotlight.tag}
                  onChange={(e) => setSpotlight({ ...spotlight, tag: e.target.value })}
                  placeholder="Flagship Series · 2026"
                  required
                />
              </div>

              <div className="form-group">
                <label>Spotlight Title</label>
                <input
                  type="text"
                  value={spotlight.title}
                  onChange={(e) => setSpotlight({ ...spotlight, title: e.target.value })}
                  placeholder="Annual Tech Talk & Hackathon Series"
                  required
                />
              </div>

              <div className="form-group">
                <label>Spotlight Description</label>
                <textarea
                  rows={3}
                  value={spotlight.description}
                  onChange={(e) => setSpotlight({ ...spotlight, description: e.target.value })}
                  placeholder="Brief synopsis of the featured flagship event..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Spotlight Image (Upload to Cloudinary)</label>
                <ImageUploader
                  currentImage={spotlight.image}
                  onUpload={(url) => setSpotlight({ ...spotlight, image: url })}
                />
              </div>

              <div className="form-group">
                <label>Target Link (optional)</label>
                <input
                  type="text"
                  value={spotlight.link || ''}
                  onChange={(e) => setSpotlight({ ...spotlight, link: e.target.value })}
                  placeholder="/events"
                />
              </div>

              <button type="submit" className="btn primary" style={{ marginTop: '12px' }}>
                Save Spotlight Changes
              </button>
            </form>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: FACULTY ADVISOR */}
        {/* ==================================================== */}
        {activeTab === 'advisor' && advisor && (
          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>Faculty Advisor & Senior Lecturer</h2>
              <p>Controls the "People first" advisor section shown on the Landing page and Leadership page.</p>
            </div>

            <form onSubmit={handleAdvisorSave} className="admin-form">
              <div className="grid g2">
                <div className="form-group">
                  <label>Full Name & Honorific</label>
                  <input
                    type="text"
                    value={advisor.name}
                    onChange={(e) => setAdvisor({ ...advisor, name: e.target.value })}
                    placeholder="Dr. / Senior Lecturer Name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Designation / Title</label>
                  <input
                    type="text"
                    value={advisor.title}
                    onChange={(e) => setAdvisor({ ...advisor, title: e.target.value })}
                    placeholder="Faculty Advisor"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Department & Faculty</label>
                <input
                  type="text"
                  value={advisor.department}
                  onChange={(e) => setAdvisor({ ...advisor, department: e.target.value })}
                  placeholder="Department of Computing & Information Systems"
                  required
                />
              </div>

              <div className="form-group">
                <label>Biography & Guidance Details</label>
                <textarea
                  rows={4}
                  value={advisor.bio}
                  onChange={(e) => setAdvisor({ ...advisor, bio: e.target.value })}
                  placeholder="2–3 line bio and role description..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Advisor Photo (Upload to Cloudinary)</label>
                <ImageUploader
                  currentImage={advisor.image || ''}
                  onUpload={(url) => setAdvisor({ ...advisor, image: url })}
                />
              </div>

              <div className="grid g2">
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={advisor.email || ''}
                    onChange={(e) => setAdvisor({ ...advisor, email: e.target.value })}
                    placeholder="ieeecs@sab.ac.lk"
                  />
                </div>

                <div className="form-group">
                  <label>LinkedIn Profile URL</label>
                  <input
                    type="url"
                    value={advisor.linkedin || ''}
                    onChange={(e) => setAdvisor({ ...advisor, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>

              <button type="submit" className="btn primary" style={{ marginTop: '12px' }}>
                Save Faculty Advisor Details
              </button>
            </form>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: EVENTS & CATEGORIES */}
        {/* ==================================================== */}
        {activeTab === 'events' && (
          <div className="admin-panel">
            {/* Manage Categories */}
            <div className="admin-subcard" style={{ marginBottom: '32px' }}>
              <h3>Manage Event Categories</h3>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>
                Add or remove filtering categories displayed in the Events archive.
              </p>

              <div className="admin-tag-cloud" style={{ margin: '18px 0' }}>
                {categories.map((c) => (
                  <div key={c.id} className="admin-chip">
                    <span>{c.label} ({c.key})</span>
                    {c.key !== 'all' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c.id, c.label)}
                        className="admin-chip-del"
                        title="Remove category"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddCategory} className="grid g3" style={{ alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Category Key (lowercase)</label>
                  <input
                    type="text"
                    placeholder="e.g. workshop"
                    value={newCatKey}
                    onChange={(e) => setNewCatKey(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Display Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Workshop"
                    value={newCatLabel}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn secondary" style={{ height: '44px' }}>
                  + Add Category
                </button>
              </form>
            </div>

            {/* Create or Edit Event */}
            <div className="admin-panel-head">
              <h2>{editingEventId ? 'Edit Event' : 'Create New Event'}</h2>
              <p>Controlled dynamically across the Events page and Home spotlights.</p>
            </div>

            <form onSubmit={handleEventSubmit} className="admin-form" style={{ marginBottom: '40px' }}>
              <div className="grid g2">
                <div className="form-group">
                  <label>Event Title</label>
                  <input
                    type="text"
                    value={eventForm.title || ''}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    placeholder="e.g. Technical Workshop Series"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={eventForm.type || 'upcoming'}
                    onChange={(e) => {
                      const selectedKey = e.target.value;
                      const matched = categories.find((c) => c.key === selectedKey);
                      setEventForm({
                        ...eventForm,
                        type: selectedKey,
                        typeLabel: matched ? matched.label : selectedKey,
                      });
                    }}
                    required
                  >
                    {categories
                      .filter((c) => c.key !== 'all')
                      .map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid g2">
                <div className="form-group">
                  <label>Event Date or Timeline</label>
                  <input
                    type="text"
                    value={eventForm.date || ''}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    placeholder="e.g. March 2026 or 24-25 May 2026"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Registration / External Link (optional)</label>
                  <input
                    type="text"
                    value={eventForm.link || ''}
                    onChange={(e) => setEventForm({ ...eventForm, link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Event Description</label>
                <textarea
                  rows={3}
                  value={eventForm.description || ''}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Comprehensive event details, takeaways, and speaker info..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Banner Image (Upload via Cloudinary)</label>
                <ImageUploader
                  currentImage={eventForm.image || ''}
                  onUpload={(url) => setEventForm({ ...eventForm, image: url })}
                />
              </div>

              <div className="form-group">
                <label>Tags (comma separated)</label>
                <input
                  type="text"
                  value={eventForm.tags?.join(', ') || ''}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      tags: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="CS, Workshop, AI/ML"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn primary">
                  {editingEventId ? 'Update Event' : 'Publish Event →'}
                </button>
                {editingEventId && (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
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
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>

            {/* Existing Events List */}
            <div className="admin-list-table">
              <h3 style={{ marginBottom: '16px' }}>Existing Events ({events.length})</h3>
              <div className="admin-grid-cards">
                {events.map((ev) => (
                  <div key={ev.id} className="admin-item-card">
                    <img src={ev.image} alt={ev.title} className="admin-card-thumb" />
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--blue)', fontWeight: 600 }}>
                        <span>{ev.date}</span>
                        <span className="mono">{ev.typeLabel}</span>
                      </div>
                      <h4 style={{ margin: '8px 0 6px', fontSize: '17px' }}>{ev.title}</h4>
                      <p style={{ fontSize: '13px', color: 'var(--muted)', flex: 1 }}>{ev.description}</p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button onClick={() => handleEditEvent(ev)} className="btn secondary" style={{ fontSize: '12px', padding: '5px 10px' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteEvent(ev.id)} className="btn secondary" style={{ fontSize: '12px', padding: '5px 10px', color: '#dc2626' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: LEADERSHIP & COMMITTEES */}
        {/* ==================================================== */}
        {activeTab === 'leadership' && (
          <div className="admin-panel">
            {/* End Year Committee Feature Banner */}
            <div className="admin-alert-banner">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Executive Committee Term Management</h3>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                  When completing a leadership term, click to archive the current committee to "Honoring alumni contributions"
                  and begin registration for the next batch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEndModal(true)}
                className="btn primary"
                style={{ background: '#FF6C0C', borderColor: '#FF6C0C', whiteSpace: 'nowrap' }}
              >
                🏁 End Current Year Committee
              </button>
            </div>

            {/* End Committee Confirmation Modal */}
            {showEndModal && (
              <div className="admin-modal-overlay">
                <div className="admin-modal">
                  <h3>End Current Year Committee</h3>
                  <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--muted)' }}>
                    All <strong>{committee.length} current active members</strong> will be packaged and moved into
                    the <strong>Honoring alumni contributions</strong> accordion with their names and roles.
                  </p>

                  <div className="form-group" style={{ margin: '20px 0' }}>
                    <label>Archived Committee Label / Year</label>
                    <input
                      type="text"
                      value={endYearPrompt}
                      onChange={(e) => setEndYearPrompt(e.target.value)}
                      placeholder="e.g. 2024 / 2025 Committee"
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button type="button" className="btn secondary" onClick={() => setShowEndModal(false)}>
                      Cancel
                    </button>
                    <button type="button" className="btn primary" onClick={handleEndCommittee} style={{ background: '#FF6C0C', borderColor: '#FF6C0C' }}>
                      Confirm & Archive Committee
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add / Edit Member Form */}
            <div className="admin-panel-head" style={{ marginTop: '36px' }}>
              <h2>{editingMemberId ? 'Edit Committee Member' : 'Add Current Committee Member'}</h2>
              <p>Under one user collect image, name, department, and batch.</p>
            </div>

            <form onSubmit={handleCommitteeSubmit} className="admin-form" style={{ marginBottom: '40px' }}>
              <div className="grid g2">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={committeeForm.name || ''}
                    onChange={(e) => setCommitteeForm({ ...committeeForm, name: e.target.value })}
                    placeholder="e.g. Naveen Fernando"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Executive Role</label>
                  <input
                    type="text"
                    value={committeeForm.role || ''}
                    onChange={(e) => setCommitteeForm({ ...committeeForm, role: e.target.value })}
                    placeholder="e.g. President / Vice President / Secretary"
                    required
                  />
                </div>
              </div>

              <div className="grid g2">
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={committeeForm.department || ''}
                    onChange={(e) => setCommitteeForm({ ...committeeForm, department: e.target.value })}
                    placeholder="Computing & Information Systems"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Batch (Select or Type)</label>
                  <select
                    value={committeeForm.batch || '2023/2024 Batch'}
                    onChange={(e) => setCommitteeForm({ ...committeeForm, batch: e.target.value })}
                  >
                    {BATCH_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Member Photo (Upload to Cloudinary)</label>
                <ImageUploader
                  currentImage={committeeForm.image || ''}
                  onUpload={(url) => setCommitteeForm({ ...committeeForm, image: url })}
                />
              </div>

              <div className="grid g2">
                <div className="form-group">
                  <label>LinkedIn URL (optional)</label>
                  <input
                    type="url"
                    value={committeeForm.linkedin || ''}
                    onChange={(e) => setCommitteeForm({ ...committeeForm, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>

                <div className="form-group">
                  <label>Email Address (optional)</label>
                  <input
                    type="email"
                    value={committeeForm.email || ''}
                    onChange={(e) => setCommitteeForm({ ...committeeForm, email: e.target.value })}
                    placeholder="member@sab.ac.lk"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn primary">
                  {editingMemberId ? 'Update Member' : '+ Add Committee Member'}
                </button>
                {editingMemberId && (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
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
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>

            {/* Current Executive Roster */}
            <h3 style={{ marginBottom: '16px' }}>Current Active Committee ({committee.length})</h3>
            <div className="admin-grid-cards" style={{ marginBottom: '44px' }}>
              {committee.map((m) => (
                <div key={m.id} className="admin-item-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                    {m.image ? (
                      <img src={m.image} alt={m.name} style={{ width: '48px', height: '48px', borderRadius: '999px', objectFit: 'cover' }} />
                    ) : (
                      <div className="person-avatar" style={{ width: '48px', height: '48px', fontSize: '15px' }}>
                        {m.initials}
                      </div>
                    )}
                    <div>
                      <h4 style={{ margin: 0, fontSize: '17px' }}>{m.name}</h4>
                      <div style={{ color: 'var(--blue)', fontSize: '13px', fontWeight: 600 }}>{m.role}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 6px' }}>{m.department}</p>
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--ink)' }}>{m.batch}</div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button onClick={() => handleEditMember(m)} className="btn secondary" style={{ fontSize: '12px', padding: '4px 10px' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDeleteMember(m.id)} className="btn secondary" style={{ fontSize: '12px', padding: '4px 10px', color: '#dc2626' }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Past Committees Archive Management */}
            <div className="admin-subcard">
              <h3>Past Leadership Archives</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                Honoring alumni contributions. The public site displays the 3 latest years by default with an "Explore More" option.
              </p>

              <form onSubmit={handleAddPastCommittee} className="admin-form" style={{ margin: '20px 0' }}>
                <div className="form-group">
                  <label>Committee Year Title</label>
                  <input
                    type="text"
                    placeholder="e.g. 2024 / 2025 Committee"
                    value={newPastYear}
                    onChange={(e) => setNewPastYear(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Members (one per line, e.g. "President: Malith Bandara")</label>
                  <textarea
                    rows={4}
                    placeholder={`President: Malith Bandara\nVice President: Hasini Wickramasinghe\nSecretary: Anuki Jayasundara`}
                    value={newPastMembersText}
                    onChange={(e) => setNewPastMembersText(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn secondary">
                  + Add Past Committee Record
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                {pastCommittees.map((pc) => (
                  <div key={pc.id} className="surface" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px' }}>{pc.year}</h4>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                        {pc.members.length} members recorded
                      </p>
                    </div>
                    <button onClick={() => handleDeletePastCommittee(pc.id)} className="btn secondary" style={{ fontSize: '12px', color: '#dc2626' }}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 5: RESOURCES */}
        {/* ==================================================== */}
        {activeTab === 'resources' && (
          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>{editingResId ? 'Edit Resource' : 'Add Knowledge Resource'}</h2>
              <p>Curated learning materials, cheat sheets, and guides. Public site shows 6 at a time with "Explore More".</p>
            </div>

            <form onSubmit={handleResourceSubmit} className="admin-form" style={{ marginBottom: '40px' }}>
              <div className="grid g2">
                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={resourceForm.category || ''}
                    onChange={(e) => setResourceForm({ ...resourceForm, category: e.target.value })}
                    placeholder="Workshop Kit / AI & Data Science / Research"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Resource Title</label>
                  <input
                    type="text"
                    value={resourceForm.title || ''}
                    onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                    placeholder="e.g. Competitive Programming Cheat Sheet"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={resourceForm.description || ''}
                  onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                  placeholder="Summary of topics, code libraries, and tools covered..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Resource File or External Link</label>
                <input
                  type="text"
                  value={resourceForm.link || ''}
                  onChange={(e) => setResourceForm({ ...resourceForm, link: e.target.value })}
                  placeholder="https://..."
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn primary">
                  {editingResId ? 'Update Resource' : '+ Add Resource'}
                </button>
                {editingResId && (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      setEditingResId(null);
                      setResourceForm({
                        category: 'Workshop Kit',
                        title: '',
                        description: '',
                        link: '#',
                      });
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>

            <h3>Existing Knowledge Resources ({resources.length})</h3>
            <div className="admin-grid-cards" style={{ marginTop: '16px' }}>
              {resources.map((res) => (
                <div key={res.id} className="admin-item-card" style={{ padding: '20px' }}>
                  <div className="mono" style={{ color: 'var(--blue)', fontSize: '11px', marginBottom: '8px' }}>
                    {res.category}
                  </div>
                  <h4 style={{ margin: '0 0 8px', fontSize: '17px' }}>{res.title}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', flex: 1 }}>{res.description}</p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button
                      onClick={() => {
                        setEditingResId(res.id);
                        setResourceForm(res);
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      className="btn secondary"
                      style={{ fontSize: '12px', padding: '4px 10px' }}
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDeleteResource(res.id)} className="btn secondary" style={{ fontSize: '12px', padding: '4px 10px', color: '#dc2626' }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 6: GALLERY */}
        {/* ==================================================== */}
        {activeTab === 'gallery' && (
          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>Chapter Photo Gallery</h2>
              <p>Upload photos via Cloudinary. Public gallery displays 6 at a time with "Explore More Moments".</p>
            </div>

            <form onSubmit={handleGallerySubmit} className="admin-form" style={{ marginBottom: '40px' }}>
              <div className="form-group">
                <label>Photo Caption / Title</label>
                <input
                  type="text"
                  value={galleryForm.caption || ''}
                  onChange={(e) => setGalleryForm({ ...galleryForm, caption: e.target.value })}
                  placeholder="e.g. Hands-on Machine Learning Workshop"
                  required
                />
              </div>

              <div className="form-group">
                <label>Alt Text (for accessibility)</label>
                <input
                  type="text"
                  value={galleryForm.alt || ''}
                  onChange={(e) => setGalleryForm({ ...galleryForm, alt: e.target.value })}
                  placeholder="Students collaborating at Sabaragamuwa University..."
                />
              </div>

              <div className="form-group">
                <label>Select Photo (Upload via Cloudinary)</label>
                <ImageUploader
                  currentImage={galleryForm.src || ''}
                  onUpload={(url) => setGalleryForm({ ...galleryForm, src: url })}
                />
              </div>

              <button type="submit" className="btn primary">
                + Add to Gallery
              </button>
            </form>

            <h3>Uploaded Gallery Photos ({gallery.length})</h3>
            <div className="admin-grid-cards" style={{ marginTop: '16px' }}>
              {gallery.map((g) => (
                <div key={g.id} className="admin-item-card">
                  <img src={g.src} alt={g.alt} className="admin-card-thumb" style={{ height: '180px' }} />
                  <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <p style={{ fontWeight: 600, fontSize: '14px', margin: '0 0 12px', flex: 1 }}>{g.caption}</p>
                    <button onClick={() => handleDeleteGalleryPhoto(g.id)} className="btn secondary" style={{ fontSize: '12px', color: '#dc2626' }}>
                      Delete Photo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 7: INQUIRIES & CONTACT MESSAGES */}
        {/* ==================================================== */}
        {activeTab === 'messages' && (
          <div className="admin-panel">
            <div className="admin-panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2>Contact Inquiries ({messages.length})</h2>
                <p>Messages received from students, researchers, faculty, and partners through the Contact Us form.</p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                  {messages.filter((m) => !m.read).length} Unread
                </span>
                <span style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                  {messages.length} Total
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search by sender name, email, or subject..."
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
                style={{ flex: 1, minWidth: '240px', padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--paper)' }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['all', 'unread', 'read'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setMessageFilter(f)}
                    className="btn secondary"
                    style={{
                      fontSize: '12px',
                      padding: '8px 16px',
                      textTransform: 'capitalize',
                      background: messageFilter === f ? 'var(--blue)' : undefined,
                      color: messageFilter === f ? '#fff' : undefined,
                      borderColor: messageFilter === f ? 'var(--blue)' : undefined,
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages list */}
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
                  <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--line)', borderRadius: '16px', background: 'var(--paper)' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>📬</div>
                    <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No inquiries found</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '420px', margin: '0 auto' }}>
                      {messages.length === 0
                        ? 'No contact messages have been received yet. When visitors submit the Contact Us form, their inquiries will appear here.'
                        : 'No messages matched your current search or filter criteria.'}
                    </p>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filtered.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        background: msg.read ? 'var(--paper)' : '#fff',
                        border: msg.read ? '1px solid var(--line)' : '2px solid rgba(0, 98, 155, 0.4)',
                        boxShadow: msg.read ? 'none' : '0 4px 18px rgba(0, 98, 155, 0.08)',
                        borderRadius: '16px',
                        padding: '24px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '3px 10px',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                background: msg.read ? 'rgba(0,0,0,0.06)' : '#dbeafe',
                                color: msg.read ? 'var(--muted)' : '#1e40af',
                              }}
                            >
                              {!msg.read && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb' }}></span>}
                              {msg.read ? 'Read' : 'New Inquiry'}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                              {new Date(msg.createdAt).toLocaleString('en-US', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>

                          <h3 style={{ fontSize: '18px', marginTop: '8px', color: 'var(--ink)' }}>
                            {msg.subject || '(No Subject)'}
                          </h3>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <a
                            href={`mailto:${msg.email}?subject=${encodeURIComponent(`Re: ${msg.subject || 'IEEE CS Inquiry'}`)}`}
                            className="btn primary"
                            style={{ fontSize: '12px', padding: '6px 14px' }}
                          >
                            ✉️ Reply
                          </a>
                          <button
                            onClick={() => handleToggleMessageRead(msg.id, msg.read)}
                            className="btn secondary"
                            style={{ fontSize: '12px', padding: '6px 14px' }}
                          >
                            {msg.read ? 'Mark Unread' : 'Mark as Read'}
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="btn secondary"
                            style={{ fontSize: '12px', padding: '6px 12px', color: '#dc2626' }}
                            title="Delete Inquiry"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '16px',
                          padding: '10px 16px',
                          background: 'rgba(0, 98, 155, 0.04)',
                          borderRadius: '10px',
                          marginBottom: '16px',
                          fontSize: '13px',
                        }}
                      >
                        <div>
                          <strong style={{ color: 'var(--muted)', marginRight: '6px' }}>Sender:</strong>
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{msg.name}</span>
                        </div>
                        <div>
                          <strong style={{ color: 'var(--muted)', marginRight: '6px' }}>Email:</strong>
                          <a href={`mailto:${msg.email}`} style={{ color: 'var(--blue)', textDecoration: 'underline' }}>
                            {msg.email}
                          </a>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '16px 20px',
                          background: 'var(--white)',
                          border: '1px solid var(--line)',
                          borderRadius: '12px',
                          fontSize: '14px',
                          lineHeight: '1.7',
                          color: 'var(--ink)',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
