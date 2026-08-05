import { redirect } from "next/navigation";

import { getBreederEntryPath } from "@/features/auth/entry-redirect";

export default async function BreederEntryPage() {
  redirect(await getBreederEntryPath());
}
