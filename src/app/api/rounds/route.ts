import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { roundService } from '@/lib/services/roundService';
import { gameService } from '@/lib/services/gameService';

/**
 * POST /api/rounds
 * Create a new round (admin only)
 */
export async function POST(req: NextRequest) {
  try {
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
    const { game_token, participant_ids } = body;

    // Validate input
    if (!game_token || !participant_ids) {
      return NextResponse.json(
        { error: 'game_token and participant_ids are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(participant_ids)) {
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

    // Verify admin owns the game
    const ownsGame = await gameService.verifyAdminOwnership(
      game_token.toUpperCase(),
      session.user.id
    );

    if (!ownsGame) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this game' },
        { status: 403 }
      );
    }

    // Create round
    const round = await roundService.createRound({
      game_token: game_token.toUpperCase(),
      participant_ids,
    });

    // Real-time updates will be handled by Supabase Realtime

    return NextResponse.json(
      {
        round: {
          id: round.id,
          game_id: round.game_id,
          status: round.status,
          participants: round.participants,
          created_at: round.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Failed to create round:', error);

    if (error instanceof Error) {
      if (error.message.includes('Game not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      if (error.message.includes('participants')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create round' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rounds?game_token=XXX
 * Get all rounds for a game
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const game_token = searchParams.get('game_token');

    if (!game_token) {
      return NextResponse.json(
        { error: 'game_token query parameter is required' },
        { status: 400 }
      );
    }

    // Get rounds
    const rounds = await roundService.getGameRounds(game_token.toUpperCase());

    return NextResponse.json({ rounds });
  } catch (error) {
    console.error('[API] Failed to get rounds:', error);

    if (error instanceof Error && error.message === 'Game not found') {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get rounds' },
      { status: 500 }
    );
  }
}
