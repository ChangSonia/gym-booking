// 純日曆日期運算一律用字串處理，不要用 Date 物件的 local getter（getDay/getDate 等）
// 那些回傳的是「執行環境時區」的值，使用者手機時區跟伺服器不同就會挪一天。
// 這裡固定用 Asia/Taipei 當錨點時區來格式化／解析。

const TZ = "Asia/Taipei";

const ymdFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const weekdayFmt = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TZ,
  weekday: "short",
});
const monthDayFmt = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TZ,
  month: "numeric",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** timestamptz(ISO) → 台北時間的 YYYY-MM-DD */
export function taipeiYmd(iso: string): string {
  return ymdFmt.format(new Date(iso));
}

/** 純日期字串（YYYY-MM-DD）→ 星期幾（週一...週日），UTC 錨點解析，不受時區影響 */
export function weekdayLabelOfYmd(ymd: string): string {
  return weekdayFmt.format(new Date(`${ymd}T12:00:00+08:00`));
}

const WEEKDAY_CHARS = ["日", "一", "二", "三", "四", "五", "六"];

/** 純日期字串（YYYY-MM-DD）→ 單字星期（給「7/16（四）」這種文案用） */
export function weekdayCharOfYmd(ymd: string): string {
  const anchor = new Date(`${ymd}T00:00:00Z`);
  return WEEKDAY_CHARS[anchor.getUTCDay()];
}

/** 純日期字串（YYYY-MM-DD）→「7/16」 */
export function monthDayLabelOfYmd(ymd: string): string {
  return monthDayFmt.format(new Date(`${ymd}T12:00:00+08:00`));
}

export function taipeiTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function taipeiMonthDayTime(iso: string): string {
  return `${monthDayFmt.format(new Date(iso))} ${timeFmt.format(new Date(iso))}`;
}

function addDaysToYmd(ymd: string, days: number): string {
  const anchor = new Date(`${ymd}T00:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return anchor.toISOString().slice(0, 10);
}

/** 這週一（台北時間）的 YYYY-MM-DD */
export function taipeiThisMonday(): string {
  const todayYmd = ymdFmt.format(new Date());
  const anchor = new Date(`${todayYmd}T00:00:00Z`);
  const dow = anchor.getUTCDay(); // 0=Sun..6=Sat，UTC 錨點解析，跟伺服器時區無關
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  return addDaysToYmd(todayYmd, diffToMonday);
}

/** 從某天開始連續 n 天的 YYYY-MM-DD 陣列 */
export function ymdRange(startYmd: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDaysToYmd(startYmd, i));
}

/** 台北時區的日期邊界（給 Supabase timestamptz 查詢用）。台灣沒有日光節約時間，+08:00 全年固定 */
export function taipeiDayBoundaryISO(ymd: string): string {
  return `${ymd}T00:00:00+08:00`;
}
