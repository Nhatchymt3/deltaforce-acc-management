import { NextResponse, type NextRequest } from 'next/server';
import { createEdgeClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, headers } = createEdgeClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/login/');

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const response = NextResponse.next({ request });
  headers.forEach((value, key) => {
    if (key === 'set-cookie') {
      response.headers.append(key, value);
    }
  });

  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
