import { NextRequest, NextResponse } from "next/server";
import { resolveLineUser, getMyLiveBookings, AuthError } from "@/lib/line-auth";

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  if (!idToken) {
    return NextResponse.json({ error: "MISSING_ID_TOKEN" }, { status: 400 });
  }

  try {
    const user = await resolveLineUser(idToken);
    const bookings = await getMyLiveBookings(user.id);
    return NextResponse.json({ user, bookings });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
