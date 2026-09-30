import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resources',
  description: 'Curated learning tracks, coding challenge archives, research guidelines, and engineering toolkits maintained by IEEE CS SUSL members.',
};

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
