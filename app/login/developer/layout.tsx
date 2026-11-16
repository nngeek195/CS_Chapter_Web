import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meet the Developers',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function DeveloperPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
