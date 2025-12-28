import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { gameService } from '@/lib/services/gameService';

/**
 * POST /api/games
 * Create a new game
 */
export async function POST(req: NextRequest) {
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

    // Parse request body
    const body = await req.json();
    const { game_type } = body;

    // Validate game_type
    if (!game_type) {
      return NextResponse.json(
        { error: 'game_type is required' },
        { status: 400 }
      );
    }

    const validGameTypes = ['button'];
    if (!validGameTypes.includes(game_type)) {
      return NextResponse.json(
        { error: 'Invalid game_type. Must be: button' },
        { status: 400 }
      );
    }

    // Create game
    const game = await gameService.createGame({
      admin_id: session.user.id,
      game_type,
    });

    return NextResponse.json(
      {
        game: {
          id: game.id,
          token: game.token,
          game_type: game.game_type,
          created_at: game.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Failed to create game:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/games
 * Get all games for the authenticated admin
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

    // Get admin's games
    const games = await gameService.getAdminGames(session.user.id);

    return NextResponse.json({ games });
  } catch (error) {
    console.error('[API] Failed to get games:', error);
    return NextResponse.json(
      { error: 'Failed to get games' },
      { status: 500 }
    );
  }
}
