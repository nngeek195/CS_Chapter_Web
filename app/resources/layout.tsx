import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resources',
  description:
    'Curated study kits, IEEEXtreme cheat sheets, workshop materials, and technical guides from IEEE Computer Society Chapter at Sabaragamuwa University of Sri Lanka.',
  openGraph: {
    title: 'Resources — IEEE CS SUSL',
    description:
      'Curated study kits, IEEEXtreme cheat sheets, workshop materials, and technical guides from IEEE Computer Society Chapter at Sabaragamuwa University of Sri Lanka.',
  },
};

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
