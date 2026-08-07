-- Migration: create private pet-photos storage bucket and RLS policies
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pet-photos',
  'pet-photos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS pet_photos_storage_select_own ON storage.objects;
DROP POLICY IF EXISTS pet_photos_storage_insert_own ON storage.objects;
DROP POLICY IF EXISTS pet_photos_storage_update_own ON storage.objects;
DROP POLICY IF EXISTS pet_photos_storage_delete_own ON storage.objects;

CREATE POLICY pet_photos_storage_select_own
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = 'breeders'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'pets'
    AND (storage.foldername(name))[4] IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.pets p
      INNER JOIN public.breeders b ON b.id = p.breeder_id
      WHERE p.id::text = (storage.foldername(name))[4]
        AND b.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY pet_photos_storage_insert_own
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = 'breeders'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'pets'
    AND (storage.foldername(name))[4] IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.pets p
      INNER JOIN public.breeders b ON b.id = p.breeder_id
      WHERE p.id::text = (storage.foldername(name))[4]
        AND b.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY pet_photos_storage_update_own
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = 'breeders'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'pets'
    AND (storage.foldername(name))[4] IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.pets p
      INNER JOIN public.breeders b ON b.id = p.breeder_id
      WHERE p.id::text = (storage.foldername(name))[4]
        AND b.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  )
  WITH CHECK (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = 'breeders'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'pets'
    AND (storage.foldername(name))[4] IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.pets p
      INNER JOIN public.breeders b ON b.id = p.breeder_id
      WHERE p.id::text = (storage.foldername(name))[4]
        AND b.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY pet_photos_storage_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = 'breeders'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'pets'
    AND (storage.foldername(name))[4] IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.pets p
      INNER JOIN public.breeders b ON b.id = p.breeder_id
      WHERE p.id::text = (storage.foldername(name))[4]
        AND b.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

COMMIT;
