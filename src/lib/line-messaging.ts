import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { taipeiWeekdayMonthDayTime } from "@/lib/date";

// 推播失敗不該擋住報名/停課本身的流程（那些已經成功了），這裡只是盡力通知
export async function sendLinePush(lineUserId: string, text: string): Promise<void> {
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  if (!token) return; // 還沒設定推播金鑰之前先不推，不要讓其他功能因此掛掉

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text }],
      }),
    });
    if (!res.ok) {
      console.error("LINE push failed", res.status, await res.text());
    }
  } catch (e) {
    console.error("LINE push error", e);
  }
}

// 推播訊息裡的課程資訊統一格式：課名、教練、星期幾＋時間
export function formatSessionLine(
  title: string,
  coachName: string | null,
  startsAtIso: string,
): string {
  return `${title}　${coachName ?? "待定"}教練\n${taipeiWeekdayMonthDayTime(startsAtIso)}`;
}

type SessionWithCoach = {
  title: string;
  starts_at: string;
  coaches: { name: string } | null;
};

export async function getSessionLineInfo(
  sessionId: number,
): Promise<SessionWithCoach | null> {
  const { data } = await supabaseAdmin
    .from("sessions")
    .select("title, starts_at, coaches(name)")
    .eq("id", sessionId)
    .single<SessionWithCoach>();
  return data ?? null;
}

// 取消/改人數之後，如果有候補的人遞補成正式報名，通知他們
export async function notifyPromoted(
  sessionId: number,
  promoted: { user_id: number }[],
): Promise<void> {
  if (promoted.length === 0) return;

  const sessionInfo = await getSessionLineInfo(sessionId);
  if (!sessionInfo) return;

  const userIds = promoted.map((b) => b.user_id);
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, line_user_id")
    .in("id", userIds);
  if (!users) return;

  const line = formatSessionLine(
    sessionInfo.title,
    sessionInfo.coaches?.name ?? null,
    sessionInfo.starts_at,
  );
  for (const u of users) {
    await sendLinePush(
      u.line_user_id,
      `🎉 候補遞補成功\n${line}\n您已經確認報名了！`,
    );
  }
}

// 通知一堂課所有 confirmed/waitlisted 的人（例如換教練時）
export async function notifySessionMembers(
  sessionId: number,
  text: string,
): Promise<void> {
  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("users!bookings_user_id_fkey(line_user_id)")
    .eq("session_id", sessionId)
    .in("status", ["confirmed", "waitlisted"]);

  if (!bookings) return;

  for (const b of bookings as unknown as {
    users: { line_user_id: string } | null;
  }[]) {
    if (b.users?.line_user_id) {
      await sendLinePush(b.users.line_user_id, text);
    }
  }
}
