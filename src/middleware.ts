import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Database } from './lib/db/schema';

/**
 * Middleware for protecting admin routes with Supabase Auth
 * Runs on every request to admin routes (admin)/*)
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient<Database>({ req, res });

  // Refresh session if it exists
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect admin routes
  if (req.nextUrl.pathname.startsWith('/(admin)') || req.nextUrl.pathname.includes('/admin/')) {
    if (!session) {
      // Redirect to login if not authenticated
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/(admin)/login';
      redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

/**
 * Matcher configuration
 * Runs middleware only on admin routes
 */
export const config = {
  matcher: [
    /*
     * Match all admin routes except:
     * - /login (allow unauthenticated access to login page)
     * - /api/auth/login (allow login API calls)
     * - /api/auth/logout (allow logout API calls)
     */
    '/(admin)/:path*',
  ],
};
