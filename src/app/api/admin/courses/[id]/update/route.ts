import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/line-auth";

// 改模板：只影響「生效日之後、且還沒開放報名」的場次（apply_course_to_sessions）。
// 已開放報名的場次凍結，時間/名額/教練都不會被模板偷改。
// 注意：這裡不開放改 weekday——apply_course_to_sessions 只會套用新的
// title/coach/capacity/start_time 到「已排出場次自己原本的日期」上，
// 不會把場次搬到別的星期。真的要改星期，用停用舊模板 + 開新模板的方式。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const courseId = Number(id);
  const { idToken, title, coachId, startTime, capacity, effectiveDate } =
    await req.json();

  if (
    !idToken ||
    !Number.isInteger(courseId) ||
    typeof title !== "string" ||
    !title.trim() ||
    typeof startTime !== "string" ||
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    typeof effectiveDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)
  ) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  try {
    await requireAdmin(idToken);
  } catch (e) {
    return authErrorResponse(e);
  }

  const { error: updateError } = await supabaseAdmin
    .from("courses")
    .update({
      title: title.trim(),
      coach_id: coachId ?? null,
      start_time: startTime,
      capacity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", courseId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: applied, error: applyError } = await supabaseAdmin.rpc(
    "apply_course_to_sessions",
    { p_course_id: courseId, p_from: effectiveDate },
  );

  if (applyError) {
    return NextResponse.json({ error: applyError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, applied });
}
