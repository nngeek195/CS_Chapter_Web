import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leadership',
  description: 'People behind the IEEE CS Chapter SUSL. Advisor and executive committee structure.',
};

export default function LeadershipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
