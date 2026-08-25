import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

import { isAdminUser, parseMemberUserRole } from "./types";

export async function getCurrentBreeder(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || isAdminUser(user)) {
    return null;
  }

  if (parseMemberUserRole(user) !== "breeder") {
    return null;
  }

  return user;
}

export async function requireBreeder(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (isAdminUser(user)) {
    redirect("/admin");
  }

  const memberRole = parseMemberUserRole(user);

  if (memberRole === "buyer") {
    redirect("/buyer");
  }

  if (memberRole !== "breeder") {
    redirect("/login");
  }

  return user;
}
