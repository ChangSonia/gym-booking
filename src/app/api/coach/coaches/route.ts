import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCoach, authErrorResponse } from "@/lib/line-auth";
import type { CoachOption } from "@/lib/coach-types";

// 給教練後台的「編輯課程」視窗用（換教練的下拉選單）
// 教練名單的新增/改名/刪除是管理員的事，這裡只讀
export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  if (!idToken) {
    return NextResponse.json({ error: "MISSING_ID_TOKEN" }, { status: 400 });
  }

  try {
    await requireCoach(idToken);
  } catch (e) {
    return authErrorResponse(e);
  }

  const { data, error } = await supabaseAdmin
    .from("coaches")
    .select("id, name")
    .order("name", { ascending: true })
    .returns<CoachOption[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ coaches: data ?? [] });
}
