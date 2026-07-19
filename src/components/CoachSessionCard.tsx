"use client";

import { useState } from "react";
import { useLiffAuth } from "@/components/LiffAuthProvider";
import type { CoachSession } from "@/lib/coach-types";
import { taipeiMonthDayTime } from "@/lib/date";

function errorText(code?: string): string {
  switch (code) {
    case "CAPACITY_BELOW_CONFIRMED":
      return "名額不能低於已報名人數";
    case "INVALID_CAPACITY":
      return "名額不能小於 1";
    case "SESSION_NOT_FOUND":
      return "找不到這堂課";
    case "FORBIDDEN":
      return "沒有權限";
    default:
      return "操作失敗，請稍後再試";
  }
}

export default function CoachSessionCard({
  session,
  onChanged,
}: {
  session: CoachSession;
  onChanged: () => void;
}) {
  const auth = useLiffAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const confirmed = session.bookings.filter((b) => b.status === "confirmed");
  const waitlisted = session.bookings
    .filter((b) => b.status === "waitlisted")
    .sort((a, b) => (a.wl_position ?? 0) - (b.wl_position ?? 0));
  const confirmedTotal = confirmed.reduce((sum, b) => sum + b.qty, 0);
  const waitlistedTotal = waitlisted.reduce((sum, b) => sum + b.qty, 0);

  async function call(url: string, body: object) {
    if (auth.status !== "ready") return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: auth.idToken, ...body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(errorText(json.error));
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  async function changeCapacity(delta: number) {
    await call(`/api/coach/sessions/${session.id}/capacity`, {
      capacity: session.capacity + delta,
    });
  }

  async function cancelSession() {
    await call(`/api/coach/sessions/${session.id}/cancel`, {});
    setConfirmCancel(false);
  }

  async function restoreSession() {
    await call(`/api/coach/sessions/${session.id}/restore`, {});
  }

  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-900">
          {taipeiMonthDayTime(session.starts_at)}　{session.title}
        </div>
        {session.status === "cancelled" && (
          <span className="shrink-0 text-xs font-semibold text-[#C8102E]">
            已停課
          </span>
        )}
      </div>
      <div className="mb-2 text-xs text-gray-400">
        教練：{session.coachName ?? "待定"}
      </div>

      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs text-gray-600">
          名額 {session.capacity} 人
        </span>
        <button
          onClick={() => changeCapacity(-1)}
          disabled={busy || session.capacity - 1 < confirmedTotal}
          className="rounded-md border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 disabled:opacity-30"
        >
          －1
        </button>
        <button
          onClick={() => changeCapacity(1)}
          disabled={busy}
          className="rounded-md border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600"
        >
          ＋1
        </button>
      </div>

      <div className="mb-2">
        <p className="mb-1 text-xs font-semibold text-gray-500">
          已報名 {confirmedTotal} 人
        </p>
        {confirmed.length === 0 ? (
          <p className="text-xs text-gray-300">還沒有人報名</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {confirmed.map((b) => (
              <li key={b.id} className="text-sm text-gray-700">
                {b.display_name ?? "（無名稱）"} · {b.qty} 位
              </li>
            ))}
          </ul>
        )}
      </div>

      {waitlisted.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-xs font-semibold text-[#8A5D00]">
            候補 {waitlistedTotal} 人
          </p>
          <ul className="flex flex-col gap-0.5">
            {waitlisted.map((b) => (
              <li key={b.id} className="text-sm text-gray-700">
                {b.wl_position}. {b.display_name ?? "（無名稱）"} · {b.qty} 位
              </li>
            ))}
          </ul>
        </div>
      )}

      {err && <p className="mb-2 text-xs text-[#C8102E]">{err}</p>}

      <div className="mt-1">
        {session.status === "scheduled" ? (
          <button
            onClick={() => setConfirmCancel(true)}
            disabled={busy}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-[#C8102E]"
          >
            停課
          </button>
        ) : (
          <button
            onClick={restoreSession}
            disabled={busy}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"
          >
            恢復
          </button>
        )}
      </div>

      {confirmCancel && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !busy && setConfirmCancel(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-bold">停課</h2>
            <p className="mb-4 text-sm text-gray-500">
              {session.title}・{taipeiMonthDayTime(session.starts_at)}
              <br />
              已報名／候補的人會保留名額和順位，之後恢復可以原樣復原。
            </p>
            {err && <p className="mb-3 text-sm text-[#C8102E]">{err}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmCancel(false)}
                disabled={busy}
                className="h-[46px] flex-1 rounded-xl bg-gray-100 text-[15px] font-semibold text-gray-700"
              >
                不要
              </button>
              <button
                onClick={cancelSession}
                disabled={busy}
                className="h-[46px] flex-1 rounded-xl bg-[#C8102E] text-[15px] font-semibold text-white"
              >
                {busy ? "處理中..." : "確定停課"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
