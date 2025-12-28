import { NextRequest, NextResponse } from 'next/server';
import { participantService } from '@/lib/services/participantService';
import { sanitizeParticipantName } from '@/lib/utils/sanitize';

/**
 * POST /api/participants
 * Join a game as a participant
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { game_token, name } = body;

    // Validate input
    if (!game_token || !name) {
      return NextResponse.json(
        { error: 'game_token and name are required' },
        { status: 400 }
      );
    }

    // Sanitize name input
    let sanitizedName: string;
    try {
      sanitizedName = sanitizeParticipantName(name);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid name' },
        { status: 400 }
      );
    }

    // Join game
    const participant = await participantService.joinGame({
      game_token: game_token.toUpperCase(),
      name: sanitizedName,
    });

    return NextResponse.json(
      {
        participant: {
          id: participant.id,
          game_id: participant.game_id,
          name: participant.name,
          is_online: participant.is_online,
          joined_at: participant.joined_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Failed to join game:', error);

    if (error instanceof Error) {
      if (error.message === 'Game not found') {
        return NextResponse.json(
          { error: 'Game not found. Please check the game token.' },
          { status: 404 }
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
      { error: 'Failed to join game' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/participants?game_token=XXX
 * Get all participants for a game
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

    // Get participants
    const participants = await participantService.getGameParticipants(
      game_token.toUpperCase()
    );

    return NextResponse.json({ participants });
  } catch (error) {
    console.error('[API] Failed to get participants:', error);

    if (error instanceof Error && error.message === 'Game not found') {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get participants' },
      { status: 500 }
    );
  }
}
