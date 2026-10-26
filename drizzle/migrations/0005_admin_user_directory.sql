-- 0005: Diretório seguro dos usuários vinculados, exclusivo do Super Admin.
-- Nunca exponha auth.users através de uma view pública.
CREATE OR REPLACE FUNCTION public.list_agency_users_admin()
RETURNS TABLE (agency_id uuid, user_id uuid, email text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT m.agency_id, m.user_id, u.email::text, m.role
  FROM public.agency_members m
  INNER JOIN auth.users u ON u.id = m.user_id
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
  ORDER BY u.email, m.role
$$;
REVOKE ALL ON FUNCTION public.list_agency_users_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_agency_users_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_agency_users_admin() TO authenticated;
