"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiffAuth } from "@/components/LiffAuthProvider";
import type { CourseRow, CoachRow } from "@/lib/admin-types";

const WEEKDAY_LABELS = ["", "週一", "週二", "週三", "週四", "週五", "週六", "週日"];

function todayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(
    new Date(),
  );
}

function toHm(time: string): string {
  return time.slice(0, 5);
}

export default function CourseManager() {
  const auth = useLiffAuth();
  const [courses, setCourses] = useState<CourseRow[] | null>(null);
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newWeekday, setNewWeekday] = useState(1);
  const [newStartTime, setNewStartTime] = useState("11:00");
  const [newCoachId, setNewCoachId] = useState<number | "">("");
  const [newCapacity, setNewCapacity] = useState(10);

  const [editing, setEditing] = useState<CourseRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editCoachId, setEditCoachId] = useState<number | "">("");
  const [editCapacity, setEditCapacity] = useState(10);
  const [editEffectiveDate, setEditEffectiveDate] = useState(todayYmd());

  const load = useCallback(async () => {
    if (auth.status !== "ready") return;
    try {
      const [coursesRes, coachesRes] = await Promise.all([
        fetch("/api/admin/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: auth.idToken }),
        }),
        fetch("/api/admin/coaches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: auth.idToken }),
        }),
      ]);
      const coursesJson = await coursesRes.json();
      const coachesJson = await coachesRes.json();
      if (!coursesRes.ok) throw new Error(coursesJson.error ?? "LOAD_FAILED");
      if (!coachesRes.ok) throw new Error(coachesJson.error ?? "LOAD_FAILED");
      setCourses(coursesJson.courses);
      setCoaches(coachesJson.coaches);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "讀取失敗");
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(c: CourseRow) {
    setEditing(c);
    setEditTitle(c.title);
    setEditStartTime(toHm(c.start_time));
    setEditCoachId(c.coach_id ?? "");
    setEditCapacity(c.capacity);
    setEditEffectiveDate(todayYmd());
  }

  async function createCourse() {
    if (auth.status !== "ready" || !newTitle.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/courses/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: auth.idToken,
          title: newTitle.trim(),
          coachId: newCoachId === "" ? null : newCoachId,
          weekday: newWeekday,
          startTime: `${newStartTime}:00`,
          capacity: newCapacity,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "操作失敗");
      setCreating(false);
      setNewTitle("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (auth.status !== "ready" || !editing || !editTitle.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/courses/${editing.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: auth.idToken,
          title: editTitle.trim(),
          coachId: editCoachId === "" ? null : editCoachId,
          startTime: `${editStartTime}:00`,
          capacity: editCapacity,
          effectiveDate: editEffectiveDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "操作失敗");
      setEditing(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c: CourseRow) {
    if (auth.status !== "ready") return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/courses/${c.id}/toggle-active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: auth.idToken, active: !c.active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "操作失敗");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-base font-bold">課程模板</h2>
      <p className="mb-3 text-xs text-gray-400">
        改模板要選生效日，只影響「生效日之後、還沒開放報名」的課；已經開放報名的課不受影響。
      </p>

      <button
        onClick={() => setCreating(true)}
        className="mb-3 h-10 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white"
      >
        新增課程
      </button>

      {err && <p className="mb-3 text-xs text-[#C8102E]">{err}</p>}

      {courses === null ? (
        <p className="text-sm text-gray-400">讀取中...</p>
      ) : courses.length === 0 ? (
        <p className="text-sm text-gray-300">還沒有課程模板</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {courses.map((c) => (
            <li
              key={c.id}
              className={`rounded-lg border border-gray-100 px-3 py-2 ${
                c.active ? "" : "opacity-50"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {WEEKDAY_LABELS[c.weekday]} {toHm(c.start_time)}　{c.title}
                </span>
                <button
                  onClick={() => toggleActive(c)}
                  disabled={busy}
                  className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                    c.active
                      ? "border-gray-200 text-gray-600"
                      : "border-gray-200 text-gray-400"
                  }`}
                >
                  {c.active ? "使用中" : "已停用"}
                </button>
              </div>
              <div className="mb-2 text-xs text-gray-400">
                教練：{c.coachName ?? "待定"} ・ 名額 {c.capacity} 人
              </div>
              <button
                onClick={() => openEdit(c)}
                className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600"
              >
                編輯
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !busy && setCreating(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-lg font-bold">新增課程</h2>

            <label className="mb-1 block text-xs text-gray-500">課名</label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="mb-3 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            />

            <label className="mb-1 block text-xs text-gray-500">星期</label>
            <select
              value={newWeekday}
              onChange={(e) => setNewWeekday(Number(e.target.value))}
              className="mb-3 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>
                  {WEEKDAY_LABELS[d]}
                </option>
              ))}
            </select>

            <label className="mb-1 block text-xs text-gray-500">時間</label>
            <input
              type="time"
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
              className="mb-3 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            />

            <label className="mb-1 block text-xs text-gray-500">教練</label>
            <select
              value={newCoachId}
              onChange={(e) =>
                setNewCoachId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="mb-3 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            >
              <option value="">待定</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <label className="mb-1 block text-xs text-gray-500">名額</label>
            <input
              type="number"
              min={1}
              value={newCapacity}
              onChange={(e) => setNewCapacity(Number(e.target.value))}
              className="mb-4 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            />

            {err && <p className="mb-3 text-sm text-[#C8102E]">{err}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setCreating(false)}
                disabled={busy}
                className="h-[46px] flex-1 rounded-xl border border-gray-200 text-[15px] font-medium text-gray-600"
              >
                取消
              </button>
              <button
                onClick={createCourse}
                disabled={busy || !newTitle.trim()}
                className="h-[46px] flex-1 rounded-xl bg-blue-600 text-[15px] font-semibold text-white disabled:opacity-50"
              >
                {busy ? "處理中..." : "新增"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !busy && setEditing(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-bold">編輯課程</h2>
            <p className="mb-3 text-xs text-gray-400">
              {WEEKDAY_LABELS[editing.weekday]}
              （固定星期不能改，要改的話用「停用」這個 + 新增一個新的）
            </p>

            <label className="mb-1 block text-xs text-gray-500">課名</label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="mb-3 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            />

            <label className="mb-1 block text-xs text-gray-500">時間</label>
            <input
              type="time"
              value={editStartTime}
              onChange={(e) => setEditStartTime(e.target.value)}
              className="mb-3 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            />

            <label className="mb-1 block text-xs text-gray-500">教練</label>
            <select
              value={editCoachId}
              onChange={(e) =>
                setEditCoachId(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="mb-3 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            >
              <option value="">待定</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <label className="mb-1 block text-xs text-gray-500">名額</label>
            <input
              type="number"
              min={1}
              value={editCapacity}
              onChange={(e) => setEditCapacity(Number(e.target.value))}
              className="mb-3 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            />

            <label className="mb-1 block text-xs text-gray-500">
              生效日（只影響這天之後、還沒開放報名的課）
            </label>
            <input
              type="date"
              value={editEffectiveDate}
              onChange={(e) => setEditEffectiveDate(e.target.value)}
              className="mb-4 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            />

            {err && <p className="mb-3 text-sm text-[#C8102E]">{err}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setEditing(null)}
                disabled={busy}
                className="h-[46px] flex-1 rounded-xl border border-gray-200 text-[15px] font-medium text-gray-600"
              >
                取消
              </button>
              <button
                onClick={saveEdit}
                disabled={busy || !editTitle.trim()}
                className="h-[46px] flex-1 rounded-xl bg-blue-600 text-[15px] font-semibold text-white disabled:opacity-50"
              >
                {busy ? "處理中..." : "確認修改"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
