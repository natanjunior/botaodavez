import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

// Cliente público (frontend + backend)
// Usa Row-Level Security (RLS) do Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente admin (server-side only)
// Bypassa RLS - usar apenas em API routes do servidor
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRole!,
  {
    auth: {
      persistSession: false
    }
  }
);
