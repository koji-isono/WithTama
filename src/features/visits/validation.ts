import { INQUIRY_MESSAGE_MAX_LENGTH } from "@/features/inquiries/constants";
import {
  hasInquiryMessageValidationErrors,
  normalizeInquiryMessage,
  validateInquiryMessage,
} from "@/features/inquiries/validation";

import {
  VISIT_DATETIME_ORDER_MESSAGE,
  VISIT_FIRST_DATETIME_REQUIRED_MESSAGE,
  VISIT_INVALID_DATETIME_MESSAGE,
  VISIT_MESSAGE_REQUIRED_MESSAGE,
  VISIT_PAST_DATETIME_MESSAGE,
  VISIT_CANCELLATION_REASON_MAX_LENGTH,
  VISIT_CANCELLATION_REASON_MAX_LENGTH_MESSAGE,
  VISIT_SCHEDULE_DATETIME_REQUIRED_MESSAGE,
  VISIT_COMPLETE_FLAGS_REQUIRED_MESSAGE,
  VISIT_COMPLETE_RESULT_REQUIRED_MESSAGE,
} from "./constants";
import { datetimeLocalToIso, isFutureDatetime } from "./datetime";
import type {
  CompleteVisitFieldErrors,
  ScheduleVisitFieldErrors,
  VisitRequestFieldErrors,
  VisitRequestFormInput,
} from "./types";

export function hasVisitRequestValidationErrors(errors: VisitRequestFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

function validatePreferredDatetime(
  value: string,
  options: { required: boolean; mustBeAfterIso?: string | null },
): string | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return options.required ? VISIT_FIRST_DATETIME_REQUIRED_MESSAGE : undefined;
  }

  const iso = datetimeLocalToIso(trimmed);

  if (!iso) {
    return VISIT_INVALID_DATETIME_MESSAGE;
  }

  if (!isFutureDatetime(iso)) {
    return VISIT_PAST_DATETIME_MESSAGE;
  }

  if (
    options.mustBeAfterIso &&
    new Date(iso).getTime() <= new Date(options.mustBeAfterIso).getTime()
  ) {
    return VISIT_DATETIME_ORDER_MESSAGE;
  }

  return undefined;
}

export function validateVisitRequestForm(input: VisitRequestFormInput): VisitRequestFieldErrors {
  const errors: VisitRequestFieldErrors = {};

  const messageErrors = validateInquiryMessage(input.message);

  if (hasInquiryMessageValidationErrors(messageErrors)) {
    errors.message = messageErrors.message?.includes("問い合わせ内容")
      ? VISIT_MESSAGE_REQUIRED_MESSAGE
      : messageErrors.message;
  }

  const firstIso = input.requestedAt.trim() ? datetimeLocalToIso(input.requestedAt) : null;

  const requestedAtError = validatePreferredDatetime(input.requestedAt, { required: true });

  if (requestedAtError) {
    errors.requestedAt = requestedAtError;
  }

  if (input.requestedAtSecond.trim()) {
    const secondError = validatePreferredDatetime(input.requestedAtSecond, {
      required: false,
      mustBeAfterIso: firstIso,
    });

    if (secondError) {
      errors.requestedAtSecond = secondError;
    }
  }

  if (input.requestedAtThird.trim()) {
    if (!input.requestedAtSecond.trim()) {
      errors.requestedAtThird = VISIT_DATETIME_ORDER_MESSAGE;
    } else {
      const secondIso = datetimeLocalToIso(input.requestedAtSecond);
      const thirdError = validatePreferredDatetime(input.requestedAtThird, {
        required: false,
        mustBeAfterIso: secondIso,
      });

      if (thirdError) {
        errors.requestedAtThird = thirdError;
      }
    }
  }

  return errors;
}

export function normalizeVisitRequestMessage(message: string): string {
  return normalizeInquiryMessage(message);
}

export { INQUIRY_MESSAGE_MAX_LENGTH };

export function validateCancellationReason(reason: string): { cancellationReason?: string } {
  const trimmed = reason.trim();

  if (trimmed.length > VISIT_CANCELLATION_REASON_MAX_LENGTH) {
    return { cancellationReason: VISIT_CANCELLATION_REASON_MAX_LENGTH_MESSAGE };
  }

  return {};
}

export function validateScheduleVisitForm(input: {
  scheduledAt: string;
}): ScheduleVisitFieldErrors {
  const errors: ScheduleVisitFieldErrors = {};
  const trimmed = input.scheduledAt.trim();

  if (!trimmed) {
    errors.scheduledAt = VISIT_SCHEDULE_DATETIME_REQUIRED_MESSAGE;
    return errors;
  }

  const iso = datetimeLocalToIso(trimmed);

  if (!iso) {
    errors.scheduledAt = VISIT_INVALID_DATETIME_MESSAGE;
    return errors;
  }

  if (!isFutureDatetime(iso)) {
    errors.scheduledAt = VISIT_PAST_DATETIME_MESSAGE;
  }

  return errors;
}

export function hasScheduleVisitValidationErrors(errors: ScheduleVisitFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

const VISIT_COMPLETE_RESULT_VALUES = ["contracted", "declined", "considering"] as const;

export function validateCompleteVisitForm(input: {
  animalConfirmed: boolean;
  explanationCompleted: boolean;
  result: string;
}): CompleteVisitFieldErrors {
  const errors: CompleteVisitFieldErrors = {};

  if (!input.animalConfirmed) {
    errors.animalConfirmed = VISIT_COMPLETE_FLAGS_REQUIRED_MESSAGE;
  }

  if (!input.explanationCompleted) {
    errors.explanationCompleted = VISIT_COMPLETE_FLAGS_REQUIRED_MESSAGE;
  }

  const result = input.result.trim();

  if (!result || !(VISIT_COMPLETE_RESULT_VALUES as readonly string[]).includes(result)) {
    errors.result = VISIT_COMPLETE_RESULT_REQUIRED_MESSAGE;
  }

  return errors;
}

export function hasCompleteVisitValidationErrors(errors: CompleteVisitFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
