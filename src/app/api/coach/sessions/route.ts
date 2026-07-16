import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCoach, AuthError } from "@/lib/line-auth";
import type { CoachSession } from "@/lib/coach-types";

type RawRow = {
  id: number;
  title: string;
  starts_at: string;
  capacity: number;
  status: "scheduled" | "cancelled";
  open_at: string;
  coaches: { name: string } | null;
  bookings: {
    id: number;
    qty: number;
    status: "confirmed" | "waitlisted" | "cancelled" | "session_cancelled";
    wl_position: number | null;
    users: { display_name: string | null } | null;
  }[];
};

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  if (!idToken) {
    return NextResponse.json({ error: "MISSING_ID_TOKEN" }, { status: 400 });
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

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select(
      "id, title, starts_at, capacity, status, open_at, coaches(name), bookings(id, qty, status, wl_position, users!bookings_user_id_fkey(display_name))",
    )
    .eq("archived", false)
    .order("starts_at", { ascending: true })
    .limit(100)
    .returns<RawRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sessions: CoachSession[] = (data ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    starts_at: s.starts_at,
    capacity: s.capacity,
    status: s.status,
    open_at: s.open_at,
    coachName: s.coaches?.name ?? null,
    bookings: (s.bookings ?? [])
      .filter((b) => b.status === "confirmed" || b.status === "waitlisted")
      .map((b) => ({
        id: b.id,
        qty: b.qty,
        status: b.status as "confirmed" | "waitlisted",
        wl_position: b.wl_position,
        display_name: b.users?.display_name ?? null,
      })),
  }));

  return NextResponse.json({ sessions });
}
