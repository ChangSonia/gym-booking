import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCoach, authErrorResponse } from "@/lib/line-auth";
import { sendLinePush, formatSessionLine, getSessionLineInfo } from "@/lib/line-messaging";

// 教練幫學員代報名，booked_by 記錄操作者（稽核用）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);
  const { idToken, userId, qty } = await req.json();

  if (
    !idToken ||
    !Number.isInteger(sessionId) ||
    !Number.isInteger(userId) ||
    !Number.isInteger(qty)
  ) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }
  if (qty < 1 || qty > 4) {
    return NextResponse.json({ error: "INVALID_QTY" }, { status: 400 });
  }

  let coach;
  try {
    coach = await requireCoach(idToken);
  } catch (e) {
    return authErrorResponse(e);
  }

  const { data, error } = await supabaseAdmin.rpc("book_session", {
    p_session_id: sessionId,
    p_user_id: userId,
    p_qty: qty,
    p_booked_by: coach.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const row = Array.isArray(data) ? data[0] : data;

  // 本人不在螢幕前，跟自己報名不一樣，值得推播通知
  const { data: target } = await supabaseAdmin
    .from("users")
    .select("line_user_id")
    .eq("id", userId)
    .single();

  if (target?.line_user_id) {
    const sessionInfo = await getSessionLineInfo(sessionId);
    if (sessionInfo) {
      const line = formatSessionLine(
        sessionInfo.title,
        sessionInfo.coaches?.name ?? null,
        sessionInfo.starts_at,
      );
      const text =
        row.out_status === "confirmed"
          ? `✅ 教練幫您報名成功\n${line}`
          : `🕒 教練幫您候補\n${line}\n前面尚有 ${Math.max(0, (row.out_position ?? 1) - 1)} 位候補`;
      await sendLinePush(target.line_user_id, text);
    }
  }

  return NextResponse.json({ status: row.out_status, position: row.out_position });
}
