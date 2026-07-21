"use client";

import { useState } from "react";
import { useLiffAuth } from "@/components/LiffAuthProvider";
import type { ChipStatus } from "@/lib/schedule";

const MAXQ = 4;

const chipColorClasses: Record<ChipStatus, string> = {
  open: "bg-[#E4F4EA] border-[#B4DEC5] text-[#0B7A3E]",
  low: "bg-[#FFF6E5] border-[#F0DBAC] text-[#8A5D00]",
  full: "bg-[#FDE8EA] border-[#F0C2CB] text-[#C8102E]",
  not_open: "bg-gray-100 border-gray-200 text-gray-500",
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
    case "NOT_ENOUGH_CAPACITY":
      return "名額不夠，改不了這麼多人";
    case "BOOKING_NOT_EDITABLE":
      return "這筆報名沒辦法編輯";
    case "SESSION_NOT_FOUND":
    case "BOOKING_NOT_FOUND":
      return "找不到這堂課";
    case "FORBIDDEN":
      return "沒有權限操作";
    default:
      return "操作失敗，請稍後再試";
  }
}

type Props = {
  variant?: "card" | "chip";
  sessionId: number;
  title: string;
  coachName: string | null;
  time: string;
  dateTimeLabel: string; // 視窗小字用，例如「7/16（四）20:00」
  status: ChipStatus;
  remaining: number;
  capacity: number;
  waitlistedCount: number;
  openAtLabel: string; // 「7/17 12:00」，未開放狀態小字用
};

