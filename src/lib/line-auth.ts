import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { AuthedUser, MyBooking } from "@/lib/auth-types";

export class AuthError extends Error {}

// 驗證 LIFF 拿到的 ID Token，取得可信的 line_user_id。
// 絕對不要相信前端直接傳來的 userId —— 任何需要身分的動作都要重新走這一關。
export async function resolveLineUser(idToken: string): Promise<AuthedUser> {
  const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: process.env.LINE_CHANNEL_ID!,
    }),
  });

  if (!verifyRes.ok) {
    throw new AuthError("INVALID_ID_TOKEN");
  }

  const payload = await verifyRes.json();
  const lineUserId: string = payload.sub;

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        line_user_id: lineUserId,
        display_name: payload.name ?? null,
        picture_url: payload.picture ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "line_user_id" },
    )
    .select("id, display_name, picture_url, is_coach, is_admin")
    .single();

  if (error || !user) {
    throw new AuthError("USER_UPSERT_FAILED");
  }

  return user;
}

export async function getMyLiveBookings(userId: number): Promise<MyBooking[]> {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id, session_id, qty, status, wl_position")
    .eq("user_id", userId)
    .in("status", ["confirmed", "waitlisted"])
    .returns<MyBooking[]>();

  if (error) throw new Error(error.message);
  return data ?? [];
}
