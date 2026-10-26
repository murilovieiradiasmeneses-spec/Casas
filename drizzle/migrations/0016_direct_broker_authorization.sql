-- 0016 Direct broker authorization per agency; no invitation token or cryptographic link.
-- The owner approves a specific email. The URL is a reusable company registration link.
-- A broker receives access only after email confirmation and server-side seat checks.
BEGIN;

CREATE TABLE IF NOT EXISTS public.crm_broker_authorizations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
 email text NOT NULL CHECK(length(btrim(email)) BETWEEN 5 AND 254),
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 2 AND 120),
 user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 authorized_at timestamptz NOT NULL DEFAULT now(),
 activated_at timestamptz,
 revoked_at timestamptz,
 UNIQUE(agency_id,email)
);
CREATE INDEX IF NOT EXISTS crm_broker_auth_pending_idx ON public.crm_broker_authorizations(agency_id)
 WHERE activated_at IS NULL AND revoked_at IS NULL;
ALTER TABLE public.crm_broker_authorizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.crm_broker_authorizations FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE public.crm_broker_authorizations TO service_role;

CREATE OR REPLACE FUNCTION public.crm_reserved_seats(_agency uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT public.crm_count_seats(_agency)+
  (SELECT count(*)::int FROM public.crm_broker_authorizations a
    WHERE a.agency_id=_agency AND a.revoked_at IS NULL AND a.activated_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.crm_salespeople s
      WHERE s.agency_id=_agency AND lower(s.email)=a.email AND s.active))
$$;

