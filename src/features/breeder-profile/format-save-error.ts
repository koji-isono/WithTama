export function formatProfileSaveError(error: unknown): string {
  console.error(error);

  if (process.env.NODE_ENV === "production") {
    return "保存に失敗しました。時間をおいて再度お試しください。";
  }

  return error instanceof Error ? error.message : "保存に失敗しました。";
}
