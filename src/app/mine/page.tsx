"use client";

import { useLiffAuth } from "@/components/LiffAuthProvider";
import LiffLogin from "@/components/LiffLogin";
import NavTabs from "@/components/NavTabs";
import SessionCard from "@/components/SessionCard";
import { taipeiTime, weekdayCharOfYmd, taipeiYmd, monthDayLabelOfYmd } from "@/lib/date";
import type { MyBooking } from "@/lib/auth-types";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-2 mt-5 flex items-center gap-2 first:mt-0">
      <span className="text-sm font-bold text-gray-700">{title}</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

function bookingCard(b: MyBooking) {
  if (!b.session) return null;
  const ymd = taipeiYmd(b.session.starts_at);
  const time = taipeiTime(b.session.starts_at);
  const dateTimeLabel = `${monthDayLabelOfYmd(ymd)}（${weekdayCharOfYmd(ymd)}）${time}`;
  return (
    <SessionCard
      key={b.id}
      sessionId={b.session_id}
      title={b.session.title}
      coachName={b.session.coachName}
      time={time}
      dateTimeLabel={dateTimeLabel}
      status="open"
      remaining={0}
      capacity={0}
      waitlistedCount={0}
      openAtLabel=""
    />
  );
}

export default function MinePage() {
  const auth = useLiffAuth();

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">我的課表</h1>

      <LiffLogin />
      <NavTabs />

      {auth.status === "loading" && (
        <p className="text-sm text-gray-400">登入中...</p>
      )}
      {auth.status === "error" && (
        <p className="text-sm text-[#C8102E]">登入失敗：{auth.message}</p>
      )}

      {auth.status === "ready" && (() => {
        const confirmed = auth.bookings
          .filter((b) => b.status === "confirmed" && b.session)
          .sort((a, b) => a.session!.starts_at.localeCompare(b.session!.starts_at));
        const waitlisted = auth.bookings
          .filter((b) => b.status === "waitlisted" && b.session)
          .sort((a, b) => a.session!.starts_at.localeCompare(b.session!.starts_at));
        const totalQty = [...confirmed, ...waitlisted].reduce((sum, b) => sum + b.qty, 0);

        if (confirmed.length === 0 && waitlisted.length === 0) {
          return <p className="py-12 text-center text-sm text-gray-300">尚無報名紀錄</p>;
        }

        return (
          <div>
            <p className="mb-2 text-xs text-gray-400">
              共 {confirmed.length + waitlisted.length} 堂 · {totalQty} 個名額
            </p>

            {confirmed.length > 0 && (
              <div>
                <SectionHeader title="報名成功" />
                <div className="flex flex-col gap-2">{confirmed.map(bookingCard)}</div>
              </div>
            )}

            {waitlisted.length > 0 && (
              <div>
                <SectionHeader title="候補中" />
                <div className="flex flex-col gap-2">{waitlisted.map(bookingCard)}</div>
              </div>
            )}
          </div>
        );
      })()}
    </main>
  );
}
