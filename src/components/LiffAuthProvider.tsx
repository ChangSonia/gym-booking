"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import liff from "@line/liff";
import type { AuthedUser, MyBooking } from "@/lib/auth-types";

type AuthState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; idToken: string; user: AuthedUser; bookings: MyBooking[] };

type Ctx = AuthState & { refresh: () => Promise<void> };

const LiffAuthContext = createContext<Ctx>({
  status: "loading",
  refresh: async () => {},
});

export function useLiffAuth() {
  return useContext(LiffAuthContext);
}

export default function LiffAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const authenticate = useCallback(async () => {
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
      setState({
        status: "ready",
        idToken,
        user: json.user,
        bookings: json.bookings ?? [],
      });
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  return (
    <LiffAuthContext.Provider value={{ ...state, refresh: authenticate }}>
      {children}
    </LiffAuthContext.Provider>
  );
}
