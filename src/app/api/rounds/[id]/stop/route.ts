import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { roundService } from '@/lib/services/roundService';

/**
 * POST /api/rounds/[id]/stop
 * Stop/cancel a round (admin only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get current session (admin must be authenticated)
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

    // Get round to verify game ownership
    const round = await roundService.getRoundById(id);

    // Get game to verify admin ownership
    const { data: game } = await supabase
      .from('games')
      .select('*')
      .eq('id', round.game_id)
      .single();

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Verify admin owns the game
    if (game.admin_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this game' },
        { status: 403 }
      );
    }

    // Stop round
    const stoppedRound = await roundService.stopRound(id);

    // Real-time updates will be handled by Supabase Realtime

    return NextResponse.json({
      round: {
        id: stoppedRound.id,
        status: stoppedRound.status,
      },
    });
  } catch (error) {
    console.error('[API] Failed to stop round:', error);

    if (error instanceof Error) {
      if (error.message === 'Round not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      if (error.message.includes('status') || error.message.includes('progress')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to stop round' },
      { status: 500 }
    );
  }
}
