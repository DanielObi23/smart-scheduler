import { OverdueList } from "@/components/overdue-list";
import { getOverdueTasksForUser } from "@/db/queries/tasks";
import { getUserSettings } from "@/db/queries/settings";
import { requireUserId } from "@/lib/auth/require-user-id";

export const dynamic = "force-dynamic";

export default async function OverduePage() {
  const userId = await requireUserId();

  const now = new Date();
  const [tasks, settings] = await Promise.all([
    getOverdueTasksForUser(userId, now),
    getUserSettings(userId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Overdue</h1>
      <p className="text-sm text-muted-foreground">
        These aren&apos;t auto-scheduled — the plan&apos;s job is to keep work
        from becoming overdue, not to keep rearranging around it once it has.
        Click one to give it a new date and time yourself.
      </p>
      <OverdueList tasks={tasks} dailyCapacity={settings.dailyCapacityHours} now={now} />
    </div>
  );
}
