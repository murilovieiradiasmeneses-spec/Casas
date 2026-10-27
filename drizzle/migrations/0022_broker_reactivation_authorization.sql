-- 0022: Keep the salesperson record and its explicit authorization in sync.
-- A revoked salesperson must never be able to reactivate their own seat.
-- Only an owner/master may reactivate, subject to the seat limit.
CREATE OR REPLACE FUNCTION public.crm_toggle_salesperson(_agent uuid,_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE company uuid;uid uuid;was_active boolean;agent_name text;
        confirmed_email text;old_email text;
BEGIN
 SELECT agency_id,user_id,active,name,email
 INTO company,uid,was_active,agent_name,old_email
 FROM public.crm_salespeople WHERE id=_agent;
 IF company IS NULL OR NOT public.crm_is_owner(company)
 THEN RAISE EXCEPTION 'Apenas o proprietário pode alterar o acesso'; END IF;
 PERFORM 1 FROM public.agencies WHERE id=company AND active=true FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Imobiliária não está ativa'; END IF;
 IF _active THEN
   SELECT lower(email) INTO confirmed_email FROM auth.users
    WHERE id=uid AND email_confirmed_at IS NOT NULL;
   IF confirmed_email IS NULL THEN
     RAISE EXCEPTION 'O corretor precisa confirmar o e-mail antes da reativação';
   END IF;
   IF NOT was_active
      AND NOT EXISTS(SELECT 1 FROM public.agency_members
        WHERE agency_id=company AND user_id=uid)
      AND NOT EXISTS(SELECT 1 FROM public.crm_broker_authorizations a
        WHERE a.agency_id=company AND a.email=confirmed_email
          AND a.revoked_at IS NULL AND a.activated_at IS NULL)
      AND public.crm_reserved_seats(company)>=public.crm_max_users(company)
   THEN RAISE EXCEPTION 'Limite de acessos do plano atingido'; END IF;
   UPDATE public.crm_salespeople
   SET active=true,email=confirmed_email WHERE id=_agent;
   INSERT INTO public.crm_broker_authorizations
      (agency_id,email,name,user_id,approved_by,authorized_at,activated_at,revoked_at)
   VALUES(company,confirmed_email,agent_name,uid,auth.uid(),now(),now(),NULL)
   ON CONFLICT(agency_id,email) DO UPDATE SET
      name=excluded.name,user_id=excluded.user_id,approved_by=excluded.approved_by,
      authorized_at=now(),activated_at=now(),revoked_at=NULL;
 ELSE
   UPDATE public.crm_salespeople SET active=false WHERE id=_agent;
   UPDATE public.crm_broker_authorizations
   SET revoked_at=now(),activated_at=NULL
   WHERE agency_id=company
     AND (user_id=uid OR lower(email)=lower(old_email))
     AND revoked_at IS NULL;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.crm_toggle_salesperson(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.crm_toggle_salesperson(uuid,boolean) TO authenticated;
