import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

/**
 * POST /api/auth/logout
 * Admin logout endpoint - ends current session
 */
export async function POST(req: NextRequest) {
  try {

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[Auth] Logout error:', error);
      return NextResponse.json(
        { error: 'Failed to logout' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth] Unexpected logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
