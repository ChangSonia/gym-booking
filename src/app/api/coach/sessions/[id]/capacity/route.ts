import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCoach, AuthError } from "@/lib/line-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);
  const { idToken, capacity } = await req.json();

  if (!idToken || !Number.isInteger(sessionId) || !Number.isInteger(capacity)) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  try {
    await requireCoach(idToken);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { error: e.message },
        { status: e.message === "FORBIDDEN" ? 403 : 401 },
      );
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  const { data: current, error: fetchError } = await supabaseAdmin
    .from("sessions")
    .select("capacity")
    .eq("id", sessionId)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
  }

  // 名額只增不減，這裡是最後一道防線（前端本來就不會讓人按出更小的數字）
  if (capacity <= current.capacity) {
    return NextResponse.json(
      { error: "CAPACITY_CANNOT_DECREASE" },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin
    .from("sessions")
    .update({ capacity, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, capacity });
}
