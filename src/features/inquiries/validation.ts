import {
  INQUIRY_MESSAGE_MAX_LENGTH,
  INQUIRY_MESSAGE_MAX_LENGTH_MESSAGE,
  INQUIRY_MESSAGE_REQUIRED_MESSAGE,
} from "./constants";
import type { InquiryMessageFieldErrors } from "./types";

const INQUIRY_ID_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidInquiryId(inquiryId: string): boolean {
  const trimmed = inquiryId.trim();

  return trimmed.length > 0 && INQUIRY_ID_UUID_REGEX.test(trimmed);
}

export function isValidInquiryPetId(petId: string): boolean {
  return isValidInquiryId(petId);
}

export function hasInquiryMessageValidationErrors(errors: InquiryMessageFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function validateInquiryMessage(message: string): InquiryMessageFieldErrors {
  const trimmed = message.trim();

  if (!trimmed) {
    return { message: INQUIRY_MESSAGE_REQUIRED_MESSAGE };
  }

  if (trimmed.length > INQUIRY_MESSAGE_MAX_LENGTH) {
    return { message: INQUIRY_MESSAGE_MAX_LENGTH_MESSAGE };
  }

  return {};
}

export function normalizeInquiryMessage(message: string): string {
  return message.trim();
}
