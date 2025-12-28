/**
 * Database schema types generated from Supabase
 * Based on migration: supabase/migrations/001_initial_schema.sql
 *
 * To regenerate: npx supabase gen types typescript --project-id mkofxzwsoytsxixljpwc > src/lib/db/schema.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      games: {
        Row: {
          id: string
          admin_id: string
          token: string
          game_type: Database['public']['Enums']['game_type']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          token: string
          game_type?: Database['public']['Enums']['game_type']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          token?: string
          game_type?: Database['public']['Enums']['game_type']
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          game_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          name: string
          color: string
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          name?: string
          color?: string
          created_at?: string
        }
      }
      participants: {
        Row: {
          id: string
          game_id: string
          team_id: string | null
          name: string
          avatar_seed: string | null
          is_online: boolean
          last_seen: string
          joined_at: string
        }
        Insert: {
          id?: string
          game_id: string
          team_id?: string | null
          name: string
          avatar_seed?: string | null
          is_online?: boolean
          last_seen?: string
          joined_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          team_id?: string | null
          name?: string
          avatar_seed?: string | null
          is_online?: boolean
          last_seen?: string
          joined_at?: string
        }
      }
      rounds: {
        Row: {
          id: string
          game_id: string
          status: 'waiting' | 'in_progress' | 'completed'
          countdown_duration: number | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          status?: 'waiting' | 'in_progress' | 'completed'
          countdown_duration?: number | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          status?: 'waiting' | 'in_progress' | 'completed'
          countdown_duration?: number | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      round_participants: {
        Row: {
          id: string
          round_id: string
          participant_id: string
          added_at: string
        }
        Insert: {
          id?: string
          round_id: string
          participant_id: string
          added_at?: string
        }
        Update: {
          id?: string
          round_id?: string
          participant_id?: string
          added_at?: string
        }
      }
      round_results: {
        Row: {
          id: string
          round_id: string
          participant_id: string
          reaction_time: number | null
          was_eliminated: boolean
          is_winner: boolean
          recorded_at: string
        }
        Insert: {
          id?: string
          round_id: string
          participant_id: string
          reaction_time?: number | null
          was_eliminated?: boolean
          is_winner?: boolean
          recorded_at?: string
        }
        Update: {
          id?: string
          round_id?: string
          participant_id?: string
          reaction_time?: number | null
          was_eliminated?: boolean
          is_winner?: boolean
          recorded_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      game_type: 'button'
    }
  }
}

// Helper types for easier access
export type Admin = Database['public']['Tables']['admins']['Row']
export type AdminInsert = Database['public']['Tables']['admins']['Insert']
export type AdminUpdate = Database['public']['Tables']['admins']['Update']

export type Game = Database['public']['Tables']['games']['Row']
export type GameInsert = Database['public']['Tables']['games']['Insert']
export type GameUpdate = Database['public']['Tables']['games']['Update']

export type Team = Database['public']['Tables']['teams']['Row']
export type TeamInsert = Database['public']['Tables']['teams']['Insert']
export type TeamUpdate = Database['public']['Tables']['teams']['Update']

export type Participant = Database['public']['Tables']['participants']['Row']
export type ParticipantInsert = Database['public']['Tables']['participants']['Insert']
export type ParticipantUpdate = Database['public']['Tables']['participants']['Update']

export type Round = Database['public']['Tables']['rounds']['Row']
export type RoundInsert = Database['public']['Tables']['rounds']['Insert']
export type RoundUpdate = Database['public']['Tables']['rounds']['Update']

export type RoundParticipant = Database['public']['Tables']['round_participants']['Row']
export type RoundParticipantInsert = Database['public']['Tables']['round_participants']['Insert']
export type RoundParticipantUpdate = Database['public']['Tables']['round_participants']['Update']

export type RoundResult = Database['public']['Tables']['round_results']['Row']
export type RoundResultInsert = Database['public']['Tables']['round_results']['Insert']
export type RoundResultUpdate = Database['public']['Tables']['round_results']['Update']
