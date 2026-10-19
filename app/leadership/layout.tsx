import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leadership',
  description:
    'Meet the Faculty Advisor, Executive Committee, and past leadership teams guiding the IEEE Computer Society Chapter at Sabaragamuwa University of Sri Lanka',
  alternates: {
    canonical: '/leadership',
  },
  openGraph: {
    title: 'Leadership | IEEE CS SUSL',
    description:
      'Meet the Faculty Advisor, Executive Committee, and past leadership teams guiding the IEEE Computer Society Chapter at Sabaragamuwa University of Sri Lanka',
    url: '/leadership',
  },
};

export default function LeadershipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
