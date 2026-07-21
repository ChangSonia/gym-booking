import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCoach, authErrorResponse } from "@/lib/line-auth";
import { notifyPromoted } from "@/lib/line-messaging";

// 教練幫某位學員取消報名（名單旁邊的「取消」按鈕）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bookingId = Number(id);
  const { idToken } = await req.json();

  if (!idToken || !Number.isInteger(bookingId)) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  let coach;
  try {
    coach = await requireCoach(idToken);
  } catch (e) {
    return authErrorResponse(e);
  }

  const { data: booking, error: fetchError } = await supabaseAdmin
    .from("bookings")
    .select("id, session_id")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: "BOOKING_NOT_FOUND" }, { status: 404 });
  }

  const { data: promoted, error } = await supabaseAdmin.rpc("cancel_booking", {
    p_booking_id: bookingId,
    p_actor_id: coach.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await notifyPromoted(booking.session_id, promoted ?? []);

  return NextResponse.json({ ok: true });
}
