"use client";

import { useState } from "react";
import { useLiffAuth } from "@/components/LiffAuthProvider";
import type { ChipStatus } from "@/lib/schedule";

const chipClasses: Record<ChipStatus, string> = {
  open: "bg-[#E4F4EA] text-[#1B7F4C]",
  low: "bg-[#FFF6E5] text-[#8A5D00]",
  full: "bg-[#FDE8EA] text-[#C8102E]",
  not_open: "bg-gray-100 text-gray-500",
};

function errorText(code?: string): string {
  switch (code) {
    case "SESSION_CANCELLED":
      return "這堂課已停課";
    case "NOT_OPEN_YET":
      return "還沒到開放報名時間";
    case "INVALID_QTY":
      return "人數不對，最多 4 位";
    case "ALREADY_BOOKED":
      return "已經報名過這堂課了";
    case "SESSION_NOT_FOUND":
    case "BOOKING_NOT_FOUND":
      return "找不到這堂課";
    case "FORBIDDEN":
      return "沒有權限取消";
    default:
      return "操作失敗，請稍後再試";
  }
}

type Props = {
  sessionId: number;
  title: string;
  time: string;
  dateTimeLabel: string; // 視窗小字用，例如「7/16（四）20:00」
  status: ChipStatus;
  mainLabel: string;
  subLabel: string;
};

export default function SessionCard({
  sessionId,
  title,
  time,
  dateTimeLabel,
  status,
  mainLabel,
  subLabel,
}: Props) {
  const auth = useLiffAuth();
  const [qty, setQty] = useState(1);
  const [modal, setModal] = useState<"book" | "cancel" | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const myBooking =
    auth.status === "ready"
      ? auth.bookings.find((b) => b.session_id === sessionId)
      : undefined;

  const willWaitlist = status === "full";

  async function book() {
    if (auth.status !== "ready") return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: auth.idToken, sessionId, qty }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(errorText(json.error));
      await auth.refresh();
      setModal(null);
      setQty(1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (auth.status !== "ready" || !myBooking) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/bookings/${myBooking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: auth.idToken }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(errorText(json.error));
      await auth.refresh();
      setModal(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="text-sm font-medium text-gray-900">
          {time}　{title}
        </div>
        {!myBooking && (
          <div
            className={`shrink-0 rounded-lg px-2 py-1 text-right ${chipClasses[status]}`}
          >
            <div className="text-xs font-semibold leading-tight">
              {mainLabel}
            </div>
            <div className="text-[11px] leading-tight">{subLabel}</div>
          </div>
        )}
      </div>

      {myBooking ? (
        <div
          className={`flex items-center justify-between rounded-lg px-3 py-2 ${
            myBooking.status === "confirmed" ? "bg-[#E4F4EA]" : "bg-[#FFF6E5]"
          }`}
        >
          <div>
            <div
              className={`text-sm font-semibold ${
                myBooking.status === "confirmed"
                  ? "text-[#1B7F4C]"
                  : "text-[#8A5D00]"
              }`}
            >
              {myBooking.status === "confirmed"
                ? `✅ 已報名 ${myBooking.qty} 位`
                : `🕒 候補中 · ${myBooking.qty} 位`}
            </div>
            <div className="text-xs text-gray-500">
              {myBooking.status === "confirmed"
                ? dateTimeLabel
                : `前面尚有 ${Math.max(0, (myBooking.wl_position ?? 1) - 1)} 位候補`}
            </div>
          </div>
          <button
            onClick={() => setModal("cancel")}
            className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500"
          >
            {myBooking.status === "confirmed" ? "取消報名" : "取消候補"}
          </button>
        </div>
      ) : status === "not_open" ? (
        <button
          disabled
          className="h-[46px] w-full rounded-xl bg-gray-100 text-[16px] font-semibold text-gray-400"
        >
          未開放
        </button>
      ) : (
        <button
          onClick={() => setModal("book")}
          disabled={auth.status !== "ready"}
          className={`h-[46px] w-full rounded-xl text-[16px] font-semibold text-white disabled:opacity-50 ${
            willWaitlist ? "bg-[#8A5D00]" : "bg-blue-600"
          }`}
        >
          {willWaitlist ? "候補" : "報名"}
        </button>
      )}

      {modal === "book" && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !busy && setModal(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-bold">
              {willWaitlist ? "候補" : "報名"}
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              {title} · {dateTimeLabel}
            </p>
            <label className="mb-2 block text-sm text-gray-600">
              {willWaitlist ? "欲候補人數" : "報名人數"}
            </label>
            <div className="mb-4 flex items-center gap-4">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-10 w-10 rounded-full border border-gray-200 text-lg"
              >
                －
              </button>
              <span className="w-8 text-center text-lg font-semibold">
                {qty}
              </span>
              <button
                onClick={() => setQty((q) => Math.min(4, q + 1))}
                className="h-10 w-10 rounded-full border border-gray-200 text-lg"
              >
                ＋
              </button>
            </div>
            {err && <p className="mb-3 text-sm text-[#C8102E]">{err}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                disabled={busy}
                className="h-[46px] flex-1 rounded-xl border border-gray-200 text-[15px] font-medium text-gray-600"
              >
                取消
              </button>
              <button
                onClick={book}
                disabled={busy}
                className={`h-[46px] flex-1 rounded-xl text-[15px] font-semibold text-white ${
                  willWaitlist ? "bg-[#8A5D00]" : "bg-blue-600"
                }`}
              >
                {busy ? "處理中..." : willWaitlist ? "確認候補" : "確認報名"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "cancel" && myBooking && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !busy && setModal(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-bold">
              {myBooking.status === "waitlisted" ? "取消候補" : "取消報名"}
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              {title} · {dateTimeLabel}
            </p>
            {err && <p className="mb-3 text-sm text-[#C8102E]">{err}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                disabled={busy}
                className="h-[46px] flex-1 rounded-xl bg-gray-100 text-[15px] font-semibold text-gray-700"
              >
                不要
              </button>
              <button
                onClick={cancel}
                disabled={busy}
                className="h-[46px] flex-1 rounded-xl bg-[#C8102E] text-[15px] font-semibold text-white"
              >
                {busy ? "處理中..." : "確定取消"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