export default function SessionCard({
  variant = "card",
  sessionId,
  title,
  coachName,
  time,
  dateTimeLabel,
  status,
  remaining,
  capacity,
  waitlistedCount,
  openAtLabel,
}: Props) {
  const auth = useLiffAuth();
  const [qty, setQty] = useState(1);
  const [modal, setModal] = useState<"book" | "edit" | "cancel" | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const myBooking =
    auth.status === "ready"
      ? auth.bookings.find((b) => b.session_id === sessionId)
      : undefined;

  const coachText = coachName ?? "待定";
  const willWaitlist = status === "full";

  // 有空位就不能選超過剩餘名額（不讓人選了一個「反正會候補」的數字）；
  // 已額滿的話才是真的自由候補 1-4 人
  const bookMax = willWaitlist ? MAXQ : Math.max(1, Math.min(MAXQ, remaining));
  const editMax =
    modal === "edit" && myBooking
      ? myBooking.status === "confirmed"
        ? Math.max(1, Math.min(MAXQ, myBooking.qty + remaining))
        : MAXQ
      : MAXQ;
  const stepMax = modal === "book" ? bookMax : editMax;
  // 這次開的視窗是「候補」情境嗎：報名時額滿，或編輯的本來就是候補中的那筆
  const sheetWait =
    modal === "book" ? willWaitlist : myBooking?.status === "waitlisted";

  function openBook() {
    setQty(1);
    setModal("book");
  }
  function openEdit() {
    if (!myBooking) return;
    setQty(myBooking.qty);
    setModal("edit");
  }

  function handlePrimaryClick() {
    if (myBooking) openEdit();
    else if (status !== "not_open") openBook();
  }

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
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  async function editQty() {
    if (auth.status !== "ready" || !myBooking) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/bookings/${myBooking.id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: auth.idToken, qty }),
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

  const cardLongLabel =
    status === "not_open"
      ? "尚未開放報名"
      : status === "full"
        ? "已額滿"
        : `剩 ${remaining} 位`;
  const cardLongSub =
    status === "not_open"
      ? `${openAtLabel} 開放`
      : status === "full"
        ? waitlistedCount > 0
          ? `${waitlistedCount} 人候補中`
          : "已額滿"
        : `上限 ${capacity} 人`;
  const chipShortLabel =
    status === "not_open" ? "未開放" : status === "full" ? "額滿" : `剩 ${remaining}`;

  // ── chip（週曆模式）──
  if (variant === "chip") {
    return (
      <>
        <button
          onClick={handlePrimaryClick}
          disabled={!myBooking && status === "not_open"}
          className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[13.5px] disabled:cursor-default ${chipColorClasses[status]}`}
        >
          <span className="shrink-0 font-mono text-[13px] font-semibold">{time}</span>
          <span className="min-w-0 flex-1 truncate font-bold text-gray-900">{title}</span>
          <span className="shrink-0 truncate text-xs text-gray-500">{coachText}</span>
          {myBooking && (
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold text-white ${
                myBooking.status === "confirmed" ? "bg-[#0B7A3E]" : "bg-[#C8102E]"
              }`}
            >
              {myBooking.status === "confirmed"
                ? `已報 ×${myBooking.qty}`
                : `候補${myBooking.wl_position ?? ""}`}
            </span>
          )}
          <span className="ml-auto shrink-0 text-xs font-bold">{chipShortLabel}</span>
        </button>
        {renderModals()}
      </>
    );
  }

  // ── card（清單模式 / 我的課表）──
  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <div className="mb-1 flex items-baseline gap-2">
        <span className="font-mono text-[15px] font-semibold text-gray-900">{time}</span>
        <span className="text-[15px] font-bold text-gray-900">{title}</span>
        <span className="ml-auto shrink-0 text-xs text-gray-400">{coachText}</span>
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
                myBooking.status === "confirmed" ? "text-[#1B7F4C]" : "text-[#8A5D00]"
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
            onClick={openEdit}
            className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500"
          >
            編輯
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
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-gray-900">
            {cardLongLabel}
            <span className="ml-2 text-xs font-normal text-gray-400">{cardLongSub}</span>
          </div>
          <button
            onClick={openBook}
            disabled={auth.status !== "ready"}
            className={`ml-auto h-[46px] shrink-0 rounded-xl px-6 text-[16px] font-semibold text-white disabled:opacity-50 ${
              willWaitlist ? "bg-[#8A5D00]" : "bg-blue-600"
            }`}
          >
            {willWaitlist ? "候補" : "報名"}
          </button>
        </div>
      )}

      {renderModals()}
    </div>
  );

  function renderModals() {
    return (
      <>
        {(modal === "book" || modal === "edit") && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
            onClick={() => !busy && setModal(null)}
          >
            <div
              className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-1 text-lg font-bold">
                {modal === "book"
                  ? sheetWait
                    ? "候補"
                    : "報名"
                  : sheetWait
                    ? "編輯候補"
                    : "編輯報名"}
              </h2>
              <p className="mb-4 text-sm text-gray-500">
                {title} · {dateTimeLabel} · {coachText}
              </p>
              <label className="mb-2 block text-sm text-gray-600">
                {sheetWait ? "欲候補人數" : "報名人數"}
              </label>
              <div className="mb-2 flex items-center justify-center gap-0">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="h-14 w-14 rounded-l-xl border border-gray-200 text-2xl disabled:text-gray-300"
                >
                  －
                </button>
                <span className="flex h-14 w-[78px] items-center justify-center border-y border-gray-200 font-mono text-2xl font-semibold">
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => Math.min(stepMax, q + 1))}
                  disabled={qty >= stepMax}
                  className="h-14 w-14 rounded-r-xl border border-gray-200 text-2xl disabled:text-gray-300"
                >
                  ＋
                </button>
              </div>
              <p className="mb-4 text-center text-xs text-gray-500">
                {sheetWait ? (
                  `目前已額滿，${qty} 位一起候補`
                ) : qty >= stepMax && stepMax < MAXQ ? (
                  <>
                    <b className="text-[#C8102E]">剩 {remaining} 位</b>
                    ，最多只能報 {stepMax} 位
                  </>
                ) : (
                  `剩 ${remaining} 位`
                )}
              </p>
              {err && <p className="mb-3 text-sm text-[#C8102E]">{err}</p>}
              <div className="flex flex-col gap-2">
                <button
                  onClick={modal === "book" ? book : editQty}
                  disabled={busy}
                  className={`h-[46px] rounded-xl text-[15px] font-semibold text-white disabled:opacity-50 ${
                    sheetWait ? "bg-[#8A5D00]" : "bg-blue-600"
                  }`}
                >
                  {busy ? "處理中..." : "確認"}
                </button>
                <button
                  onClick={() => setModal(null)}
                  disabled={busy}
                  className="h-[46px] rounded-xl border border-gray-200 text-[15px] font-medium text-gray-600"
                >
                  取消
                </button>
                {modal === "edit" && (
                  <button
                    onClick={() => setModal("cancel")}
                    className="mt-1 py-1 text-center text-sm font-medium text-[#C8102E]"
                  >
                    {sheetWait ? "取消候補" : "取消報名"}
                  </button>
                )}
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
                {myBooking.status === "waitlisted" ? "取消候補？" : "取消報名？"}
              </h2>
              <p className="mb-4 text-sm text-gray-500">
                {myBooking.status === "waitlisted"
                  ? "將不再遞補。"
                  : `釋出 ${myBooking.qty} 個名額，需重新報名。`}
              </p>
              {err && <p className="mb-3 text-sm text-[#C8102E]">{err}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => setModal(null)}
                  disabled={busy}
                  className="h-[46px] flex-1 rounded-xl bg-gray-100 text-[15px] font-semibold text-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={cancel}
                  disabled={busy}
                  className="h-[46px] flex-1 rounded-xl bg-[#C8102E] text-[15px] font-semibold text-white"
                >
                  {busy ? "處理中..." : "確認"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
}
