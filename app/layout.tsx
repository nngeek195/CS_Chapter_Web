import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://ieeecs-susl.ac.lk'),
  title: {
    default: 'IEEE CS SUSL — IEEE Computer Society Chapter',
    template: '%s — IEEE CS SUSL',
  },
  description:
    'IEEE Computer Society Chapter at Sabaragamuwa University of Sri Lanka. Empowering students with computing knowledge, workshops, hackathons, and research exposure.',
  keywords: [
    'IEEE CS',
    'IEEE Computer Society',
    'SUSL',
    'Sabaragamuwa University of Sri Lanka',
    'Computer Science',
    'IEEEXtreme',
    'Tech Workshops',
  ],
  authors: [{ name: 'IEEE CS SUSL' }],
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
  },
  openGraph: {
    title: 'IEEE CS SUSL — IEEE Computer Society Chapter',
    description:
      'IEEE Computer Society Chapter at Sabaragamuwa University of Sri Lanka.',
    images: [{ url: '/images/logo.png', width: 668, height: 299, alt: 'IEEE CS SUSL Logo' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                localStorage.removeItem('ieeecs-theme');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
