import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// 驗證 LIFF 拿到的 ID Token，取得可信的 line_user_id
// 絕對不要相信前端直接傳來的 userId —— 一定要經過 LINE 這一關
export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  if (!idToken) {
    return NextResponse.json({ error: "MISSING_ID_TOKEN" }, { status: 400 });
  }

  const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: process.env.LINE_CHANNEL_ID!,
    }),
  });

  if (!verifyRes.ok) {
    return NextResponse.json({ error: "INVALID_ID_TOKEN" }, { status: 401 });
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user });
}
