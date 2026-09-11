import {
  SpotlightData,
  FacultyAdvisorData,
  EventItem,
  EventCategory,
  CommitteeMember,
  PastCommittee,
  ResourceItem,
  GalleryPhoto,
} from './types';
import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

export const INITIAL_SPOTLIGHT: SpotlightData = {
  tag: 'Flagship Series · 2026',
  title: 'Annual Tech Talk & Hackathon Series',
  description:
    'Bringing leading tech practitioners, researchers, and alumni together for practical keynotes, live coding demos, and project showcases.',
  image:
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1800&q=82',
  link: '/events',
};

export const INITIAL_ADVISOR: FacultyAdvisorData = {
  name: 'Dr. / Senior Lecturer',
  title: 'Faculty Advisor',
  department: 'Department of Computing & Information Systems',
  bio:
    'Guiding the student chapter with strategic vision, academic rigor, and mentorship. Bridging university research initiatives with international IEEE standards and industry relations.',
  initials: 'FA',
  email: 'ieeecs@sab.ac.lk',
  linkedin: 'https://linkedin.com',
};

export const INITIAL_CATEGORIES: EventCategory[] = [
  { id: 'cat-all', key: 'all', label: 'All' },
  { id: 'cat-upcoming', key: 'upcoming', label: 'Upcoming' },
  { id: 'cat-past', key: 'past', label: 'Past' },
  { id: 'cat-flagship', key: 'flagship', label: 'Flagship' },
];

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: '1',
    type: 'upcoming',
    typeLabel: 'Workshop',
    date: 'March 2026',
    title: 'Technical Workshop Series',
    description:
      'Hands-on practical sessions in AI/ML, modern web frameworks, cloud deployment, and developer tooling.',
    image:
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=82',
    tags: ['Chapter', 'CS', 'Workshop'],
  },
  {
    id: '2',
    type: 'flagship',
    typeLabel: 'Flagship',
    date: 'May 2026',
    title: 'SUSL Annual Hackathon',
    description:
      'Competitive 24-hour sprint where student teams solve pressing industry and community challenges.',
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=82',
    tags: ['Hackathon', 'Flagship', 'Coding'],
  },
  {
    id: '3',
    type: 'upcoming',
    typeLabel: 'Talk series',
    date: 'April 2026',
    title: 'Tech Talk Series',
    description:
      'Inviting global practitioners, alumni in top tech companies, and academic researchers for insightful AMA sessions.',
    image:
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=82',
    tags: ['Talks', 'Webinar', 'Alumni'],
  },
  {
    id: '4',
    type: 'past',
    typeLabel: 'Competition',
    date: 'October 2025',
    title: 'IEEEXtreme 19.0 Participation',
    description:
      'Over 20 SUSL teams tackled 24 hours of grueling competitive programming, setting new national benchmarks.',
    image:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=82',
    tags: ['IEEEXtreme', 'Past', 'Global'],
  },
  {
    id: '5',
    type: 'past',
    typeLabel: 'Challenge',
    date: 'August 2025',
    title: 'CSIDC / Chapter Innovation Challenge',
    description:
      'Design and software competition centered around social good, healthcare, and sustainable development goals.',
    image:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=82',
    tags: ['CSIDC', 'Innovation', 'Past'],
  },
  {
    id: '6',
    type: 'flagship',
    typeLabel: 'Flagship',
    date: 'December 2025',
    title: 'Annual Chapter Showcase Day',
    description:
      'Celebration of undergraduate research, member milestones, capstone exhibitions, and annual chapter awards.',
    image:
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=82',
    tags: ['Showcase', 'Celebration', 'Awards'],
  },
];

