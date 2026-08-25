/**
 * BY-07 visit request validation tests (no DB).
 *
 * Usage:
 *   npm run test:buyer-visit-request-validation
 */

import {
  VISIT_DATETIME_ORDER_MESSAGE,
  VISIT_FIRST_DATETIME_REQUIRED_MESSAGE,
  VISIT_MESSAGE_REQUIRED_MESSAGE,
  VISIT_PAST_DATETIME_MESSAGE,
} from "../src/features/visits/constants";
import { datetimeLocalToIso, isFutureDatetime } from "../src/features/visits/datetime";
import { mapRequestVisitRpcError } from "../src/features/visits/errors";
import {
  hasVisitRequestValidationErrors,
  validateVisitRequestForm,
} from "../src/features/visits/validation";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

const checks: Check[] = [];

function record(name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function futureLocal(hoursFromNow: number): string {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pastLocal(hoursAgo: number): string {
  const date = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function main(): void {
  const baseInput = {
    inquiryId: "550e8400-e29b-41d4-a716-446655440000",
    requestedAt: "",
    requestedAtSecond: "",
    requestedAtThird: "",
    message: "",
  };

  record(
    "1. first datetime required",
    validateVisitRequestForm(baseInput).requestedAt === VISIT_FIRST_DATETIME_REQUIRED_MESSAGE,
  );
  record(
    "2. message required",
    validateVisitRequestForm({
      ...baseInput,
      requestedAt: futureLocal(24),
    }).message === VISIT_MESSAGE_REQUIRED_MESSAGE,
  );
  record(
    "3. past datetime rejected",
    validateVisitRequestForm({
      ...baseInput,
      requestedAt: pastLocal(1),
      message: "見学希望です",
    }).requestedAt === VISIT_PAST_DATETIME_MESSAGE,
  );
  record(
    "4. valid first + message passes",
    !hasVisitRequestValidationErrors(
      validateVisitRequestForm({
        ...baseInput,
        requestedAt: futureLocal(24),
        message: "見学希望です",
      }),
    ),
  );
  record(
    "5. second must be after first",
    validateVisitRequestForm({
      ...baseInput,
      requestedAt: futureLocal(48),
      requestedAtSecond: futureLocal(24),
      message: "見学希望です",
    }).requestedAtSecond === VISIT_DATETIME_ORDER_MESSAGE,
  );
  record(
    "6. third requires second",
    validateVisitRequestForm({
      ...baseInput,
      requestedAt: futureLocal(24),
      requestedAtThird: futureLocal(72),
      message: "見学希望です",
    }).requestedAtThird === VISIT_DATETIME_ORDER_MESSAGE,
  );
  record(
    "7. datetime-local converts to ISO",
    Boolean(datetimeLocalToIso(futureLocal(1))?.endsWith("Z")),
  );
  record("8. future ISO check", isFutureDatetime(new Date(Date.now() + 3600000).toISOString()));
  record(
    "9. RPC past datetime mapped",
    mapRequestVisitRpcError("first preferred datetime must be in the future") ===
      VISIT_PAST_DATETIME_MESSAGE,
  );
  record(
    "10. RPC unauthorized mapped",
    mapRequestVisitRpcError("unauthorized").includes("見学を申し込めません"),
  );

  const failed = checks.filter((check) => !check.passed);

  console.log("");
  console.log(`Result: ${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
