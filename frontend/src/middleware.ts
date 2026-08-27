import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/constants';

const AUTH_PATHS = ['/', '/login', '/register'];
const PROTECTED_PATHS = [
  '/feed',
  '/mis-problematicas',
  '/mis-postulaciones',
  '/perfil',
  '/admin',
  '/settings',
];

export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const isAuthPath = AUTH_PATHS.includes(pathname);

  // Unauthenticated user on a protected route → login
  if (!token && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Authenticated user on an auth page → feed
  if (token && isAuthPath) {
    return NextResponse.redirect(new URL('/feed', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/feed/:path*',
    '/mis-problematicas',
    '/mis-postulaciones',
    '/perfil/:path*',
    '/admin/:path*',
    '/settings',
  ],
};
