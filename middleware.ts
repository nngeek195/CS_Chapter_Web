import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('ieeecs_auth_token')?.value;

  // Protect all /admin routes
  if (pathname.startsWith('/admin')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If already authenticated and accessing login page, redirect to /admin
  if (pathname === '/login') {
    if (token) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // Guard the hidden developer chamber — only allow access if the
  // referring session marker is set (i.e. arrived via the console easter-egg).
  // Direct URL entry gets silently redirected to home.
  if (pathname === '/login/developer') {
    const referer = request.headers.get('referer') || '';
    const host = request.nextUrl.host;
    // Allow if the request came from within the same site (internal navigation)
    // or if no referer (e.g. first open after console redirect within SPA).
    // We rely on the client-side sessionStorage guard for the true gate;
    // here we just block external/direct URL entry attempts gracefully.
    const isSameOrigin = referer.includes(host);
    if (!isSameOrigin && referer !== '') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/login/developer'],
};
