import type { Metadata } from 'next';

const DESCRIPTION =
  'Join the organising committees behind IEEE Computer Society SUSL Chapter events. Browse open volunteer calls and apply for the roles that suit you.';

export const metadata: Metadata = {
  title: 'Volunteer',
  description: DESCRIPTION,
  alternates: {
    canonical: '/volunteer',
  },
  openGraph: {
    title: 'Volunteer | IEEE CS SUSL',
    description: DESCRIPTION,
    url: '/volunteer',
  },
};

export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
