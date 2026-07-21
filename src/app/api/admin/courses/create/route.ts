import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/line-auth";
import { generateSessions } from "@/lib/scheduler";

export async function POST(req: NextRequest) {
  const { idToken, title, coachId, weekday, startTime, capacity } =
    await req.json();

  if (
    !idToken ||
    typeof title !== "string" ||
    !title.trim() ||
    !Number.isInteger(weekday) ||
    weekday < 1 ||
    weekday > 7 ||
    typeof startTime !== "string" ||
    !Number.isInteger(capacity) ||
    capacity < 1
  ) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  try {
    await requireAdmin(idToken);
  } catch (e) {
    return authErrorResponse(e);
  }

  const { data: course, error } = await supabaseAdmin
    .from("courses")
    .insert({
      title: title.trim(),
      coach_id: coachId ?? null,
      weekday,
      start_time: startTime,
      capacity,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 立刻排出未來場次，不用等明天的排程器才看得到新課
  let generated = 0;
  try {
    generated = await generateSessions();
  } catch (e) {
    console.error("generateSessions after course create failed", e);
  }

  return NextResponse.json({ ok: true, courseId: course.id, generated });
}
