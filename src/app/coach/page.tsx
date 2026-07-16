"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiffAuth } from "@/components/LiffAuthProvider";
import LiffLogin from "@/components/LiffLogin";
import NavTabs from "@/components/NavTabs";
import CoachSessionCard from "@/components/CoachSessionCard";
import type { CoachSession } from "@/lib/coach-types";

export default function CoachPage() {
  const auth = useLiffAuth();
  const [sessions, setSessions] = useState<CoachSession[] | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (auth.status !== "ready") return;
    try {
      const res = await fetch("/api/coach/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: auth.idToken }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "LOAD_FAILED");
      setSessions(json.sessions);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "讀取失敗");
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  const isCoach =
    auth.status === "ready" && (auth.user.is_coach || auth.user.is_admin);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">教練後台</h1>

      <LiffLogin />
      <NavTabs />

      {auth.status === "loading" && (
        <p className="text-sm text-gray-400">登入中...</p>
      )}
      {auth.status === "error" && (
        <p className="text-sm text-[#C8102E]">登入失敗：{auth.message}</p>
      )}
      {auth.status === "ready" && !isCoach && (
        <p className="text-sm text-gray-500">沒有教練權限。</p>
      )}

      {isCoach && (
        <>
          {err && <p className="mb-3 text-sm text-[#C8102E]">{err}</p>}
          {sessions === null ? (
            <p className="text-sm text-gray-400">讀取課表中...</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map((s) => (
                <CoachSessionCard key={s.id} session={s} onChanged={load} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
