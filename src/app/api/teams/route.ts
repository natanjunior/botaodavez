import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { teamService } from '@/lib/services/teamService';
import { gameService } from '@/lib/services/gameService';
import { emitTeamCreated } from '@/lib/socket/events/teamEvents';

/**
 * POST /api/teams
 * Create a new team (admin only)
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
    const { game_token, name, color } = body;

    // Validate input
    if (!game_token || !name || !color) {
      return NextResponse.json(
        { error: 'game_token, name, and color are required' },
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

    // Create team
    const team = await teamService.createTeam({
      game_token: game_token.toUpperCase(),
      name,
      color,
    });

    // Emit WebSocket event
    emitTeamCreated(game_token.toUpperCase(), team);

    return NextResponse.json(
      {
        team: {
          id: team.id,
          game_id: team.game_id,
          name: team.name,
          color: team.color,
          created_at: team.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Failed to create team:', error);

    if (error instanceof Error) {
      if (
        error.message === 'Game not found' ||
        error.message === 'Team with this name already exists'
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      if (error.message.includes('Invalid')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/teams?game_token=XXX
 * Get all teams for a game
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

    // Get teams
    const teams = await teamService.getGameTeams(game_token.toUpperCase());

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('[API] Failed to get teams:', error);

    if (error instanceof Error && error.message === 'Game not found') {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get teams' },
      { status: 500 }
    );
  }
}
