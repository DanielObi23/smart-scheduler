import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";

const links = [
  { href: "/calendar", label: "Calendar" },
  { href: "/board", label: "Board" },
  { href: "/timetable", label: "Timetable" },
  { href: "/overdue", label: "Overdue" },
  { href: "/settings", label: "Settings" },
];

export function NavBar() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Button key={link.href} variant="ghost" size="sm" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>
        <SignOutButton />
      </div>
    </header>
  );
}
