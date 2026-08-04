-- Migration: public.pets Version 1.1
-- Safe for existing data: no DROP TABLE, TRUNCATE, or DELETE

BEGIN;

-- 1. Rename name → management_name (if applicable)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pets'
      AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pets'
      AND column_name = 'management_name'
  ) THEN
    ALTER TABLE public.pets RENAME COLUMN name TO management_name;
  END IF;
END $$;

-- 2. Add new columns (only if missing)
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS species text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS temperament text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS ai_description text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS ai_generated_at timestamptz;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS price integer;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS price_comment text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Ensure display_order has default for existing rows
UPDATE public.pets SET display_order = 0 WHERE display_order IS NULL;

-- 3–5. species: backfill → NOT NULL
UPDATE public.pets SET species = 'cat' WHERE species IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pets'
      AND column_name = 'species'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.pets ALTER COLUMN species SET NOT NULL;
  END IF;
END $$;

-- 10. Normalize invalid status values before adding constraint
UPDATE public.pets
SET status = 'draft'
WHERE status IS NULL
   OR status NOT IN (
     'draft',
     'under_review',
     'published',
     'paused',
     'family_decided',
     'closed'
   );

-- Drop legacy CHECK constraints (idempotent)
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_species_check;
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_sex_check;
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_price_check;
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_status_check;
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_display_order_check;

-- 6–11. Add CHECK constraints
ALTER TABLE public.pets
  ADD CONSTRAINT pets_species_check CHECK (species IN ('dog', 'cat'));

ALTER TABLE public.pets
  ADD CONSTRAINT pets_sex_check CHECK (sex IN ('male', 'female'));

ALTER TABLE public.pets
  ADD CONSTRAINT pets_price_check CHECK (price IS NULL OR price >= 0);

ALTER TABLE public.pets
  ADD CONSTRAINT pets_status_check CHECK (
    status IN (
      'draft',
      'under_review',
      'published',
      'paused',
      'family_decided',
      'closed'
    )
  );

ALTER TABLE public.pets
  ADD CONSTRAINT pets_display_order_check CHECK (display_order >= 0);

-- 12. Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_pets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pets_set_updated_at ON public.pets;

CREATE TRIGGER pets_set_updated_at
  BEFORE UPDATE ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pets_updated_at();

COMMIT;
