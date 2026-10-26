DROP POLICY IF EXISTS "Public read property photos" ON storage.objects;
CREATE POLICY "Read photos of published listings or own agency" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'property-images' AND (
    EXISTS (
      SELECT 1 FROM public.property_images i
      JOIN public.properties p ON p.id = i.property_id
      JOIN public.agencies a ON a.id = p.agency_id
      WHERE i.url = storage.objects.name AND p.published = true AND a.active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.properties p
      JOIN public.agencies a ON a.id = p.agency_id
      WHERE p.cover_image_url = storage.objects.name AND p.published = true AND a.active = true
    )
    OR public.can_manage_property_image_path(name)
  )
);
DROP POLICY IF EXISTS "Public reads branding files" ON storage.objects;