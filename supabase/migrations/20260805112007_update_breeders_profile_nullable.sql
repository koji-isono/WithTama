-- Migration: public.breeders Version 1.2 — profile fields nullable for first-login provisional record
-- Safe for existing data: no DROP TABLE, TRUNCATE, or DELETE
-- Note: address1/address2 相当は現行スキーマの address_line

BEGIN;

ALTER TABLE public.breeders ALTER COLUMN postal_code DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN prefecture DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN city DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN address_line DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN business_name DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN website_url DROP NOT NULL;
ALTER TABLE public.breeders ALTER COLUMN profile_text DROP NOT NULL;

COMMIT;
