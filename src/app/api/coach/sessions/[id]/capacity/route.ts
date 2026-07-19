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

  if (capacity < 1) {
    return NextResponse.json({ error: "INVALID_CAPACITY" }, { status: 400 });
  }

  const { data: confirmedBookings, error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .select("qty")
    .eq("session_id", sessionId)
    .eq("status", "confirmed");

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500 });
  }

  const confirmedTotal = (confirmedBookings ?? []).reduce(
    (sum, b) => sum + b.qty,
    0,
  );

  // 名額可以減少，但不能低於目前已確認的人數——這樣永遠不會有「要踢誰」的情況
  if (capacity < confirmedTotal) {
    return NextResponse.json(
      { error: "CAPACITY_BELOW_CONFIRMED" },
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
