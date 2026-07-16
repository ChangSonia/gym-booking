import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveLineUser, AuthError } from "@/lib/line-auth";

export async function POST(req: NextRequest) {
  const { idToken, sessionId, qty } = await req.json();

  if (!idToken || !sessionId || !qty) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }
  if (!Number.isInteger(qty) || qty < 1 || qty > 4) {
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

  const { data, error } = await supabaseAdmin.rpc("book_session", {
    p_session_id: sessionId,
    p_user_id: user.id,
    p_qty: qty,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ status: row.out_status, position: row.out_position });
}
