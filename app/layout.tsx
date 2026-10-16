import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DeveloperConsoleListener from '@/components/DeveloperConsoleListener';
import { AuthProvider } from '@/context/AuthContext';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cschaptersusl.org';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'IEEE CS SUSL — Computer Society Student Branch Chapter',
    template: '%s | IEEE CS SUSL',
  },
  description:
    'Official IEEE Computer Society Student Branch Chapter at Sabaragamuwa University of Sri Lanka. Empowering students through computing knowledge, workshops, hackathons, IEEEXtreme, and research exposure.',
  keywords: [
    'IEEE CS SUSL',
    'IEEE Computer Society SUSL',
    'IEEE Computer Society Chapter',
    'IEEE Computer Society Sabaragamuwa',
    'Sabaragamuwa University of Sri Lanka',
    'SUSL IEEE',
    'Computer Science SUSL',
    'IEEEXtreme',
    'Tech Workshops Sri Lanka',
    'IEEE Sri Lanka Section',
    'cschaptersusl',
    'CS Chapter SUSL',
    'IEEE Student Branch Chapter',
  ],
  authors: [{ name: 'IEEE CS SUSL', url: SITE_URL }],
  creator: 'IEEE Computer Society Chapter at Sabaragamuwa University of Sri Lanka',
  publisher: 'IEEE CS SUSL',
  category: 'Education, Technology',

  // Canonical + alternates
  alternates: {
    canonical: '/',
  },

  // Google Search Console verification — add your token here after verifying
  verification: {
    google: '<UmPFyWPlpWtuzUqNLgG3M-PO67F9w-OMHaJq8463s84',
  },

  // Robots directives
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Favicon / Icons
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
    shortcut: '/images/logo.png',
  },

  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'IEEE CS SUSL',
    title: 'IEEE CS SUSL — Computer Society Student Branch Chapter',
    description:
      'Official IEEE Computer Society Student Branch Chapter at Sabaragamuwa University of Sri Lanka.',
    images: [
      {
        url: '/images/logo.png',
        width: 668,
        height: 299,
        alt: 'IEEE CS SUSL — Computer Society Chapter Logo',
        type: 'image/png',
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'IEEE CS SUSL — Computer Society Student Branch Chapter',
    description:
      'Official IEEE Computer Society Student Branch Chapter at Sabaragamuwa University of Sri Lanka.',
    images: ['/images/logo.png'],
    site: '@ieeecs_susl',
    creator: '@ieeecs_susl',
  },
};

// JSON-LD structured data — Organisation schema for Google rich results
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'IEEE Computer Society Student Branch Chapter — Sabaragamuwa University of Sri Lanka',
  alternateName: ['IEEE CS SUSL', 'CS Chapter SUSL'],
  url: SITE_URL,
  logo: `${SITE_URL}/images/logo.png`,
  image: `${SITE_URL}/images/logo.png`,
  description:
    'Official IEEE Computer Society Student Branch Chapter at Sabaragamuwa University of Sri Lanka. We empower students through computing knowledge, workshops, hackathons, IEEEXtreme, and research.',
  email: 'ieeecssusl@gmail.com',
  sameAs: [
    'https://www.linkedin.com/company/ieee-cs-student-branch-chapter-susl',
    'https://www.instagram.com/ieee_cs_susl',
    'https://www.facebook.com/share/1Fgqg7JcxD/',
  ],
  parentOrganization: {
    '@type': 'Organization',
    name: 'IEEE Sri Lanka Section',
    url: 'https://www.ieeesrilanka.org/',
  },
  foundingOrganization: {
    '@type': 'Organization',
    name: 'Sabaragamuwa University of Sri Lanka',
    url: 'https://www.sab.ac.lk/',
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
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <DeveloperConsoleListener />
          <Navbar />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
