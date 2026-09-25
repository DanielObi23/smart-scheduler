"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "@/actions/settings";
import type { UserSettingsRow } from "@/db/schema";

export function SettingsForm({ settings }: { settings: UserSettingsRow }) {
  const [isPending, startTransition] = useTransition();
  const [dailyCapacityHours, setDailyCapacityHours] = useState(settings.dailyCapacityHours);
  const [capacityOverflowPercent, setCapacityOverflowPercent] = useState(
    settings.capacityOverflowPercent,
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateSettings({ dailyCapacityHours, capacityOverflowPercent });
        toast.success("Settings saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dailyCapacityHours">Daily capacity (hours)</Label>
        <Input
          id="dailyCapacityHours"
          type="number"
          min={1}
          max={24}
          value={dailyCapacityHours}
          onChange={(e) => setDailyCapacityHours(Number(e.target.value))}
        />
        <p className="text-xs text-muted-foreground">
          How much time you actually have for tasks on a normal day.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="capacityOverflowPercent">Overflow allowance (%)</Label>
        <Input
          id="capacityOverflowPercent"
          type="number"
          min={0}
          max={100}
          value={capacityOverflowPercent}
          onChange={(e) => setCapacityOverflowPercent(Number(e.target.value))}
        />
        <p className="text-xs text-muted-foreground">
          How far past your daily capacity the scheduler is allowed to go on a
          busy day. 0 means strict.
        </p>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        Save
      </Button>
    </form>
  );
}
