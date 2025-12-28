import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente admin (server-side only)
// Bypassa RLS - usar APENAS em API routes do servidor
// NUNCA importe este arquivo em componentes client-side!
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRole!,
  {
    auth: {
      persistSession: false
    }
  }
);
