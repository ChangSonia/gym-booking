"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiffAuth } from "@/components/LiffAuthProvider";
import type { CoachRow } from "@/lib/admin-types";

function errorText(code?: string): string {
  switch (code) {
    case "NAME_TAKEN":
      return "已經有教練用這個名字了";
    case "FORBIDDEN":
      return "沒有權限";
    default:
      return "操作失敗，請稍後再試";
  }
}

export default function CoachManager() {
  const auth = useLiffAuth();
  const [coaches, setCoaches] = useState<CoachRow[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<CoachRow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<CoachRow | null>(null);

  const load = useCallback(async () => {
    if (auth.status !== "ready") return;
    try {
      const res = await fetch("/api/admin/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: auth.idToken }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "LOAD_FAILED");
      setCoaches(json.coaches);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "讀取失敗");
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  async function addCoach() {
    if (auth.status !== "ready" || !newName.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/coaches/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: auth.idToken, name: newName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(errorText(json.error));
      setNewName("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  async function rename() {
    if (auth.status !== "ready" || !renaming || !renameValue.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/coaches/${renaming.id}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: auth.idToken,
          name: renameValue.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(errorText(json.error));
      setRenaming(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (auth.status !== "ready" || !deleting) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/coaches/${deleting.id}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: auth.idToken }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(errorText(json.error));
      setDeleting(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-base font-bold">教練名單</h2>
      <p className="mb-3 text-xs text-gray-400">
        這裡是課表上顯示的教練名字。刪除教練後，名下的課會顯示「待定」。
      </p>

      <div className="mb-3 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新教練的名字"
          className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm"
        />
        <button
          onClick={addCoach}
          disabled={busy || !newName.trim()}
          className="h-10 shrink-0 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          新增
        </button>
      </div>

      {err && <p className="mb-3 text-xs text-[#C8102E]">{err}</p>}

      {coaches === null ? (
        <p className="text-sm text-gray-400">讀取中...</p>
      ) : coaches.length === 0 ? (
        <p className="text-sm text-gray-300">還沒有教練</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {coaches.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
            >
              <span className="text-sm font-medium text-gray-900">
                {c.name}
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setRenaming(c);
                    setRenameValue(c.name);
                  }}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600"
                >
                  改名
                </button>
                <button
                  onClick={() => setDeleting(c)}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-[#C8102E]"
                >
                  刪除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {renaming && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !busy && setRenaming(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-lg font-bold">改教練名字</h2>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="mb-4 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            />
            {err && <p className="mb-3 text-sm text-[#C8102E]">{err}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setRenaming(null)}
                disabled={busy}
                className="h-[46px] flex-1 rounded-xl border border-gray-200 text-[15px] font-medium text-gray-600"
              >
                取消
              </button>
              <button
                onClick={rename}
                disabled={busy || !renameValue.trim()}
                className="h-[46px] flex-1 rounded-xl bg-blue-600 text-[15px] font-semibold text-white disabled:opacity-50"
              >
                {busy ? "處理中..." : "確認修改"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !busy && setDeleting(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-bold">刪除教練</h2>
            <p className="mb-4 text-sm text-gray-500">
              {deleting.name}
              <br />
              名下的課會變成「待定」，會員也會看到「待定」。
            </p>
            {err && <p className="mb-3 text-sm text-[#C8102E]">{err}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleting(null)}
                disabled={busy}
                className="h-[46px] flex-1 rounded-xl bg-gray-100 text-[15px] font-semibold text-gray-700"
              >
                不要
              </button>
              <button
                onClick={doDelete}
                disabled={busy}
                className="h-[46px] flex-1 rounded-xl bg-[#C8102E] text-[15px] font-semibold text-white"
              >
                {busy ? "處理中..." : "確定刪除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
