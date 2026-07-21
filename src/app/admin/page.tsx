"use client";

import { useLiffAuth } from "@/components/LiffAuthProvider";
import LiffLogin from "@/components/LiffLogin";
import NavTabs from "@/components/NavTabs";
import CoachManager from "@/components/CoachManager";
import CourseManager from "@/components/CourseManager";
import UserPermissionManager from "@/components/UserPermissionManager";

export default function AdminPage() {
  const auth = useLiffAuth();
  const isAdmin = auth.status === "ready" && auth.user.is_admin;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">管理</h1>

      <LiffLogin />
      <NavTabs />

      {auth.status === "loading" && (
        <p className="text-sm text-gray-400">登入中...</p>
      )}
      {auth.status === "error" && (
        <p className="text-sm text-[#C8102E]">登入失敗：{auth.message}</p>
      )}
      {auth.status === "ready" && !isAdmin && (
        <p className="text-sm text-gray-500">沒有管理員權限。</p>
      )}

      {isAdmin && (
        <div className="flex flex-col gap-8">
          <CourseManager />
          <CoachManager />
          <UserPermissionManager />
        </div>
      )}
    </main>
  );
}
