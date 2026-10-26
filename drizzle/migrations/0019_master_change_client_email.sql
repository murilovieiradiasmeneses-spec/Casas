-- 0019: Master-only replacement of an agency's owner/editor account.
-- Never rewrites the underlying auth user's email or password.
-- The original membership remains valid until its verified replacement is ready.
BEGIN;
CREATE TABLE IF NOT EXISTS public.agency_member_email_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
 old_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 target_email text NOT NULL CHECK(length(btrim(target_email)) BETWEEN 5 AND 254),
 member_role text NOT NULL CHECK(member_role IN ('owner','editor')),
 requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '14 days',
 completed_at timestamptz,
 canceled_at timestamptz
);
ALTER TABLE public.agency_member_email_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agency_member_email_changes FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.agency_member_email_changes TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS agency_member_pending_old
  ON public.agency_member_email_changes(agency_id,old_user_id)
  WHERE completed_at IS NULL AND canceled_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS agency_member_pending_email
  ON public.agency_member_email_changes(agency_id,target_email)
  WHERE completed_at IS NULL AND canceled_at IS NULL;

-- Internal transfer is atomic: remove the old agency link only after the new
-- verified user exists. The existing company's properties/CRM remain untouched.
CREATE OR REPLACE FUNCTION public.apply_agency_member_email_change(
 _agency uuid,_old_user uuid,_target_user uuid,_expected_role text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE old_role text; verified_email text;
BEGIN
 IF _old_user=_target_user THEN RAISE EXCEPTION 'A conta de destino é a mesma da conta atual'; END IF;
 SELECT role INTO old_role FROM public.agency_members
  WHERE agency_id=_agency AND user_id=_old_user FOR UPDATE;
 IF old_role IS NULL OR old_role<>_expected_role
 THEN RAISE EXCEPTION 'A permissão antiga mudou. Recarregue a empresa'; END IF;
 SELECT lower(email) INTO verified_email FROM auth.users
  WHERE id=_target_user AND email_confirmed_at IS NOT NULL;
 IF verified_email IS NULL THEN RAISE EXCEPTION 'O novo e-mail ainda não foi confirmado'; END IF;
 IF EXISTS(SELECT 1 FROM public.agency_members
   WHERE agency_id=_agency AND user_id=_target_user)
 THEN RAISE EXCEPTION 'O novo e-mail já tem acesso a esta imobiliária'; END IF;
 -- Existing owner account cannot retain a separate salesperson access.
 UPDATE public.crm_salespeople SET active=false WHERE agency_id=_agency AND user_id=_old_user;
 UPDATE public.crm_broker_authorizations SET revoked_at=now()
   WHERE agency_id=_agency AND user_id=_old_user AND revoked_at IS NULL;
 DELETE FROM public.agency_members WHERE agency_id=_agency AND user_id=_old_user;
 INSERT INTO public.agency_members(agency_id,user_id,role)
 VALUES(_agency,_target_user,_expected_role);
END $$;
REVOKE ALL ON FUNCTION public.apply_agency_member_email_change(uuid,uuid,uuid,text)
 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.master_change_agency_login(
 _agency uuid,_old_user uuid,_new_email text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE normalized text := lower(btrim(coalesce(_new_email,'')));
 old_role text; old_email text; target_user uuid; target_confirmed timestamptz;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::public.app_role)
 THEN RAISE EXCEPTION 'Somente o administrador master pode trocar o acesso'; END IF;
 IF normalized !~* '^[^ @]+@[^ @]+\.[^ @]+$' OR length(normalized)>254
 THEN RAISE EXCEPTION 'Informe um e-mail válido'; END IF;
 PERFORM 1 FROM public.agencies WHERE id=_agency FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada'; END IF;
 SELECT m.role,lower(u.email) INTO old_role,old_email
 FROM public.agency_members m JOIN auth.users u ON u.id=m.user_id
 WHERE m.agency_id=_agency AND m.user_id=_old_user;
 IF old_role IS NULL THEN RAISE EXCEPTION 'Usuário original sem vínculo ativo'; END IF;
 IF old_email=normalized THEN RAISE EXCEPTION 'Informe um e-mail diferente do atual'; END IF;
 SELECT id,email_confirmed_at INTO target_user,target_confirmed
 FROM auth.users WHERE lower(email)=normalized LIMIT 1;
 IF target_user IS NOT NULL AND EXISTS(SELECT 1 FROM public.agency_members
   WHERE agency_id=_agency AND user_id=target_user)
 THEN RAISE EXCEPTION 'O e-mail informado já está vinculado à empresa'; END IF;
 -- Invalidate earlier outstanding requests for this same owner.
 UPDATE public.agency_member_email_changes SET canceled_at=now()
 WHERE agency_id=_agency AND old_user_id=_old_user
   AND completed_at IS NULL AND canceled_at IS NULL;
 IF target_user IS NOT NULL AND target_confirmed IS NOT NULL THEN
   PERFORM public.apply_agency_member_email_change(_agency,_old_user,target_user,old_role);
   RETURN 'alterado';
 END IF;
 INSERT INTO public.agency_member_email_changes
   (agency_id,old_user_id,target_email,member_role,requested_by)
 VALUES(_agency,_old_user,normalized,old_role,auth.uid());
 RETURN 'pendente';
END $$;

CREATE OR REPLACE FUNCTION public.activate_agency_login_change(_agency uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE normalized text; request public.agency_member_email_changes%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre em sua conta'; END IF;
 SELECT lower(email) INTO normalized FROM auth.users
 WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
 IF normalized IS NULL THEN RAISE EXCEPTION 'Confirme o e-mail antes de ativar'; END IF;
 PERFORM 1 FROM public.agencies WHERE id=_agency AND active=true FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Esta imobiliária está indisponível'; END IF;
 SELECT * INTO request FROM public.agency_member_email_changes
 WHERE agency_id=_agency AND target_email=normalized
  AND completed_at IS NULL AND canceled_at IS NULL AND expires_at>now()
 FOR UPDATE;
 IF request.id IS NULL THEN RAISE EXCEPTION 'Este e-mail não possui uma troca de acesso autorizada ou o prazo expirou'; END IF;
 PERFORM public.apply_agency_member_email_change(_agency,request.old_user_id,auth.uid(),request.member_role);
 UPDATE public.agency_member_email_changes SET completed_at=now() WHERE id=request.id;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.master_list_agency_login_changes()
RETURNS TABLE(
 id uuid,agency_id uuid,old_user_id uuid,old_email text,target_email text,
 member_role text,created_at timestamptz,expires_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::public.app_role)
 THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 RETURN QUERY SELECT c.id,c.agency_id,c.old_user_id,u.email::text,c.target_email,c.member_role,
  c.created_at,c.expires_at
 FROM public.agency_member_email_changes c JOIN auth.users u ON u.id=c.old_user_id
 WHERE c.completed_at IS NULL AND c.canceled_at IS NULL AND c.expires_at>now()
 ORDER BY c.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.master_cancel_agency_login_change(_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE company uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::public.app_role)
 THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 SELECT agency_id INTO company FROM public.agency_member_email_changes WHERE id=_id;
 IF company IS NULL THEN RAISE EXCEPTION 'Solicitação inexistente'; END IF;
 PERFORM 1 FROM public.agencies WHERE id=company FOR UPDATE;
 UPDATE public.agency_member_email_changes SET canceled_at=now()
 WHERE id=_id AND canceled_at IS NULL AND completed_at IS NULL;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.master_change_agency_login(uuid,uuid,text),
 public.activate_agency_login_change(uuid),
 public.master_list_agency_login_changes(),
 public.master_cancel_agency_login_change(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.master_change_agency_login(uuid,uuid,text),
 public.activate_agency_login_change(uuid),
 public.master_list_agency_login_changes(),
 public.master_cancel_agency_login_change(uuid) TO authenticated;
COMMIT;
