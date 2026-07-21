import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/line-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const coachId = Number(id);
  const { idToken, name } = await req.json();

  if (
    !idToken ||
    !Number.isInteger(coachId) ||
    typeof name !== "string" ||
    !name.trim()
  ) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  try {
    await requireAdmin(idToken);
  } catch (e) {
    return authErrorResponse(e);
  }

  const { error } = await supabaseAdmin
    .from("coaches")
    .update({ name: name.trim() })
    .eq("id", coachId);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "NAME_TAKEN" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
