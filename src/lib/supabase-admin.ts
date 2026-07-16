import "server-only";
import { createClient } from "@supabase/supabase-js";

// service_role key，繞過 RLS。只能在伺服器端（Server Component / Route Handler）使用。
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
