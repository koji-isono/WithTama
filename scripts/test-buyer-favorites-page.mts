/**
 * BY-03 buyer favorites static verification (no browser / no DB writes).
 *
 * Usage:
 *   npm run test:buyer-favorites-page
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

  const favoritesPage = read("src/app/(buyer)/buyer/favorites/page.tsx");
  const favoritesView = read("src/features/favorites/components/buyer-favorites-view.tsx");
  const favoriteCard = read("src/features/favorites/components/buyer-favorite-pet-card.tsx");
  const service = read("src/features/favorites/service.ts");
  const repository = read("src/features/favorites/repository.ts");
  const loaders = read("src/features/favorites/loaders.ts");
  const dashboardMenu = read("src/features/buyers/dashboard-menu.ts");
  const petDetailPage = read("src/app/(public)/pets/[petId]/page.tsx");
  const petDetailView = read("src/features/pets/components/public-pet-detail-view.tsx");
  const loginPage = read("src/app/(auth)/login/login-form.tsx");
  const buyerLayout = read("src/app/(buyer)/buyer/layout.tsx");

  record(
    checks,
    "1. BY-03 page uses loadBuyerFavoritesPageData",
    favoritesPage.includes("loadBuyerFavoritesPageData") &&
      favoritesPage.includes("BuyerFavoritesView"),
  );
  record(checks, "2. buyer layout uses requireBuyer", buyerLayout.includes("requireBuyer"));
  record(
    checks,
    "3. service resolves buyer from auth (not client buyer_id)",
    service.includes("getBuyerProfileByUserId(user.id)") &&
      !service.includes("formData.get") &&
      service.includes("resolveBuyerIdForCurrentUser"),
  );
  record(
    checks,
    "4. add checks published pet before insert",
    service.includes("isPublishedPetListable") && repository.includes("published_pets_public"),
  );
  record(
    checks,
    "5. favorites list uses published view by ids",
    loaders.includes("listPublishedPetsForPublicByIds"),
  );
  record(
    checks,
    "6. pet detail loads favorite state",
    petDetailPage.includes("loadPetFavoriteUiState") &&
      petDetailView.includes("FavoriteToggleButton"),
  );
  record(
    checks,
    "7. guest favorite links to login with next",
    loaders.includes("encodeURIComponent") && loaders.includes("/login?next="),
  );
  record(
    checks,
    "8. login supports next param for buyer",
    loginPage.includes("useSearchParams") &&
      loginPage.includes("sanitizeNextPath") &&
      loginPage.includes('role === "buyer" && nextPath'),
  );
  record(
    checks,
    "9. BY-02 favorites menu linked",
    dashboardMenu.includes('href: "/buyer/favorites"') &&
      dashboardMenu.includes("お気に入りを見る"),
  );
  record(
    checks,
    "10. favorites list remove action",
    favoriteCard.includes("removeFavoriteFromListAction"),
  );
  record(
    checks,
    "11. empty state links to /pets",
    favoritesView.includes("href={PUBLIC_PETS_PATH}"),
  );
  record(
    checks,
    "12. inquiries/visits still coming soon",
    dashboardMenu.includes('id: "inquiries"') &&
      dashboardMenu.includes('id: "visits"') &&
      dashboardMenu.includes("comingSoon: true"),
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
