import LiffLogin from "@/components/LiffLogin";
import { getScheduleDays, type ChipStatus } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const chipClasses: Record<ChipStatus, string> = {
  open: "bg-[#E4F4EA] text-[#1B7F4C]",
  low: "bg-[#FFF6E5] text-[#8A5D00]",
  full: "bg-[#FDE8EA] text-[#C8102E]",
  not_open: "bg-gray-100 text-gray-500",
};

export default async function Home() {
  const days = await getScheduleDays();

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">課表</h1>

      <LiffLogin />

      <div className="flex flex-col divide-y divide-gray-100">
        {days.map((day) => (
          <div key={day.ymd} className="py-3">
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-sm font-semibold text-gray-700">
                {day.weekdayLabel}
              </span>
              <span className="text-sm text-gray-400">{day.monthDayLabel}</span>
            </div>

            {day.sessions.length === 0 ? (
              <p className="text-sm text-gray-300">今天沒有課</p>
            ) : (
              <div className="flex flex-col gap-2">
                {day.sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {s.time}　{s.title}
                    </div>
                    <div
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-right ${chipClasses[s.status]}`}
                    >
                      <div className="text-sm font-semibold leading-tight">
                        {s.mainLabel}
                      </div>
                      <div className="text-xs leading-tight">{s.subLabel}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
