-- Migration: initial registration profile support (breeders / buyers Version 1.3 / 1.1)
-- ALTER TABLE only: no DROP TABLE, TRUNCATE, or DELETE

BEGIN;

-- breeders: profile fields nullable (idempotent)
ALTER TABLE public.breeders ALTER COLUMN postal_code DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN prefecture DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN city DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN business_name DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN website_url DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN profile_text DROP NOT NULL;

ALTER TABLE public.breeders ADD COLUMN IF NOT EXISTS address1 text;
ALTER TABLE public.breeders ADD COLUMN IF NOT EXISTS address2 text;

ALTER TABLE public.breeders ALTER COLUMN address1 DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN address2 DROP NOT NULL;

-- legacy column (Version 1.2 以前): nullable のまま維持
ALTER TABLE public.breeders ALTER COLUMN address_line DROP NOT NULL;

ALTER TABLE public.breeders
  ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false;

-- buyers: profile completion flag
ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false;

COMMIT;
