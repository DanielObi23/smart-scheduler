import { auth } from "@/lib/auth/server";

export default auth.middleware({ loginUrl: "/sign-in" });

export const config = {
  matcher: [
    "/calendar/:path*",
    "/board/:path*",
    "/timetable/:path*",
    "/overdue/:path*",
    "/settings/:path*",
  ],
};
