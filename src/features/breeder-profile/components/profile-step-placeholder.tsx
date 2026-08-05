import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getBreederProfileStepBySlug, type BreederProfileStepSlug } from "../constants";

type ProfileStepPlaceholderProps = {
  stepSlug: BreederProfileStepSlug;
  message?: string;
};

export function ProfileStepPlaceholder({ stepSlug, message }: ProfileStepPlaceholderProps) {
  const step = getBreederProfileStepBySlug(stepSlug);
  const displayMessage = message ?? `Step${step.step} ${step.label}（未実装）`;

  return (
    <Card className="border-[var(--border)] bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{step.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-neutral-600 sm:text-base">{displayMessage}</p>
      </CardContent>
    </Card>
  );
}
