import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/db/schema';
import { participantService } from '@/lib/services/participantService';
import { gameService } from '@/lib/services/gameService';

/**
 * GET /api/participants/[id]
 * Get participant by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const participant = await participantService.getParticipantById(id);

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ participant });
  } catch (error) {
    console.error('[API] Failed to get participant:', error);
    return NextResponse.json(
      { error: 'Failed to get participant' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/participants/[id]
 * Update participant (name, online status, team assignment)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { name, is_online, team_id } = body;

    // Validate at least one field is provided
    if (name === undefined && is_online === undefined && team_id === undefined) {
      return NextResponse.json(
        { error: 'At least one field (name, is_online, team_id) must be provided' },
        { status: 400 }
      );
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Invalid name' },
          { status: 400 }
        );
      }
      if (name.trim().length > 50) {
        return NextResponse.json(
          { error: 'Name must be 50 characters or less' },
          { status: 400 }
        );
      }
    }

    // Update participant
    const participant = await participantService.updateParticipant(id, {
      name,
      is_online,
      team_id,
    });

    return NextResponse.json({ participant });
  } catch (error) {
    console.error('[API] Failed to update participant:', error);
    return NextResponse.json(
      { error: 'Failed to update participant' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/participants/[id]
 * Kick participant from game (admin only)
 */
export async function DELETE(
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

    // Get participant to verify game ownership
    const participant = await participantService.getParticipantById(id);
    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Get game to verify admin ownership
    const { data: game } = await supabase
      .from('games')
      .select('*')
      .eq('id', participant.game_id)
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

    // Kick participant
    await participantService.kickParticipant(id);

    return NextResponse.json(
      { message: 'Participant kicked successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Failed to kick participant:', error);
    return NextResponse.json(
      { error: 'Failed to kick participant' },
      { status: 500 }
    );
  }
}
