import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Events',
  description:
    'Upcoming events, past events, and flagship chapter activities of IEEE Computer Society Chapter at Sabaragamuwa University of Sri Lanka.',
  openGraph: {
    title: 'Events — IEEE CS SUSL',
    description:
      'Upcoming events, past events, and flagship chapter activities of IEEE Computer Society Chapter at Sabaragamuwa University of Sri Lanka.',
  },
};

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
