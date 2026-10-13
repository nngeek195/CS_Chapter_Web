/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },

  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          // Allow the srcdoc iframe (ConstellationField animation) to run inline scripts.
          // 'unsafe-inline' for script-src is required because the animation's HTML source
          // is injected as a srcdoc attribute and the browser treats it as an inline script.
          // 'unsafe-eval' is required by some WebGL/Three.js animation internals.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://static.cloudflareinsights.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' blob: data: https://images.unsplash.com https://firebasestorage.googleapis.com https://res.cloudinary.com",
              "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.cloudfunctions.net https://api.cloudinary.com",
              // Allow srcdoc iframes and OpenStreetMap embed
              "frame-src 'self' blob: data: https://www.openstreetmap.org",
              "worker-src 'self' blob:",
              "media-src 'self' blob:",
            ].join('; '),
          },
          // Remove X-Frame-Options to avoid conflicting with the above CSP frame-src
          // (Vercel may set this automatically; the CSP frame-ancestors directive is preferred)
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