CREATE OR REPLACE FUNCTION public.crm_authorize_broker(_agency uuid,_email text,_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  normalized text := lower(btrim(coalesce(_email,'')));
  new_name text := btrim(coalesce(_name,''));
  candidate_user uuid;
  confirmed_at timestamptz;
  prior_id uuid;
  prior_active boolean;
  already_assigned boolean;
BEGIN
 IF NOT public.crm_is_owner(_agency) THEN RAISE EXCEPTION 'Apenas o proprietário pode autorizar corretores'; END IF;
 IF normalized !~* '^[^ @]+@[^ @]+\.[^ @]+$' OR length(normalized)>254
    OR length(new_name) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Nome ou e-mail inválido'; END IF;
 PERFORM 1 FROM public.agencies WHERE id=_agency AND active=true FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Imobiliária indisponível'; END IF;
 SELECT id,email_confirmed_at INTO candidate_user,confirmed_at
   FROM auth.users WHERE lower(email)=normalized LIMIT 1;
 SELECT id, (revoked_at IS NULL) INTO prior_id,prior_active
   FROM public.crm_broker_authorizations WHERE agency_id=_agency AND email=normalized;

 -- This authorization is already reserved, or the account has an active seat.
 SELECT EXISTS(SELECT 1 FROM public.crm_salespeople WHERE agency_id=_agency
   AND lower(email)=normalized AND active=true) INTO already_assigned;
 IF (prior_id IS NULL OR NOT prior_active) AND NOT already_assigned
    AND NOT EXISTS(SELECT 1 FROM public.agency_members m JOIN auth.users u ON u.id=m.user_id
      WHERE m.agency_id=_agency AND lower(u.email)=normalized)
    AND public.crm_reserved_seats(_agency)>=public.crm_max_users(_agency)
 THEN RAISE EXCEPTION 'Limite de usuários do plano atingido. Desative alguém ou evolua o plano'; END IF;

 INSERT INTO public.crm_broker_authorizations(agency_id,email,name,user_id,approved_by,authorized_at,activated_at,revoked_at)
 VALUES(_agency,normalized,new_name,candidate_user,auth.uid(),now(),NULL,NULL)
 ON CONFLICT(agency_id,email) DO UPDATE
 SET name=excluded.name,user_id=excluded.user_id,approved_by=excluded.approved_by,
     authorized_at=now(),activated_at=NULL,revoked_at=NULL;

 IF candidate_user IS NOT NULL AND confirmed_at IS NOT NULL THEN
   INSERT INTO public.crm_salespeople(agency_id,user_id,name,email,active)
   VALUES(_agency,candidate_user,new_name,normalized,true)
   ON CONFLICT(agency_id,user_id) DO UPDATE SET
     name=excluded.name,email=excluded.email,active=true;
   UPDATE public.crm_broker_authorizations
   SET user_id=candidate_user,activated_at=now()
   WHERE agency_id=_agency AND email=normalized;
   RETURN 'ativo';
 END IF;
 RETURN 'autorizado';
END $$;

CREATE OR REPLACE FUNCTION public.crm_activate_authorized_broker(_agency uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE normalized text; approval public.crm_broker_authorizations%ROWTYPE; exists_active boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para ativar'; END IF;
 SELECT lower(email) INTO normalized FROM auth.users
   WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
 IF normalized IS NULL THEN RAISE EXCEPTION 'Confirme seu e-mail antes de ativar o acesso'; END IF;
 PERFORM 1 FROM public.agencies WHERE id=_agency AND active=true FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Imobiliária indisponível'; END IF;
 SELECT * INTO approval FROM public.crm_broker_authorizations
   WHERE agency_id=_agency AND email=normalized FOR UPDATE;
 IF approval.id IS NULL OR approval.revoked_at IS NOT NULL THEN
   RAISE EXCEPTION 'Este e-mail ainda não foi autorizado pelo proprietário'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.crm_salespeople
   WHERE agency_id=_agency AND user_id=auth.uid() AND active) INTO exists_active;
 IF NOT exists_active AND NOT EXISTS(SELECT 1 FROM public.agency_members
   WHERE agency_id=_agency AND user_id=auth.uid())
   AND public.crm_count_seats(_agency)>=public.crm_max_users(_agency)
 THEN RAISE EXCEPTION 'Limite de usuários do plano atingido'; END IF;
 INSERT INTO public.crm_salespeople(agency_id,user_id,name,email,active)
 VALUES(_agency,auth.uid(),approval.name,normalized,true)
 ON CONFLICT(agency_id,user_id) DO UPDATE SET name=excluded.name,email=excluded.email,active=true;
 UPDATE public.crm_broker_authorizations SET user_id=auth.uid(),activated_at=now()
 WHERE id=approval.id;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.crm_list_authorized_brokers(_agency uuid)
RETURNS TABLE(id uuid,name text,email text,state text,authorized_at timestamptz,activated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF NOT public.crm_is_owner(_agency) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 RETURN QUERY SELECT a.id,a.name,a.email,
   CASE WHEN a.revoked_at IS NOT NULL THEN 'revogado'
     WHEN a.activated_at IS NOT NULL THEN 'ativo' ELSE 'autorizado' END,
   a.authorized_at,a.activated_at
 FROM public.crm_broker_authorizations a WHERE a.agency_id=_agency
 ORDER BY a.authorized_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.crm_revoke_broker(_agency uuid,_email text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE normalized text:=lower(btrim(coalesce(_email,'')));
BEGIN
 IF NOT public.crm_is_owner(_agency) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 PERFORM 1 FROM public.agencies WHERE id=_agency FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Imobiliária indisponível'; END IF;
 UPDATE public.crm_broker_authorizations SET revoked_at=now()
 WHERE agency_id=_agency AND email=normalized AND revoked_at IS NULL;
 UPDATE public.crm_salespeople SET active=false
 WHERE agency_id=_agency AND lower(email)=normalized AND active=true;
 RETURN true;
END $$;

-- Existing triggers and alternative access paths must honor reserved seats.
CREATE OR REPLACE FUNCTION public.crm_limit_memberships()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.agency_id=OLD.agency_id AND NEW.user_id=OLD.user_id THEN RETURN NEW; END IF;
 PERFORM 1 FROM public.agencies WHERE id=NEW.agency_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.crm_salespeople
   WHERE agency_id=NEW.agency_id AND user_id=NEW.user_id AND active)
 AND NOT EXISTS(SELECT 1 FROM public.crm_broker_authorizations a JOIN auth.users u
   ON lower(u.email)=a.email WHERE a.agency_id=NEW.agency_id AND u.id=NEW.user_id
   AND a.activated_at IS NULL AND a.revoked_at IS NULL)
 AND public.crm_reserved_seats(NEW.agency_id)>=public.crm_max_users(NEW.agency_id)
 THEN RAISE EXCEPTION 'Limite de usuários do plano atingido'; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.crm_validate_plan_seats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF NEW.max_users < public.crm_reserved_seats(NEW.agency_id) THEN
  RAISE EXCEPTION 'O plano não comporta os usuários e acessos autorizados'; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.crm_toggle_salesperson(_agent uuid,_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE agency uuid;uid uuid;was_active boolean;
BEGIN
 SELECT agency_id,user_id,active INTO agency,uid,was_active FROM public.crm_salespeople WHERE id=_agent;
 IF agency IS NULL OR NOT public.crm_is_owner(agency) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 PERFORM 1 FROM public.agencies WHERE id=agency FOR UPDATE;
 IF _active AND NOT was_active
 AND NOT EXISTS(SELECT 1 FROM public.agency_members WHERE agency_id=agency AND user_id=uid)
 AND NOT EXISTS(SELECT 1 FROM public.crm_broker_authorizations a
   WHERE a.agency_id=agency AND a.user_id=uid AND a.revoked_at IS NULL AND a.activated_at IS NULL)
 AND public.crm_reserved_seats(agency)>=public.crm_max_users(agency) THEN
  RAISE EXCEPTION 'Limite de usuários atingido'; END IF;
 UPDATE public.crm_salespeople SET active=_active WHERE id=_agent;
END $$;

-- Invalidate the legacy invite creation flow; no token issuance remains available.
REVOKE EXECUTE ON FUNCTION public.crm_create_broker_invite(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_assign_salesperson(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_redeem_broker_invite(text) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_invite_details(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.crm_reserved_seats(uuid),
 public.crm_authorize_broker(uuid,text,text),public.crm_activate_authorized_broker(uuid),
 public.crm_list_authorized_brokers(uuid),public.crm_revoke_broker(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_reserved_seats(uuid),public.crm_authorize_broker(uuid,text,text),
 public.crm_activate_authorized_broker(uuid),public.crm_list_authorized_brokers(uuid),
 public.crm_revoke_broker(uuid,text) TO authenticated;
COMMIT;
