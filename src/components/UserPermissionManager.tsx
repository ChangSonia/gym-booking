"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiffAuth } from "@/components/LiffAuthProvider";
import type { AdminUserRow } from "@/lib/admin-types";

export default function UserPermissionManager() {
  const auth = useLiffAuth();
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (auth.status !== "ready") return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: auth.idToken }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "LOAD_FAILED");
      setUsers(json.users);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "讀取失敗");
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleCoach(u: AdminUserRow) {
    if (auth.status !== "ready") return;
    setBusyId(u.id);
    setErr("");
    try {
      const res = await fetch(`/api/admin/users/${u.id}/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: auth.idToken, isCoach: !u.is_coach }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "操作失敗");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失敗，請稍後再試");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-base font-bold">使用者權限</h2>
      <p className="mb-3 text-xs text-gray-400">
        設定誰可以進教練後台。管理員身分不能在這裡改，要去 Supabase 手動設。
      </p>

      {err && <p className="mb-3 text-xs text-[#C8102E]">{err}</p>}

      {users === null ? (
        <p className="text-sm text-gray-400">讀取中...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-300">還沒有人登入過</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {u.picture_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={u.picture_url}
                    alt=""
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                )}
                <span className="text-sm text-gray-900">
                  {u.display_name ?? "（無名稱）"}
                  {u.is_admin && (
                    <span className="ml-1 text-xs text-gray-400">
                      （管理員）
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={() => toggleCoach(u)}
                disabled={busyId === u.id}
                className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                  u.is_coach
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {u.is_coach ? "是教練" : "不是教練"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
