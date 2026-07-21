import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  taipeiYmd,
  taipeiTime,
  taipeiMonthDayTime,
  taipeiToday,
  weekdayLabelOfYmd,
  monthDayLabelOfYmd,
  taipeiThisMonday,
  taipeiDayBoundaryISO,
  ymdRange,
} from "@/lib/date";

export type ChipStatus = "open" | "low" | "full" | "not_open";

export type SessionChip = {
  id: number;
  title: string;
  time: string;
  status: ChipStatus;
  mainLabel: string;
  subLabel: string;
};

export type DayGroup = {
  ymd: string;
  weekdayLabel: string;
  monthDayLabel: string;
  sessions: SessionChip[];
};

type RawSession = {
  id: number;
  title: string;
  starts_at: string;
  capacity: number;
  open_at: string;
};

type RawBooking = {
  session_id: number;
  status: "confirmed" | "waitlisted";
  qty: number;
};

async function getWeeksVisible(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "weeks_visible")
    .maybeSingle();

  const n = data?.value ? parseInt(data.value, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 2;
}

export async function getScheduleDays(): Promise<DayGroup[]> {
  const weeksVisible = await getWeeksVisible();
  const days = weeksVisible * 7;
  const monday = taipeiThisMonday();
  const end = taipeiDayBoundaryISO(ymdRange(monday, days + 1)[days]);
  const nowIso = new Date().toISOString();

  const { data: sessions, error: sessionsError } = await supabaseAdmin
    .from("sessions")
    .select("id, title, starts_at, capacity, open_at")
    .eq("status", "scheduled")
    .eq("archived", false)
    // 已經開始的課不顯示——不能只靠每天跑一次的歸檔工作，那個有一天的延遲
    .gte("starts_at", nowIso)
    .lt("starts_at", end)
    .order("starts_at", { ascending: true })
    .returns<RawSession[]>();

  if (sessionsError) throw new Error(sessionsError.message);

  const sessionIds = (sessions ?? []).map((s) => s.id);

  let bookings: RawBooking[] = [];
  if (sessionIds.length > 0) {
    const { data: bookingRows, error: bookingsError } = await supabaseAdmin
      .from("bookings")
      .select("session_id, status, qty")
      .in("session_id", sessionIds)
      .in("status", ["confirmed", "waitlisted"])
      .returns<RawBooking[]>();

    if (bookingsError) throw new Error(bookingsError.message);
    bookings = bookingRows ?? [];
  }

  const usedBySession = new Map<number, { confirmed: number; waitlisted: number }>();
  for (const b of bookings) {
    const cur = usedBySession.get(b.session_id) ?? { confirmed: 0, waitlisted: 0 };
    if (b.status === "confirmed") cur.confirmed += b.qty;
    else cur.waitlisted += b.qty;
    usedBySession.set(b.session_id, cur);
  }

  const now = new Date();
  const byYmd = new Map<string, SessionChip[]>();

  for (const s of sessions ?? []) {
    const ymd = taipeiYmd(s.starts_at);
    const used = usedBySession.get(s.id) ?? { confirmed: 0, waitlisted: 0 };
    const remaining = s.capacity - used.confirmed;

    let status: ChipStatus;
    let mainLabel: string;
    let subLabel: string;

    if (now < new Date(s.open_at)) {
      status = "not_open";
      mainLabel = "尚未開放報名";
      subLabel = `${taipeiMonthDayTime(s.open_at)} 開放`;
    } else if (remaining <= 0) {
      status = "full";
      mainLabel = "已額滿";
      subLabel = used.waitlisted > 0 ? `${used.waitlisted} 人候補中` : "已額滿";
    } else if (remaining <= 3) {
      status = "low";
      mainLabel = `剩 ${remaining} 位`;
      subLabel = `上限 ${s.capacity} 人`;
    } else {
      status = "open";
      mainLabel = `剩 ${remaining} 位`;
      subLabel = `上限 ${s.capacity} 人`;
    }

    const chip: SessionChip = {
      id: s.id,
      title: s.title,
      time: taipeiTime(s.starts_at),
      status,
      mainLabel,
      subLabel,
    };

    const arr = byYmd.get(ymd) ?? [];
    arr.push(chip);
    byYmd.set(ymd, arr);
  }

  const todayYmd = taipeiToday();

  // 已經過去的日期不顯示（不是只藏課程，連那一天的列都不要出現）
  return ymdRange(monday, days)
    .filter((ymd) => ymd >= todayYmd)
    .map((ymd) => ({
      ymd,
      weekdayLabel: weekdayLabelOfYmd(ymd),
      monthDayLabel: monthDayLabelOfYmd(ymd),
      sessions: byYmd.get(ymd) ?? [],
    }));
}
