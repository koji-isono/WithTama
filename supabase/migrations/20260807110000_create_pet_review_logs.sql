-- Migration: create public.pet_review_logs Version 1.0
-- Audit append-only table for pet listing review history (Decision No.97, No.98, No.105)
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

CREATE TABLE IF NOT EXISTS public.pet_review_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE RESTRICT,
  action text NOT NULL,
  comment text,
  actor_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pet_review_logs_action_check CHECK (
    action IN ('submitted', 'returned', 'approved')
  ),

  CONSTRAINT pet_review_logs_returned_comment_check CHECK (
    action <> 'returned'
    OR (comment IS NOT NULL AND btrim(comment) <> '')
  )
);

CREATE INDEX IF NOT EXISTS pet_review_logs_pet_id_created_at_idx
  ON public.pet_review_logs (pet_id, created_at DESC);

ALTER TABLE public.pet_review_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pet_review_logs_select_breeder_own ON public.pet_review_logs;
DROP POLICY IF EXISTS pet_review_logs_select_admin ON public.pet_review_logs;
DROP POLICY IF EXISTS pet_review_logs_insert_submitted_breeder ON public.pet_review_logs;
DROP POLICY IF EXISTS pet_review_logs_insert_admin_review ON public.pet_review_logs;

CREATE POLICY pet_review_logs_select_breeder_own
  ON public.pet_review_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pets p
      INNER JOIN public.breeders b ON b.id = p.breeder_id
      WHERE p.id = pet_review_logs.pet_id
        AND b.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY pet_review_logs_select_admin
  ON public.pet_review_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY pet_review_logs_insert_submitted_breeder
  ON public.pet_review_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND action = 'submitted'
    AND EXISTS (
      SELECT 1
      FROM public.pets p
      INNER JOIN public.breeders b ON b.id = p.breeder_id
      WHERE p.id = pet_id
        AND b.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY pet_review_logs_insert_admin_review
  ON public.pet_review_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    AND actor_user_id = auth.uid()
    AND action IN ('returned', 'approved')
  );

COMMIT;
