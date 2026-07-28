import { NextResponse, type NextRequest } from 'next/server';
import { createEdgeClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/login/');

  const { supabase, headers } = createEdgeClient(request);
  const { data: { session }, error } = await supabase.auth.getSession();

  const user = session?.user ?? null;
  const cookies = request.headers.get('cookie') ?? '';

  const debugInfo = JSON.stringify({
    path: pathname,
    isPublic: isPublicRoute,
    hasCookies: cookies.length > 0,
    hasSession: !!session,
    hasError: !!error,
    hasUser: !!user
  });

  if (!user && !isPublicRoute) {
    const redirect = NextResponse.redirect(new URL('/login', request.url));
    redirect.headers.set('x-debug', debugInfo);
    return redirect;
  }

  if (user && pathname === '/login') {
    const redirect = NextResponse.redirect(new URL('/', request.url));
    redirect.headers.set('x-debug', debugInfo);
    return redirect;
  }

  const response = NextResponse.next({ request });
  response.headers.set('x-debug', debugInfo);
  headers.forEach((value, key) => {
    if (key === 'set-cookie') {
      response.headers.append(key, value);
    }
  });

  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
