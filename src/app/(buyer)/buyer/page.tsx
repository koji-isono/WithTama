import { redirect } from "next/navigation";

import { getBuyerEntryPath } from "@/features/auth/entry-redirect";

export default async function BuyerEntryPage() {
  redirect(await getBuyerEntryPath());
}
