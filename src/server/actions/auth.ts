"use server";

import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/server/auth/firebase";

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/** Clears the server session cookie. The client also calls Firebase signOut(). */
export async function logoutAction(): Promise<ActionResult<null>> {
  (await cookies()).delete(SESSION_COOKIE);
  return { ok: true, data: null };
}
