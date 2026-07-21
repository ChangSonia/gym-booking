import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/line-auth";
import type { AdminUserRow } from "@/lib/admin-types";

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  if (!idToken) {
    return NextResponse.json({ error: "MISSING_ID_TOKEN" }, { status: 400 });
  }

  try {
    await requireAdmin(idToken);
  } catch (e) {
    return authErrorResponse(e);
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, display_name, picture_url, is_coach, is_admin")
    .order("created_at", { ascending: true })
    .returns<AdminUserRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}
