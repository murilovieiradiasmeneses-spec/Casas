-- Preserve CRM history when removing an unneeded listing.
-- Leads, visits and deals keep their own agency, people, amounts and dates.
-- Active rental contracts continue to block deletion.
BEGIN;
ALTER TABLE public.crm_visits ALTER COLUMN property_id DROP NOT NULL;
ALTER TABLE public.crm_visits DROP CONSTRAINT IF EXISTS crm_visits_property_id_fkey;
ALTER TABLE public.crm_visits ADD CONSTRAINT crm_visits_property_id_fkey FOREIGN KEY (property_id)
 REFERENCES public.properties(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.crm_visits.property_id IS 'Optional linked listing; null after a listing is deleted.';
COMMIT;