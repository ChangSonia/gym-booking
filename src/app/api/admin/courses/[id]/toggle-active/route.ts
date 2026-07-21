import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/line-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const courseId = Number(id);
  const { idToken, active } = await req.json();

  if (!idToken || !Number.isInteger(courseId) || typeof active !== "boolean") {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  try {
    await requireAdmin(idToken);
  } catch (e) {
    return authErrorResponse(e);
  }

  const { error } = await supabaseAdmin
    .from("courses")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", courseId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
