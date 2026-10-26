
-- CASAS white-label / multi-tenant migration.
-- Run once after 0000_casas_schema.sql. Review policies before launching publicly.
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS hero_url text,
  ADD COLUMN IF NOT EXISTS tagline text NOT NULL DEFAULT 'Encontre o lugar ideal para viver.',
  ADD COLUMN IF NOT EXISTS about text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS primary_color text NOT NULL DEFAULT '#396351',
  ADD COLUMN IF NOT EXISTS secondary_color text NOT NULL DEFAULT '#232624',
  ADD COLUMN IF NOT EXISTS background_color text NOT NULL DEFAULT '#FAF9F6',
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_domain text UNIQUE;

ALTER TABLE public.agencies
  ADD CONSTRAINT agencies_primary_hex CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT agencies_secondary_hex CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT agencies_background_hex CHECK (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT agencies_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

CREATE TABLE IF NOT EXISTS public.agency_members (
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agency_id,user_id)
);
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.agency_members TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.agency_members TO authenticated;
GRANT ALL ON public.agency_members TO service_role;

CREATE OR REPLACE FUNCTION public.can_manage_agency(_agency_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.agency_members m WHERE m.agency_id = _agency_id AND m.user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.can_edit_brand(_agency_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.agency_members m
      WHERE m.agency_id = _agency_id AND m.user_id = auth.uid() AND m.role = 'owner')
$$;
REVOKE ALL ON FUNCTION public.can_manage_agency(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_edit_brand(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_agency(uuid), public.can_edit_brand(uuid) TO authenticated;

CREATE POLICY "Own memberships or platform admin" ON public.agency_members
FOR SELECT TO authenticated USING
  (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Platform admin manages membership" ON public.agency_members
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Owners may edit branding of their own company. Only platform admin can create/delete companies.
DROP POLICY IF EXISTS "Admins manage agencies" ON public.agencies;
CREATE POLICY "Platform admin creates agencies" ON public.agencies FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners manage brand" ON public.agencies FOR UPDATE TO authenticated
USING (public.can_edit_brand(id))
WITH CHECK (public.can_edit_brand(id));
CREATE POLICY "Platform admin deletes agencies" ON public.agencies FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'));

-- Harden tenant rows: agency_id may not be changed by ordinary members.
DROP POLICY IF EXISTS "Admins read all" ON public.properties;
DROP POLICY IF EXISTS "Admins insert" ON public.properties;
DROP POLICY IF EXISTS "Admins update" ON public.properties;
DROP POLICY IF EXISTS "Admins delete" ON public.properties;
CREATE POLICY "Tenant can read all own properties" ON public.properties FOR SELECT TO authenticated
USING (public.can_manage_agency(agency_id));
CREATE POLICY "Tenant can insert own properties" ON public.properties FOR INSERT TO authenticated
WITH CHECK (public.can_manage_agency(agency_id));
CREATE POLICY "Tenant can update own properties" ON public.properties FOR UPDATE TO authenticated
USING (public.can_manage_agency(agency_id))
WITH CHECK (public.can_manage_agency(agency_id));
CREATE POLICY "Tenant can delete own properties" ON public.properties FOR DELETE TO authenticated
USING (public.can_manage_agency(agency_id));

-- A property slug needs to be unique per company, not globally.
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS properties_agency_slug_unique ON public.properties (agency_id, slug);

DROP POLICY IF EXISTS "Admins read images" ON public.property_images;
DROP POLICY IF EXISTS "Admins write images" ON public.property_images;
CREATE POLICY "Tenant can read own property images" ON public.property_images FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id
AND public.can_manage_agency(p.agency_id)));
CREATE POLICY "Tenant can insert property images" ON public.property_images FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id
AND public.can_manage_agency(p.agency_id)));
CREATE POLICY "Tenant can update property images" ON public.property_images FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.can_manage_agency(p.agency_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.can_manage_agency(p.agency_id)));
CREATE POLICY "Tenant can delete property images" ON public.property_images FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.can_manage_agency(p.agency_id)));

-- Upload paths: <agency-uuid>/<property-uuid>/<file>. Existing platform-admin uploads still work.
DROP POLICY IF EXISTS "Admins upload property photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins update property photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete property photos" ON storage.objects;
CREATE POLICY "Tenant uploads property photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
 bucket_id = 'property-images' AND (
 public.has_role(auth.uid(),'admin')
 OR (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
 AND public.can_manage_agency(((storage.foldername(name))[1])::uuid)
 ));
CREATE POLICY "Tenant updates property photos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'property-images' AND (
 public.has_role(auth.uid(),'admin') OR
 ((storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' AND
 public.can_manage_agency(((storage.foldername(name))[1])::uuid))
))
WITH CHECK (bucket_id = 'property-images' AND (
 public.has_role(auth.uid(),'admin') OR
 ((storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' AND
 public.can_manage_agency(((storage.foldername(name))[1])::uuid))
));
CREATE POLICY "Tenant deletes property photos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'property-images' AND (
 public.has_role(auth.uid(),'admin') OR
 ((storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' AND
 public.can_manage_agency(((storage.foldername(name))[1])::uuid))
));

-- Branding images are intentionally public; edits/upload remain restricted.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('agency-branding','agency-branding',true,5242880,ARRAY['image/png','image/jpeg','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public reads branding files" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'agency-branding');
CREATE POLICY "Owners upload branding files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='agency-branding'
AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
AND public.can_edit_brand(((storage.foldername(name))[1])::uuid));
CREATE POLICY "Owners delete branding files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='agency-branding'
AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
AND public.can_edit_brand(((storage.foldername(name))[1])::uuid));

-- Only a platform admin can assign the initial customer account, by existing Auth email.
CREATE OR REPLACE FUNCTION public.assign_agency_member(_agency_id uuid, _email text, _role text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE _uid uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
   RAISE EXCEPTION 'Not authorized';
 END IF;
 IF _role NOT IN ('owner','editor') THEN
   RAISE EXCEPTION 'Invalid role';
 END IF;
 SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
 IF _uid IS NULL THEN RAISE EXCEPTION 'User not found. Create them in Auth first.'; END IF;
 INSERT INTO public.agency_members (agency_id,user_id,role)
 VALUES (_agency_id,_uid,_role) ON CONFLICT (agency_id,user_id) DO UPDATE SET role=EXCLUDED.role;
 RETURN _uid;
END $$;
REVOKE ALL ON FUNCTION public.assign_agency_member(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_agency_member(uuid,text,text) TO authenticated;
