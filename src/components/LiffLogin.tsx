"use client";

import { useLiffAuth } from "@/components/LiffAuthProvider";

export default function LiffLogin() {
  const auth = useLiffAuth();

  if (auth.status === "loading") {
    return <p className="mb-4 text-sm text-gray-400">登入中...</p>;
  }

  if (auth.status === "error") {
    return (
      <p className="mb-4 text-sm text-[#C8102E]">登入失敗：{auth.message}</p>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-2">
      {auth.user.picture_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={auth.user.picture_url}
          alt=""
          width={28}
          height={28}
          className="rounded-full"
        />
      )}
      <span className="text-sm text-gray-600">
        已登入：{auth.user.display_name ?? "（無名稱）"}
      </span>
    </div>
  );
}
