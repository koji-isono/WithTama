export const BUSINESS_REGISTRATION_TYPES = [
  "販売",
  "保管",
  "貸出し",
  "訓練",
  "展示",
  "競りあっせん",
  "譲受飼養",
] as const;

export type BusinessRegistrationType = (typeof BUSINESS_REGISTRATION_TYPES)[number];

export const REGISTRATION_TYPE_GUIDANCE =
  "登録種別の適否については、管轄自治体へご確認ください。";
