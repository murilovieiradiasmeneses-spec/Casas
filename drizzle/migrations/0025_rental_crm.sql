-- 0025: rental management isolated per CASAS white-label agency.
-- Rental contracts link only to a property and optional lead in the SAME agency.
-- Only managers (owners, editors and platform admins) access rental finances.
BEGIN;
CREATE TABLE IF NOT EXISTS public.crm_rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  tenant_name text NOT NULL CHECK (length(btrim(tenant_name)) BETWEEN 2 AND 160),
  tenant_phone text NOT NULL DEFAULT '',
  tenant_email text,
  start_date date NOT NULL,
  end_date date,
  due_day integer NOT NULL CHECK (due_day BETWEEN 1 AND 28),
  monthly_rent numeric(12,2) NOT NULL CHECK(monthly_rent > 0 AND monthly_rent <= 9999999999),
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','encerrado')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_rentals_dates CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_one_active_lease_per_property
  ON public.crm_rentals(property_id) WHERE status='ativo';
CREATE INDEX IF NOT EXISTS crm_rentals_agency_status ON public.crm_rentals(agency_id,status);

CREATE TABLE IF NOT EXISTS public.crm_rent_receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  rental_id uuid NOT NULL REFERENCES public.crm_rentals(id) ON DELETE RESTRICT,
  reference_month date NOT NULL,
  due_date date NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0 AND amount <= 9999999999),
  status text NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','recebido')),
  received_at timestamptz,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_rent_reference_first CHECK (extract(day FROM reference_month)=1),
  CONSTRAINT crm_rent_receipt_date_consistency CHECK (
    (status='pendente' AND received_at IS NULL) OR
    (status='recebido' AND received_at IS NOT NULL)
  ),
  CONSTRAINT crm_rent_receivables_unique UNIQUE(rental_id,reference_month)
);
CREATE INDEX IF NOT EXISTS crm_receivables_agency_due ON public.crm_rent_receivables(agency_id,status,due_date);

CREATE OR REPLACE FUNCTION public.crm_validate_rental()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.properties p WHERE p.id=NEW.property_id
    AND p.agency_id=NEW.agency_id AND p.purpose='locacao')
  THEN RAISE EXCEPTION 'Escolha um imóvel de locação pertencente à imobiliária'; END IF;
  IF NEW.lead_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.crm_leads l WHERE l.id=NEW.lead_id AND l.agency_id=NEW.agency_id)
  THEN RAISE EXCEPTION 'O inquilino selecionado não pertence à imobiliária'; END IF;
  NEW.updated_at=now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_validate_rental_trigger ON public.crm_rentals;
CREATE TRIGGER crm_validate_rental_trigger BEFORE INSERT OR UPDATE
  ON public.crm_rentals FOR EACH ROW EXECUTE FUNCTION public.crm_validate_rental();

CREATE OR REPLACE FUNCTION public.crm_validate_receivable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE lease public.crm_rentals%ROWTYPE;
BEGIN
  SELECT * INTO lease FROM public.crm_rentals r
  WHERE r.id=NEW.rental_id AND r.agency_id=NEW.agency_id;
  IF lease.id IS NULL THEN RAISE EXCEPTION 'Contrato não pertence à imobiliária'; END IF;
  IF NEW.due_date < lease.start_date
    OR (lease.end_date IS NOT NULL AND NEW.due_date > lease.end_date)
  THEN RAISE EXCEPTION 'Vencimento fora da vigência do contrato'; END IF;
  IF date_trunc('month', NEW.due_date::timestamp)::date <> NEW.reference_month
  THEN RAISE EXCEPTION 'Mês de referência diferente do mês de vencimento'; END IF;
  -- Do not allow secretly moving already paid receipts back to pending.
  IF TG_OP='UPDATE' AND OLD.status='recebido' AND NEW.status='pendente'
    AND NOT public.crm_is_owner(NEW.agency_id)
  THEN RAISE EXCEPTION 'Somente o proprietário pode desfazer um recebimento'; END IF;
  NEW.updated_at=now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_validate_receivable_trigger ON public.crm_rent_receivables;
CREATE TRIGGER crm_validate_receivable_trigger BEFORE INSERT OR UPDATE
  ON public.crm_rent_receivables FOR EACH ROW EXECUTE FUNCTION public.crm_validate_receivable();

