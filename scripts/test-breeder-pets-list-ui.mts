/**
 * BR-10 breeder pets list pause / resume UI verification.
 *
 * Usage:
 *   npm run test:breeder-pets-list-ui
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

  const listContent = read("src/features/pets/components/breeder-pets-list-content.tsx");
  const pauseDialog = read("src/features/pets/components/pet-pause-listing-dialog.tsx");
  const resumeDialog = read("src/features/pets/components/pet-resume-listing-dialog.tsx");
  const service = read("src/features/pets/service.ts");

  record(
    checks,
    "published card shows pause button",
    listContent.includes('pet.status === "published"') && listContent.includes("公開を停止"),
  );
  record(
    checks,
    "paused card shows resume button",
    listContent.includes('pet.status === "paused"') && listContent.includes("再公開する"),
  );
  record(
    checks,
    "draft card keeps submit review",
    listContent.includes('pet.status === "draft"') && listContent.includes("公開申請"),
  );
  record(
    checks,
    "under_review has no pause/resume buttons",
    !listContent.includes('pet.status === "under_review"') ||
      (!listContent.match(/under_review[\s\S]{0,200}公開を停止/) &&
        !listContent.match(/under_review[\s\S]{0,200}再公開する/)),
  );

  record(checks, "pause dialog title", pauseDialog.includes("公開停止の確認"));
  record(checks, "pause dialog body", pauseDialog.includes("この犬猫の公開を停止しますか？"));
  record(
    checks,
    "pause dialog explanation",
    pauseDialog.includes("購入希望者向けの犬猫一覧・詳細ページから表示されなくなります"),
  );
  record(
    checks,
    "pause dialog revision note",
    pauseDialog.includes("審査中の紹介文変更案は取り消されます。"),
  );
  record(checks, "pause dialog cancel", pauseDialog.includes("キャンセル"));
  record(checks, "pause dialog submit", pauseDialog.includes("公開を停止"));
  record(checks, "pause dialog pending state", pauseDialog.includes("停止中..."));
  record(checks, "pause dialog error display", pauseDialog.includes("error"));

  record(checks, "resume dialog title", resumeDialog.includes("再公開の確認"));
  record(checks, "resume dialog body", resumeDialog.includes("この犬猫を再公開しますか？"));
  record(
    checks,
    "resume dialog explanation",
    resumeDialog.includes("停止前に承認されていた内容で再び公開されます。"),
  );
  record(checks, "resume dialog cancel", resumeDialog.includes("キャンセル"));
  record(checks, "resume dialog submit", resumeDialog.includes("再公開する"));
  record(checks, "resume dialog pending state", resumeDialog.includes("再公開中..."));

  record(checks, "pausePetListingAction in service", service.includes("pausePetListingAction"));
  record(checks, "resumePetListingAction in service", service.includes("resumePetListingAction"));
  record(
    checks,
    "revalidate breeder pets path",
    service.includes("revalidatePath(BREEDER_PETS_PATH)"),
  );
  record(
    checks,
    "double submit guard pause",
    listContent.includes("disabled={isPausing}") && listContent.includes("disabled={isSubmitting}"),
  );

  const passed = checks.filter((check) => check.passed).length;
  const failed = checks.length - passed;
  console.log("");
  console.log(`${passed} passed / ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
