import {
  PROFILE_INCOMPLETE_MESSAGE,
  RESUBMIT_GENERIC_ERROR_MESSAGE,
  RESUBMIT_INVALID_STATUS_MESSAGE,
  SUBMIT_INVALID_STATUS_MESSAGE,
} from "./application-submit-constants";
import { formatProfileSaveError } from "./format-save-error";

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
}

export function formatInitialSubmitError(error: unknown): string {
  const message = normalizeErrorMessage(error);

  if (message.includes("authentication required")) {
    return "ログインが必要です。";
  }

  if (message.includes("invalid review status")) {
    return SUBMIT_INVALID_STATUS_MESSAGE;
  }

  if (message.includes("documents required")) {
    return PROFILE_INCOMPLETE_MESSAGE;
  }

  if (message.includes("breeder not found")) {
    return "プロフィールが見つかりません。";
  }

  return formatProfileSaveError(error);
}

export function formatResubmitError(error: unknown): string {
  const message = normalizeErrorMessage(error);

  if (message.includes("authentication required")) {
    return "ログインが必要です。";
  }

  if (message.includes("invalid review status")) {
    return RESUBMIT_INVALID_STATUS_MESSAGE;
  }

  if (message.includes("documents required")) {
    return PROFILE_INCOMPLETE_MESSAGE;
  }

  if (message.includes("breeder not found")) {
    return "プロフィールが見つかりません。";
  }

  return RESUBMIT_GENERIC_ERROR_MESSAGE;
}
