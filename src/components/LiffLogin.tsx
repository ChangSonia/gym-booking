"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";

type LineUser = {
  id: number;
  display_name: string | null;
  picture_url: string | null;
  is_coach: boolean;
  is_admin: boolean;
};

export default function LiffLogin() {
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [user, setUser] = useState<LineUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });

        if (!liff.isLoggedIn()) {
          liff.login();
          return; // 會跳轉到 LINE 登入頁，這行之後不會執行
        }

        const idToken = liff.getIDToken();
        if (!idToken) throw new Error("NO_ID_TOKEN");

        const res = await fetch("/api/auth/line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        if (!res.ok) throw new Error(await res.text());

        const json = await res.json();
        if (!cancelled) {
          setUser(json.user);
          setStatus("ready");
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e instanceof Error ? e.message : String(e));
          setStatus("error");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return <p style={{ marginBottom: 16 }}>登入中...</p>;
  }

  if (status === "error") {
    return (
      <p style={{ marginBottom: 16, color: "#C8102E" }}>登入失敗：{errorMsg}</p>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
      }}
    >
      {user?.picture_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.picture_url}
          alt=""
          width={32}
          height={32}
          style={{ borderRadius: "50%" }}
        />
      )}
      <span>已登入：{user?.display_name ?? "（無名稱）"}</span>
    </div>
  );
}
