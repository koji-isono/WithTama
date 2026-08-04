"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { insertPet } from "@/lib/supabase/pets";

const createPetSchema = z.object({
  management_name: z.string().trim().min(1, "管理名を入力してください"),
  breed: z.string().trim().min(1, "犬種を入力してください"),
  sex: z.enum(["male", "female"], { message: "性別を選択してください" }),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "誕生日を入力してください"),
});

export type CreatePetFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"management_name" | "breed" | "sex" | "birthday", string>>;
};

export async function createPetAction(
  _prevState: CreatePetFormState,
  formData: FormData,
): Promise<CreatePetFormState> {
  const parsed = createPetSchema.safeParse({
    management_name: formData.get("management_name"),
    breed: formData.get("breed"),
    sex: formData.get("sex"),
    birthday: formData.get("birthday"),
  });

  if (!parsed.success) {
    const fieldErrors: CreatePetFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (
        field === "management_name" ||
        field === "breed" ||
        field === "sex" ||
        field === "birthday"
      ) {
        fieldErrors[field] = issue.message;
      }
    }
    return { fieldErrors };
  }

  try {
    await insertPet({
      managementName: parsed.data.management_name,
      breed: parsed.data.breed,
      sex: parsed.data.sex,
      birthday: parsed.data.birthday,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "登録に失敗しました",
    };
  }

  revalidatePath("/breeder/pets");
  redirect("/breeder/pets");
}
