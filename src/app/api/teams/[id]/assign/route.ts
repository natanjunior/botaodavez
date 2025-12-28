import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/db/schema';
import { teamService } from '@/lib/services/teamService';
import { emitTeamParticipantsUpdated } from '@/lib/socket/events/teamEvents';

/**
 * POST /api/teams/[id]/assign
 * Assign participants to a team (admin only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: team_id } = params;

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

    // Get team to verify game ownership
    const team = await teamService.getTeamById(team_id);
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Get game to verify admin ownership
    const { data: game } = await supabase
      .from('games')
      .select('*')
      .eq('id', team.game_id)
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

    const body = await req.json();
    const { participant_ids } = body;

    // Validate input
    if (!participant_ids || !Array.isArray(participant_ids)) {
      return NextResponse.json(
        { error: 'participant_ids must be an array' },
        { status: 400 }
      );
    }

    if (participant_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one participant_id is required' },
        { status: 400 }
      );
    }

    // Assign participants to team
    await teamService.assignParticipants(team_id, participant_ids);

    // Emit WebSocket event
    emitTeamParticipantsUpdated(game.token, team_id, participant_ids);

    return NextResponse.json(
      { message: 'Participants assigned successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Failed to assign participants:', error);

    if (error instanceof Error) {
      if (error.message === 'Team not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      if (error.message.includes('required')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to assign participants' },
      { status: 500 }
    );
  }
}
