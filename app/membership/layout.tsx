import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Membership',
  description:
    'Join the IEEE Computer Society Chapter at Sabaragamuwa University of Sri Lanka to connect with fellow students and professionals in the field of computer science.',
  alternates: {
    canonical: '/membership',
  },
  openGraph: {
    title: 'Membership | IEEE CS SUSL',
    description:
      'Join the IEEE Computer Society Chapter at Sabaragamuwa University of Sri Lanka to connect with fellow students and professionals in the field of computer science.',
    url: '/membership',
  },
};

export default function MembershipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
