import { supabaseAdmin } from "@/lib/supabase-admin";

type SessionRow = {
  id: number;
  title: string;
  starts_at: string;
  capacity: number;
  coaches: { name: string } | null;
};

const dateFmt = new Intl.DateTimeFormat("zh-TW", {
  timeZone: "Asia/Taipei",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default async function Home() {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("id, title, starts_at, capacity, coaches(name)")
    .eq("status", "scheduled")
    .eq("archived", false)
    .order("starts_at", { ascending: true })
    .limit(20)
    .returns<SessionRow[]>();

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        課表（測試讀取）
      </h1>

      {error && (
        <p style={{ color: "#C8102E" }}>
          讀取失敗：{error.message}
        </p>
      )}

      {!error && (!data || data.length === 0) && <p>沒有資料。</p>}

      {!error && data && data.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {data.map((s) => (
            <li
              key={s.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              <div style={{ fontWeight: 600 }}>{s.title}</div>
              <div style={{ fontSize: 14, color: "#555" }}>
                {dateFmt.format(new Date(s.starts_at))} ・ {s.coaches?.name ?? "待定"} ・ 上限 {s.capacity} 人
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