-- A contract marks the property as rented; ending the contract makes the
-- property available again without changing photos, prices or publishing.
CREATE OR REPLACE FUNCTION public.crm_sync_rental_property_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF NEW.status='ativo' THEN
    UPDATE public.properties SET status='alugado'
      WHERE id=NEW.property_id AND agency_id=NEW.agency_id AND status <> 'alugado';
  ELSIF NEW.status='encerrado' AND (TG_OP='INSERT' OR OLD.status='ativo') THEN
    UPDATE public.properties SET status='disponivel'
      WHERE id=NEW.property_id AND agency_id=NEW.agency_id AND status='alugado'
        AND NOT EXISTS(SELECT 1 FROM public.crm_rentals r WHERE r.property_id=NEW.property_id
          AND r.status='ativo');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_sync_rental_status_trigger ON public.crm_rentals;
CREATE TRIGGER crm_sync_rental_status_trigger AFTER INSERT OR UPDATE OF status
  ON public.crm_rentals FOR EACH ROW EXECUTE FUNCTION public.crm_sync_rental_property_status();

ALTER TABLE public.crm_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_rent_receivables ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_rentals,public.crm_rent_receivables FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.crm_rentals,public.crm_rent_receivables TO authenticated;
GRANT ALL ON public.crm_rentals,public.crm_rent_receivables TO service_role;

DROP POLICY IF EXISTS "Rental managers read" ON public.crm_rentals;
CREATE POLICY "Rental managers read" ON public.crm_rentals FOR SELECT TO authenticated
 USING(public.crm_is_manager(agency_id));
DROP POLICY IF EXISTS "Rental managers insert" ON public.crm_rentals;
CREATE POLICY "Rental managers insert" ON public.crm_rentals FOR INSERT TO authenticated
 WITH CHECK(public.crm_is_manager(agency_id));
DROP POLICY IF EXISTS "Rental managers update" ON public.crm_rentals;
CREATE POLICY "Rental managers update" ON public.crm_rentals FOR UPDATE TO authenticated
 USING(public.crm_is_manager(agency_id)) WITH CHECK(public.crm_is_manager(agency_id));

DROP POLICY IF EXISTS "Receivable managers read" ON public.crm_rent_receivables;
CREATE POLICY "Receivable managers read" ON public.crm_rent_receivables FOR SELECT TO authenticated
 USING(public.crm_is_manager(agency_id));
DROP POLICY IF EXISTS "Receivable managers insert" ON public.crm_rent_receivables;
CREATE POLICY "Receivable managers insert" ON public.crm_rent_receivables FOR INSERT TO authenticated
 WITH CHECK(public.crm_is_manager(agency_id));
DROP POLICY IF EXISTS "Receivable managers update" ON public.crm_rent_receivables;
CREATE POLICY "Receivable managers update" ON public.crm_rent_receivables FOR UPDATE TO authenticated
 USING(public.crm_is_manager(agency_id)) WITH CHECK(public.crm_is_manager(agency_id));

-- Generate at most 12 monthly invoices in one request. Idempotent; never
-- overwrites an already registered receipt, even if amount changed later.
CREATE OR REPLACE FUNCTION public.crm_generate_rent_receivables(
 _rental_id uuid,_first_month date,_months integer
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE lease public.crm_rentals%ROWTYPE; mon date; due date; n integer:=0; i integer;
BEGIN
 IF _months NOT BETWEEN 1 AND 12 OR _first_month IS NULL
   OR extract(day from _first_month)<>1
 THEN RAISE EXCEPTION 'Escolha o primeiro dia do mês e 1 a 12 mensalidades'; END IF;
 SELECT * INTO lease FROM public.crm_rentals WHERE id=_rental_id FOR UPDATE;
 IF lease.id IS NULL OR NOT public.crm_is_manager(lease.agency_id)
 THEN RAISE EXCEPTION 'Sem permissão para gerar aluguéis'; END IF;
 IF lease.status<>'ativo' THEN RAISE EXCEPTION 'O contrato precisa estar ativo'; END IF;
 FOR i IN 0..(_months-1) LOOP
   mon=(_first_month + (i||' months')::interval)::date;
   due=mon+(lease.due_day-1);
   IF due < lease.start_date OR (lease.end_date IS NOT NULL AND due > lease.end_date)
   THEN RAISE EXCEPTION 'Mensalidade de % fora do período do contrato',to_char(mon,'MM/YYYY'); END IF;
   INSERT INTO public.crm_rent_receivables
     (agency_id,rental_id,reference_month,due_date,amount)
   VALUES(lease.agency_id,lease.id,mon,due,lease.monthly_rent)
   ON CONFLICT(rental_id,reference_month) DO NOTHING;
   IF FOUND THEN n=n+1; END IF;
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.crm_generate_rent_receivables(uuid,date,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_generate_rent_receivables(uuid,date,integer) TO authenticated;
COMMENT ON TABLE public.crm_rentals IS
 'Private company rentals with tenant identity and linked listing; managers only.';
COMMENT ON TABLE public.crm_rent_receivables IS
 'Private monthly rental receivables. Pending/received values are manually maintained.';
COMMIT;