import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendTomorrowReminders } from "@/lib/reminders";
import { generateSessions } from "@/lib/scheduler";

// Vercel Cron 每天固定時間打這支 API（見 vercel.json），
// 自動帶 Authorization: Bearer <CRON_SECRET> —— 防止別人亂打這個 endpoint
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let generated: number;
  try {
    generated = await generateSessions();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GENERATE_FAILED" },
      { status: 500 },
    );
  }

  const { data: archived, error: archiveError } = await supabaseAdmin.rpc(
    "archive_old_sessions",
  );

  if (archiveError) {
    return NextResponse.json({ error: archiveError.message }, { status: 500 });
  }

  let reminded = 0;
  try {
    reminded = await sendTomorrowReminders();
  } catch (e) {
    console.error("sendTomorrowReminders failed", e);
  }

  return NextResponse.json({ generated, archived, reminded });
}
