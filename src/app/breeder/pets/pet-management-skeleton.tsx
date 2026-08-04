import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PetManagementSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-10 w-full rounded-full sm:w-48" />
      </div>

      <div className="mt-6 space-y-4 sm:mt-8">
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="overflow-hidden border-[var(--border)] bg-white shadow-sm">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <CardContent className="space-y-4 p-4 sm:p-5">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((__, buttonIndex) => (
                  <Skeleton key={buttonIndex} className="h-8 rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
