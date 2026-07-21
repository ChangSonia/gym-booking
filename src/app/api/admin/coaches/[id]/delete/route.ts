import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/line-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const coachId = Number(id);
  const { idToken } = await req.json();

  if (!idToken || !Number.isInteger(coachId)) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  try {
    await requireAdmin(idToken);
  } catch (e) {
    return authErrorResponse(e);
  }

  // 名下的課 coach_id 會被資料庫的 ON DELETE SET NULL 自動設成 NULL，
  // 會員端和教練後台都會顯示「待定」——這是產品決策，誠實比隱藏好
  const { error } = await supabaseAdmin
    .from("coaches")
    .delete()
    .eq("id", coachId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
