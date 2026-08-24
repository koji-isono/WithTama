/**
 * Shared Select UI static verification.
 *
 * Usage:
 *   npx tsx scripts/test-select-ui.mts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function main(): void {
  const checks: Check[] = [];
  const selectUi = read("src/components/ui/select.tsx");
  const selectField = read("src/components/ui/select-field.tsx");
  const completeForm = read("src/features/visits/components/breeder-visit-complete-form.tsx");

  record(
    checks,
    "1. select uses Radix portal with elevated z-index",
    selectUi.includes("SelectPrimitive.Portal") && selectUi.includes("z-[200]"),
  );
  record(
    checks,
    "2. select trigger has h-11 and focus ring",
    selectUi.includes("h-11") && selectUi.includes("focus-visible:ring-2"),
  );
  record(
    checks,
    "3. select trigger supports error variant",
    selectUi.includes("selectTriggerVariants") && selectUi.includes("error:"),
  );
  record(
    checks,
    "4. select content uses collision padding defaults",
    selectUi.includes("collisionPadding = 24") && selectUi.includes("sideOffset = 8"),
  );
  record(
    checks,
    "5. select items have min height for touch targets",
    selectUi.includes("min-h-10"),
  );
  record(
    checks,
    "6. SelectField renders hints before trigger",
    selectField.includes("hints.map") &&
      selectField.indexOf("hints.map") < selectField.indexOf("<SelectTrigger"),
  );
  record(
    checks,
    "7. BR-15 complete form uses SelectField",
    completeForm.includes("SelectField") && completeForm.includes("hints={resultHints}"),
  );

  const passed = checks.filter((check) => check.passed).length;
  const failed = checks.filter((check) => !check.passed).length;
  console.log("");
  console.log(`Result: ${passed} passed / ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
