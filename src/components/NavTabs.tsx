"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiffAuth } from "@/components/LiffAuthProvider";

export default function NavTabs() {
  const auth = useLiffAuth();
  const pathname = usePathname();
  const isCoach =
    auth.status === "ready" && (auth.user.is_coach || auth.user.is_admin);
  const isAdmin = auth.status === "ready" && auth.user.is_admin;
  const mineCount = auth.status === "ready" ? auth.bookings.length : 0;

  const tabs = [
    { href: "/", label: "課表", badge: null as number | null },
    { href: "/mine", label: "我的課表", badge: mineCount },
    ...(isCoach ? [{ href: "/coach", label: "教練", badge: null }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "管理", badge: null }] : []),
  ];

  return (
    <nav className="mb-4 flex gap-1 border-b border-gray-100">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-3 py-2 text-sm font-medium ${
              active
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-400"
            }`}
          >
            {t.label}
            {!!t.badge && (
              <span className="ml-1 rounded-full bg-green-600 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                {t.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
