import { supabase } from '@/lib/db/supabase';
import { supabaseAdmin } from '@/lib/db/supabaseAdmin';
import type { Game, GameInsert } from '@/lib/db/schema';
import { generateUniqueGameToken } from '@/lib/utils/tokenGenerator';
import { validateGameToken } from '@/lib/utils/validation';

type GameType = 'button';

export interface CreateGameParams {
  admin_id: string;
  game_type: GameType;
}

export interface UpdateGameParams {
  game_type?: GameType;
}

/**
 * Game Service
 * Handles all game-related business logic
 */
export const gameService = {
  /**
   * Create a new game with a unique token
   */
  async createGame(params: CreateGameParams): Promise<Game> {
    const { admin_id, game_type } = params;

    // Generate unique game token
    const token = await generateUniqueGameToken();

    // Insert game into database
    const { data, error } = await supabaseAdmin
      .from('games')
      .insert({
        token,
        admin_id,
        game_type,
      })
      .select()
      .single();

    if (error) {
      console.error('[GameService] Failed to create game:', error);
      throw new Error('Failed to create game');
    }

    if (!data) {
      throw new Error('Game created but no data returned');
    }

    return data;
  },

  /**
   * Get game by token
   */
  async getGameByToken(token: string): Promise<Game | null> {
    // Validate token format
    try {
      validateGameToken(token);
    } catch (error) {
      return null;
    }

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('token', token)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('[GameService] Failed to get game:', error);
      throw new Error('Failed to get game');
    }

    return data;
  },

  /**
   * Update game settings
   */
  async updateGame(token: string, params: UpdateGameParams): Promise<Game> {
    // Validate token format
    validateGameToken(token);

    const { data, error } = await supabaseAdmin
      .from('games')
      .update({
        ...params,
        updated_at: new Date().toISOString(),
      })
      .eq('token', token)
      .select()
      .single();

    if (error) {
      console.error('[GameService] Failed to update game:', error);
      throw new Error('Failed to update game');
    }

    if (!data) {
      throw new Error('Game not found');
    }

    return data;
  },

  /**
   * Delete a game and all associated data
   */
  async deleteGame(token: string): Promise<void> {
    // Validate token format
    validateGameToken(token);

    // Delete game (cascades to teams, participants, rounds via ON DELETE CASCADE)
    const { error } = await supabaseAdmin
      .from('games')
      .delete()
      .eq('token', token);

    if (error) {
      console.error('[GameService] Failed to delete game:', error);
      throw new Error('Failed to delete game');
    }
  },

  /**
   * Check if game exists and is active
   */
  async isGameActive(token: string): Promise<boolean> {
    const game = await this.getGameByToken(token);
    return game !== null;
  },

  /**
   * Get all games for an admin
   */
  async getAdminGames(admin_id: string): Promise<Game[]> {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('admin_id', admin_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GameService] Failed to get admin games:', error);
      throw new Error('Failed to get admin games');
    }

    return data || [];
  },

  /**
   * Verify admin owns the game
   */
  async verifyAdminOwnership(token: string, admin_id: string): Promise<boolean> {
    const game = await this.getGameByToken(token);
    return game?.admin_id === admin_id;
  },
};
