"use client";

import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

import type { PublicPetDetailPhoto } from "../types";

type PublicPetPhotoGalleryProps = {
  photos: PublicPetDetailPhoto[];
  publicDisplayName: string;
};

export function PublicPetPhotoGallery({ photos, publicDisplayName }: PublicPetPhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = photos.length;
  const hasMultiple = total > 1;
  const safeIndex = total === 0 ? 0 : Math.min(activeIndex, total - 1);
  const activePhoto = photos[safeIndex] ?? null;

  const goTo = useCallback(
    (index: number) => {
      if (total === 0) {
        return;
      }

      const normalized = ((index % total) + total) % total;
      setActiveIndex(normalized);
    },
    [total],
  );

  if (total === 0) {
    return (
      <div
        className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl bg-neutral-100 text-neutral-400"
        aria-label="写真なし"
      >
        <ImageOff className="size-10" aria-hidden />
        <span className="text-sm">写真は準備中です</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl bg-neutral-100">
        <div className="aspect-[4/3] w-full">
          {activePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activePhoto.signedUrl}
              alt={activePhoto.alt}
              className="size-full object-cover"
            />
          ) : null}
        </div>

        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={() => goTo(safeIndex - 1)}
              className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              aria-label="前の写真"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goTo(safeIndex + 1)}
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              aria-label="次の写真"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      {hasMultiple ? (
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-sm text-neutral-600" aria-live="polite">
            {safeIndex + 1} / {total}
          </p>
          <div className="flex items-center gap-1.5" aria-hidden>
            {photos.map((photo, index) => (
              <span
                key={photo.id}
                className={`size-2 rounded-full ${
                  index === safeIndex ? "bg-[var(--primary)]" : "bg-neutral-300"
                }`}
              />
            ))}
          </div>
        </div>
      ) : null}

      {hasMultiple ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                index === safeIndex
                  ? "border-[var(--primary)]"
                  : "border-transparent opacity-80 hover:opacity-100"
              }`}
              aria-label={`${publicDisplayName}の写真 ${index + 1}枚目を表示`}
              aria-current={index === safeIndex ? "true" : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.signedUrl} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
