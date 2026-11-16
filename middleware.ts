import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('ieeecs_auth_token')?.value;
  const role = request.cookies.get('ieeecs_user_role')?.value; // 'admin' | 'member' | undefined

  // Protect all /admin routes — must be authenticated AND must be an admin (not a board member)
  if (pathname.startsWith('/admin')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // If a board member tries to access /admin, redirect them to /member
    if (role === 'member') {
      return NextResponse.redirect(new URL('/member', request.url));
    }
  }

  // Protect all /member routes — must be authenticated
  if (pathname.startsWith('/member')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // If a full admin tries to access /member, redirect them to /admin
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // If already authenticated and accessing login page, redirect based on role
  if (pathname === '/login') {
    if (token) {
      if (role === 'member') {
        return NextResponse.redirect(new URL('/member', request.url));
      }
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // Guard the developer page — only allow access from within the same site.
  // Direct URL entry from external sources gets silently redirected to home.
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
  matcher: ['/admin/:path*', '/member/:path*', '/login', '/login/developer'],
};
