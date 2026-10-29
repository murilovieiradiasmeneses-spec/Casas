CREATE OR REPLACE FUNCTION public.crm_validate_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.agency_id IS DISTINCT FROM OLD.agency_id THEN
    RAISE EXCEPTION 'CRM: empresa não pode ser alterada';
  END IF;
  IF TG_TABLE_NAME='crm_leads' THEN
    IF NEW.property_id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM public.properties p WHERE p.id=NEW.property_id AND p.agency_id=NEW.agency_id)
    THEN RAISE EXCEPTION 'CRM: imóvel não pertence a esta empresa'; END IF;
  ELSIF TG_TABLE_NAME='crm_visits' THEN
    IF NOT EXISTS(SELECT 1 FROM public.crm_leads l
      WHERE l.id=NEW.lead_id AND l.agency_id=NEW.agency_id)
    THEN RAISE EXCEPTION 'CRM: lead não pertence a esta empresa'; END IF;
    IF NEW.property_id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM public.properties p WHERE p.id=NEW.property_id AND p.agency_id=NEW.agency_id)
    THEN RAISE EXCEPTION 'CRM: imóvel não pertence a esta empresa'; END IF;
  ELSIF TG_TABLE_NAME='crm_deals' THEN
    IF NOT EXISTS(SELECT 1 FROM public.crm_leads l
      WHERE l.id=NEW.lead_id AND l.agency_id=NEW.agency_id)
    THEN RAISE EXCEPTION 'CRM: lead não pertence a esta empresa'; END IF;
    IF NEW.property_id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM public.properties p WHERE p.id=NEW.property_id AND p.agency_id=NEW.agency_id)
    THEN RAISE EXCEPTION 'CRM: imóvel não pertence a esta empresa'; END IF;
  END IF;
  RETURN NEW;
END $$;