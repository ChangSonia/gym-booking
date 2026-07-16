import LiffAuthProvider from "@/components/LiffAuthProvider";
import LiffLogin from "@/components/LiffLogin";
import SessionCard from "@/components/SessionCard";
import { getScheduleDays } from "@/lib/schedule";
import { weekdayCharOfYmd } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function Home() {
  const days = await getScheduleDays();

  return (
    <LiffAuthProvider>
      <main className="mx-auto w-full max-w-md px-4 py-6">
        <h1 className="mb-4 text-xl font-bold">課表</h1>

        <LiffLogin />

        <div className="flex flex-col gap-4">
          {days.map((day) => (
            <div key={day.ymd}>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-sm font-semibold text-gray-700">
                  {day.weekdayLabel}
                </span>
                <span className="text-sm text-gray-400">
                  {day.monthDayLabel}
                </span>
              </div>

              {day.sessions.length === 0 ? (
                <p className="text-sm text-gray-300">今天沒有課</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {day.sessions.map((s) => (
                    <SessionCard
                      key={s.id}
                      sessionId={s.id}
                      title={s.title}
                      time={s.time}
                      dateTimeLabel={`${day.monthDayLabel}（${weekdayCharOfYmd(day.ymd)}）${s.time}`}
                      status={s.status}
                      mainLabel={s.mainLabel}
                      subLabel={s.subLabel}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </LiffAuthProvider>
  );
}
