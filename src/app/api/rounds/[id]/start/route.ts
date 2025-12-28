import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/db/schema';
import { roundService } from '@/lib/services/roundService';
import { emitRoundStarted } from '@/lib/socket/handlers/roundHandlers';

/**
 * POST /api/rounds/[id]/start
 * Start a round (admin only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get current session (admin must be authenticated)
    const supabase = createRouteHandlerClient<Database>({ cookies });
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

    // Start round
    const startedRound = await roundService.startRound(id);

    // Emit WebSocket event to all participants
    emitRoundStarted(
      game.token,
      startedRound.id,
      startedRound.countdown_duration!
    );

    return NextResponse.json({
      round: {
        id: startedRound.id,
        status: startedRound.status,
        countdown_duration: startedRound.countdown_duration,
        started_at: startedRound.started_at,
        participants: startedRound.participants,
      },
    });
  } catch (error) {
    console.error('[API] Failed to start round:', error);

    if (error instanceof Error) {
      if (error.message === 'Round not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      if (
        error.message.includes('status') ||
        error.message.includes('participants')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to start round' },
      { status: 500 }
    );
  }
}
