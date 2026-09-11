export interface SpotlightData {
  id?: string;
  tag: string;
  title: string;
  description: string;
  image: string;
  link?: string;
  updatedAt?: number;
}

export interface FacultyAdvisorData {
  id?: string;
  name: string;
  title: string;
  department: string;
  bio: string;
  image?: string;
  initials?: string;
  linkedin?: string;
  email?: string;
  updatedAt?: number;
}

export interface EventItem {
  id: string;
  type: string; // 'upcoming' | 'past' | 'flagship' or custom category key
  typeLabel: string;
  date: string;
  title: string;
  description: string;
  image: string;
  tags: string[];
  link?: string;
  createdAt?: number;
}

export interface EventCategory {
  id: string;
  key: string; // e.g. 'upcoming', 'past', 'flagship', 'workshop'
  label: string; // e.g. 'Upcoming', 'Past', 'Flagship', 'Workshop'
}

export interface CommitteeMember {
  id: string;
  name: string;
  role: string;
  department: string;
  batch: string; // e.g. '2022/2023 Batch', '2023/2024 Batch'
  image?: string;
  initials?: string;
  linkedin?: string;
  email?: string;
  order?: number;
}

export interface PastCommittee {
  id: string;
  year: string; // e.g. '2024 / 2025', '2023 / 2024'
  members: string[]; // e.g. ['President: Malith Bandara', 'Vice President: Hasini Wickramasinghe']
  createdAt?: number;
}

export interface ResourceItem {
  id: string;
  category: string;
  title: string;
  description: string;
  link: string;
  createdAt?: number;
}

export interface GalleryPhoto {
  id: string;
  src: string;
  alt: string;
  caption: string;
  createdAt?: number;
}
