import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

// 週數從 settings.weeks_generate 動態讀，不寫死——老闆要能自己改，不用找工程師
export async function generateSessions(): Promise<number> {
  const { data: weeksSetting } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "weeks_generate")
    .maybeSingle();

  const weeks = weeksSetting?.value ? parseInt(weeksSetting.value, 10) : 3;

  const { data, error } = await supabaseAdmin.rpc("generate_sessions", {
    p_weeks: Number.isFinite(weeks) && weeks > 0 ? weeks : 3,
  });

  if (error) throw new Error(error.message);
  return data ?? 0;
}
