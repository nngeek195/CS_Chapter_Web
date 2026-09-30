import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin',
  description: 'IEEE CS SUSL Chapter Administration Portal.',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
