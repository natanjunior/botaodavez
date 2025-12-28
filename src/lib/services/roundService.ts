import { supabase, supabaseAdmin } from '@/lib/db/supabase';
import type { Database } from '@/lib/db/schema';
import type { Round, RoundParticipant, RoundResult } from '@/lib/db/schema';
import { generateCountdownDuration, determineWinners } from '@/lib/utils/timing';
import { validateGameToken } from '@/lib/utils/validation';
import { gameService } from './gameService';

type RoundStatus = Database['public']['Enums']['round_status'];

export interface CreateRoundParams {
  game_token: string;
  participant_ids: string[];
}

export interface UpdateRoundParticipantsParams {
  participant_ids: string[];
}

export interface RecordReactionParams {
  round_id: string;
  participant_id: string;
  reaction_time: number;
}

export interface RecordEliminationParams {
  round_id: string;
  participant_id: string;
}

export interface RoundWithParticipants extends Round {
  participants: RoundParticipant[];
  results?: RoundResult[];
}

/**
 * Round Service
 * Handles all round-related business logic
 */
export const roundService = {
  /**
   * Create a new round for a game
   */
  async createRound(params: CreateRoundParams): Promise<RoundWithParticipants> {
    const { game_token, participant_ids } = params;

    // Validate game token
    validateGameToken(game_token);

    if (!participant_ids || participant_ids.length < 2) {
      throw new Error('At least 2 participants are required for a round');
    }

    // Get game
    const game = await gameService.getGameByToken(game_token);
    if (!game) {
      throw new Error('Game not found');
    }

    // Create round
    const { data: round, error: roundError } = await supabaseAdmin
      .from('rounds')
      .insert({
        game_id: game.id,
        status: 'waiting' as RoundStatus,
      })
      .select()
      .single();

    if (roundError || !round) {
      console.error('[RoundService] Failed to create round:', roundError);
      throw new Error('Failed to create round');
    }

    // Add participants to round
    const roundParticipants = participant_ids.map((participant_id) => ({
      round_id: round.id,
      participant_id,
    }));

    const { error: participantsError } = await supabaseAdmin
      .from('round_participants')
      .insert(roundParticipants);

    if (participantsError) {
      console.error('[RoundService] Failed to add participants:', participantsError);
      // Rollback: delete round
      await supabaseAdmin.from('rounds').delete().eq('id', round.id);
      throw new Error('Failed to add participants to round');
    }

    // Fetch created round with participants
    return await this.getRoundById(round.id);
  },

  /**
   * Get round by ID with participants and results
   */
  async getRoundById(round_id: string): Promise<RoundWithParticipants> {
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('*')
      .eq('id', round_id)
      .single();

    if (roundError || !round) {
      throw new Error('Round not found');
    }

    // Get participants
    const { data: roundParticipants, error: participantsError } = await supabase
      .from('round_participants')
      .select('*')
      .eq('round_id', round_id);

    if (participantsError) {
      throw new Error('Failed to get round participants');
    }

    // Get results (if any)
    const { data: results } = await supabase
      .from('round_results')
      .select('*')
      .eq('round_id', round_id);

    return {
      ...round,
      participants: roundParticipants || [],
      results: results || [],
    };
  },

  /**
   * Update round participants (for replay scenario)
   */
  async updateRoundParticipants(
    round_id: string,
    params: UpdateRoundParticipantsParams
  ): Promise<RoundWithParticipants> {
    const { participant_ids } = params;

    if (!participant_ids || participant_ids.length < 2) {
      throw new Error('At least 2 participants are required for a round');
    }

    // Verify round exists and is not in progress
    const round = await this.getRoundById(round_id);
    if (round.status === 'in_progress') {
      throw new Error('Cannot update participants while round is in progress');
    }

    // Delete existing participants
    await supabaseAdmin
      .from('round_participants')
      .delete()
      .eq('round_id', round_id);

    // Add new participants
    const roundParticipants = participant_ids.map((participant_id) => ({
      round_id,
      participant_id,
    }));

    const { error } = await supabaseAdmin
      .from('round_participants')
      .insert(roundParticipants);

    if (error) {
      console.error('[RoundService] Failed to update participants:', error);
      throw new Error('Failed to update round participants');
    }

    return await this.getRoundById(round_id);
  },

  /**
   * Start a round (set countdown and update status)
   */
  async startRound(round_id: string): Promise<RoundWithParticipants> {
    const round = await this.getRoundById(round_id);

    if (round.status !== 'waiting') {
      throw new Error('Round can only be started from waiting status');
    }

    if (round.participants.length < 2) {
      throw new Error('At least 2 participants are required to start round');
    }

    // Delete previous results (for replay scenario)
    await supabaseAdmin
      .from('round_results')
      .delete()
      .eq('round_id', round_id);

    // Generate random countdown duration (1000-5000ms)
    const countdown_duration = generateCountdownDuration();

    // Update round status
    const { error } = await supabaseAdmin
      .from('rounds')
      .update({
        status: 'in_progress' as RoundStatus,
        countdown_duration,
        started_at: new Date().toISOString(),
        completed_at: null, // Clear previous completion
      })
      .eq('id', round_id);

    if (error) {
      console.error('[RoundService] Failed to start round:', error);
      throw new Error('Failed to start round');
    }

    return await this.getRoundById(round_id);
  },

  /**
   * Stop/cancel a round
   */
  async stopRound(round_id: string): Promise<RoundWithParticipants> {
    const round = await this.getRoundById(round_id);

    if (round.status !== 'in_progress') {
      throw new Error('Can only stop a round that is in progress');
    }

    // Update round status back to waiting
    const { error } = await supabaseAdmin
      .from('rounds')
      .update({
        status: 'waiting' as RoundStatus,
        countdown_duration: null,
        started_at: null,
      })
      .eq('id', round_id);

    if (error) {
      console.error('[RoundService] Failed to stop round:', error);
      throw new Error('Failed to stop round');
    }

    // Delete any partial results
    await supabaseAdmin
      .from('round_results')
      .delete()
      .eq('round_id', round_id);

    return await this.getRoundById(round_id);
  },

  /**
   * Record participant reaction time
   */
  async recordReaction(params: RecordReactionParams): Promise<RoundResult> {
    const { round_id, participant_id, reaction_time } = params;

    // Validate reaction time
    if (reaction_time < 0 || reaction_time > 10000) {
      throw new Error('Invalid reaction time. Must be between 0-10000ms');
    }

    // Verify round is in progress
    const round = await this.getRoundById(round_id);
    if (round.status !== 'in_progress') {
      throw new Error('Round is not in progress');
    }

    // Verify participant is in round
    const isParticipant = round.participants.some(
      (rp) => rp.participant_id === participant_id
    );
    if (!isParticipant) {
      throw new Error('Participant is not in this round');
    }

    // Record result
    const { data, error } = await supabaseAdmin
      .from('round_results')
      .insert({
        round_id,
        participant_id,
        reaction_time,
        was_eliminated: false,
        is_winner: false, // Will be determined later
      })
      .select()
      .single();

    if (error) {
      console.error('[RoundService] Failed to record reaction:', error);
      throw new Error('Failed to record reaction time');
    }

    return data!;
  },

  /**
   * Record participant elimination (clicked yellow button)
   */
  async recordElimination(params: RecordEliminationParams): Promise<RoundResult> {
    const { round_id, participant_id } = params;

    // Verify round is in progress
    const round = await this.getRoundById(round_id);
    if (round.status !== 'in_progress') {
      throw new Error('Round is not in progress');
    }

    // Verify participant is in round
    const isParticipant = round.participants.some(
      (rp) => rp.participant_id === participant_id
    );
    if (!isParticipant) {
      throw new Error('Participant is not in this round');
    }

    // Record elimination
    const { data, error } = await supabaseAdmin
      .from('round_results')
      .insert({
        round_id,
        participant_id,
        reaction_time: null,
        was_eliminated: true,
        is_winner: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[RoundService] Failed to record elimination:', error);
      throw new Error('Failed to record elimination');
    }

    return data!;
  },

  /**
   * Complete round and determine winner(s)
   */
  async completeRound(round_id: string): Promise<RoundWithParticipants> {
    const round = await this.getRoundById(round_id);

    if (round.status !== 'in_progress') {
      throw new Error('Can only complete a round that is in progress');
    }

    // Get all results
    const { data: results, error: resultsError } = await supabase
      .from('round_results')
      .select('*')
      .eq('round_id', round_id);

    if (resultsError || !results) {
      throw new Error('Failed to get round results');
    }

    // Determine winner(s) - participants with lowest reaction time
    const winnerIds = determineWinners(results);

    // Update winners
    if (winnerIds.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('round_results')
        .update({ is_winner: true })
        .eq('round_id', round_id)
        .in('participant_id', winnerIds);

      if (updateError) {
        console.error('[RoundService] Failed to mark winners:', updateError);
        throw new Error('Failed to mark winners');
      }
    }

    // Update round status
    const { error } = await supabaseAdmin
      .from('rounds')
      .update({
        status: 'completed' as RoundStatus,
        completed_at: new Date().toISOString(),
      })
      .eq('id', round_id);

    if (error) {
      console.error('[RoundService] Failed to complete round:', error);
      throw new Error('Failed to complete round');
    }

    return await this.getRoundById(round_id);
  },

  /**
   * Get round result
   */
  async getRoundResult(round_id: string): Promise<RoundResult[]> {
    const { data, error } = await supabase
      .from('round_results')
      .select('*')
      .eq('round_id', round_id)
      .order('reaction_time', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('[RoundService] Failed to get round results:', error);
      throw new Error('Failed to get round results');
    }

    return data || [];
  },

  /**
   * Get all rounds for a game
   */
  async getGameRounds(game_token: string): Promise<Round[]> {
    validateGameToken(game_token);

    const game = await gameService.getGameByToken(game_token);
    if (!game) {
      throw new Error('Game not found');
    }

    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .eq('game_id', game.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[RoundService] Failed to get game rounds:', error);
      throw new Error('Failed to get game rounds');
    }

    return data || [];
  },
};
