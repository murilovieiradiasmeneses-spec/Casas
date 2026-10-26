-- 0007 CRM imobiliário multi-tenant
-- Dados de contatos, visitas e negociações são privados: somente membros da
-- imobiliária ou administrador da plataforma, via RLS. Nenhuma policy para anon.

CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 160),
  phone text NOT NULL DEFAULT '',
  email text,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','site','whatsapp','instagram','indicacao','outro')),
  stage text NOT NULL DEFAULT 'novo'
    CHECK (stage IN ('novo','contato','visita','proposta','negociacao','ganho','perdido')),
  budget_brl numeric(14,2) CHECK (budget_brl IS NULL OR budget_brl >= 0),
  notes text NOT NULL DEFAULT '',
  next_contact_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_leads_agency_stage_idx ON public.crm_leads(agency_id,stage);
CREATE INDEX IF NOT EXISTS crm_leads_agency_created_idx ON public.crm_leads(agency_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'agendada'
    CHECK (status IN ('agendada','realizada','cancelada')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_visits_agency_date_idx ON public.crm_visits(agency_id,scheduled_at);

CREATE TABLE IF NOT EXISTS public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 2 AND 180),
  amount_brl numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount_brl >= 0),
  status text NOT NULL DEFAULT 'proposta'
    CHECK (status IN ('proposta','negociacao','ganho','perdido')),
  expected_close_date date,
  closed_at timestamptz,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_deals_agency_status_idx ON public.crm_deals(agency_id,status);

-- Rejeita associações entre leads/imóveis/visitas/negócios de empresas diferentes.
-- Também impede alterar agency_id de registros existentes.
CREATE OR REPLACE FUNCTION public.crm_validate_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.agency_id IS DISTINCT FROM OLD.agency_id THEN
    RAISE EXCEPTION 'CRM: empresa não pode ser alterada';
  END IF;

  IF TG_TABLE_NAME = 'crm_leads' THEN
    IF NEW.property_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = NEW.property_id AND p.agency_id = NEW.agency_id
    ) THEN RAISE EXCEPTION 'CRM: imóvel não pertence a esta empresa'; END IF;
  ELSIF TG_TABLE_NAME = 'crm_visits' THEN
    IF NOT EXISTS (SELECT 1 FROM public.crm_leads l
      WHERE l.id = NEW.lead_id AND l.agency_id = NEW.agency_id) THEN
      RAISE EXCEPTION 'CRM: lead não pertence a esta empresa';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.properties p
      WHERE p.id = NEW.property_id AND p.agency_id = NEW.agency_id) THEN
      RAISE EXCEPTION 'CRM: imóvel não pertence a esta empresa';
    END IF;
  ELSIF TG_TABLE_NAME = 'crm_deals' THEN
    IF NOT EXISTS (SELECT 1 FROM public.crm_leads l
      WHERE l.id = NEW.lead_id AND l.agency_id = NEW.agency_id) THEN
      RAISE EXCEPTION 'CRM: lead não pertence a esta empresa';
    END IF;
    IF NEW.property_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = NEW.property_id AND p.agency_id = NEW.agency_id
    ) THEN RAISE EXCEPTION 'CRM: imóvel não pertence a esta empresa'; END IF;
  END IF;
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='crm_leads_validate_tenant') THEN
    CREATE TRIGGER crm_leads_validate_tenant BEFORE INSERT OR UPDATE ON public.crm_leads
      FOR EACH ROW EXECUTE FUNCTION public.crm_validate_tenant();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='crm_visits_validate_tenant') THEN
    CREATE TRIGGER crm_visits_validate_tenant BEFORE INSERT OR UPDATE ON public.crm_visits
      FOR EACH ROW EXECUTE FUNCTION public.crm_validate_tenant();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='crm_deals_validate_tenant') THEN
    CREATE TRIGGER crm_deals_validate_tenant BEFORE INSERT OR UPDATE ON public.crm_deals
      FOR EACH ROW EXECUTE FUNCTION public.crm_validate_tenant();
  END IF;
END $$;

DO $$ DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['crm_leads','crm_visits','crm_deals'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl);

    EXECUTE format('DROP POLICY IF EXISTS "CRM tenant read" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "CRM tenant create" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "CRM tenant update" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "CRM tenant delete" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "CRM tenant read" ON public.%I FOR SELECT TO authenticated USING (public.can_manage_agency(agency_id))', tbl);
    EXECUTE format('CREATE POLICY "CRM tenant create" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_manage_agency(agency_id))', tbl);
    EXECUTE format('CREATE POLICY "CRM tenant update" ON public.%I FOR UPDATE TO authenticated USING (public.can_manage_agency(agency_id)) WITH CHECK (public.can_manage_agency(agency_id))', tbl);
    EXECUTE format('CREATE POLICY "CRM tenant delete" ON public.%I FOR DELETE TO authenticated USING (public.can_manage_agency(agency_id))', tbl);
    EXECUTE format('DROP TRIGGER IF EXISTS crm_touch_updated_at ON public.%I', tbl);
    EXECUTE format('CREATE TRIGGER crm_touch_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', tbl);
  END LOOP;
END $$;

COMMENT ON TABLE public.crm_leads IS 'Leads privados por imobiliária. Não se confundem com usuários de autenticação.';
COMMENT ON TABLE public.crm_visits IS 'Agendamentos de visita vinculados ao lead e imóvel da mesma empresa.';
COMMENT ON TABLE public.crm_deals IS 'Negociações; status ganho constitui venda registrada manualmente.';
