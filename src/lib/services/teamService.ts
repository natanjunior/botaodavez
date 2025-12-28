import { supabase, supabaseAdmin } from '@/lib/db/supabase';
import type { Database } from '@/lib/db/schema';
import type { Team, TeamInsert } from '@/lib/db/schema';
import { validateHexColor, validateGameToken } from '@/lib/utils/validation';
import { gameService } from './gameService';
import { participantService } from './participantService';

export interface CreateTeamParams {
  game_token: string;
  name: string;
  color: string;
}

export interface UpdateTeamParams {
  name?: string;
  color?: string;
}

/**
 * Team Service
 * Handles all team-related business logic
 */
export const teamService = {
  /**
   * Create a new team
   */
  async createTeam(params: CreateTeamParams): Promise<Team> {
    const { game_token, name, color } = params;

    // Validate game token
    validateGameToken(game_token);

    // Validate color
    validateHexColor(color);

    // Validate name
    if (!name || name.trim().length === 0) {
      throw new Error('Team name is required');
    }

    if (name.trim().length > 50) {
      throw new Error('Team name must be 50 characters or less');
    }

    // Get game
    const game = await gameService.getGameByToken(game_token);
    if (!game) {
      throw new Error('Game not found');
    }

    // Check if team with same name already exists in this game
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('*')
      .eq('game_id', game.id)
      .eq('name', name.trim())
      .maybeSingle();

    if (existingTeam) {
      throw new Error('Team with this name already exists');
    }

    // Create team
    const { data, error } = await supabaseAdmin
      .from('teams')
      .insert({
        game_id: game.id,
        name: name.trim(),
        color: color.toUpperCase(),
      })
      .select()
      .single();

    if (error) {
      console.error('[TeamService] Failed to create team:', error);
      throw new Error('Failed to create team');
    }

    if (!data) {
      throw new Error('Team created but no data returned');
    }

    return data;
  },

  /**
   * Get all teams for a game
   */
  async getGameTeams(game_token: string): Promise<Team[]> {
    // Validate game token
    validateGameToken(game_token);

    // Get game
    const game = await gameService.getGameByToken(game_token);
    if (!game) {
      throw new Error('Game not found');
    }

    // Get teams
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('game_id', game.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[TeamService] Failed to get teams:', error);
      throw new Error('Failed to get teams');
    }

    return data || [];
  },

  /**
   * Get team by ID
   */
  async getTeamById(id: string): Promise<Team | null> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('[TeamService] Failed to get team:', error);
      throw new Error('Failed to get team');
    }

    return data;
  },

  /**
   * Update team
   */
  async updateTeam(id: string, params: UpdateTeamParams): Promise<Team> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Validate and add name if provided
    if (params.name !== undefined) {
      if (!params.name || params.name.trim().length === 0) {
        throw new Error('Team name cannot be empty');
      }
      if (params.name.trim().length > 50) {
        throw new Error('Team name must be 50 characters or less');
      }
      updateData.name = params.name.trim();
    }

    // Validate and add color if provided
    if (params.color !== undefined) {
      validateHexColor(params.color);
      updateData.color = params.color.toUpperCase();
    }

    const { data, error } = await supabaseAdmin
      .from('teams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[TeamService] Failed to update team:', error);
      throw new Error('Failed to update team');
    }

    if (!data) {
      throw new Error('Team not found');
    }

    return data;
  },

  /**
   * Delete a team
   */
  async deleteTeam(id: string): Promise<void> {
    // Unassign all participants from this team first
    const { error: unassignError } = await supabaseAdmin
      .from('participants')
      .update({ team_id: null })
      .eq('team_id', id);

    if (unassignError) {
      console.error('[TeamService] Failed to unassign participants:', unassignError);
      throw new Error('Failed to unassign participants from team');
    }

    // Delete team
    const { error } = await supabaseAdmin
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[TeamService] Failed to delete team:', error);
      throw new Error('Failed to delete team');
    }
  },

  /**
   * Assign participants to a team
   */
  async assignParticipants(team_id: string, participant_ids: string[]): Promise<void> {
    if (!participant_ids || participant_ids.length === 0) {
      throw new Error('At least one participant ID is required');
    }

    // Verify team exists
    const team = await this.getTeamById(team_id);
    if (!team) {
      throw new Error('Team not found');
    }

    // Assign all participants to the team
    const { error } = await supabaseAdmin
      .from('participants')
      .update({ team_id, updated_at: new Date().toISOString() })
      .in('id', participant_ids);

    if (error) {
      console.error('[TeamService] Failed to assign participants:', error);
      throw new Error('Failed to assign participants to team');
    }
  },

  /**
   * Unassign participant from team
   */
  async unassignParticipant(participant_id: string): Promise<void> {
    await participantService.assignToTeam(participant_id, null);
  },

  /**
   * Get team participants count
   */
  async getTeamParticipantsCount(team_id: string): Promise<number> {
    const { count, error } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', team_id);

    if (error) {
      console.error('[TeamService] Failed to count team participants:', error);
      throw new Error('Failed to count team participants');
    }

    return count || 0;
  },

  /**
   * Verify team belongs to game
   */
  async verifyTeamBelongsToGame(team_id: string, game_id: string): Promise<boolean> {
    const team = await this.getTeamById(team_id);
    return team?.game_id === game_id;
  },
};
