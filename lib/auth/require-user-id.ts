import { auth } from "@/lib/auth/server";

/** Throws if there's no signed-in session -- proxy.ts already gates these
 * routes, so this is defense-in-depth, not the primary access check. */
export async function requireUserId(): Promise<string> {
  const { data } = await auth.getSession();
  const userId = data?.user?.id;
  if (!userId) throw new Error("Not signed in");
  return userId;
}
