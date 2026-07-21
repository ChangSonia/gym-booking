import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/line-auth";
import type { CoachRow } from "@/lib/admin-types";

export async function POST(req: NextRequest) {
  const { idToken, name } = await req.json();
  if (!idToken || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  try {
    await requireAdmin(idToken);
  } catch (e) {
    return authErrorResponse(e);
  }

  const { data, error } = await supabaseAdmin
    .from("coaches")
    .insert({ name: name.trim() })
    .select("id, name, active, user_id")
    .single<CoachRow>();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "NAME_TAKEN" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ coach: data });
}