export const INITIAL_COMMITTEE: CommitteeMember[] = [
  {
    id: 'cm-1',
    initials: 'P',
    name: 'Naveen Fernando',
    role: 'President',
    department: 'Computing & Information Systems',
    batch: '2022/2023 Batch',
    order: 1,
  },
  {
    id: 'cm-2',
    initials: 'VP',
    name: 'Chamodi Rajapakse',
    role: 'Vice President',
    department: 'Software Engineering',
    batch: '2022/2023 Batch',
    order: 2,
  },
  {
    id: 'cm-3',
    initials: 'S',
    name: 'Kavindu Dilshan',
    role: 'Secretary',
    department: 'Computing & Information Systems',
    batch: '2023/2024 Batch',
    order: 3,
  },
  {
    id: 'cm-4',
    initials: 'VS',
    name: 'Tharushi Silva',
    role: 'Vice Secretary',
    department: 'Physical Sciences & Technology',
    batch: '2023/2024 Batch',
    order: 4,
  },
  {
    id: 'cm-5',
    initials: 'T',
    name: 'Janith Senaratne',
    role: 'Treasurer',
    department: 'Software Engineering',
    batch: '2022/2023 Batch',
    order: 5,
  },
  {
    id: 'cm-6',
    initials: 'PV',
    name: 'Nisal Bandara',
    role: 'Public Visibility Chair',
    department: 'Computing & Information Systems',
    batch: '2023/2024 Batch',
    order: 6,
  },
];

export const INITIAL_PAST_COMMITTEES: PastCommittee[] = [
  {
    id: 'pc-2024-2025',
    year: '2024 / 2025',
    members: [
      'President: Malith Bandara',
      'Vice President: Hasini Wickramasinghe',
      'Secretary: Anuki Jayasundara',
      'Treasurer: Kasun Perera',
      'Public Visibility Chair: Shenal Dias',
    ],
    createdAt: 20250101,
  },
  {
    id: 'pc-2023-2024',
    year: '2023 / 2024',
    members: [
      'President: Dineth Gunawardena',
      'Vice President: Kaveesha Rodrigo',
      'Secretary: Lakshan Senanayake',
      'Treasurer: Nuwantha Ekanayake',
      'Editor / Webmaster: Tharindu Weerasinghe',
    ],
    createdAt: 20240101,
  },
  {
    id: 'pc-2022-2023',
    year: '2022 / 2023',
    members: [
      'President: Roshen Silva',
      'Vice President: Dilshan Perera',
      'Secretary: Chamathka Fernando',
      'Treasurer: Mihiran Jayawardena',
    ],
    createdAt: 20230101,
  },
  {
    id: 'pc-2021-2022',
    year: '2021 / 2022',
    members: [
      'President: Tharaka Bandara',
      'Secretary: Sanduni Gamage',
      'Treasurer: Janith Wijesinghe',
    ],
    createdAt: 20220101,
  },
];

export const INITIAL_RESOURCES: ResourceItem[] = [
  {
    id: 'res-1',
    category: 'Workshop Kit',
    title: 'Full-Stack Web Development Handbook',
    description:
      'Modern guide covering Next.js, TypeScript, REST & GraphQL APIs, and Docker deployments.',
    link: '#',
    createdAt: 1,
  },
  {
    id: 'res-2',
    category: 'IEEEXtreme Prep',
    title: 'Competitive Programming Cheat Sheet',
    description:
      'Data structures, graph algorithms, dynamic programming templates, and practice problem sets.',
    link: '#',
    createdAt: 2,
  },
  {
    id: 'res-3',
    category: 'AI & Data Science',
    title: 'Machine Learning Fundamentals & PyTorch',
    description:
      'Introductory notebook collection covering supervised learning, neural networks, and model evaluation.',
    link: '#',
    createdAt: 3,
  },
  {
    id: 'res-4',
    category: 'Research',
    title: 'IEEE Research Paper Writing Guide',
    description:
      'LaTeX templates, citation standards, writing abstracts, and submitting to IEEE conferences.',
    link: '#',
    createdAt: 4,
  },
  {
    id: 'res-5',
    category: 'Open Source',
    title: 'Git & GitHub Workflow for Teams',
    description:
      'Branching strategies, pull request etiquette, continuous integration, and collaborative development.',
    link: '#',
    createdAt: 5,
  },
  {
    id: 'res-6',
    category: 'Cloud & DevOps',
    title: 'Cloud Architecture & Microservices',
    description:
      'Introduction to containerization, serverless functions, and deploying resilient cloud applications.',
    link: '#',
    createdAt: 6,
  },
  {
    id: 'res-7',
    category: 'Cybersecurity',
    title: 'Application Security & OWASP Top 10',
    description:
      'Practical vulnerabilities, defense strategies, penetration testing basics, and authentication best practices.',
    link: '#',
    createdAt: 7,
  },
  {
    id: 'res-8',
    category: 'Mobile Dev',
    title: 'Cross-Platform App Development Kit',
    description:
      'React Native and Flutter architecture patterns, state management, offline caching, and store deployment.',
    link: '#',
    createdAt: 8,
  },
];

