import "server-only";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { AuthedUser, MyBooking } from "@/lib/auth-types";

export class AuthError extends Error {}

// 共用的錯誤轉 HTTP response，FORBIDDEN 是權限不夠（403），其他都是身分驗證失敗（401）
export function authErrorResponse(e: unknown) {
  if (e instanceof AuthError) {
    return NextResponse.json(
      { error: e.message },
      { status: e.message === "FORBIDDEN" ? 403 : 401 },
    );
  }
  return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
}

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

// 教練權限一定要在後端驗證，前端說「我是教練」不算數
export async function requireCoach(idToken: string): Promise<AuthedUser> {
  const user = await resolveLineUser(idToken);
  if (!user.is_coach && !user.is_admin) {
    throw new AuthError("FORBIDDEN");
  }
  return user;
}

// 管理員權限（管教練名單、設定誰是教練）也一定要在後端驗證
export async function requireAdmin(idToken: string): Promise<AuthedUser> {
  const user = await resolveLineUser(idToken);
  if (!user.is_admin) {
    throw new AuthError("FORBIDDEN");
  }
  return user;
}

type RawMyBooking = {
  id: number;
  session_id: number;
  qty: number;
  status: "confirmed" | "waitlisted";
  wl_position: number | null;
  sessions: {
    title: string;
    starts_at: string;
    coaches: { name: string } | null;
  } | null;
};

export async function getMyLiveBookings(userId: number): Promise<MyBooking[]> {
  // 已經上過的課不顯示在「我的課表」，跟課表頁「不顯示過去」的規則一致
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, session_id, qty, status, wl_position, sessions!inner(title, starts_at, coaches(name))",
    )
    .eq("user_id", userId)
    .in("status", ["confirmed", "waitlisted"])
    .gte("sessions.starts_at", new Date().toISOString())
    .returns<RawMyBooking[]>();

  if (error) throw new Error(error.message);

  return (data ?? []).map((b) => ({
    id: b.id,
    session_id: b.session_id,
    qty: b.qty,
    status: b.status,
    wl_position: b.wl_position,
    session: b.sessions
      ? {
          title: b.sessions.title,
          starts_at: b.sessions.starts_at,
          coachName: b.sessions.coaches?.name ?? null,
        }
      : null,
  }));
}
