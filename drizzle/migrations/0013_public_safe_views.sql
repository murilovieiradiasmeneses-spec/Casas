-- 0013: Public-safe projections, phase 1 (non-disruptive).
-- Published ads can hide street address/ZIP without exposing raw values over API.
-- Security-definer views intentionally filter published listings AND active agencies.
-- They contain only fields necessary to render public pages.
CREATE OR REPLACE VIEW public.public_agency_profiles
WITH (security_barrier=true)
AS
SELECT a.id,a.name,a.slug,a.logo_url,a.hero_url,a.tagline,a.about,
       a.whatsapp,a.email,a.address,a.instagram,
       a.primary_color,a.secondary_color,a.background_color,
       a.text_color,a.hero_text_color,a.active
FROM public.agencies a
WHERE a.active IS TRUE;

CREATE OR REPLACE VIEW public.public_property_listings
WITH (security_barrier=true)
AS
SELECT p.id,p.agency_id,p.slug,p.title,p.description,p.property_type,
       p.purpose,p.status,p.price,p.bedrooms,p.suites,p.bathrooms,p.parking,
       p.built_area,p.land_area,
       CASE WHEN p.show_address THEN p.address ELSE NULL::text END AS address,
       CASE WHEN p.show_address THEN p.cep ELSE NULL::text END AS cep,
       p.show_address,p.neighborhood,p.city,p.state,
       CASE WHEN p.show_address THEN p.latitude
            ELSE round(p.latitude::numeric,3)::double precision END AS latitude,
       CASE WHEN p.show_address THEN p.longitude
            ELSE round(p.longitude::numeric,3)::double precision END AS longitude,
       p.features,p.featured,p.published,p.cover_image_url,p.whatsapp,
       p.created_at,p.updated_at,p.is_off_plan,p.price_display_type,
       p.income_min,p.income_max
FROM public.properties p JOIN public.agencies a ON a.id=p.agency_id
WHERE p.published IS TRUE AND a.active IS TRUE;

REVOKE ALL ON public.public_agency_profiles,public.public_property_listings FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.public_agency_profiles,public.public_property_listings TO anon,authenticated;
COMMENT ON VIEW public.public_property_listings IS
 'Public-safe inventory. Street/ZIP are NULL and coordinates rounded for listings with show_address=false.';
COMMENT ON VIEW public.public_agency_profiles IS
 'Public brand and explicit business contacts of active companies, not membership, billing or user data.';
