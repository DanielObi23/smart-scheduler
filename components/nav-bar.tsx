import Link from "next/link";
import { SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

export function NavBar() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/calendar" className="font-semibold">
          Scheduler
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" asChild aria-label="Settings">
            <Link href="/settings">
              <SettingsIcon />
            </Link>
          </Button>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
