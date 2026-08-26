export function normalizeReturnedComment(comment: string | null): string | null {
  if (comment === null) {
    return null;
  }

  const trimmed = comment.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}
