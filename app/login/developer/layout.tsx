import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Secret Developer Chamber',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function DeveloperChamberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
