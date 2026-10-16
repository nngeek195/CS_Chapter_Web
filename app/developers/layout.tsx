import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Secret Developer Chamber — Contact the Developers',
  description:
    'Meet the developers behind the IEEE Computer Society Chapter platform at Sabaragamuwa University of Sri Lanka: Lead Developer Niranga Nayanajith and Front end Developer Kaveesha Sandeepani.',
  alternates: {
    canonical: '/developers',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function DevelopersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
