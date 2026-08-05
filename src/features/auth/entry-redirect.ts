import { createClient } from "@/lib/supabase/server";

import { parseUserRole } from "./types";

type RoleEntryConfig = {
  role: "buyer" | "breeder";
  table: "buyers" | "breeders";
  profilePath: string;
  dashboardPath: string;
};

async function getRoleEntryPath(config: RoleEntryConfig): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "/login";
  }

  const role = parseUserRole(user);
  if (role !== config.role) {
    return "/login";
  }

  const { data, error } = await supabase
    .from(config.table)
    .select("profile_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.profile_completed) {
    return config.profilePath;
  }

  return config.dashboardPath;
}

export async function getBreederEntryPath(): Promise<string> {
  return getRoleEntryPath({
    role: "breeder",
    table: "breeders",
    profilePath: "/breeder/profile",
    dashboardPath: "/breeder/dashboard",
  });
}

export async function getBuyerEntryPath(): Promise<string> {
  return getRoleEntryPath({
    role: "buyer",
    table: "buyers",
    profilePath: "/buyer/profile",
    dashboardPath: "/buyer/dashboard",
  });
}
