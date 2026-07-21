import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveLineUser, AuthError } from "@/lib/line-auth";
import { notifyPromoted } from "@/lib/line-messaging";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bookingId = Number(id);
  const { idToken, qty } = await req.json();

  if (!idToken || !Number.isInteger(bookingId) || !Number.isInteger(qty)) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }
  if (qty < 1 || qty > 4) {
    return NextResponse.json({ error: "INVALID_QTY" }, { status: 400 });
  }

  let user;
  try {
    user = await resolveLineUser(idToken);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  // 只能改自己的報名——絕對不能信任前端傳來的 booking id 就直接放行
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from("bookings")
    .select("id, user_id, session_id")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: "BOOKING_NOT_FOUND" }, { status: 404 });
  }
  if (booking.user_id !== user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { data: rows, error } = await supabaseAdmin.rpc("edit_booking_qty", {
    p_booking_id: bookingId,
    p_actor_id: user.id,
    p_qty: qty,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // edit_booking_qty 回傳「自己那筆」+「因此被遞補的候補」，濾掉自己那筆才是被遞補的人
  const promoted = (rows ?? []).filter(
    (r: { id: number }) => r.id !== bookingId,
  );
  await notifyPromoted(booking.session_id, promoted);

  return NextResponse.json({ ok: true });
}
