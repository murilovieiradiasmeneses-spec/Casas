-- Per-company white-label typography colors.
-- Keep previous appearance for existing clients and preserve brand isolation.
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS text_color text NOT NULL DEFAULT '#232624',
  ADD COLUMN IF NOT EXISTS hero_text_color text NOT NULL DEFAULT '#FFFFFF';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agencies_text_color_hex') THEN
    ALTER TABLE public.agencies ADD CONSTRAINT agencies_text_color_hex
    CHECK (text_color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agencies_hero_text_color_hex') THEN
    ALTER TABLE public.agencies ADD CONSTRAINT agencies_hero_text_color_hex
    CHECK (hero_text_color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
END $$;
