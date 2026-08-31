import { BreederDashboardView, loadBreederDashboardPageData } from "@/features/breeder-dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ブリーダーダッシュボード",
};

type BreederDashboardPageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function BreederDashboardPage({ searchParams }: BreederDashboardPageProps) {
  const { checkout } = await searchParams;
  const pageData = await loadBreederDashboardPageData({ checkoutQuery: checkout });

  return <BreederDashboardView {...pageData} />;
}
