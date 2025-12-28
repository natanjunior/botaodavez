import { supabase } from '@/lib/db/supabase';
import { supabaseAdmin } from '@/lib/db/supabaseAdmin';
import type { Participant, ParticipantInsert } from '@/lib/db/schema';
import { sanitizeParticipantName, validateGameToken } from '@/lib/utils/validation';
import { gameService } from './gameService';

export interface JoinGameParams {
  game_token: string;
  name: string;
}

export interface UpdateParticipantParams {
  name?: string;
  is_online?: boolean;
  team_id?: string | null;
}

/**
 * Participant Service
 * Handles all participant-related business logic
 */
export const participantService = {
  /**
   * Join a game as a participant
   */
  async joinGame(params: JoinGameParams): Promise<Participant> {
    const { game_token, name } = params;

    // Validate game token format
    validateGameToken(game_token);

    // Sanitize participant name
    const sanitizedName = sanitizeParticipantName(name);

    // Check if game exists
    const game = await gameService.getGameByToken(game_token);
    if (!game) {
      throw new Error('Game not found');
    }

    // Check if participant with same name already exists in this game
    const { data: existingParticipant } = await supabase
      .from('participants')
      .select('*')
      .eq('game_id', game.id)
      .eq('name', sanitizedName)
      .maybeSingle();

    if (existingParticipant) {
      // Return existing participant (allow rejoin)
      return existingParticipant;
    }

    // Create new participant
    const { data, error } = await supabaseAdmin
      .from('participants')
      .insert({
        game_id: game.id,
        name: sanitizedName,
        is_online: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[ParticipantService] Failed to join game:', error);
      throw new Error('Failed to join game');
    }

    if (!data) {
      throw new Error('Participant created but no data returned');
    }

    return data;
  },

  /**
   * Get all participants for a game
   */
  async getGameParticipants(game_token: string): Promise<Participant[]> {
    // Validate game token
    validateGameToken(game_token);

    // Get game
    const game = await gameService.getGameByToken(game_token);
    if (!game) {
      throw new Error('Game not found');
    }

    // Get participants
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('game_id', game.id)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('[ParticipantService] Failed to get participants:', error);
      throw new Error('Failed to get participants');
    }

    return data || [];
  },

  /**
   * Get participant by ID
   */
  async getParticipantById(id: string): Promise<Participant | null> {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('[ParticipantService] Failed to get participant:', error);
      throw new Error('Failed to get participant');
    }

    return data;
  },

  /**
   * Update participant
   */
  async updateParticipant(id: string, params: UpdateParticipantParams): Promise<Participant> {
    const updateData: any = {
      ...params,
      updated_at: new Date().toISOString(),
    };

    // Sanitize name if provided
    if (params.name) {
      updateData.name = sanitizeParticipantName(params.name);
    }

    const { data, error } = await supabaseAdmin
      .from('participants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ParticipantService] Failed to update participant:', error);
      throw new Error('Failed to update participant');
    }

    if (!data) {
      throw new Error('Participant not found');
    }

    return data;
  },

  /**
   * Update participant online status
   */
  async setOnlineStatus(id: string, is_online: boolean): Promise<void> {
    await this.updateParticipant(id, { is_online });
  },

  /**
   * Kick participant from game (delete)
   */
  async kickParticipant(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('participants')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[ParticipantService] Failed to kick participant:', error);
      throw new Error('Failed to kick participant');
    }
  },

  /**
   * Assign participant to team
   */
  async assignToTeam(participant_id: string, team_id: string | null): Promise<Participant> {
    return await this.updateParticipant(participant_id, { team_id });
  },

  /**
   * Get participants by team
   */
  async getTeamParticipants(team_id: string): Promise<Participant[]> {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('team_id', team_id)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('[ParticipantService] Failed to get team participants:', error);
      throw new Error('Failed to get team participants');
    }

    return data || [];
  },

  /**
   * Get unassigned participants for a game
   */
  async getUnassignedParticipants(game_token: string): Promise<Participant[]> {
    // Validate game token
    validateGameToken(game_token);

    // Get game
    const game = await gameService.getGameByToken(game_token);
    if (!game) {
      throw new Error('Game not found');
    }

    // Get unassigned participants
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('game_id', game.id)
      .is('team_id', null)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('[ParticipantService] Failed to get unassigned participants:', error);
      throw new Error('Failed to get unassigned participants');
    }

    return data || [];
  },
};
