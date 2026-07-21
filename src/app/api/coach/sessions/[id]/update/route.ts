import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCoach, authErrorResponse } from "@/lib/line-auth";
import {
  notifyPromoted,
  notifySessionMembers,
  formatSessionLine,
} from "@/lib/line-messaging";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);
  const { idToken, capacity, coachId } = await req.json();

  if (
    !idToken ||
    !Number.isInteger(sessionId) ||
    !Number.isInteger(capacity) ||
    (coachId !== null && !Number.isInteger(coachId))
  ) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }
  if (capacity < 1) {
    return NextResponse.json({ error: "INVALID_CAPACITY" }, { status: 400 });
  }

  try {
    await requireCoach(idToken);
  } catch (e) {
    return authErrorResponse(e);
  }

  const { data: current, error: fetchError } = await supabaseAdmin
    .from("sessions")
    .select("capacity, coach_id, title, starts_at")
    .eq("id", sessionId)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
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

  const capacityIncreased = capacity > current.capacity;
  const coachChanged = coachId !== current.coach_id;

  const { error: updateError } = await supabaseAdmin
    .from("sessions")
    .update({ capacity, coach_id: coachId, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 名額變多，可能有候補的人現在塞得下了
  if (capacityIncreased) {
    const { data: promoted } = await supabaseAdmin.rpc("promote_waitlist", {
      p_session_id: sessionId,
    });
    await notifyPromoted(sessionId, promoted ?? []);
  }

  if (coachChanged) {
    const { data: newCoach } = coachId
      ? await supabaseAdmin.from("coaches").select("name").eq("id", coachId).single()
      : { data: null };
    const line = formatSessionLine(
      current.title,
      newCoach?.name ?? null,
      current.starts_at,
    );
    await notifySessionMembers(
      sessionId,
      `🔄 教練異動\n${line}\n已經報名／候補的人請留意。`,
    );
  }

  return NextResponse.json({ ok: true });
}
