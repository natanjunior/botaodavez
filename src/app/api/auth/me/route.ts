import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

/**
 * GET /api/auth/me
 * Returns current authenticated admin's information
 */
export async function GET(req: NextRequest) {
  try {

    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get admin record from database
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (adminError || !admin) {
      console.error('[Auth] Admin record not found:', adminError);
      return NextResponse.json(
        { error: 'Admin record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      admin: {
        id: admin.id,
        email: admin.email,
        created_at: admin.created_at,
        updated_at: admin.updated_at,
      },
      session: {
        access_token: session.access_token,
        expires_at: session.expires_at,
      },
    });
  } catch (error) {
    console.error('[Auth] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
