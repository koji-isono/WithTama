import { redirect } from "next/navigation";

import { BREEDER_PROFILE_BASIC_PATH } from "@/features/breeder-profile";

export default function BreederProfileEntryPage() {
  redirect(BREEDER_PROFILE_BASIC_PATH);
}