export const INITIAL_GALLERY: GalleryPhoto[] = [
  {
    id: 'gal-1',
    src: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=82',
    alt: 'Students collaborating during technical workshop',
    caption: 'Collaborative Problem Solving Session',
    createdAt: 1,
  },
  {
    id: 'gal-2',
    src: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=82',
    alt: 'Hands-on coding lab at Sabaragamuwa University',
    caption: 'Hands-on Coding Lab',
    createdAt: 2,
  },
  {
    id: 'gal-3',
    src: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=82',
    alt: 'Tech Talk keynote presentation',
    caption: 'Guest Speaker Keynote & Discussion',
    createdAt: 3,
  },
  {
    id: 'gal-4',
    src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=82',
    alt: 'Hackathon team sprinting through the night',
    caption: 'IEEEXtreme Hackathon Team Sprint',
    createdAt: 4,
  },
  {
    id: 'gal-5',
    src: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=82',
    alt: 'Chapter annual showcase and awards',
    caption: 'Annual Chapter Showcase & Awards',
    createdAt: 5,
  },
  {
    id: 'gal-6',
    src: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=82',
    alt: 'Workshop participants sharing demo code',
    caption: 'Participant Demo & Knowledge Exchange',
    createdAt: 6,
  },
  {
    id: 'gal-7',
    src: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=82',
    alt: 'Students analyzing code together',
    caption: 'Algorithm Optimization Round',
    createdAt: 7,
  },
  {
    id: 'gal-8',
    src: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=82',
    alt: 'Chapter delegation celebration',
    caption: 'National IEEE CS Congress Delegates',
    createdAt: 8,
  },
];

export async function seedAllData(): Promise<{ success: boolean; message: string }> {
  try {
    const batch = writeBatch(db);

    // 1. Spotlight
    const spotlightRef = doc(db, 'site_settings', 'spotlight');
    batch.set(spotlightRef, { ...INITIAL_SPOTLIGHT, updatedAt: Date.now() });

    // 2. Advisor
    const advisorRef = doc(db, 'site_settings', 'advisor');
    batch.set(advisorRef, { ...INITIAL_ADVISOR, updatedAt: Date.now() });

    // 3. Categories
    for (const cat of INITIAL_CATEGORIES) {
      batch.set(doc(db, 'event_categories', cat.id), cat);
    }

    // 4. Events
    for (const evt of INITIAL_EVENTS) {
      batch.set(doc(db, 'events', evt.id), { ...evt, createdAt: Date.now() });
    }

    // 5. Committee
    for (const member of INITIAL_COMMITTEE) {
      batch.set(doc(db, 'leadership', member.id), member);
    }

    // 6. Past Committees
    for (const pc of INITIAL_PAST_COMMITTEES) {
      batch.set(doc(db, 'past_committees', pc.id), pc);
    }

    // 7. Resources
    for (const res of INITIAL_RESOURCES) {
      batch.set(doc(db, 'resources', res.id), res);
    }

    // 8. Gallery
    for (const gal of INITIAL_GALLERY) {
      batch.set(doc(db, 'gallery', gal.id), gal);
    }

    await batch.commit();
    return { success: true, message: 'All initial chapter data seeded successfully into Firestore!' };
  } catch (err: any) {
    console.error('Failed to seed data to Firestore:', err);
    return { success: false, message: err?.message || 'Failed to seed data' };
  }
}
