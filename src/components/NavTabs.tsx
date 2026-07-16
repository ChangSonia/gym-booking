"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiffAuth } from "@/components/LiffAuthProvider";

export default function NavTabs() {
  const auth = useLiffAuth();
  const pathname = usePathname();
  const isCoach =
    auth.status === "ready" && (auth.user.is_coach || auth.user.is_admin);

  const tabs = [
    { href: "/", label: "課表" },
    ...(isCoach ? [{ href: "/coach", label: "教練" }] : []),
  ];

  if (tabs.length < 2) return null;

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
          </Link>
        );
      })}
    </nav>
  );
}
