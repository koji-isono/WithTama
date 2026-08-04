import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type PetFetchAlertProps = {
  message: string;
};

export function PetFetchAlert({ message }: PetFetchAlertProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
        <AlertCircle className="size-4 text-red-600" />
        <AlertTitle>データの取得に失敗しました</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}
