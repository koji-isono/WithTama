import "server-only";

import { getLatestReturnedCommentForBreeder } from "./repository";
import { normalizeReturnedComment } from "./normalize-returned-comment";

export { normalizeReturnedComment };

export async function loadLatestReturnedCommentForBreederSafely(
  breederId: string,
): Promise<string | null> {
  try {
    const comment = await getLatestReturnedCommentForBreeder(breederId);
    return normalizeReturnedComment(comment);
  } catch {
    return null;
  }
}
