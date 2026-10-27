-- 0026: Keep rental contract/property linkage immutable after registration
-- so already issued receivables cannot be silently migrated to another listing.
-- Prevent switching a currently leased property from locação to venda.
BEGIN;
CREATE OR REPLACE FUNCTION public.crm_validate_rental()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF TG_OP='UPDATE' AND
    (NEW.agency_id IS DISTINCT FROM OLD.agency_id
     OR NEW.property_id IS DISTINCT FROM OLD.property_id)
  THEN RAISE EXCEPTION 'O imóvel e a imobiliária do contrato não podem ser alterados. Encerre o contrato e cadastre outro'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.properties p
    WHERE p.id=NEW.property_id AND p.agency_id=NEW.agency_id AND p.purpose='locacao')
  THEN RAISE EXCEPTION 'O contrato exige um imóvel de locação da mesma imobiliária'; END IF;
  IF NEW.lead_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.crm_leads l
    WHERE l.id=NEW.lead_id AND l.agency_id=NEW.agency_id)
  THEN RAISE EXCEPTION 'O lead selecionado não pertence à imobiliária'; END IF;
  NEW.updated_at=now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.crm_preserve_rental_purpose()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF NEW.purpose IS DISTINCT FROM OLD.purpose
    AND EXISTS(SELECT 1 FROM public.crm_rentals r
      WHERE r.property_id=NEW.id AND r.status='ativo')
  THEN RAISE EXCEPTION 'O imóvel possui contrato de locação ativo. Encerre o contrato antes de mudar a finalidade'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_preserve_rental_purpose_trigger ON public.properties;
CREATE TRIGGER crm_preserve_rental_purpose_trigger
 BEFORE UPDATE OF purpose ON public.properties FOR EACH ROW
 EXECUTE FUNCTION public.crm_preserve_rental_purpose();

-- Protect ownership of a record even if client attempts to change its agency.
CREATE OR REPLACE FUNCTION public.crm_validate_receivable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE lease public.crm_rentals%ROWTYPE;
BEGIN
  IF TG_OP='UPDATE' AND
    (NEW.agency_id IS DISTINCT FROM OLD.agency_id OR NEW.rental_id IS DISTINCT FROM OLD.rental_id
     OR NEW.reference_month IS DISTINCT FROM OLD.reference_month)
  THEN RAISE EXCEPTION 'Não é permitido transferir uma parcela a outro contrato'; END IF;
  SELECT * INTO lease FROM public.crm_rentals r
  WHERE r.id=NEW.rental_id AND r.agency_id=NEW.agency_id;
  IF lease.id IS NULL THEN RAISE EXCEPTION 'Contrato não pertence à imobiliária'; END IF;
  IF NEW.due_date<lease.start_date
    OR (lease.end_date IS NOT NULL AND NEW.due_date>lease.end_date)
  THEN RAISE EXCEPTION 'Vencimento fora da vigência do contrato'; END IF;
  IF date_trunc('month',NEW.due_date::timestamp)::date<>NEW.reference_month
  THEN RAISE EXCEPTION 'Mês de referência incompatível com o vencimento'; END IF;
  IF TG_OP='UPDATE' AND OLD.status='recebido' AND NEW.status='pendente'
    AND NOT public.crm_is_owner(NEW.agency_id)
  THEN RAISE EXCEPTION 'Somente proprietário ou master pode desfazer recebimento'; END IF;
  NEW.updated_at=now();
  RETURN NEW;
END $$;
COMMIT;