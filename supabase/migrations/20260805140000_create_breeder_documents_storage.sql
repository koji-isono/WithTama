-- Migration: create private breeder-documents storage bucket and RLS policies
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'breeder-documents',
  'breeder-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS breeder_documents_select_own ON storage.objects;
DROP POLICY IF EXISTS breeder_documents_insert_own ON storage.objects;
DROP POLICY IF EXISTS breeder_documents_update_own ON storage.objects;

CREATE POLICY breeder_documents_select_own
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'breeder-documents'
    AND (storage.foldername(name))[1] = 'breeders'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY breeder_documents_insert_own
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'breeder-documents'
    AND (storage.foldername(name))[1] = 'breeders'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY breeder_documents_update_own
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'breeder-documents'
    AND (storage.foldername(name))[1] = 'breeders'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'breeder-documents'
    AND (storage.foldername(name))[1] = 'breeders'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

COMMIT;
