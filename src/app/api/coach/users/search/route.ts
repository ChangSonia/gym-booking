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

  // 沒打字的時候給一份預設名單（最近活躍的人），而不是空的——
  // 這樣一開啟就像個下拉選單，打字才是用來縮小範圍
  let builder = supabaseAdmin
    .from("users")
    .select("id, display_name, picture_url")
    .order(q ? "display_name" : "last_seen_at", { ascending: !!q })
    .limit(30);

  if (q) {
    builder = builder.ilike("display_name", `%${q}%`);
  }

  const { data, error } = await builder;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}
