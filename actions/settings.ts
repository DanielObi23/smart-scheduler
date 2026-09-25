"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/auth/require-user-id";

const settingsInputSchema = z.object({
  dailyCapacityHours: z.coerce.number().min(1).max(24),
  capacityOverflowPercent: z.coerce.number().min(0).max(100),
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;

export async function updateSettings(input: SettingsInput) {
  const userId = await requireUserId();

  const data = settingsInputSchema.parse(input);

  await db
    .insert(userSettings)
    .values({ userId, ...data })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: data,
    });

  revalidatePath("/calendar");
  revalidatePath("/settings");
}
