import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { roundService } from '@/lib/services/roundService';

/**
 * GET /api/rounds/[id]
 * Get round by ID with participants and results
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const round = await roundService.getRoundById(id);

    return NextResponse.json({
      round: {
        id: round.id,
        game_id: round.game_id,
        status: round.status,
        countdown_duration: round.countdown_duration,
        started_at: round.started_at,
        completed_at: round.completed_at,
        participants: round.participants,
        results: round.results,
      },
    });
  } catch (error) {
    console.error('[API] Failed to get round:', error);

    if (error instanceof Error && error.message === 'Round not found') {
      return NextResponse.json(
        { error: 'Round not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get round' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/rounds/[id]
 * Update round participants (admin only)
 */
export async function PATCH(
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

    const body = await req.json();
    const { participant_ids } = body;

    // Validate input
    if (!participant_ids || !Array.isArray(participant_ids)) {
      return NextResponse.json(
        { error: 'participant_ids must be an array' },
        { status: 400 }
      );
    }

    if (participant_ids.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 participants are required for a round' },
        { status: 400 }
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

    // Update participants
    const updatedRound = await roundService.updateRoundParticipants(id, {
      participant_ids,
    });

    return NextResponse.json({
      round: {
        id: updatedRound.id,
        status: updatedRound.status,
        participants: updatedRound.participants,
      },
    });
  } catch (error) {
    console.error('[API] Failed to update round:', error);

    if (error instanceof Error) {
      if (error.message === 'Round not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      if (error.message.includes('in progress')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update round' },
      { status: 500 }
    );
  }
}
