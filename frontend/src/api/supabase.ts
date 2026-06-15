import { createClient } from "@supabase/supabase-js";

// Read from Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Only initialize if environment variables are provided
export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

if (supabase) {
  console.log("🔌 Supabase client successfully initialized.");
} else {
  console.warn("⚠️ Supabase credentials missing. Running in Mock Database mode.");
}
