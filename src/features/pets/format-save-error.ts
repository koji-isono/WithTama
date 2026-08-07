export function formatPetSaveError(error: unknown): string {
  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  } else {
    console.error("Pet save failed");
  }

  if (process.env.NODE_ENV === "production") {
    return "保存に失敗しました。時間をおいて再度お試しください。";
  }

  return error instanceof Error ? error.message : "保存に失敗しました。";
}
