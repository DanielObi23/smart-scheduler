import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { userSettings, type UserSettingsRow } from "@/db/schema";

const DEFAULT_SETTINGS: Omit<UserSettingsRow, "userId"> = {
  dailyCapacityHours: 8,
  capacityOverflowPercent: 10,
};

/** Falls back to sane defaults if the user hasn't saved settings yet. */
export async function getUserSettings(userId: string): Promise<UserSettingsRow> {
  const [row] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  return row ?? { userId, ...DEFAULT_SETTINGS };
}
