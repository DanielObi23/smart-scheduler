import { SettingsForm } from "@/components/settings-form";
import { getUserSettings } from "@/db/queries/settings";
import { requireUserId } from "@/lib/auth/require-user-id";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await requireUserId();

  const settings = await getUserSettings(userId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}
