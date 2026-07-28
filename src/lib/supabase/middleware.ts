import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';

/**
 * Creates a Supabase client optimized for Edge Runtime.
 * Uses native Web APIs for cookie handling to ensure compatibility with Vercel Edge Functions.
 */
export function createEdgeClient(request: Request) {
  const headers = new Headers();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('cookie') ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            headers.append(
              'set-cookie',
              serializeCookieHeader(name, value, options)
            );
          });
        },
      },
    }
  );

  return { supabase, headers };
}
