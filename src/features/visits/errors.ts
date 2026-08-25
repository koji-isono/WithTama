import {
  VISIT_ALREADY_EXISTS_MESSAGE,
  VISIT_CANCEL_ERROR_MESSAGE,
  VISIT_CANNOT_CANCEL_MESSAGE,
  VISIT_CANNOT_COMPLETE_MESSAGE,
  VISIT_CANNOT_SCHEDULE_MESSAGE,
  VISIT_CANCELLATION_REASON_MAX_LENGTH_MESSAGE,
  VISIT_COMPLETE_BEFORE_SCHEDULED_MESSAGE,
  VISIT_COMPLETE_ERROR_MESSAGE,
  VISIT_COMPLETE_FLAGS_REQUIRED_MESSAGE,
  VISIT_COMPLETE_RESULT_REQUIRED_MESSAGE,
  VISIT_INQUIRY_NOT_ELIGIBLE_MESSAGE,
  VISIT_INVALID_DATETIME_MESSAGE,
  VISIT_MESSAGE_MAX_LENGTH_MESSAGE,
  VISIT_PAST_DATETIME_MESSAGE,
  VISIT_SCHEDULE_DATETIME_REQUIRED_MESSAGE,
  VISIT_SCHEDULE_ERROR_MESSAGE,
  VISIT_SUBMIT_ERROR_MESSAGE,
  VISIT_UNAUTHORIZED_INQUIRY_MESSAGE,
} from "./constants";

export function mapRequestVisitRpcError(message: string | undefined): string {
  if (!message) {
    return VISIT_SUBMIT_ERROR_MESSAGE;
  }

  const normalized = message.toLowerCase();

  if (normalized.includes("must be in the future") || normalized.includes("past")) {
    return VISIT_PAST_DATETIME_MESSAGE;
  }

  if (
    normalized.includes("invalid second preferred") ||
    normalized.includes("invalid third preferred") ||
    normalized.includes("second preferred datetime is required")
  ) {
    return VISIT_INVALID_DATETIME_MESSAGE;
  }

  if (normalized.includes("visit already exists")) {
    return VISIT_ALREADY_EXISTS_MESSAGE;
  }

  if (normalized.includes("invalid inquiry status")) {
    return VISIT_INQUIRY_NOT_ELIGIBLE_MESSAGE;
  }

  if (
    normalized.includes("unauthorized") ||
    normalized.includes("invalid request actor") ||
    normalized.includes("inquiry not found")
  ) {
    return VISIT_UNAUTHORIZED_INQUIRY_MESSAGE;
  }

  if (normalized.includes("message too long")) {
    return VISIT_MESSAGE_MAX_LENGTH_MESSAGE;
  }

  if (normalized.includes("first preferred datetime is required")) {
    return VISIT_PAST_DATETIME_MESSAGE;
  }

  return VISIT_SUBMIT_ERROR_MESSAGE;
}

export function mapCancelVisitRpcError(message: string | undefined): string {
  if (!message) {
    return VISIT_CANCEL_ERROR_MESSAGE;
  }

  const normalized = message.toLowerCase();

  if (normalized.includes("invalid visit status")) {
    return VISIT_CANNOT_CANCEL_MESSAGE;
  }

  if (
    normalized.includes("unauthorized") ||
    normalized.includes("invalid cancel actor") ||
    normalized.includes("visit not found")
  ) {
    return VISIT_CANNOT_CANCEL_MESSAGE;
  }

  if (normalized.includes("cancellation reason too long")) {
    return VISIT_CANCELLATION_REASON_MAX_LENGTH_MESSAGE;
  }

  return VISIT_CANCEL_ERROR_MESSAGE;
}

export function mapScheduleVisitRpcError(message: string | undefined): string {
  if (!message) {
    return VISIT_SCHEDULE_ERROR_MESSAGE;
  }

  const normalized = message.toLowerCase();

  if (normalized.includes("must be in the future") || normalized.includes("past")) {
    return VISIT_PAST_DATETIME_MESSAGE;
  }

  if (normalized.includes("scheduled datetime is required")) {
    return VISIT_SCHEDULE_DATETIME_REQUIRED_MESSAGE;
  }

  if (normalized.includes("invalid visit status")) {
    return VISIT_CANNOT_SCHEDULE_MESSAGE;
  }

  if (
    normalized.includes("unauthorized") ||
    normalized.includes("invalid schedule actor") ||
    normalized.includes("visit not found")
  ) {
    return VISIT_CANNOT_SCHEDULE_MESSAGE;
  }

  return VISIT_SCHEDULE_ERROR_MESSAGE;
}

export function mapCompleteVisitRpcError(message: string | undefined): string {
  if (!message) {
    return VISIT_COMPLETE_ERROR_MESSAGE;
  }

  const normalized = message.toLowerCase();

  if (normalized.includes("implementation flags must be true")) {
    return VISIT_COMPLETE_FLAGS_REQUIRED_MESSAGE;
  }

  if (normalized.includes("visit cannot be completed before scheduled datetime")) {
    return VISIT_COMPLETE_BEFORE_SCHEDULED_MESSAGE;
  }

  if (normalized.includes("result is required") || normalized.includes("invalid result")) {
    return VISIT_COMPLETE_RESULT_REQUIRED_MESSAGE;
  }

  if (normalized.includes("invalid visit status")) {
    return VISIT_CANNOT_COMPLETE_MESSAGE;
  }

  if (
    normalized.includes("unauthorized") ||
    normalized.includes("invalid complete actor") ||
    normalized.includes("visit not found")
  ) {
    return VISIT_CANNOT_COMPLETE_MESSAGE;
  }

  return VISIT_COMPLETE_ERROR_MESSAGE;
}
