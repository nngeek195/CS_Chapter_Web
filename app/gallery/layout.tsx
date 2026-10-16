import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gallery',
  description:
    'Moments in action — Snapshots and photo archive of workshops, hackathons, speaker sessions, and chapter milestones of IEEE CS SUSL.',
  alternates: {
    canonical: '/gallery',
  },
  openGraph: {
    title: 'Gallery | IEEE CS SUSL',
    description:
      'Moments in action — Snapshots and photo archive of workshops, hackathons, speaker sessions, and chapter milestones of IEEE CS SUSL.',
    url: '/gallery',
  },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
