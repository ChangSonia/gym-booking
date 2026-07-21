import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendLinePush } from "@/lib/line-messaging";
import { taipeiTomorrowRangeISO, taipeiMonthDayTime } from "@/lib/date";

type SessionRow = {
  id: number;
  title: string;
  starts_at: string;
};

type BookingRow = {
  users: { line_user_id: string } | null;
};

// 提醒「明天」有課的人（只提醒 confirmed，候補的人還沒真的上到課）
// 用 reminder_sent 記錄發過了沒，排程器一天跑好幾次也不會重複發
export async function sendTomorrowReminders(): Promise<number> {
  const { start, end } = taipeiTomorrowRangeISO();

  const { data: sessions, error } = await supabaseAdmin
    .from("sessions")
    .select("id, title, starts_at")
    .eq("status", "scheduled")
    .eq("archived", false)
    .eq("reminder_sent", false)
    .gte("starts_at", start)
    .lt("starts_at", end)
    .returns<SessionRow[]>();

  if (error) throw new Error(error.message);
  if (!sessions || sessions.length === 0) return 0;

  for (const session of sessions) {
    const { data: bookings } = await supabaseAdmin
      .from("bookings")
      .select("users!bookings_user_id_fkey(line_user_id)")
      .eq("session_id", session.id)
      .eq("status", "confirmed")
      .returns<BookingRow[]>();

    const when = taipeiMonthDayTime(session.starts_at);
    for (const b of bookings ?? []) {
      if (b.users?.line_user_id) {
        await sendLinePush(
          b.users.line_user_id,
          `⏰ 課前提醒\n${session.title}　${when}\n明天有你的課，別忘了！`,
        );
      }
    }

    await supabaseAdmin
      .from("sessions")
      .update({ reminder_sent: true })
      .eq("id", session.id);
  }

  return sessions.length;
}
