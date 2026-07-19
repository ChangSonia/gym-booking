import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveLineUser, AuthError } from "@/lib/line-auth";
import { sendLinePush } from "@/lib/line-messaging";
import { taipeiMonthDayTime } from "@/lib/date";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bookingId = Number(id);
  const { idToken } = await req.json();

  if (!idToken || !Number.isInteger(bookingId)) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  let user;
  try {
    user = await resolveLineUser(idToken);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  // 只能取消自己的報名——絕對不能信任前端傳來的 booking id 就直接放行
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from("bookings")
    .select("id, user_id, session_id")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: "BOOKING_NOT_FOUND" }, { status: 404 });
  }
  if (booking.user_id !== user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { data: promoted, error } = await supabaseAdmin.rpc("cancel_booking", {
    p_booking_id: bookingId,
    p_actor_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // 有人從候補遞補成正式報名，通知他們
  if (promoted && promoted.length > 0) {
    const { data: sessionInfo } = await supabaseAdmin
      .from("sessions")
      .select("title, starts_at")
      .eq("id", booking.session_id)
      .single();

    const userIds = promoted.map((b: { user_id: number }) => b.user_id);
    const { data: promotedUsers } = await supabaseAdmin
      .from("users")
      .select("id, line_user_id")
      .in("id", userIds);

    if (sessionInfo && promotedUsers) {
      const when = taipeiMonthDayTime(sessionInfo.starts_at);
      for (const u of promotedUsers) {
        await sendLinePush(
          u.line_user_id,
          `🎉 候補遞補成功\n${sessionInfo.title}　${when}\n你已經確認報名了！`,
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
