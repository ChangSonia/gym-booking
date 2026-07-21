"use client";

import { useState } from "react";
import SessionCard from "@/components/SessionCard";
import { weekdayCharOfYmd, taipeiToday } from "@/lib/date";
import type { DayGroup, WeekMeta } from "@/lib/schedule";

type Props = {
  days: DayGroup[];
  weeks: WeekMeta[];
};

function DayHeader({ ymd, monthDayLabel }: { ymd: string; monthDayLabel: string }) {
  const isToday = ymd === taipeiToday();
  return (
    <div className="my-3 flex items-center gap-2 text-gray-400">
      <span className="text-base font-semibold text-gray-700">{monthDayLabel}</span>
      <span className="text-sm font-bold text-gray-700">星期{weekdayCharOfYmd(ymd)}</span>
      <div className="h-px flex-1 bg-gray-200" />
      {isToday && (
        <span className="shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-[11px] font-bold text-gray-600">
          今天
        </span>
      )}
    </div>
  );
}

function dateTimeLabelOf(day: DayGroup, time: string): string {
  return `${day.monthDayLabel}（${weekdayCharOfYmd(day.ymd)}）${time}`;
}

function ListView({ days, weeks }: Props) {
  return (
    <>
      {weeks.map((w) => {
        const weekDays = days.filter((d) => d.weekIndex === w.index && d.sessions.length > 0);
        return (
          <div key={w.index} className="mb-2">
            <div className="sticky top-0 z-10 bg-white/95 py-2 backdrop-blur">
              <div className="text-lg font-extrabold text-gray-900">{w.label}</div>
              <div className="text-xs text-gray-400">{w.rangeLabel}</div>
            </div>
            {weekDays.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-300">無課程</p>
            ) : (
              weekDays.map((d) => (
                <div key={d.ymd}>
                  <DayHeader ymd={d.ymd} monthDayLabel={d.monthDayLabel} />
                  <div className="flex flex-col gap-2">
                    {d.sessions.map((s) => (
                      <SessionCard
                        key={s.id}
                        sessionId={s.id}
                        title={s.title}
                        coachName={s.coachName}
                        time={s.time}
                        dateTimeLabel={dateTimeLabelOf(d, s.time)}
                        status={s.status}
                        remaining={s.remaining}
                        capacity={s.capacity}
                        waitlistedCount={s.waitlistedCount}
                        openAtLabel={s.openAtLabel}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        );
      })}
    </>
  );
}

function CalendarView({ days, weeks }: Props) {
  const [weekIdx, setWeekIdx] = useState(0);
  const week = weeks[weekIdx];
  const weekDays = days.filter((d) => d.weekIndex === weekIdx);
  const todayYmd = taipeiToday();

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setWeekIdx((i) => Math.max(0, i - 1))}
          disabled={weekIdx === 0}
          className="h-9 w-9 rounded-lg border border-gray-200 text-sm disabled:text-gray-300"
        >
          ‹
        </button>
        <div className="flex-1 text-center">
          <div className="text-base font-extrabold text-gray-900">{week?.label}</div>
          <div className="text-xs text-gray-400">{week?.rangeLabel}</div>
        </div>
        <button
          onClick={() => setWeekIdx((i) => Math.min(weeks.length - 1, i + 1))}
          disabled={weekIdx >= weeks.length - 1}
          className="h-9 w-9 rounded-lg border border-gray-200 text-sm disabled:text-gray-300"
        >
          ›
        </button>
      </div>

      <div className="mb-3 flex gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-sm border border-[#B4DEC5] bg-[#E4F4EA]" />
          有空位
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-sm border border-[#F0DBAC] bg-[#FFF6E5]" />
          快滿
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-sm border border-[#F0C2CB] bg-[#FDE8EA]" />
          已額滿
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-sm border border-gray-200 bg-gray-100" />
          未開放
        </span>
      </div>

      <div className="flex flex-col">
        {weekDays.map((d) => {
          const isToday = d.ymd === todayYmd;
          return (
            <div key={d.ymd} className="flex gap-2 border-t border-gray-100 py-2 first:border-t-0">
              <div
                className={`flex w-11 shrink-0 flex-col items-center pt-0.5 ${
                  isToday ? "" : "text-gray-500"
                }`}
              >
                <div
                  className={`font-mono text-lg font-semibold ${
                    isToday ? "rounded-lg bg-gray-900 px-1 text-white" : ""
                  }`}
                >
                  {d.monthDayLabel.split("/")[1]}
                </div>
                <div className="text-[11px]">{weekdayCharOfYmd(d.ymd)}</div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {d.sessions.length === 0 ? (
                  <div className="py-2 text-sm text-gray-300">—</div>
                ) : (
                  d.sessions.map((s) => (
                    <SessionCard
                      key={s.id}
                      variant="chip"
                      sessionId={s.id}
                      title={s.title}
                      coachName={s.coachName}
                      time={s.time}
                      dateTimeLabel={dateTimeLabelOf(d, s.time)}
                      status={s.status}
                      remaining={s.remaining}
                      capacity={s.capacity}
                      waitlistedCount={s.waitlistedCount}
                      openAtLabel={s.openAtLabel}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ScheduleView({ days, weeks }: Props) {
  const [mode, setMode] = useState<"list" | "cal">("list");

  return (
    <div>
      <div className="sticky top-0 z-20 mb-3 bg-white py-1">
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => setMode("list")}
            className={`flex-1 rounded-lg py-2 text-sm font-bold ${
              mode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            清單
          </button>
          <button
            onClick={() => setMode("cal")}
            className={`flex-1 rounded-lg py-2 text-sm font-bold ${
              mode === "cal" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            週曆
          </button>
        </div>
      </div>

      {mode === "list" ? <ListView days={days} weeks={weeks} /> : <CalendarView days={days} weeks={weeks} />}
    </div>
  );
}
