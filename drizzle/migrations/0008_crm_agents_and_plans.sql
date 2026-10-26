-- 0008: CASAS CRM brokers + seat limits. 3 seats including owners/editors.
CREATE TABLE IF NOT EXISTS public.crm_settings (
 agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
 plan text NOT NULL DEFAULT 'essencial' CHECK(plan IN ('essencial','profissional','premium','personalizado')),
 max_users int NOT NULL DEFAULT 3 CHECK(max_users BETWEEN 1 AND 500)
);
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.crm_settings TO authenticated;
CREATE POLICY "CRM settings read" ON public.crm_settings FOR SELECT TO authenticated USING(public.can_manage_agency(agency_id));
CREATE POLICY "CRM settings master edit" ON public.crm_settings FOR ALL TO authenticated
 USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.crm_salespeople (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 2 AND 120),
 email text NOT NULL,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(agency_id,user_id)
);
ALTER TABLE public.crm_salespeople ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.crm_salespeople TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.crm_salespeople FROM authenticated;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS assigned_agent_id uuid REFERENCES public.crm_salespeople(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS crm_leads_assignee_idx ON public.crm_leads(assigned_agent_id);

CREATE OR REPLACE FUNCTION public.crm_is_owner(_agency uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT public.has_role(auth.uid(),'admin'::public.app_role)
 OR EXISTS(SELECT 1 FROM public.agency_members m JOIN public.agencies a ON a.id=m.agency_id
 WHERE m.agency_id=_agency AND m.user_id=auth.uid() AND m.role='owner' AND a.active) $$;
CREATE OR REPLACE FUNCTION public.crm_is_manager(_agency uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT public.has_role(auth.uid(),'admin'::public.app_role)
 OR EXISTS(SELECT 1 FROM public.agency_members m JOIN public.agencies a ON a.id=m.agency_id
 WHERE m.agency_id=_agency AND m.user_id=auth.uid() AND m.role IN ('owner','editor') AND a.active) $$;
CREATE OR REPLACE FUNCTION public.crm_is_agent(_agency uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT EXISTS(SELECT 1 FROM public.crm_salespeople s JOIN public.agencies a ON a.id=s.agency_id
 WHERE s.agency_id=_agency AND s.user_id=auth.uid() AND s.active AND a.active) $$;
CREATE OR REPLACE FUNCTION public.crm_can_read_lead(_lead uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT EXISTS(SELECT 1 FROM public.crm_leads l WHERE l.id=_lead AND
 (public.crm_is_manager(l.agency_id) OR EXISTS(SELECT 1 FROM public.crm_salespeople s
 WHERE s.id=l.assigned_agent_id AND s.agency_id=l.agency_id
 AND s.user_id=auth.uid() AND s.active AND public.crm_is_agent(l.agency_id)))) $$;

DROP POLICY IF EXISTS "CRM salespeople read" ON public.crm_salespeople;
CREATE POLICY "CRM salespeople read" ON public.crm_salespeople FOR SELECT TO authenticated
USING(public.crm_is_manager(agency_id) OR (user_id=auth.uid() AND public.crm_is_agent(agency_id)));

CREATE OR REPLACE FUNCTION public.crm_validate_lead_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF NEW.assigned_agent_id IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM public.crm_salespeople s WHERE s.id=NEW.assigned_agent_id AND s.agency_id=NEW.agency_id AND s.active) THEN
  RAISE EXCEPTION 'Corretor inválido ou de outra empresa'; END IF;
 IF TG_OP='UPDATE' AND NEW.assigned_agent_id IS DISTINCT FROM OLD.assigned_agent_id
   AND NOT public.crm_is_manager(NEW.agency_id) THEN
  RAISE EXCEPTION 'Somente gestor transfere leads'; END IF;
 IF TG_OP='INSERT' AND NOT public.crm_is_manager(NEW.agency_id)
   AND NOT EXISTS(SELECT 1 FROM public.crm_salespeople s WHERE s.id=NEW.assigned_agent_id
   AND s.user_id=auth.uid() AND s.active) THEN
  RAISE EXCEPTION 'Corretor cadastra apenas leads próprios'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_validate_lead_assignment ON public.crm_leads;
CREATE TRIGGER crm_validate_lead_assignment BEFORE INSERT OR UPDATE ON public.crm_leads
FOR EACH ROW EXECUTE FUNCTION public.crm_validate_lead_assignment();

DROP POLICY IF EXISTS "CRM tenant read" ON public.crm_leads;
DROP POLICY IF EXISTS "CRM tenant create" ON public.crm_leads;
DROP POLICY IF EXISTS "CRM tenant update" ON public.crm_leads;
DROP POLICY IF EXISTS "CRM tenant delete" ON public.crm_leads;
CREATE POLICY "CRM leads select" ON public.crm_leads FOR SELECT TO authenticated
USING(public.crm_is_manager(agency_id) OR (assigned_agent_id IS NOT NULL
 AND EXISTS(SELECT 1 FROM public.crm_salespeople s WHERE s.id=assigned_agent_id AND
 s.agency_id=agency_id AND s.user_id=auth.uid() AND s.active AND public.crm_is_agent(agency_id))));
CREATE POLICY "CRM leads insert" ON public.crm_leads FOR INSERT TO authenticated
WITH CHECK(public.crm_is_manager(agency_id) OR (public.crm_is_agent(agency_id)
 AND assigned_agent_id IN (SELECT id FROM public.crm_salespeople s
 WHERE s.agency_id=crm_leads.agency_id AND s.user_id=auth.uid() AND s.active)));
CREATE POLICY "CRM leads update" ON public.crm_leads FOR UPDATE TO authenticated
USING(public.crm_is_manager(agency_id) OR public.crm_can_read_lead(id))
WITH CHECK(public.crm_is_manager(agency_id) OR (public.crm_is_agent(agency_id)
 AND assigned_agent_id IN (SELECT id FROM public.crm_salespeople s
 WHERE s.agency_id=crm_leads.agency_id AND s.user_id=auth.uid() AND s.active)));
CREATE POLICY "CRM leads delete" ON public.crm_leads FOR DELETE TO authenticated
USING(public.crm_is_manager(agency_id));
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['crm_visits','crm_deals'] LOOP
  EXECUTE format('DROP POLICY IF EXISTS "CRM tenant read" ON public.%I',tbl);
  EXECUTE format('DROP POLICY IF EXISTS "CRM tenant create" ON public.%I',tbl);
  EXECUTE format('DROP POLICY IF EXISTS "CRM tenant update" ON public.%I',tbl);
  EXECUTE format('DROP POLICY IF EXISTS "CRM tenant delete" ON public.%I',tbl);
  EXECUTE format('CREATE POLICY "CRM scoped read" ON public.%I FOR SELECT TO authenticated USING(public.crm_is_manager(agency_id) OR public.crm_can_read_lead(lead_id))',tbl);
  EXECUTE format('CREATE POLICY "CRM scoped insert" ON public.%I FOR INSERT TO authenticated WITH CHECK ((public.crm_is_manager(agency_id) OR public.crm_can_read_lead(lead_id)) AND EXISTS(SELECT 1 FROM public.crm_leads l WHERE l.id=lead_id AND l.agency_id=agency_id))',tbl);
  EXECUTE format('CREATE POLICY "CRM scoped update" ON public.%I FOR UPDATE TO authenticated USING(public.crm_is_manager(agency_id) OR public.crm_can_read_lead(lead_id)) WITH CHECK ((public.crm_is_manager(agency_id) OR public.crm_can_read_lead(lead_id)) AND EXISTS(SELECT 1 FROM public.crm_leads l WHERE l.id=lead_id AND l.agency_id=agency_id))',tbl);
  EXECUTE format('CREATE POLICY "CRM scoped delete" ON public.%I FOR DELETE TO authenticated USING(public.crm_is_manager(agency_id))',tbl);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.crm_count_seats(_agency uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT count(DISTINCT uid)::int FROM (
 SELECT user_id AS uid FROM public.agency_members WHERE agency_id=_agency
 UNION SELECT user_id FROM public.crm_salespeople WHERE agency_id=_agency AND active) members $$;
CREATE OR REPLACE FUNCTION public.crm_max_users(_agency uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT coalesce((SELECT max_users FROM public.crm_settings WHERE agency_id=_agency),3) $$;

CREATE OR REPLACE FUNCTION public.crm_assign_salesperson(_agency uuid,_email text,_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE uid uuid; result uuid; already boolean;
BEGIN
 IF NOT public.crm_is_owner(_agency) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 IF length(btrim(_name)) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Nome inválido'; END IF;
 SELECT id INTO uid FROM auth.users WHERE lower(email)=lower(btrim(_email)) LIMIT 1;
 IF uid IS NULL THEN RAISE EXCEPTION 'Crie a conta em Authentication > Users antes de vincular'; END IF;
 PERFORM 1 FROM public.agencies WHERE id=_agency FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.crm_salespeople s WHERE s.agency_id=_agency
 AND s.user_id=uid AND s.active) INTO already;
 IF NOT already AND NOT EXISTS(SELECT 1 FROM public.agency_members
 WHERE agency_id=_agency AND user_id=uid)
 AND public.crm_count_seats(_agency)>=public.crm_max_users(_agency) THEN
 RAISE EXCEPTION 'Limite de usuários atingido. Solicite evolução do plano'; END IF;
 INSERT INTO public.crm_salespeople(agency_id,user_id,name,email,active)
 VALUES(_agency,uid,btrim(_name),lower(btrim(_email)),true)
 ON CONFLICT(agency_id,user_id) DO UPDATE SET name=EXCLUDED.name,email=EXCLUDED.email,active=true
 RETURNING id INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.crm_toggle_salesperson(_agent uuid,_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE agency uuid; uid uuid; was_active boolean;
BEGIN
 SELECT agency_id,user_id,active INTO agency,uid,was_active FROM public.crm_salespeople WHERE id=_agent;
 IF agency IS NULL OR NOT public.crm_is_owner(agency) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 PERFORM 1 FROM public.agencies WHERE id=agency FOR UPDATE;
 IF _active AND NOT was_active
 AND NOT EXISTS(SELECT 1 FROM public.agency_members WHERE agency_id=agency AND user_id=uid)
 AND public.crm_count_seats(agency)>=public.crm_max_users(agency) THEN
 RAISE EXCEPTION 'Limite de usuários atingido'; END IF;
 UPDATE public.crm_salespeople SET active=_active WHERE id=_agent;
END $$;

CREATE OR REPLACE FUNCTION public.crm_limit_memberships()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.agency_id=OLD.agency_id AND NEW.user_id=OLD.user_id THEN RETURN NEW; END IF;
 PERFORM 1 FROM public.agencies WHERE id=NEW.agency_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.crm_salespeople WHERE agency_id=NEW.agency_id AND user_id=NEW.user_id AND active)
 AND public.crm_count_seats(NEW.agency_id)>=public.crm_max_users(NEW.agency_id) THEN
 RAISE EXCEPTION 'Limite de usuários do CRM atingido'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_limit_memberships ON public.agency_members;
CREATE TRIGGER crm_limit_memberships BEFORE INSERT OR UPDATE ON public.agency_members
FOR EACH ROW EXECUTE FUNCTION public.crm_limit_memberships();

REVOKE ALL ON FUNCTION public.crm_assign_salesperson(uuid,text,text),public.crm_toggle_salesperson(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_assign_salesperson(uuid,text,text),
 public.crm_toggle_salesperson(uuid,boolean),public.crm_is_agent(uuid),
 public.crm_is_manager(uuid),public.crm_is_owner(uuid),public.crm_can_read_lead(uuid),
 public.crm_count_seats(uuid),public.crm_max_users(uuid) TO authenticated;
