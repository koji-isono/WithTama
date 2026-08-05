export const BREEDER_PROFILE_TOTAL_STEPS = 5;

export const BREEDER_PROFILE_ENTRY_PATH = "/breeder/profile";
export const BREEDER_PROFILE_BASIC_PATH = "/breeder/profile/basic";

export const BREEDER_PROFILE_STEPS = [
  {
    slug: "basic",
    path: "/breeder/profile/basic",
    label: "基本情報",
    step: 1,
  },
  {
    slug: "location",
    path: "/breeder/profile/location",
    label: "所在地",
    step: 2,
  },
  {
    slug: "license",
    path: "/breeder/profile/license",
    label: "第一種動物取扱業情報",
    step: 3,
  },
  {
    slug: "introduction",
    path: "/breeder/profile/introduction",
    label: "ブリーダー紹介",
    step: 4,
  },
  {
    slug: "verification",
    path: "/breeder/profile/verification",
    label: "本人確認・登録証提出",
    step: 5,
  },
] as const;

export type BreederProfileStepSlug = (typeof BREEDER_PROFILE_STEPS)[number]["slug"];

/** @deprecated Use BREEDER_PROFILE_STEPS instead */
export const BREEDER_PROFILE_STEP_LABELS = BREEDER_PROFILE_STEPS.map((item) => item.label);

export function getBreederProfileProgressPercent(currentStep: number): number {
  return Math.round((currentStep / BREEDER_PROFILE_TOTAL_STEPS) * 100);
}

export function getBreederProfileStepFromPathname(pathname: string) {
  const matched = BREEDER_PROFILE_STEPS.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );

  return matched ?? BREEDER_PROFILE_STEPS[0];
}

export function getBreederProfileStepBySlug(slug: BreederProfileStepSlug) {
  const matched = BREEDER_PROFILE_STEPS.find((item) => item.slug === slug);

  if (!matched) {
    throw new Error(`Unknown breeder profile step slug: ${slug}`);
  }

  return matched;
}
