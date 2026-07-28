import { NextResponse, type NextRequest } from 'next/server';
import { createEdgeClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/login/');

  console.log('[MIDDLEWARE] Path:', pathname);
  console.log('[MIDDLEWARE] Is Public Route:', isPublicRoute);
  console.log('[MIDDLEWARE] Cookies:', request.headers.get('cookie'));

  const { supabase, headers } = createEdgeClient(request);
  const { data: { session }, error } = await supabase.auth.getSession();

  console.log('[MIDDLEWARE] Session:', session ? 'exists' : 'null');
  console.log('[MIDDLEWARE] Error:', error);
  console.log('[MIDDLEWARE] User:', session?.user ? 'exists' : 'null');

  const user = session?.user ?? null;

  if (!user && !isPublicRoute) {
    console.log('[MIDDLEWARE] Redirecting to /login (no user)');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && pathname === '/login') {
    console.log('[MIDDLEWARE] Redirecting to / (has user)');
    return NextResponse.redirect(new URL('/', request.url));
  }

  console.log('[MIDDLEWARE] Allowing request');

  const response = NextResponse.next({ request });
  headers.forEach((value, key) => {
    if (key === 'set-cookie') {
      response.headers.append(key, value);
    }
  });

  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
