// proxy.ts — Next.js v16 renamed middleware.ts → proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

// Edge-compatible JWT parser using atob
function isTokenValid(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const payloadPart = parts[1];
    // Replace URL-safe base64 characters
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    const payload = JSON.parse(jsonPayload);
    
    // Check if expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false;
    }
    
    return !!payload.userId;
  } catch (e) {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Exclude static assets and favicons
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/logout') || // allow logout API
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg')
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const token = request.cookies.get('token')?.value;
  const isValid = token ? isTokenValid(token) : false;

  // Redirect to login if not authenticated
  if (!isPublic && !isValid) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Redirect to dashboard if logged in and trying to access login page
  if (pathname === '/login' && isValid) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|_next/data).*)'],
};
