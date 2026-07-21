import LiffLogin from "@/components/LiffLogin";
import NavTabs from "@/components/NavTabs";
import ScheduleView from "@/components/ScheduleView";
import { getScheduleDays } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { days, weeks } = await getScheduleDays();

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">課表</h1>

      <LiffLogin />
      <NavTabs />

      <ScheduleView days={days} weeks={weeks} />
    </main>
  );
}
