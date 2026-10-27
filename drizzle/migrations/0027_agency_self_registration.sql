-- 0027: secure first-time agency access registration without manual Cloud Users setup.
-- Initial membership is granted only after the user's email is CONFIRMED.
-- The master may authorize the email but cannot set the account password.
BEGIN;
CREATE TABLE IF NOT EXISTS public.agency_initial_access_authorizations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
 email text NOT NULL CHECK(length(btrim(email)) BETWEEN 5 AND 254),
 member_role text NOT NULL CHECK(member_role IN ('owner','editor')),
 created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '14 days',
 activated_at timestamptz,
 canceled_at timestamptz,
 UNIQUE(agency_id,email)
);
ALTER TABLE public.agency_initial_access_authorizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agency_initial_access_authorizations FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.agency_initial_access_authorizations TO service_role;

CREATE OR REPLACE FUNCTION public.master_authorize_agency_member(
 _agency uuid,_email text,_role text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE normalized text:=lower(btrim(coalesce(_email,'')));
 target_user uuid; confirmed_at timestamptz;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::public.app_role)
 THEN RAISE EXCEPTION 'Apenas o master pode autorizar o primeiro acesso de uma imobiliária'; END IF;
 IF _role NOT IN ('owner','editor')
 THEN RAISE EXCEPTION 'Permissão inválida'; END IF;
 IF normalized !~* '^[^ @]+@[^ @]+\.[^ @]+$' OR length(normalized)>254
 THEN RAISE EXCEPTION 'Informe um e-mail válido'; END IF;
 PERFORM 1 FROM public.agencies WHERE id=_agency AND active=true AND slug<>'casas' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Empresa indisponível'; END IF;
 SELECT id,email_confirmed_at INTO target_user,confirmed_at
 FROM auth.users WHERE lower(email)=normalized LIMIT 1;
 IF target_user IS NOT NULL AND confirmed_at IS NOT NULL THEN
   INSERT INTO public.agency_members(agency_id,user_id,role)
   VALUES(_agency,target_user,_role)
   ON CONFLICT(agency_id,user_id) DO UPDATE SET role=excluded.role;
   UPDATE public.agency_initial_access_authorizations SET canceled_at=now()
     WHERE agency_id=_agency AND email=normalized AND activated_at IS NULL;
   RETURN 'ativo';
 END IF;
 INSERT INTO public.agency_initial_access_authorizations
 (agency_id,email,member_role,created_by,created_at,expires_at,activated_at,canceled_at)
 VALUES (_agency,normalized,_role,auth.uid(),now(),now()+interval '14 days',NULL,NULL)
 ON CONFLICT(agency_id,email) DO UPDATE SET
 member_role=excluded.member_role,created_by=excluded.created_by,
 created_at=now(),expires_at=now()+interval '14 days',
 activated_at=NULL,canceled_at=NULL;
 RETURN 'pendente';
END $$;

CREATE OR REPLACE FUNCTION public.activate_agency_access(_agency uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE normalized text; authrow public.agency_initial_access_authorizations%ROWTYPE;
 request public.agency_member_email_changes%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para ativar o acesso'; END IF;
 SELECT lower(email) INTO normalized FROM auth.users
 WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
 IF normalized IS NULL THEN RAISE EXCEPTION 'Confirme seu e-mail antes de ativar a conta'; END IF;
 PERFORM 1 FROM public.agencies WHERE id=_agency AND active=true FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Imobiliária indisponível'; END IF;
 IF EXISTS (SELECT 1 FROM public.agency_members
   WHERE agency_id=_agency AND user_id=auth.uid()) THEN RETURN true; END IF;
 SELECT * INTO authrow FROM public.agency_initial_access_authorizations
 WHERE agency_id=_agency AND email=normalized
 AND canceled_at IS NULL AND activated_at IS NULL AND expires_at>now()
 FOR UPDATE;
 IF authrow.id IS NOT NULL THEN
   INSERT INTO public.agency_members(agency_id,user_id,role)
   VALUES(_agency,auth.uid(),authrow.member_role);
   UPDATE public.agency_initial_access_authorizations
   SET activated_at=now() WHERE id=authrow.id;
   RETURN true;
 END IF;
 -- Existing master-approved replacement flow uses the same activation page.
 SELECT * INTO request FROM public.agency_member_email_changes
 WHERE agency_id=_agency AND target_email=normalized
 AND canceled_at IS NULL AND completed_at IS NULL AND expires_at>now()
 FOR UPDATE;
 IF request.id IS NULL THEN
   RAISE EXCEPTION 'O e-mail desta conta não foi autorizado para esta imobiliária ou o prazo expirou';
 END IF;
 PERFORM public.apply_agency_member_email_change(_agency,request.old_user_id,auth.uid(),request.member_role);
 UPDATE public.agency_member_email_changes SET completed_at=now() WHERE id=request.id;
 RETURN true;
END $$;
-- Admin-only status for the agency list. Never expose the pending email list publicly.
CREATE OR REPLACE FUNCTION public.master_list_initial_access()
RETURNS TABLE (agency_id uuid,email text,member_role text,created_at timestamptz,expires_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::public.app_role)
 THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 RETURN QUERY SELECT a.agency_id,a.email,a.member_role,a.created_at,a.expires_at
 FROM public.agency_initial_access_authorizations a
 WHERE a.activated_at IS NULL AND a.canceled_at IS NULL AND a.expires_at>now()
 ORDER BY a.created_at DESC;
END $$;
REVOKE ALL ON FUNCTION public.master_authorize_agency_member(uuid,text,text),
 public.activate_agency_access(uuid),public.master_list_initial_access() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.master_authorize_agency_member(uuid,text,text),
 public.activate_agency_access(uuid),public.master_list_initial_access() TO authenticated;
COMMIT;