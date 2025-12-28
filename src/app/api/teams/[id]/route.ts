import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { teamService } from '@/lib/services/teamService';

/**
 * GET /api/teams/[id]
 * Get team by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const team = await teamService.getTeamById(id);

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error('[API] Failed to get team:', error);
    return NextResponse.json(
      { error: 'Failed to get team' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/teams/[id]
 * Update team (admin only)
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

    // Get team to verify game ownership
    const team = await teamService.getTeamById(id);
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
    const { name, color } = body;

    // Validate at least one field is provided
    if (name === undefined && color === undefined) {
      return NextResponse.json(
        { error: 'At least one field (name, color) must be provided' },
        { status: 400 }
      );
    }

    // Update team
    const updatedTeam = await teamService.updateTeam(id, { name, color });

    // Real-time updates will be handled by Supabase Realtime

    return NextResponse.json({ team: updatedTeam });
  } catch (error) {
    console.error('[API] Failed to update team:', error);

    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/teams/[id]
 * Delete team (admin only)
 */
export async function DELETE(
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

    // Get team to verify game ownership
    const team = await teamService.getTeamById(id);
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

    // Delete team
    await teamService.deleteTeam(id);

    // Real-time updates will be handled by Supabase Realtime

    return NextResponse.json(
      { message: 'Team deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Failed to delete team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}
