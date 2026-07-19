import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCoach, AuthError } from "@/lib/line-auth";
import { sendLinePush } from "@/lib/line-messaging";
import { taipeiMonthDayTime } from "@/lib/date";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);
  const { idToken } = await req.json();

  if (!idToken || !Number.isInteger(sessionId)) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  try {
    await requireCoach(idToken);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { error: e.message },
        { status: e.message === "FORBIDDEN" ? 403 : 401 },
      );
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  // 恢復後 status 就不再是 session_cancelled 了，要先查一次名單再呼叫 RPC
  const { data: toRestore } = await supabaseAdmin
    .from("bookings")
    .select("users!bookings_user_id_fkey(line_user_id)")
    .eq("session_id", sessionId)
    .eq("status", "session_cancelled");

  const { error } = await supabaseAdmin.rpc("restore_session", {
    p_session_id: sessionId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: sessionInfo } = await supabaseAdmin
    .from("sessions")
    .select("title, starts_at")
    .eq("id", sessionId)
    .single();

  if (sessionInfo && toRestore) {
    const when = taipeiMonthDayTime(sessionInfo.starts_at);
    for (const b of toRestore as unknown as {
      users: { line_user_id: string } | null;
    }[]) {
      if (b.users?.line_user_id) {
        await sendLinePush(
          b.users.line_user_id,
          `✅ 恢復開課\n${sessionInfo.title}　${when}\n這堂課恢復了，你的報名／候補原樣保留。`,
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
