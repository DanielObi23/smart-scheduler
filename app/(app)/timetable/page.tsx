import { Button } from "@/components/ui/button";
import { FixedEventForm } from "@/components/fixed-event-form";
import { TimetableList } from "@/components/timetable-list";
import { getFixedEventsForUser } from "@/db/queries/fixedEvents";
import { requireUserId } from "@/lib/auth/require-user-id";

export const dynamic = "force-dynamic";

export default async function TimetablePage() {
  const userId = await requireUserId();

  const events = await getFixedEventsForUser(userId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Timetable</h1>
        <FixedEventForm trigger={<Button>+ New entry</Button>} />
      </div>
      <p className="text-sm text-muted-foreground">
        Your fixed commitments — sleep, work, classes — that the scheduler
        works around when placing tasks.
      </p>
      <TimetableList events={events} />
    </div>
  );
}
