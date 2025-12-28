import { NextRequest, NextResponse } from 'next/server';
import { roundService } from '@/lib/services/roundService';

/**
 * GET /api/rounds/[id]/result
 * Get round result with all reaction times and winner(s)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get round results
    const results = await roundService.getRoundResult(id);

    return NextResponse.json({
      results: results.map((r) => ({
        id: r.id,
        participant_id: r.participant_id,
        reaction_time: r.reaction_time,
        was_eliminated: r.was_eliminated,
        is_winner: r.is_winner,
        recorded_at: r.recorded_at,
      })),
    });
  } catch (error) {
    console.error('[API] Failed to get round result:', error);

    return NextResponse.json(
      { error: 'Failed to get round result' },
      { status: 500 }
    );
  }
}
