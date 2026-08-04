-- Migration: public.breeders Version 1.1 — draft nullable columns for provisional registration
-- Safe for existing data: no DROP TABLE, TRUNCATE, or DELETE

BEGIN;

ALTER TABLE public.breeders ALTER COLUMN business_name DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN representative_name DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN postal_code DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN prefecture DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN city DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN address_line DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN business_registration_number DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN business_registration_type DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN registration_authority DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN registration_expires_at DROP NOT NULL;

COMMIT;
