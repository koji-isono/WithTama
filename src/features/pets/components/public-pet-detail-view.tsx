import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

import { PUBLIC_PET_DETAIL_SCREEN_ID, PUBLIC_PETS_PATH } from "../constants";
import {
  formatPetPrice,
  formatPublicBreederAddress,
  formatPublicPetAttributeLine,
} from "../list-format";
import type { LoadPublicPetDetailPageResult, PublicBreederDetail, PublicPetDetail } from "../types";
import { PublicPetPhotoGallery } from "./public-pet-photo-gallery";

type PublicPetDetailViewProps = {
  result: LoadPublicPetDetailPageResult;
};

function TextSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{children}</p>
    </div>
  );
}

function BreederTextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      <p className="max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
        {text}
      </p>
    </div>
  );
}

function hasAboutSection(detail: PublicPetDetail): boolean {
  return Boolean(detail.temperament || detail.description);
}

function hasBreederSection(breeder: PublicBreederDetail | null): boolean {
  if (!breeder) {
    return false;
  }

  return Boolean(
    breeder.businessName ||
    breeder.prefecture ||
    breeder.city ||
    breeder.profileText ||
    breeder.breedingPolicy ||
    breeder.healthPolicy ||
    breeder.breedingEnvironment,
  );
}

function PublicPetDetailContent({ detail }: { detail: PublicPetDetail }) {
  const attributeLine = formatPublicPetAttributeLine({
    species: detail.species,
    breed: detail.breed,
    sex: detail.sex,
    birthday: detail.birthday,
  });
  const breederAddress =
    detail.breeder != null
      ? formatPublicBreederAddress(detail.breeder.prefecture, detail.breeder.city)
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-12 sm:py-10">
      <nav className="mb-6">
        <Link
          href={PUBLIC_PETS_PATH}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden />
          犬猫一覧へ戻る
        </Link>
      </nav>

      <p className="mb-4 text-xs font-semibold tracking-widest text-[var(--primary)]">
        {PUBLIC_PET_DETAIL_SCREEN_ID}
      </p>

      <div className="grid gap-8 md:grid-cols-2 md:items-start">
        <PublicPetPhotoGallery
          photos={detail.photos}
          publicDisplayName={detail.publicDisplayName}
        />

        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
              {detail.publicDisplayName}
            </h1>
            <p className="text-sm text-neutral-600 sm:text-base">{attributeLine}</p>
          </div>

          {detail.color ? (
            <p className="text-sm text-neutral-700">
              <span className="font-medium text-neutral-800">毛色</span>
              <span className="ml-2">{detail.color}</span>
            </p>
          ) : null}

          <p className="text-base text-neutral-800">{formatPetPrice(detail.price)}</p>

          {detail.priceComment ? (
            <p className="text-sm leading-relaxed text-neutral-600">{detail.priceComment}</p>
          ) : null}
        </div>
      </div>

      {hasAboutSection(detail) ? (
        <section className="mt-10 space-y-6">
          <h2 className="text-xl font-bold text-neutral-900">この子について</h2>
          <Card className="border-[var(--border)] bg-white shadow-sm">
            <CardContent className="space-y-6 p-6">
              {detail.temperament ? (
                <TextSection title="性格・気質">{detail.temperament}</TextSection>
              ) : null}
              {detail.description ? (
                <TextSection title="紹介文">{detail.description}</TextSection>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {detail.breeder && hasBreederSection(detail.breeder) ? (
        <section className="mt-10 space-y-6">
          <h2 className="text-xl font-bold text-neutral-900">ブリーダーについて</h2>
          <Card className="border-[var(--border)] bg-white shadow-sm">
            <CardContent className="space-y-6 p-6">
              {detail.breeder.businessName ? (
                <p className="text-lg font-semibold text-neutral-900">
                  {detail.breeder.businessName}
                </p>
              ) : null}

              {breederAddress ? <p className="text-sm text-neutral-600">{breederAddress}</p> : null}

              {detail.breeder.profileText ? (
                <BreederTextBlock title="自己紹介" text={detail.breeder.profileText} />
              ) : null}

              {detail.breeder.breedingPolicy ? (
                <BreederTextBlock title="繁殖方針" text={detail.breeder.breedingPolicy} />
              ) : null}

              {detail.breeder.healthPolicy ? (
                <BreederTextBlock title="健康管理方針" text={detail.breeder.healthPolicy} />
              ) : null}

              {detail.breeder.breedingEnvironment ? (
                <BreederTextBlock title="飼育環境" text={detail.breeder.breedingEnvironment} />
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

export function PublicPetDetailView({ result }: PublicPetDetailViewProps) {
  if (!result.success) {
    if ("notFound" in result && result.notFound) {
      return null;
    }

    if (!("error" in result)) {
      return null;
    }

    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="size-4 text-red-600" />
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return <PublicPetDetailContent detail={result.detail} />;
}
