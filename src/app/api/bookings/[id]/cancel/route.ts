import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveLineUser, AuthError } from "@/lib/line-auth";

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

  let user;
  try {
    user = await resolveLineUser(idToken);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  // 只能取消自己的報名——絕對不能信任前端傳來的 booking id 就直接放行
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from("bookings")
    .select("id, user_id")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: "BOOKING_NOT_FOUND" }, { status: 404 });
  }
  if (booking.user_id !== user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { error } = await supabaseAdmin.rpc("cancel_booking", {
    p_booking_id: bookingId,
    p_actor_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
