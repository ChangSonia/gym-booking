"use client";

import { useRef, useState } from "react";
import { useLiffAuth } from "@/components/LiffAuthProvider";
import type {
  CoachSession,
  CoachOption,
  RosterBooking,
  UserOption,
} from "@/lib/coach-types";
import { taipeiMonthDayTime } from "@/lib/date";

const MAXCAP = 60;
const MAXQ = 4;

function errorText(code?: string): string {
  switch (code) {
    case "CAPACITY_BELOW_CONFIRMED":
      return "名額不能低於已報名人數";
    case "INVALID_CAPACITY":
      return "名額不能小於 1";
    case "INVALID_QTY":
      return "人數不對，最多 4 位";
    case "ALREADY_BOOKED":
      return "這位學員已經報名過這堂課了";
    case "SESSION_CANCELLED":
      return "這堂課已停課";
    case "NOT_OPEN_YET":
      return "還沒到開放報名時間";
    case "SESSION_NOT_FOUND":
      return "找不到這堂課";
    case "BOOKING_NOT_FOUND":
      return "找不到這筆報名";
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
  const [kickTarget, setKickTarget] = useState<RosterBooking | null>(null);

  const [editing, setEditing] = useState(false);
  const [editCapacity, setEditCapacity] = useState(session.capacity);
  const [editCoachId, setEditCoachId] = useState<number | null>(session.coachId);
  const [coachOptions, setCoachOptions] = useState<CoachOption[] | null>(null);

  const [booking, setBooking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserOption[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [bookQty, setBookQty] = useState(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const confirmed = session.bookings.filter((b) => b.status === "confirmed");
  const waitlisted = session.bookings
    .filter((b) => b.status === "waitlisted")
    .sort((a, b) => (a.wl_position ?? 0) - (b.wl_position ?? 0));
  const confirmedTotal = confirmed.reduce((sum, b) => sum + b.qty, 0);
  const waitlistedTotal = waitlisted.reduce((sum, b) => sum + b.qty, 0);

  async function call(url: string, body: object) {
    if (auth.status !== "ready") return false;
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
      // 教練這邊的操作可能剛好影響到「自己」的報名狀態（例如踢掉的人剛好是自己在測試）
      // 課表頁/我的課表頁用的是同一份 LiffAuthProvider 資料，這裡也要跟著刷新
      await auth.refresh();
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失敗，請稍後再試");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function openEdit() {
    setEditCapacity(session.capacity);
    setEditCoachId(session.coachId);
    setEditing(true);
    if (!coachOptions && auth.status === "ready") {
      try {
        const res = await fetch("/api/coach/coaches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: auth.idToken }),
        });
        const json = await res.json();
        if (res.ok) setCoachOptions(json.coaches);
      } catch {
        // 教練名單載入失敗不擋住編輯視窗，只是下拉選單會是空的
      }
    }
  }

  async function saveEdit() {
    const ok = await call(`/api/coach/sessions/${session.id}/update`, {
      capacity: editCapacity,
      coachId: editCoachId,
    });
    if (ok) setEditing(false);
  }

  async function cancelSession() {
    const ok = await call(`/api/coach/sessions/${session.id}/cancel`, {});
    if (ok) setConfirmCancel(false);
  }

  async function restoreSession() {
    await call(`/api/coach/sessions/${session.id}/restore`, {});
  }

  async function doKick() {
    if (!kickTarget) return;
    const ok = await call(`/api/coach/bookings/${kickTarget.id}/cancel`, {});
    if (ok) setKickTarget(null);
  }

  async function runSearch(value: string) {
    if (auth.status !== "ready") return;
    setSearching(true);
    try {
      const res = await fetch("/api/coach/users/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: auth.idToken, query: value }),
      });
      const json = await res.json();
      if (res.ok) setSearchResults(json.users);
    } catch {
      // 搜尋失敗就當作沒結果，使用者可以再試一次
    } finally {
      setSearching(false);
    }
  }

  function openBook() {
    setBooking(true);
    setSearchQuery("");
    setSearchResults(null);
    setSelectedUser(null);
    setBookQty(1);
    // 一開啟就先給一份預設名單，像下拉選單一樣，不用先打字才看得到人
    runSearch("");
  }

  function onSearchInput(value: string) {
    setSearchQuery(value);
    setSelectedUser(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(value), 300);
  }

  async function doBook() {
    if (!selectedUser) return;
    const ok = await call(`/api/coach/sessions/${session.id}/book`, {
      userId: selectedUser.id,
      qty: bookQty,
    });
    if (ok) setBooking(false);
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
        教練：{session.coachName ?? "待定"} ・ 名額 {session.capacity} 人
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
                {b.display_name ?? "（無名稱）"}
                {b.qty > 1 ? ` · ${b.qty} 位` : ""}
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
                {b.wl_position}. {b.display_name ?? "（無名稱）"}
                {b.qty > 1 ? ` · ${b.qty} 位` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {err && !editing && <p className="mb-2 text-xs text-[#C8102E]">{err}</p>}

      <div className="mt-1 flex gap-1.5">
        <button
          onClick={openEdit}
          disabled={busy}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600"
        >
          編輯
        </button>
        {session.status === "scheduled" && (
          <button
            onClick={openBook}
            disabled={busy}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600"
          >
            代報名
          </button>
        )}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !busy && setEditing(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-bold">編輯課程</h2>
            <p className="mb-4 text-sm text-gray-500">
              {session.title}・{taipeiMonthDayTime(session.starts_at)}
            </p>

            <label className="mb-2 block text-sm text-gray-600">名額</label>
            <div className="mb-1 flex items-center gap-0">
              <button
                onClick={() => setEditCapacity((c) => Math.max(1, c - 1))}
                disabled={editCapacity <= confirmedTotal}
                className="h-11 w-11 rounded-l-xl border border-gray-200 text-xl disabled:text-gray-300"
              >
                －
              </button>
              <span className="flex h-11 w-16 items-center justify-center border-y border-gray-200 font-mono text-lg font-semibold">
                {editCapacity}
              </span>
              <button
                onClick={() => setEditCapacity((c) => Math.min(MAXCAP, c + 1))}
                disabled={editCapacity >= MAXCAP}
                className="h-11 w-11 rounded-r-xl border border-gray-200 text-xl disabled:text-gray-300"
              >
                ＋
              </button>
            </div>
            <p className="mb-4 text-xs text-gray-400">
              已報名 {confirmedTotal} 人，名額不能改到比這個少
            </p>

            <label className="mb-2 block text-sm text-gray-600">教練</label>
            <select
              value={editCoachId ?? ""}
              onChange={(e) =>
                setEditCoachId(e.target.value === "" ? null : Number(e.target.value))
              }
              className="mb-4 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm"
            >
              <option value="">待定</option>
              {(coachOptions ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {err && <p className="mb-3 text-sm text-[#C8102E]">{err}</p>}

            <div className="mb-4 flex gap-3">
              <button
                onClick={() => setEditing(false)}
                disabled={busy}
                className="h-[46px] flex-1 rounded-xl border border-gray-200 text-[15px] font-medium text-gray-600"
              >
                取消
              </button>
              <button
                onClick={saveEdit}
                disabled={busy}
                className="h-[46px] flex-1 rounded-xl bg-blue-600 text-[15px] font-semibold text-white"
              >
                {busy ? "處理中..." : "確認"}
              </button>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="mb-1 text-xs font-semibold text-gray-500">
                已報名 {confirmedTotal} 人
              </p>
              {confirmed.length === 0 ? (
                <p className="mb-3 text-xs text-gray-300">還沒有人報名</p>
              ) : (
                <ul className="mb-3 flex flex-col gap-0.5">
                  {confirmed.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <span className="flex-1">
                        {b.display_name ?? "（無名稱）"}
                        {b.qty > 1 ? ` · ${b.qty} 位` : ""}
                      </span>
                      <button
                        onClick={() => setKickTarget(b)}
                        className="shrink-0 text-xs font-medium text-gray-400"
                      >
                        取消
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {waitlisted.length > 0 && (
                <>
                  <p className="mb-1 text-xs font-semibold text-[#8A5D00]">
                    候補 {waitlistedTotal} 人
                  </p>
                  <ul className="mb-3 flex flex-col gap-0.5">
                    {waitlisted.map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <span className="flex-1">
                          {b.wl_position}. {b.display_name ?? "（無名稱）"}
                          {b.qty > 1 ? ` · ${b.qty} 位` : ""}
                        </span>
                        <button
                          onClick={() => setKickTarget(b)}
                          className="shrink-0 text-xs font-medium text-gray-400"
                        >
                          取消
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

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
          </div>
        </div>
      )}

      {booking && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !busy && setBooking(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-bold">代報名</h2>
            <p className="mb-4 text-sm text-gray-500">
              {session.title}・{taipeiMonthDayTime(session.starts_at)}
            </p>

            {!selectedUser ? (
              <>
                <label className="mb-2 block text-sm text-gray-600">
                  選會員（只能選已經登入過系統的人，可以打字縮小範圍）
                </label>
                <input
                  value={searchQuery}
                  onChange={(e) => onSearchInput(e.target.value)}
                  placeholder="輸入名字關鍵字，或直接從下面選"
                  className="mb-3 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm"
                  autoFocus
                />
                {searching && <p className="text-sm text-gray-400">搜尋中...</p>}
                {!searching && searchResults !== null && searchResults.length === 0 && (
                  <p className="text-sm text-gray-300">找不到符合的會員</p>
                )}
                {searchResults && searchResults.length > 0 && (
                  <ul className="max-h-60 overflow-y-auto rounded-xl border border-gray-100">
                    {searchResults.map((u) => (
                      <li key={u.id}>
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2.5 text-left text-sm last:border-b-0"
                        >
                          {u.picture_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={u.picture_url}
                              alt=""
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                          )}
                          <span>{u.display_name ?? "（無名稱）"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4">
                  <button
                    onClick={() => setBooking(false)}
                    disabled={busy}
                    className="h-[46px] w-full rounded-xl border border-gray-200 text-[15px] font-medium text-gray-600"
                  >
                    取消
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5">
                  {selectedUser.picture_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedUser.picture_url}
                      alt=""
                      width={28}
                      height={28}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-sm font-semibold">
                    {selectedUser.display_name ?? "（無名稱）"}
                  </span>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="ml-auto text-xs font-medium text-gray-400"
                  >
                    重選
                  </button>
                </div>

                <label className="mb-2 block text-sm text-gray-600">報名人數</label>
                <div className="mb-4 flex items-center justify-center gap-0">
                  <button
                    onClick={() => setBookQty((q) => Math.max(1, q - 1))}
                    disabled={bookQty <= 1}
                    className="h-12 w-12 rounded-l-xl border border-gray-200 text-xl disabled:text-gray-300"
                  >
                    －
                  </button>
                  <span className="flex h-12 w-16 items-center justify-center border-y border-gray-200 font-mono text-lg font-semibold">
                    {bookQty}
                  </span>
                  <button
                    onClick={() => setBookQty((q) => Math.min(MAXQ, q + 1))}
                    disabled={bookQty >= MAXQ}
                    className="h-12 w-12 rounded-r-xl border border-gray-200 text-xl disabled:text-gray-300"
                  >
                    ＋
                  </button>
                </div>

                {err && <p className="mb-3 text-sm text-[#C8102E]">{err}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={() => setBooking(false)}
                    disabled={busy}
                    className="h-[46px] flex-1 rounded-xl border border-gray-200 text-[15px] font-medium text-gray-600"
                  >
                    取消
                  </button>
                  <button
                    onClick={doBook}
                    disabled={busy}
                    className="h-[46px] flex-1 rounded-xl bg-blue-600 text-[15px] font-semibold text-white"
                  >
                    {busy ? "處理中..." : "確認代報名"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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

      {kickTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !busy && setKickTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-bold">
              {kickTarget.status === "waitlisted" ? "取消候補？" : "取消報名？"}
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              {kickTarget.display_name ?? "（無名稱）"}
              {kickTarget.qty > 1 ? ` · ${kickTarget.qty} 位` : ""}
            </p>
            {err && <p className="mb-3 text-sm text-[#C8102E]">{err}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setKickTarget(null)}
                disabled={busy}
                className="h-[46px] flex-1 rounded-xl bg-gray-100 text-[15px] font-semibold text-gray-700"
              >
                不要
              </button>
              <button
                onClick={doKick}
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
