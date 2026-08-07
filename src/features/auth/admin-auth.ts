import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

import { getMemberHomePath, isAdminUser, parseMemberUserRole } from "./types";

export async function getCurrentAdmin(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !isAdminUser(user)) {
    return null;
  }

  return user;
}

export async function requireAdmin(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (isAdminUser(user)) {
    return user;
  }

  const memberRole = parseMemberUserRole(user);

  if (memberRole) {
    redirect(getMemberHomePath(memberRole));
  }

  redirect("/login");
}
