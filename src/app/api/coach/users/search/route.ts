import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCoach, authErrorResponse } from "@/lib/line-auth";

// 幫學員代報名時搜尋會員用——只能從「已經登入過系統的人」裡面選
export async function POST(req: NextRequest) {
  const { idToken, query } = await req.json();
  if (!idToken || typeof query !== "string") {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  try {
    await requireCoach(idToken);
  } catch (e) {
    return authErrorResponse(e);
  }

  const q = query.trim();
  if (!q) {
    return NextResponse.json({ users: [] });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, display_name, picture_url")
    .ilike("display_name", `%${q}%`)
    .order("display_name", { ascending: true })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}
