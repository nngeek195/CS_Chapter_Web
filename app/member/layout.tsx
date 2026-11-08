import type { Metadata } from 'next';
import AdminShell from '../admin/AdminShell';

export const metadata: Metadata = {
  title: 'Member Portal',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
