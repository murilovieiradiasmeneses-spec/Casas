-- 0017: Reactivation of a previously activated broker must consume a seat.
CREATE OR REPLACE FUNCTION public.crm_authorize_broker(_agency uuid,_email text,_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  normalized text := lower(btrim(coalesce(_email,'')));
  new_name text := btrim(coalesce(_name,''));
  candidate_user uuid; confirmed_at timestamptz;
  prior_id uuid; prior_reserved boolean; already_assigned boolean;
BEGIN
 IF NOT public.crm_is_owner(_agency) THEN RAISE EXCEPTION 'Apenas o proprietário pode autorizar corretores'; END IF;
 IF normalized !~* '^[^ @]+@[^ @]+\.[^ @]+$' OR length(normalized)>254
   OR length(new_name) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Nome ou e-mail inválido'; END IF;
 PERFORM 1 FROM public.agencies WHERE id=_agency AND active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Imobiliária indisponível'; END IF;
 SELECT id,email_confirmed_at INTO candidate_user,confirmed_at
 FROM auth.users WHERE lower(email)=normalized LIMIT 1;
 SELECT id,(revoked_at IS NULL AND activated_at IS NULL)
 INTO prior_id,prior_reserved FROM public.crm_broker_authorizations
 WHERE agency_id=_agency AND email=normalized;
 SELECT EXISTS(SELECT 1 FROM public.crm_salespeople
   WHERE agency_id=_agency AND lower(email)=normalized AND active) INTO already_assigned;
 IF NOT coalesce(prior_reserved,false) AND NOT already_assigned
 AND NOT EXISTS(SELECT 1 FROM public.agency_members m JOIN auth.users u
   ON u.id=m.user_id WHERE m.agency_id=_agency AND lower(u.email)=normalized)
 AND public.crm_reserved_seats(_agency)>=public.crm_max_users(_agency)
 THEN RAISE EXCEPTION 'Limite de usuários atingido. Desative alguém ou evolua o plano'; END IF;
 INSERT INTO public.crm_broker_authorizations(
   agency_id,email,name,user_id,approved_by,authorized_at,activated_at,revoked_at)
 VALUES(_agency,normalized,new_name,candidate_user,auth.uid(),now(),NULL,NULL)
 ON CONFLICT(agency_id,email) DO UPDATE SET
 name=excluded.name,user_id=excluded.user_id,approved_by=excluded.approved_by,
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
REVOKE ALL ON FUNCTION public.crm_authorize_broker(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_authorize_broker(uuid,text,text) TO authenticated;
