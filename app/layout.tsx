import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  metadataBase: new URL('https://ieeecs-susl.ac.lk'),
  title: {
    default: 'IEEE CS Chapter SUSL',
    template: '%s',
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
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/images/favicon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/images/apple-icon.png',
  },
  openGraph: {
    title: 'IEEE CS Chapter SUSL',
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
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
