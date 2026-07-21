import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/line-auth";
import type { CourseRow } from "@/lib/admin-types";

type RawRow = {
  id: number;
  title: string;
  coach_id: number | null;
  weekday: number;
  start_time: string;
  capacity: number;
  active: boolean;
  coaches: { name: string } | null;
};

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  if (!idToken) {
    return NextResponse.json({ error: "MISSING_ID_TOKEN" }, { status: 400 });
  }

  try {
    await requireAdmin(idToken);
  } catch (e) {
    return authErrorResponse(e);
  }

  const { data, error } = await supabaseAdmin
    .from("courses")
    .select(
      "id, title, coach_id, weekday, start_time, capacity, active, coaches(name)",
    )
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true })
    .returns<RawRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const courses: CourseRow[] = (data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    coach_id: c.coach_id,
    coachName: c.coaches?.name ?? null,
    weekday: c.weekday,
    start_time: c.start_time,
    capacity: c.capacity,
    active: c.active,
  }));

  return NextResponse.json({ courses });
}
