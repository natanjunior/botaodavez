import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/db/schema';
import { gameService } from '@/lib/services/gameService';

type GameType = Database['public']['Enums']['game_type'];

/**
 * GET /api/games/[token]
 * Get game details by token
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    // Get game
    const game = await gameService.getGameByToken(token);

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      game: {
        id: game.id,
        token: game.token,
        game_type: game.game_type,
        admin_id: game.admin_id,
        created_at: game.created_at,
        updated_at: game.updated_at,
      },
    });
  } catch (error) {
    console.error('[API] Failed to get game:', error);
    return NextResponse.json(
      { error: 'Failed to get game' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/games/[token]
 * Update game settings
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

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

    // Verify admin owns the game
    const ownsGame = await gameService.verifyAdminOwnership(token, session.user.id);
    if (!ownsGame) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this game' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { game_type } = body;

    // Validate game_type if provided
    if (game_type) {
      const validGameTypes: GameType[] = ['button'];
      if (!validGameTypes.includes(game_type)) {
        return NextResponse.json(
          { error: 'Invalid game_type. Must be: button' },
          { status: 400 }
        );
      }
    }

    // Update game
    const game = await gameService.updateGame(token, { game_type });

    return NextResponse.json({
      game: {
        id: game.id,
        token: game.token,
        game_type: game.game_type,
        updated_at: game.updated_at,
      },
    });
  } catch (error) {
    console.error('[API] Failed to update game:', error);
    return NextResponse.json(
      { error: 'Failed to update game' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/games/[token]
 * Delete a game
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

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

    // Verify admin owns the game
    const ownsGame = await gameService.verifyAdminOwnership(token, session.user.id);
    if (!ownsGame) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this game' },
        { status: 403 }
      );
    }

    // Delete game
    await gameService.deleteGame(token);

    return NextResponse.json(
      { message: 'Game deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Failed to delete game:', error);
    return NextResponse.json(
      { error: 'Failed to delete game' },
      { status: 500 }
    );
  }
}
