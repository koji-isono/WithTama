import type { IntroductionProfileInput } from "./types";

export type IntroductionFieldKey = keyof IntroductionProfileInput;

export type IntroductionFieldConfig = {
  key: IntroductionFieldKey;
  id: string;
  label: string;
  placeholder: string;
  description: string;
};

export const INTRODUCTION_FIELDS: IntroductionFieldConfig[] = [
  {
    key: "profileText",
    id: "profile_text",
    label: "ブリーダー紹介",
    placeholder:
      "例）\n犬猫の健康と幸せを第一に考え、一頭一頭に愛情を持って育てています。",
    description: "経歴や犬猫への想いなどをご記入ください。",
  },
  {
    key: "breedingPolicy",
    id: "breeding_policy",
    label: "繁殖方針",
    placeholder:
      "例）\n健康状態と遺伝的なリスクに配慮し、無理のない繁殖を行っています。",
    description: "繁殖回数、親犬・親猫への配慮、血統への考え方などをご記入ください。",
  },
  {
    key: "healthPolicy",
    id: "health_policy",
    label: "健康管理方針",
    placeholder:
      "例）\n定期的な健康診断、ワクチン接種、寄生虫対策を行っています。",
    description: "健康診断、ワクチン、感染症対策などをご記入ください。",
  },
  {
    key: "breedingEnvironment",
    id: "breeding_environment",
    label: "飼育環境",
    placeholder:
      "例）\n清潔で温度管理された室内で、十分な運動と社会化の時間を確保しています。",
    description: "飼育場所、衛生管理、運動、社会化などをご記入ください。",
  },
];

/**
 * AI 文章生成（将来方針）
 *
 * 第1期では本画面から AI 下書き生成は実装しない。
 * 将来 Dify で下書きを生成する予定。
 *
 * 公開フロー: AI 下書き → ブリーダー確認・修正 → 管理者審査 → 公開
 * AI が生成した文章を自動公開しない。
 * 健康状態・性格・血統・安全性を AI が事実確認なしに断定しない方針。
 */
export const AI_DRAFT_GENERATION_TODO =
  "Phase 2+: Integrate Dify draft generation with breeder review before admin approval.";
