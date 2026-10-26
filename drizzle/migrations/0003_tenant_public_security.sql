
-- Ensure the shared private property-photo bucket exists.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('property-images','property-images',false,10485760,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Public catalogues must not expose properties owned by suspended tenants.
DROP POLICY IF EXISTS "Public read published" ON public.properties;
CREATE POLICY "Public reads active published listings" ON public.properties FOR SELECT TO anon,authenticated
USING (
  published = true AND EXISTS (
    SELECT 1 FROM public.agencies a WHERE a.id = agency_id AND a.active = true
  )
);
DROP POLICY IF EXISTS "Public read images of published" ON public.property_images;
CREATE POLICY "Public reads published active listing images" ON public.property_images FOR SELECT TO anon,authenticated
USING (
  EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.published = true
    AND EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = p.agency_id AND a.active = true))
);

-- Clients cannot replace photos using cross-tenant paths. Uploads use agency/property folders.
CREATE OR REPLACE FUNCTION public.can_manage_property_image_path(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id::text = (storage.foldername(_path))[2]
      AND p.agency_id::text = (storage.foldername(_path))[1]
      AND public.can_manage_agency(p.agency_id)
  )
$$;
REVOKE ALL ON FUNCTION public.can_manage_property_image_path(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_property_image_path(text) TO authenticated;

DROP POLICY IF EXISTS "Tenant uploads property photos" ON storage.objects;
DROP POLICY IF EXISTS "Tenant updates property photos" ON storage.objects;
DROP POLICY IF EXISTS "Tenant deletes property photos" ON storage.objects;
CREATE POLICY "Tenant uploads property photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-images' AND (
  public.has_role(auth.uid(),'admin') OR public.can_manage_property_image_path(name)
));
CREATE POLICY "Tenant updates property photos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'property-images' AND (
  public.has_role(auth.uid(),'admin') OR public.can_manage_property_image_path(name)
))
WITH CHECK (bucket_id = 'property-images' AND (
  public.has_role(auth.uid(),'admin') OR public.can_manage_property_image_path(name)
));
CREATE POLICY "Tenant deletes property photos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'property-images' AND (
  public.has_role(auth.uid(),'admin') OR public.can_manage_property_image_path(name)
));
